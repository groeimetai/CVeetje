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
import { withRetry } from './retry';
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
 * Strip any trailing sign-off phrases the model may have added despite
 * being told not to. formatFullLetter appends its own "Met vriendelijke
 * groet, {name}" block — anything similar in the model's closing would
 * create a duplicate.
 *
 * This is the safety net. The first line of defense is the prompt
 * telling the model not to write sign-offs; this catches leakage.
 */
function stripSignOff(closing: string, language: OutputLanguage): string {
  if (!closing) return closing;

  // Order matters: longer phrases first so shorter ones don't eat them
  // partially. Case-insensitive. Allow optional punctuation and trailing
  // whitespace/newlines after the phrase.
  const dutchPatterns = [
    /met\s+vriendelijke\s+groeten?[\s,.\n]*$/i,
    /hoogachtend[\s,.\n]*$/i,
    /vriendelijke\s+groeten?[\s,.\n]*$/i,
    /met\s+hartelijke\s+groeten?[\s,.\n]*$/i,
    /hartelijke\s+groeten?[\s,.\n]*$/i,
    /groet(en)?[\s,.\n]*$/i,
  ];

  const englishPatterns = [
    /kind\s+regards[\s,.\n]*$/i,
    /best\s+regards[\s,.\n]*$/i,
    /warm\s+regards[\s,.\n]*$/i,
    /yours\s+sincerely[\s,.\n]*$/i,
    /yours\s+truly[\s,.\n]*$/i,
    /yours\s+faithfully[\s,.\n]*$/i,
    /sincerely[\s,.\n]*$/i,
    /regards[\s,.\n]*$/i,
  ];

  const patterns = language === 'nl' ? [...dutchPatterns, ...englishPatterns] : [...englishPatterns, ...dutchPatterns];

  let cleaned = closing.trim();

  // Apply patterns repeatedly until none match — catches edge cases
  // like "Kind regards, Sincerely," (double sign-off from the model).
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of patterns) {
      const next = cleaned.replace(pattern, '').trim();
      if (next !== cleaned) {
        cleaned = next;
        changed = true;
      }
    }
  }

  // Also strip a trailing comma left behind by "..., Kind regards" style
  return cleaned.replace(/[,;]\s*$/, '').trim();
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
    const result = await withRetry(() =>
      generateObject({
        model: aiProvider(modelId),
        schema: motivationLetterSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
      }),
    );

    // Also strip sign-offs from the persisted closing section, not just
    // from the rendered fullText, so downstream consumers (edit UI,
    // copy-to-clipboard, DOCX export) never see a duplicate either.
    const cleanedClosing = stripSignOff(result.object.closing, language);

    const fullText = formatFullLetter(
      { ...result.object, closing: cleanedClosing },
      linkedInData.fullName,
      jobVacancy.title,
      jobVacancy.company,
      language,
    );

    const letter: GeneratedMotivationLetter = {
      opening: result.object.opening,
      whyCompany: result.object.whyCompany,
      whyMe: result.object.whyMe,
      motivation: result.object.motivation,
      closing: cleanedClosing,
      fullText,
    };

    const usage: TokenUsage = {
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
    };

    console.log(
      `[Motivation Gen] Generated letter: ${usage.promptTokens} input, ${usage.completionTokens} output tokens`,
    );

    return { letter, usage };
  } catch (error) {
    console.error('[Motivation Gen] Failed after retries:', error);
    throw error;
  }
}
