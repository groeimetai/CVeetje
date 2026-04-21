/**
 * Motivation Letter Generator
 *
 * Generates personalized motivation letters that:
 * - Mirror the already-tailored CV (reuse its terminology so the letter
 *   and CV feel like one coherent application)
 * - Bridge the candidate's interests (from about, projects, certs) to
 *   the company's mission and role
 * - Address the vacancy's explicit must-have and nice-to-have skills
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import { resolveTemperature } from './temperature';
import { withRetry } from './retry';
import { humanizeMotivationLetter } from './humanizer';
import type {
  ParsedLinkedIn,
  JobVacancy,
  GeneratedCVContent,
  GeneratedMotivationLetter,
  LLMProvider,
  TokenUsage,
  OutputLanguage,
} from '@/types';

// Schema for structured motivation letter output.
//
// Note the closing section explicitly bans sign-offs: formatFullLetter
// appends "Met vriendelijke groet, {name}" itself, and any sign-off in
// the model output would double it up. We also strip sign-offs in code
// as a safety net — belt and suspenders.
const motivationLetterSchema = z.object({
  opening: z.string().describe(
    'Opening paragraph: a compelling hook that grabs attention and immediately shows understanding of the company/role. Reference something specific — a product, a mission statement, a value, a recent development. 2-3 sentences. Never start with "Ik schrijf u" / "I am writing to apply".'
  ),
  whyCompany: z.string().describe(
    'Why this company/role: show genuine research. Reference what the company does, what they value, and what drew you specifically to THIS role (not just the title). Draw a line from something the company cares about to something the candidate cares about. 2-3 sentences.'
  ),
  whyMe: z.string().describe(
    'Why I am a good fit: address the vacancy\'s most important must-have skills one by one, each backed by a concrete experience from the CV. Use the SAME terminology the CV uses — the CV has already been tailored to this vacancy, so the letter must mirror its framing (no new paraphrases). 4-6 sentences.'
  ),
  motivation: z.string().describe(
    'Personal motivation and enthusiasm: what drives the candidate, why this role fits their trajectory. Mine the profile\'s about, projects, and certifications for genuine interest signals and connect them to the company\'s domain. If personal motivation text was provided, weave it in naturally. 2-3 sentences.'
  ),
  closing: z.string().describe(
    'Final call to action paragraph: express enthusiasm and availability for an interview. 1-2 sentences. CRITICAL: do NOT include any sign-off greeting ("Met vriendelijke groet", "Hoogachtend", "Kind regards", "Sincerely", "Best regards"). Do NOT include the candidate name. Just the call-to-action sentences — the sign-off and name are appended automatically afterwards.'
  ),
});

// Build the system prompt for motivation letter generation
function buildSystemPrompt(language: OutputLanguage): string {
  const languageInstructions =
    language === 'nl'
      ? `Write the entire letter in Dutch (Nederlands). Use formal but warm "u" form.
       Use professional Dutch business letter conventions.`
      : `Write the entire letter in English. Use professional but personable tone.
       Use standard business letter conventions.`;

  return `You are an expert cover letter writer who creates compelling, personalized motivation letters that get results.

${languageInstructions}

═══════════════════════════════════════════════
CORE PRINCIPLES
═══════════════════════════════════════════════

1. **Mirror the CV, don't reinvent it.** You will be given the CV that was
   just generated for THIS specific vacancy. That CV has already been
   tailored — headline, summary, experience highlights, and skills are
   already written in the vacancy's language. Your job is to reuse that
   framing in the letter, not to invent new phrasings. Consistency
   between CV and letter is the point: a recruiter reading both should
   feel they're written by the same person about the same job.

2. **Address must-haves concretely.** For each must-have skill in the
   vacancy, pick one experience from the CV that demonstrates it and say
   so explicitly. "The vacancy asks for X; in my role at Y I did Z."
   Vague claims ("I'm a strong communicator") are forbidden — always
   point to evidence.

3. **Bridge interests, don't just list them.** The candidate has real
   interests visible in their profile (about section, personal projects,
   certifications, volunteer work, side projects). The company has a
   real mission visible in the vacancy text (what they build, who they
   serve, what they value). Your motivation paragraph must draw an
   honest, specific line between the two. Generic enthusiasm ("I am
   passionate about technology") is forbidden — find something real.

4. **Show company knowledge.** Reference something concrete from the
   vacancy: a product, a mission, a value, a technology stack, a
   customer segment. Never write "your impressive company" without
   saying what specifically impressed you.

5. **Be specific, not generic.** Never open with "Ik schrijf u om te
   solliciteren..." / "I am writing to apply...". Open with a hook that
   shows you already understand something about them.

6. **Tone**: professional but personable, confident but not arrogant,
   enthusiastic but not desperate. Formal Dutch "u" form (if Dutch).

7. **Length**: total letter 300-400 words across all five sections
   combined. Every sentence must earn its place.

═══════════════════════════════════════════════
HARD OUTPUT RULES
═══════════════════════════════════════════════

- The closing section must contain ONLY the call-to-action sentences.
- Do NOT write "Met vriendelijke groet", "Hoogachtend", "Kind regards",
  "Sincerely", "Best regards", or any other sign-off inside the closing.
- Do NOT write the candidate name inside the closing.
- The sign-off and signature are appended automatically after the
  closing — anything you put there would create a duplicate.

═══════════════════════════════════════════════
STRUCTURE
═══════════════════════════════════════════════

- **opening**: hook showing immediate understanding of the role/company
- **whyCompany**: why this company, drawing a specific line from their
  mission/product/values to what the candidate cares about
- **whyMe**: evidence-based pitch addressing must-haves one by one,
  reusing the CV's exact vocabulary
- **motivation**: personal drive; honestly bridge interests from the
  profile's about/projects/certs to the company's domain
- **closing**: confident call to action — NO sign-off, NO name`;
}

// Build the user prompt with all context
function buildUserPrompt(
  linkedInData: ParsedLinkedIn,
  jobVacancy: JobVacancy,
  cvContent: GeneratedCVContent,
  personalMotivation?: string,
): string {
  // --- CANDIDATE PROFILE (raw, for interest signals) ---
  // We deliberately pass the full about section, all experiences, all
  // projects, and all certifications. Interest signals live in the
  // details — truncating loses the thread that makes the letter feel
  // personal. Token cost is cheap; a bland letter is expensive.

  const experienceLines = linkedInData.experience
    .map((exp) => {
      const period = `${exp.startDate}${exp.endDate ? ` – ${exp.endDate}` : ' – heden'}`;
      const desc = exp.description ? `\n  ${exp.description}` : '';
      return `- **${exp.title}** at ${exp.company} (${period})${desc}`;
    })
    .join('\n');

  const projectLines =
    linkedInData.projects && linkedInData.projects.length > 0
      ? linkedInData.projects
          .map((p) => {
            const tech = p.technologies.length > 0 ? ` [${p.technologies.join(', ')}]` : '';
            const desc = p.description ? `\n  ${p.description}` : '';
            return `- **${p.title}**${tech}${desc}`;
          })
          .join('\n')
      : 'None listed';

  const certLines =
    linkedInData.certifications.length > 0
      ? linkedInData.certifications.map((c) => `- ${c.name}${c.issuer ? ` (${c.issuer})` : ''}`).join('\n')
      : 'None listed';

  const skillsList = linkedInData.skills.map((s) => s.name).join(', ');

  // --- TAILORED CV CONTENT (primary source of language to mirror) ---
  // The CV has ALREADY been tailored to this vacancy by the CV generator.
  // Passing the full content lets the motivation letter reuse the same
  // reframings instead of reinventing them, which keeps CV and letter
  // consistent.

  const cvExperienceLines = cvContent.experience
    .slice(0, 6)
    .map((exp) => {
      const highlights = exp.highlights && exp.highlights.length > 0 ? exp.highlights.map((h) => `    • ${h}`).join('\n') : '';
      const desc = exp.description ? `\n    ${exp.description}` : '';
      return `- **${exp.title}** at ${exp.company} (${exp.period})${desc}${highlights ? '\n' + highlights : ''}`;
    })
    .join('\n');

  const cvSkillLines = [
    cvContent.skills.technical.length > 0 ? `Technical: ${cvContent.skills.technical.join(', ')}` : '',
    cvContent.skills.soft.length > 0 ? `Soft: ${cvContent.skills.soft.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // --- VACANCY (full, not truncated) ---
  // Culture/values sections are often at the bottom of a vacancy and
  // get lost when the description is truncated to 1000 chars.

  const mustHaveLines =
    jobVacancy.mustHaveSkills && jobVacancy.mustHaveSkills.length > 0
      ? jobVacancy.mustHaveSkills.map((s) => `- ${s}`).join('\n')
      : 'None explicitly listed';

  const niceToHaveLines =
    jobVacancy.niceToHaveSkills && jobVacancy.niceToHaveSkills.length > 0
      ? jobVacancy.niceToHaveSkills.map((s) => `- ${s}`).join('\n')
      : 'None explicitly listed';

  let prompt = `Generate a motivation letter for this application.

═══════════════════════════════════════════════
CANDIDATE PROFILE (raw — use for interest signals)
═══════════════════════════════════════════════

Name: ${linkedInData.fullName}
${linkedInData.headline ? `Current title: ${linkedInData.headline}` : ''}
${linkedInData.location ? `Location: ${linkedInData.location}` : ''}

${linkedInData.about ? `## About\n${linkedInData.about}\n` : ''}
## Experience
${experienceLines || 'None listed'}

## Projects (personal, open source, side work — strong interest signals)
${projectLines}

## Certifications (additional interest signals — what did they choose to learn?)
${certLines}

## Skills
${skillsList || 'None listed'}

═══════════════════════════════════════════════
TAILORED CV (use for language mirroring — THIS is the vocabulary to reuse)
═══════════════════════════════════════════════

The CV below was just generated for this exact vacancy. It already uses
the vacancy's terminology and frames each experience to match. Your
letter MUST mirror this framing — do not invent new phrasings.

## CV Headline
${cvContent.headline}

## CV Summary
${cvContent.summary}

## CV Experience (with tailored highlights)
${cvExperienceLines}

## CV Skills (already prioritized for this vacancy)
${cvSkillLines || 'None'}

═══════════════════════════════════════════════
TARGET VACANCY
═══════════════════════════════════════════════

Position: ${jobVacancy.title}
${jobVacancy.company ? `Company: ${jobVacancy.company}` : ''}
${jobVacancy.industry ? `Industry: ${jobVacancy.industry}` : ''}
${jobVacancy.location ? `Location: ${jobVacancy.location}` : ''}

## Full Job Description
${jobVacancy.description}

## Key Requirements
${jobVacancy.requirements.map((r) => `- ${r}`).join('\n')}

## Must-Have Skills (the letter must address these one by one in whyMe)
${mustHaveLines}

## Nice-to-Have Skills
${niceToHaveLines}

## Keywords
${jobVacancy.keywords.join(', ')}
`;

  if (personalMotivation && personalMotivation.trim()) {
    prompt += `
═══════════════════════════════════════════════
PERSONAL MOTIVATION FROM THE CANDIDATE (incorporate naturally)
═══════════════════════════════════════════════

"${personalMotivation}"

The candidate has shared this directly. Weave these sentiments into the
motivation paragraph, especially when bridging interests to the company.
`;
  }

  prompt += `
═══════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════

Generate a compelling, personalized motivation letter that:

1. **Opens with a specific hook** — reference something concrete from
   the vacancy (product, mission, value, tech stack). Never "I am
   writing to apply...".

2. **Draws an interest bridge** in the whyCompany and motivation
   paragraphs. Mine the candidate's about/projects/certifications for
   genuine interest signals, and connect them honestly to what this
   company does. Generic "passionate about X" phrases are forbidden —
   find something real.

3. **Addresses must-have skills concretely in whyMe**. For each must-
   have, pick one experience from the TAILORED CV (not the raw
   profile) and say explicitly how it demonstrates that must-have.
   Reuse the CV's exact wording — don't paraphrase what has already
   been carefully framed.

4. **Mirrors the CV's vocabulary**. If the CV reframed "Hielp klanten
   bij problemen" as "Loste klantincidenten op binnen SLA", the letter
   MUST use "klantincidenten binnen SLA", not the original "hielp
   klanten bij problemen". Same for every other reframed item.

5. **Closes with a confident call to action** — NO sign-off, NO name
   in the closing field. These are appended automatically.`;

  return prompt;
}

/**
 * Strip sign-off phrases and anything after them from the closing
 * section. formatFullLetter appends its own "Met vriendelijke groet,
 * {name}" block — anything similar in the model's closing creates a
 * double sign-off in the rendered letter.
 *
 * The earlier version only matched patterns anchored at the very END of
 * the string (`$`). That missed the common case where the model writes:
 *
 *   "...call to action.\n\nMet vriendelijke groet,\n\nNiels van der Werf"
 *
 * Here the string ends with the candidate's name, not the greeting, so
 * the anchored regex didn't match. The fix: scan for the FIRST
 * occurrence of any sign-off phrase and truncate everything from that
 * point onwards (including the name that follows).
 */
