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

import { z } from 'zod';
import { resolveTemperature } from './temperature';
import { generateObjectResilient } from './generate-resilient';
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
// Fields are OPTIONAL at the schema level to survive Claude Opus 4.7
// structured-output quirks ({} or {data: ...}); normalizeMotivationSections
// enforces that the core content exists and throws for the resilient
// helper to retry when the response is unusable.
//
// Note the closing section explicitly bans sign-offs: formatFullLetter
// appends "Met vriendelijke groet, {name}" itself, and any sign-off in
// the model output would double it up.
const motivationLetterSchema = z.object({
  opening: z.string().optional().describe(
    'Opening hook referencing something concrete from the vacancy text (product, mission, value, tech stack, customer segment). 2-3 sentences. Never "I am writing to apply" or "Ik schrijf u" — start with substance.'
  ),
  whyCompany: z.string().optional().describe(
    'Why this company/role: connect what the vacancy says about the company to what the candidate values. Only use details that literally appear in the vacancy text — do not invent company facts. 2-3 sentences.'
  ),
  whyMe: z.string().optional().describe(
    'Address the vacancy\'s must-have skills one by one, each backed by a WORK-HISTORY experience from the tailored CV (not personal projects unless work history truly doesn\'t cover a must-have). Reuse the CV\'s exact wording — no new paraphrases. 4-6 sentences.'
  ),
  motivation: z.string().optional().describe(
    'Restrained bridge from a real signal in the profile (about-section, work patterns, or projects) to the vacancy\'s domain. If the candidate provided personal motivation text, weave it in. 2-3 sentences. No gushing, no "passionate about", no "thrilled to apply".'
  ),
  closing: z.string().optional().describe(
    'Specific call to action. 1-2 sentences. Do NOT include any sign-off ("Met vriendelijke groet", "Kind regards" etc.) or the candidate name — those are appended automatically.'
  ),
});

type MotivationSections = Required<{
  opening: string;
  whyCompany: string;
  whyMe: string;
  motivation: string;
  closing: string;
}>;

// Normalize what the LLM returned into a complete set of sections. If the
// output is unusable (wrapped in {data:...} or largely empty), throws so
// the resilient helper retries the call (eventually with the Opus 4.6
// fallback model).
function normalizeMotivationSections(rawInput: unknown): MotivationSections {
  type RawShape = Partial<MotivationSections> & { data?: Partial<MotivationSections> };
  let raw = (rawInput ?? {}) as RawShape;

  if (
    raw.data &&
    typeof raw.data === 'object' &&
    !raw.opening &&
    !raw.whyMe &&
    !raw.motivation
  ) {
    raw = raw.data as RawShape;
  }

  const filledSections = (['opening', 'whyCompany', 'whyMe', 'motivation', 'closing'] as const).filter(
    (key) => typeof raw[key] === 'string' && (raw[key] as string).trim().length > 20,
  );

  // A usable letter needs at least the opening, whyMe and motivation —
  // those carry the meat. If fewer than 3 meaningful sections came back,
  // treat it as an empty response and trigger retry.
  if (filledSections.length < 3) {
    throw new Error(
      'Het AI-model gaf een onvolledig antwoord terug voor de motivatiebrief. Probeer het opnieuw.',
    );
  }

  return {
    opening: raw.opening?.trim() ?? '',
    whyCompany: raw.whyCompany?.trim() ?? '',
    whyMe: raw.whyMe?.trim() ?? '',
    motivation: raw.motivation?.trim() ?? '',
    closing: raw.closing?.trim() ?? '',
  };
}