function stripSignOff(closing: string, language: OutputLanguage): string {
  if (!closing) return closing;

  // Phrases that mark the start of a sign-off block. Everything from
  // the match position to the end of the string is stripped.
  // Ordered longest-first so shorter substrings don't eat part of a
  // longer phrase. Case-insensitive.
  const dutchPhrases = [
    'met vriendelijke groeten',
    'met vriendelijke groet',
    'met hartelijke groeten',
    'met hartelijke groet',
    'vriendelijke groeten',
    'vriendelijke groet',
    'hartelijke groeten',
    'hartelijke groet',
    'hoogachtend',
  ];

  const englishPhrases = [
    'yours sincerely',
    'yours faithfully',
    'yours truly',
    'kind regards',
    'best regards',
    'warm regards',
    'sincerely',
    'regards',
  ];

  const phrases = language === 'nl'
    ? [...dutchPhrases, ...englishPhrases]
    : [...englishPhrases, ...dutchPhrases];

  let cleaned = closing.trim();

  // Find the earliest sign-off phrase and cut everything from there.
  const lowerCleaned = cleaned.toLowerCase();
  let earliestIndex = -1;

  for (const phrase of phrases) {
    const idx = lowerCleaned.indexOf(phrase);
    if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
      earliestIndex = idx;
    }
  }

  if (earliestIndex !== -1) {
    cleaned = cleaned.slice(0, earliestIndex).trim();
  }

  // Strip trailing punctuation left behind (comma, semicolon, newlines).
  return cleaned.replace(/[,;:\s]+$/, '').trim();
}