// Build the system prompt for motivation letter generation
function buildSystemPrompt(language: OutputLanguage): string {
  const languageInstructions =
    language === 'nl'
      ? `Schrijf in natuurlijk, professioneel Nederlands met de "u"-vorm. Geen letterlijke vertalingen uit het Engels, geen anglicismen, geen opgesomde adjectieven. Concrete werkwoorden (leidde, ontwikkelde, beheerde). Korte zinnen waar dat helderheid geeft.`
      : `Write in natural, professional English. Confident and personable, not stiff. Short sentences where they aid clarity.`;

  return `You are an expert cover letter writer. Generate a motivation letter that reads like a thoughtful human candidate wrote it — not an LLM.

${languageInstructions}

## CORE PRINCIPLES

1. **Only facts that are in the profile or CV.** Never invent companies, degrees, projects, numbers, interests, or company details. When in doubt: omit. A shorter honest letter beats a longer fabricated one.

2. **Mirror the tailored CV.** The CV passed below was just generated for THIS vacancy and already uses the vacancy's language. Reuse that framing verbatim where possible — do not paraphrase or reinvent. The letter and CV should feel written by the same person about the same job.

3. **whyMe leans on WORK EXPERIENCE, not projects.** For each must-have skill, pick ONE work-history item from the CV that demonstrates it. Personal projects are a fallback ONLY when work history genuinely doesn't cover a must-have. Do not lead with portfolio/side-project work when relevant employment evidence exists.

4. **Every paragraph touches the vacancy text.**
   - opening hooks something concrete the vacancy mentions (product, mission, value, tech stack, customer segment).
   - whyCompany references what the vacancy actually says about the company — never invent company facts.
   - whyMe addresses verified must-haves.
   - motivation bridges to a domain detail from the vacancy.
   No generic platitudes; if you can't tie a paragraph back to the vacancy text, rewrite it.

5. **Restrained motivation paragraph.** If the candidate provided personal motivation text, weave it in. Otherwise find ONE genuine bridge from the profile (about, work patterns, or — only if richer — a project or certification) to the vacancy's domain. No gushing.

## FORBIDDEN VOCABULARY (these are AI tells — do not use)

"thrilled", "passionate about", "deeply committed", "excited about", "exciting opportunity",
"leverage", "spearhead", "foster", "delve", "navigate", "harness", "unlock", "empower",
"robust", "holistic", "dynamic", "cutting-edge", "innovative", "vibrant", "renowned",
"world-class", "best-in-class", "evolving landscape", "in today's fast-paced world",
"testament to", "pivotal moment", "underscores", "aligned with", "in alignment with",
"at its core", "fundamentally", "the real question is".

NL-equivalenten ook verboden: "gepassioneerd", "gedreven door", "kartrekker", "spilfunctie",
"in een dynamische omgeving", "bewezen track record", "in essentie", "fundamenteel".

## STYLE RULES

- **No rule-of-three.** Don't write "A, B, and C" lists where two items add no information. Don't write "not just X, but Y" or "het gaat niet alleen om X, maar om Y".
- **Plain verbs.** "Built", "led", "shipped", "managed", "wrote" — not "embodied", "facilitated", "championed".
- **No em-dash overuse.** Use commas or periods.
- **No signposting.** Don't write "I want to highlight that..." — just say the thing.

## HARD OUTPUT RULES

- The closing contains ONLY a call-to-action — NO sign-off, NO candidate name. Those are appended automatically.
- Total letter length: 280–360 words across all five sections. Every sentence earns its place.

## STRUCTURE

- **opening**: hook anchored in the vacancy text
- **whyCompany**: line from vacancy text → what the candidate values (only details from sources)
- **whyMe**: must-haves addressed one by one, each tied to a work-history experience from the CV in the CV's wording
- **motivation**: one restrained bridge from a real profile signal to the vacancy's domain
- **closing**: specific call to action, NO sign-off, NO name`;
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

## TARGET VACANCY (primary source — every paragraph must touch this)

Position: ${jobVacancy.title}
${jobVacancy.company ? `Company: ${jobVacancy.company}` : ''}
${jobVacancy.industry ? `Industry: ${jobVacancy.industry}` : ''}
${jobVacancy.location ? `Location: ${jobVacancy.location}` : ''}

### Job Description
${jobVacancy.description}

### Key Requirements
${jobVacancy.requirements.map((r) => `- ${r}`).join('\n')}

### Must-Have Skills (address each in whyMe with one work-history example)
${mustHaveLines}

### Nice-to-Have Skills
${niceToHaveLines}

---

## TAILORED CV (this is the vocabulary to reuse — whyMe leans on this)

The CV was generated for THIS vacancy. Mirror its wording in the letter — do not paraphrase.

### CV Headline
${cvContent.headline}

### CV Summary
${cvContent.summary}

### CV Work Experience (with tailored highlights — primary source for whyMe)
${cvExperienceLines}

### CV Skills
${cvSkillLines || 'None'}

---

## CANDIDATE PROFILE (supporting context — use sparingly)

Name: ${linkedInData.fullName}
${linkedInData.headline ? `Current title: ${linkedInData.headline}` : ''}

${linkedInData.about ? `### About\n${linkedInData.about}\n` : ''}
### Raw Work Experience
${experienceLines || 'None listed'}

### Projects (use ONLY as a motivation-bridge if work experience doesn't cover the relevant ground)
${projectLines}

### Certifications
${certLines}

### Skills
${skillsList || 'None listed'}
`;

  if (personalMotivation && personalMotivation.trim()) {
    prompt += `
---

## PERSONAL MOTIVATION FROM CANDIDATE

"${personalMotivation}"

Weave this into the motivation paragraph naturally.
`;
  }

  prompt += `
---

## INSTRUCTIONS

1. **opening**: hook anchored in the vacancy text (product, mission, value). No "Ik schrijf u" / "I am writing to apply".
2. **whyCompany**: reference what the vacancy actually says about the company. Do not invent company facts.
3. **whyMe**: each must-have addressed with ONE work-history experience from the tailored CV. Lead with employment evidence, not side projects.
4. **motivation**: one genuine bridge between a profile signal and the vacancy's domain. Restrained tone — no "passionate about", no "thrilled".
5. **closing**: specific call to action. NO sign-off, NO name (appended automatically).
6. **Mirror CV wording** verbatim where possible. If the CV says "Loste klantincidenten op binnen SLA", the letter uses that — not "hielp klanten met problemen".
7. **Follow forbidden-vocabulary list** in the system prompt strictly.

## FINAL CHECK (apply before returning)

- Every company, project, degree, number mentioned exists in the profile or CV.
- Every detail about the target company is in the vacancy text.
- Every paragraph touches the vacancy text in a verifiable way.
- whyMe is backed by work experience, not just projects.
- No forbidden vocabulary, no rule-of-three, no em-dash overuse.

Remove any sentence that fails. A shorter honest letter is fine.`;

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

// Heuristic language detection on the AI-generated body. Used as a defense
// when the `language` flag passed in disagrees with what the model actually
// wrote — e.g. user picked NL but the CV was already English so the model
// mirrored that, or older CVs that never stored a `language` field.
function detectLetterLanguage(text: string): OutputLanguage {
  const lower = ` ${text.toLowerCase()} `;
  // Tokens chosen for low collision: function words and common openers.
  const dutchMarkers = [
    ' ik ', ' het ', ' uw ', ' mijn ', ' graag ', ' bij ', ' om ', ' van ',
    ' deze ', ' niet ', ' goed ', ' werk', ' ervaring', ' jaar ', ' zou ',
  ];
  const englishMarkers = [
    ' i ', ' the ', ' your ', ' my ', ' glad ', ' would ', ' have ', ' with ',
    ' this ', ' not ', ' good ', ' work', ' experience', ' years ', ' team ',
  ];
  let nl = 0;
  let en = 0;
  for (const m of dutchMarkers) if (lower.includes(m)) nl += 1;
  for (const m of englishMarkers) if (lower.includes(m)) en += 1;
  return en > nl ? 'en' : 'nl';
}

// Generate complete formatted letter
function formatFullLetter(
  sections: MotivationSections,
  fullName: string,
  jobTitle: string,
  companyName: string | null,
  language: OutputLanguage,
): string {
  // The model may ignore the `language` instruction when the CV it mirrors is
  // in another language. Cross-check against the actual prose so the signoff
  // and chrome match what the reader sees.
  const bodySample = [
    sections.opening, sections.whyCompany, sections.whyMe,
    sections.motivation, sections.closing,
  ].filter(Boolean).join(' ');
  const detected = detectLetterLanguage(bodySample);
  const effectiveLanguage: OutputLanguage = detected !== language ? detected : language;

  const date = new Date().toLocaleDateString(effectiveLanguage === 'nl' ? 'nl-NL' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const greeting = effectiveLanguage === 'nl' ? 'Geachte heer/mevrouw,' : 'Dear Hiring Manager,';

  const signOff = effectiveLanguage === 'nl' ? 'Met vriendelijke groet,' : 'Kind regards,';

  // Defensive strip of any sign-off the model included despite the
  // prompt telling it not to. Use the detected language so we strip both
  // NL and EN signoffs regardless of the original flag.
  const cleanedClosing = stripSignOff(sections.closing, effectiveLanguage);

  return `${date}

${effectiveLanguage === 'nl' ? 'Betreft' : 'Re'}: ${effectiveLanguage === 'nl' ? 'Sollicitatie' : 'Application'} ${jobTitle}${companyName ? ` - ${companyName}` : ''}

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
  const systemPrompt = buildSystemPrompt(language);
  const userPrompt = buildUserPrompt(linkedInData, jobVacancy, cvContent, personalMotivation);

  console.log(`[Motivation Gen] Generating letter in ${language} for ${jobVacancy.title}`);

  try {
    // Pass 1 — structured generation. Resilient helper retries the same
    // model twice and falls back to claude-opus-4-6 for Anthropic if the
    // primary keeps returning empty/partial output.
    const genResult = await generateObjectResilient({
      provider,
      apiKey,
      model,
      schema: motivationLetterSchema,
      prompt: userPrompt,
      system: systemPrompt,
      temperature: resolveTemperature(provider, model, 0.7),
      normalize: normalizeMotivationSections,
      logTag: 'Motivation Gen',
    });
    const result = { object: genResult.value, usage: { inputTokens: genResult.usage.promptTokens, outputTokens: genResult.usage.completionTokens } };

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