// Generate complete formatted letter
function formatFullLetter(
  sections: z.infer<typeof motivationLetterSchema>,
  fullName: string,
  jobTitle: string,
  companyName: string | null,
  language: OutputLanguage,
): string {
  const date = new Date().toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const greeting = language === 'nl' ? 'Geachte heer/mevrouw,' : 'Dear Hiring Manager,';

  const signOff = language === 'nl' ? 'Met vriendelijke groet,' : 'Kind regards,';

  // Defensive strip of any sign-off the model included despite the
  // prompt telling it not to.
  const cleanedClosing = stripSignOff(sections.closing, language);

  return `${date}

${language === 'nl' ? 'Betreft' : 'Re'}: ${language === 'nl' ? 'Sollicitatie' : 'Application'} ${jobTitle}${companyName ? ` - ${companyName}` : ''}

${greeting}

${sections.opening}

${sections.whyCompany}

${sections.whyMe}

${sections.motivation}

${cleanedClosing}

${signOff}

${fullName}`;
}

// Main generation function
export interface MotivationGenerationResult {
  letter: GeneratedMotivationLetter;
  usage: TokenUsage;
}

export async function generateMotivationLetter(
  linkedInData: ParsedLinkedIn,
  jobVacancy: JobVacancy,
  cvContent: GeneratedCVContent,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  language: OutputLanguage = 'nl',
  personalMotivation?: string,
): Promise<MotivationGenerationResult> {
  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);

  const systemPrompt = buildSystemPrompt(language);
  const userPrompt = buildUserPrompt(linkedInData, jobVacancy, cvContent, personalMotivation);

  console.log(`[Motivation Gen] Generating letter in ${language} for ${jobVacancy.title}`);

  try {
    // Pass 1 — structured generation. Builds the letter from profile,
    // CV, vacancy, and personal motivation.
    const result = await withRetry(() =>
      generateObject({
        model: aiProvider(modelId),
        schema: motivationLetterSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: resolveTemperature(provider, modelId, 0.7),
      }),
    );

    // Pass 2 — humanizer. Rewrites the prose to remove the standard AI
    // tells (significance inflation, copula avoidance, em dashes, "-ing"
    // tail phrases, etc.) while preserving structure, facts, and language.
    // Degrades gracefully: if the humanizer call fails it returns the
    // original sections so the user still gets a letter.
    const humanized = await humanizeMotivationLetter(
      {
        opening: result.object.opening,
        whyCompany: result.object.whyCompany,
        whyMe: result.object.whyMe,
        motivation: result.object.motivation,
        closing: result.object.closing,
      },
      provider,
      apiKey,
      model,
      language,
    );

    // Strip any sign-off the model may still have added to the closing.
    // Defense in depth: prompt + humanizer rules + this regex pass.
    const cleanedClosing = stripSignOff(humanized.sections.closing, language);

    const fullText = formatFullLetter(
      { ...humanized.sections, closing: cleanedClosing },
      linkedInData.fullName,
      jobVacancy.title,
      jobVacancy.company,
      language,
    );

    const letter: GeneratedMotivationLetter = {
      opening: humanized.sections.opening,
      whyCompany: humanized.sections.whyCompany,
      whyMe: humanized.sections.whyMe,
      motivation: humanized.sections.motivation,
      closing: cleanedClosing,
      fullText,
    };

    // Sum token usage across both passes so the credit accounting and
    // the token-usage display include the humanizer cost.
    const usage: TokenUsage = {
      promptTokens: (result.usage?.inputTokens ?? 0) + humanized.usage.promptTokens,
      completionTokens: (result.usage?.outputTokens ?? 0) + humanized.usage.completionTokens,
    };

    console.log(
      `[Motivation Gen] Generated letter (incl. humanizer): ${usage.promptTokens} input, ${usage.completionTokens} output tokens total`,
    );

    return { letter, usage };
  } catch (error) {
    console.error('[Motivation Gen] Failed after retries:', error);
    throw error;
  }
}
