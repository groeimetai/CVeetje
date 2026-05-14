import { z } from 'zod';
import { resolveTemperature } from './temperature';
import { generateObjectResilient } from './generate-resilient';
import { getCurrentDateContext } from './date-context';
import { validateCVContent } from './validators/claim-validator';
import type {
  ParsedLinkedIn,
  JobVacancy,
  GeneratedCVContent,
  LLMProvider,
  TokenUsage,
  OutputLanguage,
  FitAnalysis,
} from '@/types';
import type { CVDesignTokens, ExperienceDescriptionFormat } from '@/types/design-tokens';

// Schema for structured CV output.
//
// Top-level fields are OPTIONAL because Claude Opus 4.7 under structured
// output occasionally returns `{}` or drops fields (e.g. headline). Parse
// leniently, then validate meaningfully in code: if the core fields are
// empty we throw a user-facing error, otherwise we fill sensible defaults.
const cvContentSchema = z.object({
  headline: z.string().optional().describe('Professional headline bridging candidate background with the TARGET JOB. Example: "Senior Software Engineer | Cloud & DevOps Specialist". Must position them for the target role, not just copy their current title.'),
  summary: z.string().optional().describe('Professional summary tailored to the target job, 2-3 sentences'),
  experience: z.array(
    z.object({
      title: z.string().describe('Job title - reframed toward the target role when the described work supports it (see instructions).'),
      company: z.string(),
      location: z.string().nullable(),
      period: z.string().describe('Format: "Month Year - Month Year" or "Month Year - Present"'),
      highlights: z.array(z.string()).describe('2-5 bullet points. More bullets for highly relevant roles.'),
      description: z.string().optional().describe('2-3 sentences of prose; used when format is paragraph instead of bullets.'),
      relevanceScore: z.number().describe('1-5, where 5=highly relevant to the target job'),
    })
  ).optional().describe('Experiences ORDERED BY RELEVANCE to the target job, not chronologically'),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string(),
      details: z.string().nullable().describe('Optional: relevant coursework, honors, GPA'),
    })
  ).optional(),
  skills: z.object({
    technical: z.array(z.string()).describe('Technical/hard skills relevant to the job, ordered by relevance'),
    soft: z.array(z.string()).describe('Soft skills relevant to the job'),
  }).optional(),
  languages: z.array(
    z.object({
      language: z.string(),
      level: z.string().describe('Proficiency level: Native, Fluent, Professional, Conversational, Basic'),
    })
  ).optional(),
  certifications: z.array(z.string()).optional().describe('Relevant certifications'),
  projects: z.array(
    z.object({
      title: z.string().describe('Project name, refined for relevance to target job'),
      description: z.string().describe('Tailored project description highlighting relevance to target job'),
      technologies: z.array(z.string()).describe('Technologies/tools used, ordered by relevance'),
      url: z.string().nullable().describe('Link to project/repo if available from profile data'),
      period: z.string().describe('Date range or "Ongoing"'),
      highlights: z.array(z.string()).describe('1-3 key achievements from the project'),
    })
  ).optional().describe('Projects ordered by relevance. Include personal projects, open source, academic work.'),
  interests: z.array(z.string()).optional().describe('Personal interests/hobbies — verbatim from profile.interests. Empty array if profile has none or if interests should be omitted.'),
});

// HONESTY RULES - Two clear blocks: what is forbidden, what is encouraged.
// The previous version was overly defensive and discouraged legitimate
// rephrasing. Now: fabrication is strictly forbidden, but linguistic
// reframing into the vacancy's vocabulary is explicitly encouraged.
const honestyRules = `
⚠️ HONESTY MODEL — TWO BLOCKS

You are a CV OPTIMIZER, not a CV FABRICATOR. The candidate's real experience
must stay intact, but you SHOULD actively rephrase it in the language the
target vacancy uses. Conservative omission is NOT a virtue here — under-
selling a real qualification because you didn't dare translate it is just as
harmful as fabrication.

═══════════════════════════════════════════════
BLOCK 1 — ❌ FORBIDDEN (never do these)
═══════════════════════════════════════════════
- Invent job titles, companies, or employment dates that don't exist
- Fabricate skills, technologies, or certifications the candidate doesn't have
- Claim years of experience beyond what the candidate actually has
- Add achievements, metrics, or responsibilities that have no basis in the source
- Create education credentials or degrees that don't exist
- Manufacture projects, clients, or accomplishments
- Inflate team sizes, revenue, or impact beyond what the source reasonably implies
- Add industry experience the candidate has never worked in
- Upgrade job levels (Developer → Senior Developer) unless explicitly stated
- Add technologies to job titles the candidate didn't actually work with

═══════════════════════════════════════════════
BLOCK 2 — ✅ ENCOURAGED (actively do these)
═══════════════════════════════════════════════
This is where most candidates lose ground: their real experience is described
in their *own* words instead of the *vacancy's* words. Fix that.

1. **Translate to vacancy vocabulary.** Read the vacancy first. For every
   experience entry, ask: "Which words from the vacancy describe what this
   person actually did?" Then use those words.
   - Profile: "Hielp klanten met problemen oplossen" + vacancy asks for
     "incident management" → "Loste klantincidenten op binnen SLA"
   - Profile: "Maakte planningen voor het magazijn" + vacancy asks for
     "supply chain coordination" → "Coördineerde de inkomende goederenstroom
     en magazijnplanning"
   - Profile: "Werkte met Kubernetes" + vacancy asks for "container
     orchestration" → "Beheerde container-orchestratie met Kubernetes"

2. **Reframe job titles toward the target role** when the actual work supports
   it. Examples:
   - "IT Consultant" → "ServiceNow Consultant" (ONLY if they did ServiceNow work)
   - "Developer" → "Full-Stack Developer" (ONLY if they did frontend + backend)
   - "Project Lead" → "Project Lead / Product Owner" (ONLY if they did PO tasks)
   When the underlying work supports the reframe, USE the reframe — don't be
   shy. Misleading titles are forbidden, but accurate-but-better-aimed titles
   are exactly the point of this tool.

3. **Use industry synonyms and standard terminology** for existing skills.
   - "Made websites" → "Developed responsive web applications"
   - "Helped fix bugs" → "Contributed to debugging and code quality"
   - "Talked to customers" → "Managed client communication"

4. **Use only metrics the profile actually contains.** When the source mentions
   a number, scale, or impact, use it. When it doesn't, do NOT invent one.
   - Profile says "managed a team" → write "managed a team" (NOT "managed a team of 5-8")
   - Profile says "team of 5" → write "team of 5"
   - Profile says "increased revenue" → write "increased revenue" (NOT "increased revenue by 30%")
   - Profile says "increased revenue by 25%" → write "increased revenue by 25%"

   A bullet without a number is far better than a bullet with a fabricated number.
   Recruiters spot invented metrics instantly; one fake number tanks the entire CV's credibility.

5. **Reorder and prioritize** by relevance to the target role. Most relevant
   experience first, even if it's not the most recent.

═══════════════════════════════════════════════
JUDGEMENT CALL: forbidden vs encouraged
═══════════════════════════════════════════════
The dividing line is FACTUAL CLAIM vs LINGUISTIC FRAMING.
- Adding a skill the candidate doesn't have = forbidden (factual fabrication).
- Describing a skill the candidate DOES have using the vacancy's preferred
  term = encouraged (linguistic framing).

If a profile fact CAN be traced back to the source, you may freely choose the
words you use to describe it. If it CANNOT be traced back, omit it.

Do NOT omit a real qualification just because the profile didn't phrase it the
same way as the vacancy. That's the bug we're fixing.
`;

// Language-specific instructions
const languageInstructions: Record<OutputLanguage, { intro: string; outputNote: string }> = {
  en: {
    intro: 'You are an expert CV writer. Create a professional, tailored CV based on the following profile data.',
    outputNote: `Write ALL output in English. Use professional English language appropriate for CVs.
- Past tense for past roles, present tense for current role
- Concrete action verbs, never "responsible for" or "worked on"
- British or American spelling — stay consistent throughout
- Avoid AI tells: "leveraged", "synergy", "spearheaded", "passionate professional", "results-driven dynamic"`,
  },
  nl: {
    intro: 'Je bent een expert CV-schrijver. Maak een professionele, op maat gemaakte CV op basis van de volgende profielgegevens.',
    outputNote: `Schrijf ALLE output in natuurlijk, professioneel Nederlands. Gebruik geen letterlijke vertalingen uit het Engels.

**Nederlandse CV-conventies — gebruik deze:**
- Verleden tijd voor afgeronde rollen, tegenwoordige tijd voor de huidige rol
- Beknopte zakelijke toon, geen marketingtaal
- Werkwoorden voorop: "Leidde", "Ontwikkelde", "Beheerde", "Coördineerde", "Implementeerde", "Realiseerde", "Adviseerde", "Begeleidde", "Stelde op", "Voerde door"

**Correcte vertalingen / herfraseringen:**
- "Responsible for" → "Verantwoordelijk voor" als label, maar **liever**: "Leidde", "Beheerde", "Coördineerde"
- "Worked on" → "Werkte aan" / "Droeg bij aan" — vermijd alleen "werkte aan" als zwak werkwoord
- "Led a team of X" → "Gaf leiding aan een team van X" of "Leidde een team van X"
- "Increased X" → "Verhoogde X" / "Groeide X" / "Vergrootte X" (kies wat past)
- "Implemented" → "Implementeerde" / "Voerde door" / "Zette op"
- "Developed" → "Ontwikkelde" / "Bouwde" / "Zette op"
- "Stakeholder management" → "Stakeholdermanagement" (één woord) of "Beheer van stakeholders"
- "Hands-on" → "Hands-on" (Nederlandse vakliteratuur gebruikt dit ook) of "Praktisch / uitvoerend"

**Vermijd anglicismen en stiff vertalingen:**
- ❌ "Ik ben verantwoordelijk geweest voor het managen van..." → ✅ "Beheerde..."
- ❌ "Heeft bijgedragen aan het succesvol leveren van..." → ✅ "Leverde..."
- ❌ "Heeft de leiding genomen over een team..." → ✅ "Leidde een team..."
- ❌ "Het team waar ik onderdeel van uitmaakte" → ✅ "Het team waar ik in werkte"
- ❌ "Door middel van het implementeren van" → ✅ "Door X te implementeren"

**Vermijd AI-tells in het Nederlands:**
- ❌ "Resultaatgerichte professional met passie voor..." (cliché)
- ❌ "Bewezen track record in het leveren van..." (corporate jargon)
- ❌ "Spilfunctie", "voortrekker", "kartrekker" — alleen gebruiken als de rol dat letterlijk was
- ❌ "Dynamische, proactieve en gedreven..." (lege opsomming van adjectieven)

**Schrijf zoals een ervaren Nederlandse recruiter zou willen lezen:** concreet, feitelijk, zonder opsmuk.`,
  },
};

/**
 * Build a steering section from a pre-computed fit analysis.
 *
 * The fit analyzer already did the hard work of identifying which of
 * the candidate's strengths map to this vacancy, which gaps the
 * recruiter is likely to flag, and what actionable advice applies to
 * this specific application. All of that is valuable input for the CV
 * generator — we were throwing it away before.
 *
 * We surface it as four concrete buckets the CV writer should act on:
 *   1. Confirmed strengths → emphasize prominently
 *   2. Matched skills → keep exact vacancy wording
 *   3. Warnings / gaps → address proactively via functional equivalents
 *      and reframing, not by omission
 *   4. Advice → follow verbatim where applicable
 */
function buildFitAnalysisSection(fitAnalysis?: FitAnalysis | null): string {
  if (!fitAnalysis) return '';

  const lines: string[] = ['## Fit-analysis findings (use these to steer the CV)'];
  lines.push(
    'A pre-computed fit analysis has already identified the strongest angles and the weakest gaps for this exact vacancy. Treat its findings as direct instructions for what to emphasize and what to work around.'
  );

  // Strengths — the things to lean into.
  if (fitAnalysis.strengths && fitAnalysis.strengths.length > 0) {
    lines.push('');
    lines.push('### Confirmed strengths — EMPHASIZE these prominently');
    for (const s of fitAnalysis.strengths) {
      const detail = s.detail ? ` — ${s.detail}` : '';
      lines.push(`- **[${s.category}]** ${s.message}${detail}`);
    }
    lines.push('These are the angles the recruiter is most likely to respond to. Surface them in the headline, summary, and top bullet points of the most relevant experiences.');
  }

  // Matched skills — use the vacancy's exact wording.
  if (fitAnalysis.skillMatch?.matched && fitAnalysis.skillMatch.matched.length > 0) {
    lines.push('');
    lines.push('### Skills the analyzer already matched (use the EXACT wording below in the skills section)');
    lines.push(fitAnalysis.skillMatch.matched.map((s) => `- ${s}`).join('\n'));
  }

  // Warnings — the things to work around.
  if (fitAnalysis.warnings && fitAnalysis.warnings.length > 0) {
    lines.push('');
    lines.push('### Identified gaps — ADDRESS proactively, do not hide');
    for (const w of fitAnalysis.warnings) {
      const detail = w.detail ? ` — ${w.detail}` : '';
      lines.push(`- **[${w.severity}/${w.category}]** ${w.message}${detail}`);
    }
    lines.push(
      'For each gap above: look in the profile for functional equivalents, transferable experience, or implicit evidence that can be legitimately reframed in the vacancy\'s vocabulary. Do not invent experience. Do not omit real experience that could address the gap just because the original wording was different.'
    );
  }

  // Missing skills — last resort, find equivalents or note for the motivation letter.
  if (fitAnalysis.skillMatch?.missing && fitAnalysis.skillMatch.missing.length > 0) {
    lines.push('');
    lines.push('### Skills the analyzer could not find direct evidence for');
    lines.push(fitAnalysis.skillMatch.missing.map((s) => `- ${s}`).join('\n'));
    lines.push(
      'For each of these, scan the profile ONE more time for functional equivalents or implicit evidence. If you find genuine equivalence (e.g. candidate has Kubernetes experience and the missing skill is "container orchestration"), list the skill using the vacancy\'s wording in the skills section and describe a relevant experience that demonstrates it. Only truly absent skills should remain missing.'
    );
  }

  // Bonus skills — nice-to-haves to surface.
  if (fitAnalysis.skillMatch?.bonus && fitAnalysis.skillMatch.bonus.length > 0) {
    lines.push('');
    lines.push('### Bonus skills the candidate has (nice-to-haves for this vacancy — surface them)');
    lines.push(fitAnalysis.skillMatch.bonus.map((s) => `- ${s}`).join('\n'));
  }

  // Actionable advice — follow it.
  if (fitAnalysis.advice) {
    lines.push('');
    lines.push('### Actionable advice for this application (follow verbatim where possible)');
    lines.push(fitAnalysis.advice);
  }

  // Experience match context — so the CV doesn't overclaim or underclaim years.
  if (fitAnalysis.experienceMatch) {
    const em = fitAnalysis.experienceMatch;
    lines.push('');
    lines.push('### Experience match context');
    lines.push(
      `Analyzer estimated candidate has ${em.candidateYears} years of relevant experience vs ${em.requiredYears} required (level match: ${em.levelMatch ? 'yes' : 'no'}). Use these numbers as the TRUTH when phrasing the summary — do not contradict them. If the candidate meets or exceeds the required years, state that confidently; if they fall short, do not claim more years than they have but do emphasize the quality and transferability of what they do have.`
    );
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Parse a date string like "Jan 2022", "2022", "Oct 2020" into a Date.
 * Returns null if unparseable.
 */
function parseExperienceDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // "2022" → Jan 1 2022
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) return new Date(parseInt(yearOnly[1]), 0, 1);

  // "Jan 2022", "October 2020", "mrt 2021", etc.
  const parsed = new Date(trimmed + ' 1'); // "Jan 2022 1" → valid Date
  if (!isNaN(parsed.getTime())) return parsed;

  // Try Dutch month abbreviations
  const dutchMonths: Record<string, number> = {
    jan: 0, feb: 1, mrt: 2, apr: 3, mei: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11,
  };
  const match = trimmed.match(/^(\w+)\s+(\d{4})$/i);
  if (match) {
    const monthIdx = dutchMonths[match[1].toLowerCase()];
    if (monthIdx !== undefined) return new Date(parseInt(match[2]), monthIdx, 1);
  }

  return null;
}

/**
 * Format a duration in months as "X years, Y months" or "X years" etc.
 */
function formatDuration(totalMonths: number, language: OutputLanguage = 'nl'): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (language === 'nl') {
    if (years === 0) return `${months} maand${months !== 1 ? 'en' : ''}`;
    if (months === 0) return `${years} jaar`;
    return `${years} jaar, ${months} maand${months !== 1 ? 'en' : ''}`;
  }
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`;
  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
}

/**
 * Pre-compute duration for each experience entry and total career span.
 * This prevents the AI from having to do date math (which it often gets wrong).
 */
function computeExperienceDurations(
  experiences: ParsedLinkedIn['experience'],
  language: OutputLanguage = 'nl'
): { perRole: Map<number, string>; totalSummary: string } {
  const now = new Date();
  const perRole = new Map<number, string>();
  const intervals: Array<{ startMonth: number; endMonth: number }> = [];

  for (let i = 0; i < experiences.length; i++) {
    const exp = experiences[i];
    const start = parseExperienceDate(exp.startDate);
    const end = exp.endDate ? parseExperienceDate(exp.endDate) : now;

    if (start && end) {
      const startMonth = start.getFullYear() * 12 + start.getMonth();
      const endMonth = end.getFullYear() * 12 + end.getMonth();
      const normalizedEnd = Math.max(startMonth + 1, endMonth);
      const months = Math.max(1, normalizedEnd - startMonth);

      perRole.set(i, formatDuration(months, language));
      intervals.push({ startMonth, endMonth: normalizedEnd });
    }
  }

  const merged = intervals
    .sort((a, b) => a.startMonth - b.startMonth)
    .reduce<Array<{ startMonth: number; endMonth: number }>>((acc, current) => {
      const last = acc[acc.length - 1];
      if (!last) {
        acc.push({ ...current });
        return acc;
      }

      if (current.startMonth <= last.endMonth) {
        last.endMonth = Math.max(last.endMonth, current.endMonth);
      } else {
        acc.push({ ...current });
      }
      return acc;
    }, []);

  const totalMonths = merged.reduce((sum, interval) => sum + (interval.endMonth - interval.startMonth), 0);
  const totalFormatted = formatDuration(totalMonths, language);
  const totalSummary = language === 'nl'
    ? `Totale unieke loopbaanduur (overlappende rollen niet dubbel geteld): **${totalFormatted}** (berekend op ${now.toISOString().split('T')[0]})`
    : `Total unique career duration (overlapping roles not double-counted): **${totalFormatted}** (computed on ${now.toISOString().split('T')[0]})`;

  return { perRole, totalSummary };
}

function computeUniqueCareerMonths(experiences: ParsedLinkedIn['experience']): number {
  const now = new Date();
  const intervals: Array<{ startMonth: number; endMonth: number }> = [];

  for (const exp of experiences) {
    const start = parseExperienceDate(exp.startDate);
    const end = exp.endDate ? parseExperienceDate(exp.endDate) : now;
    if (!start || !end) continue;

    const startMonth = start.getFullYear() * 12 + start.getMonth();
    const endMonth = end.getFullYear() * 12 + end.getMonth();
    intervals.push({
      startMonth,
      endMonth: Math.max(startMonth + 1, endMonth),
    });
  }

  const merged = intervals
    .sort((a, b) => a.startMonth - b.startMonth)
    .reduce<Array<{ startMonth: number; endMonth: number }>>((acc, current) => {
      const last = acc[acc.length - 1];
      if (!last) {
        acc.push({ ...current });
        return acc;
      }
      if (current.startMonth <= last.endMonth) {
        last.endMonth = Math.max(last.endMonth, current.endMonth);
      } else {
        acc.push({ ...current });
      }
      return acc;
    }, []);

  return merged.reduce((sum, interval) => sum + (interval.endMonth - interval.startMonth), 0);
}

function stripUnsupportedYearClaims(
  text: string,
  maxYears: number,
  removeAll = false,
): string {
  let result = text;
  const patterns = [
    /\bwith\s+\d{1,2}\+?\s*(?:years?|yrs?)\s+of\s+[A-Za-z -]+/gi,
    /\bmet\s+\d{1,2}\+?\s+jaar(?:\s+ervaring)?\s+in\s+[A-Za-zÀ-ÿ -]+/gi,
    /\b\d{1,2}\+?\s*(?:years?|yrs?)\s+of\s+(?:professional\s+)?experience\b/gi,
    /\b\d{1,2}\+?\s+jaar(?:\s+professionele)?\s+ervaring\b/gi,
  ];

  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }

  result = result.replace(/\s{2,}/g, ' ').replace(/\s+\|/g, ' |').replace(/\|\s+\|/g, '|').trim();

  if (removeAll) return result.replace(/^[|,\-:\s]+|[|,\-:\s]+$/g, '').trim();

  const yearClaimRegex = /\b(\d{1,2})(\+)?\s*(years?|yrs?|jaar)\b/gi;
  result = result.replace(yearClaimRegex, (match, yearsStr) => {
    const years = parseInt(yearsStr, 10);
    return years > maxYears ? '' : match;
  });

  return result.replace(/\s{2,}/g, ' ').replace(/^[|,\-:\s]+|[|,\-:\s]+$/g, '').trim();
}

function buildPrompt(
  linkedIn: ParsedLinkedIn,
  jobVacancy: JobVacancy | null,
  designTokens?: CVDesignTokens,
  language: OutputLanguage = 'nl',
  descriptionFormat: ExperienceDescriptionFormat = 'bullets',
  fitAnalysis?: FitAnalysis | null,
  includeInterests: boolean = false,
): string {
  // Layout-aware instructions (single-column only now for reliable PDF)
  const isCompact = designTokens?.spacing === 'compact';
  const bulletCount = isCompact ? '2-3' : '3-5';
  const bulletLength = isCompact ? 'Keep bullet points concise (max 15 words each)' : 'Bullet points can be detailed (max 25 words each)';

  // Experience format instructions
  const experienceFormatInstruction = descriptionFormat === 'paragraph'
    ? `
**EXPERIENCE FORMAT: PARAGRAPH**
- Write 2-3 sentences per experience as flowing prose
- Use the "description" field for each experience
- Leave the "highlights" array empty
- Focus on key achievements and responsibilities in narrative form`
    : `
**EXPERIENCE FORMAT: BULLETS**
- Generate ${bulletCount} bullet points per experience
- Use the "highlights" array
- Do not use the "description" field
- ${bulletLength}`;

  const langInstructions = languageInstructions[language];

  // Pre-compute experience durations so the AI doesn't have to do date math
  const { perRole, totalSummary } = computeExperienceDurations(linkedIn.experience, language);

  let prompt = `${langInstructions.intro}

${getCurrentDateContext(language)}

${honestyRules}

## CRITICAL: Output Language
${langInstructions.outputNote}

## LinkedIn Profile Data:

**Name:** ${linkedIn.fullName}
${linkedIn.headline ? `**Current Title:** ${linkedIn.headline}` : ''}
${linkedIn.location ? `**Location:** ${linkedIn.location}` : ''}
${linkedIn.about ? `**About:** ${linkedIn.about}` : ''}

### Experience:
${totalSummary}

${linkedIn.experience
  .map(
    (exp, i) => `
- **${exp.title}** at ${exp.company}
  ${exp.location ? `Location: ${exp.location}` : ''}
  ${exp.startDate} - ${exp.endDate || 'Present'}${perRole.has(i) ? ` (${perRole.get(i)})` : ''}
  ${exp.description ? `Description: ${exp.description}` : '[No description in profile — write 1-2 bullets describing the GENERIC responsibilities typical of this title at this kind of company. Do NOT invent metrics, project names, team sizes, technologies, or specific achievements. Prefer fewer bullets over fabricated ones.]'}
`
  )
  .join('\n')}

### Education:
${linkedIn.education
  .map(
    (edu) => `
- **${edu.school}**
  ${edu.degree || ''} ${edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
  ${edu.startYear ? `${edu.startYear} - ` : ''}${edu.endYear || ''}
`
  )
  .join('\n')}

### Skills:
${linkedIn.skills.map((s) => s.name).join(', ')}

### Languages:
${linkedIn.languages.map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`).join(', ')}

### Certifications:
${linkedIn.certifications.map((c) => `${c.name}${c.issuer ? ` - ${c.issuer}` : ''}${c.issueDate ? ` (${c.issueDate})` : ''}`).join(', ')}

### Projects:
${linkedIn.projects && linkedIn.projects.length > 0
  ? linkedIn.projects.map((p) => {
      const parts = [`- **${p.title}**`];
      if (p.role) parts.push(`Role: ${p.role}`);
      if (p.startDate || p.endDate) parts.push(`Period: ${p.startDate || '?'} - ${p.endDate || 'Present'}`);
      if (p.description) parts.push(p.description);
      if (p.technologies.length > 0) parts.push(`Technologies: ${p.technologies.join(', ')}`);
      if (p.url) parts.push(`URL: ${p.url}`);
      return parts.join('\n  ');
    }).join('\n')
  : 'No projects listed'}

### Interests/Hobbies:
${linkedIn.interests && linkedIn.interests.length > 0 ? linkedIn.interests.join(', ') : 'None listed in profile'}

${includeInterests
  ? `**Interests output rule:** Include the interests listed above VERBATIM in the output \`interests\` array. Do not rephrase, translate, or add new ones. If the profile has no interests, return an empty array.`
  : `**Interests output rule:** Return an EMPTY \`interests\` array. The user opted out of showing hobbies on this CV — do not include any, regardless of what the profile lists.`
}
`;

  if (jobVacancy) {
    // Build keywords section
    const keywordsSection = jobVacancy.keywords && jobVacancy.keywords.length > 0
      ? `
## Critical Keywords from Job Posting:
${jobVacancy.keywords.map((k) => `- ${k}`).join('\n')}

**IMPORTANT:** These keywords are extracted from the job posting. Incorporate them NATURALLY throughout:
- Use 2-3 top keywords in the professional summary
- Include relevant keywords in experience highlights where appropriate
- Ensure the skills section includes matching keywords`
      : '';

    // Must-have / nice-to-have skills are structured fields on the parsed
    // vacancy. Surface them explicitly so the model can match them
    // deliberately instead of treating all keywords as equal weight.
    const mustHaveSection = jobVacancy.mustHaveSkills && jobVacancy.mustHaveSkills.length > 0
      ? `
## Must-Have Skills (vacancy explicitly requires these):
${jobVacancy.mustHaveSkills.map((s) => `- ${s}`).join('\n')}

For EACH must-have above, you MUST consciously decide which profile experience
demonstrates it, then describe that experience using the must-have's exact
wording. If the candidate has functional-equivalent experience (e.g. profile
mentions "Kubernetes" and must-have asks for "container orchestration"),
describe it using the vacancy's term — that is encouraged framing, not fabrication.`
      : '';

    const niceToHaveSection = jobVacancy.niceToHaveSkills && jobVacancy.niceToHaveSkills.length > 0
      ? `
## Nice-to-Have Skills (vacancy bonus points):
${jobVacancy.niceToHaveSkills.map((s) => `- ${s}`).join('\n')}

If the candidate has any of these — even tangentially — surface them in skills
or highlights. Don't fabricate them, but don't leave real matches buried either.`
      : '';

    // Build top keywords for summary hint
    const topKeywords = jobVacancy.keywords && jobVacancy.keywords.length > 0
      ? jobVacancy.keywords.slice(0, 3).join(', ')
      : '';

    prompt += `

## Target Job:

**Title:** ${jobVacancy.title}
${jobVacancy.company ? `**Company:** ${jobVacancy.company}` : ''}
${jobVacancy.industry ? `**Industry:** ${jobVacancy.industry}` : ''}
${jobVacancy.location ? `**Location:** ${jobVacancy.location}` : ''}
${jobVacancy.employmentType ? `**Employment Type:** ${jobVacancy.employmentType}` : ''}

**Job Description:**
${jobVacancy.description}

${jobVacancy.requirements.length > 0 ? `**Key Requirements:**\n${jobVacancy.requirements.map((r) => `- ${r}`).join('\n')}` : ''}
${mustHaveSection}
${niceToHaveSection}
${keywordsSection}

${jobVacancy.industry ? `## Sector context
The vacancy is in **${jobVacancy.industry}**. Infer the conventions of this
sector from the vacancy text itself: which terminology, metrics, certifications
or seniority signals matter here? Use that vocabulary when describing the
candidate's experience. Do NOT fall back to generic phrasing — every sector has
its own language and the CV must speak it.` : ''}

${buildFitAnalysisSection(fitAnalysis)}

## Strategic Matching Instructions:

**Step 0 - Terminology Mapping (DO THIS FIRST, INTERNALLY):**
Before writing anything, build a mental mapping of profile-language → vacancy-language.

For each skill, responsibility, or achievement in the candidate's profile, ask:
"Which words does the vacancy use for this same concept?" Then use the
vacancy's words consistently throughout headline, summary, experience and
skills.

This is the single biggest lever for a tailored CV. Most candidates fail not
because they lack the experience, but because they describe it in their own
words instead of the vacancy's. Fix that.

Examples of correct mapping (the underlying fact stays the same, only the
phrasing changes to match vacancy vocabulary):

| Profile says | Vacancy asks for | Use in CV |
|---|---|---|
| "Hielp klanten bij problemen" | "Incident management" | "Loste klantincidenten op binnen SLA" |
| "Maakte de planning voor het magazijn" | "Supply chain coordination" | "Coördineerde inkomende goederenstroom en magazijnplanning" |
| "Werkte met Kubernetes en Docker" | "Container orchestration" | "Beheerde container-orchestratie met Kubernetes en Docker" |
| "Gaf leiding aan 5 mensen" | "People management" | "Voerde direct leiderschap over een team van 5" |
| "Onderhield contact met leveranciers" | "Vendor management" | "Beheerde de leveranciersrelaties en contractafspraken" |

The fact never changes. The words do. This is ENCOURAGED framing — see Block 2
of the honesty rules above.

**Step 1 - Analyze Requirements:**
For each job requirement listed above, identify which of the candidate's
experiences best demonstrates that skill or capability — including via
functional equivalence (Kubernetes ≈ container orchestration, Salesforce ≈
CRM, etc.).

**Step 2 - CRITICAL: Experience Relevance Assessment:**
Before writing, score EACH experience 1-5 on relevance to "${jobVacancy.title}".
Be generous about transferable relevance — a senior role in an adjacent domain
often scores 3-4, not 1-2.
- **5 (Highly Relevant):** Direct match - same role/field, directly applicable skills
- **4 (Very Relevant):** Strong overlap - related role, most skills transfer
- **3 (Moderately Relevant):** Some overlap - transferable skills apply
- **2 (Slightly Relevant):** Limited overlap - only soft skills or general experience applies
- **1 (Minimally Relevant):** Little connection - include briefly or consider omitting

**OUTPUT experiences ORDERED BY RELEVANCE (highest first), NOT chronologically!**

**Step 3 - Job Title Adaptation:**
Reframe job titles toward the target role whenever the actual described work
supports it. This is the default, not the exception. The whole point of this
tool is to surface the relevant angle of each role.

✅ DO reframe when the work supports it:
- "IT Consultant" → "ServiceNow Consultant" (if they did ServiceNow work)
- "Software Engineer" → "Software Engineer (Backend Focus)" (if backend work is described)
- "Project Lead" → "Project Lead / Product Owner" (if they did PO tasks)
- "Customer Service Rep" → "Customer Success Specialist" (if they did retention/upsell work)

❌ DO NOT:
- Upgrade levels (Developer → Senior Developer) unless explicitly stated
- Add technologies the candidate didn't work with
- Add specializations they didn't actually do

Only fall back to the original title when the described work genuinely doesn't
support any reframe — not as a default safety move.

**Step 4 - Professional Headline (CRITICAL!):**
Create a headline that BRIDGES the candidate's experience WITH the target role:
- Target role: "${jobVacancy.title}"
- DO NOT just copy the candidate's current LinkedIn headline!
- The headline should position them AS a potential "${jobVacancy.title}"
- Format: "[Role/Expertise] | [Specialization relevant to job]"
- NEVER mention years of experience in the headline
- Examples of GOOD headlines for this job:
  - If applying for "Backend Developer": "Software Engineer | Backend Development & API Architecture"
  - If applying for "Product Manager": "Product Lead | Tech Product Strategy & Agile Delivery"
  - If applying for "Data Analyst": "Analytics Professional | Data-Driven Business Intelligence"
- The headline should feel natural, not forced - bridge their real experience to the target

**Step 5 - Professional Summary Strategy:**
Write a summary that:
- Opens with positioning for "${jobVacancy.title}" role
${topKeywords ? `- Naturally includes keywords like: ${topKeywords}` : ''}
- References 1-2 key requirements the candidate clearly meets (using the vacancy's wording)
- Closes with value proposition relevant to ${jobVacancy.company || 'this opportunity'}

**Step 6 - Experience Tailoring by Relevance:**
- **Score 5-4 roles:** 4-5 detailed bullet points, lead with job-relevant achievements
- **Score 3 roles:** 3 bullet points, focus on transferable skills
- **Score 2-1 roles:** 2 brief bullet points OR omit if CV is already long enough

For ALL roles:
- REWRITE highlights using vocabulary FROM the job posting (apply the Step 0 mapping)
- QUANTIFY achievements where possible (%, numbers, scale, impact)
- Lead with the most job-relevant accomplishments

**Step 7 - Skills Optimization:**
- Order technical skills by relevance to this specific job
- Include job keywords in skills where the candidate has matching or equivalent experience
- Match skill names exactly as they appear in the job posting when the candidate
  has the underlying experience (e.g. write "Container orchestration (Kubernetes)"
  rather than just "Kubernetes" if the vacancy uses that phrase)

## ATS Optimization:
- Mirror the job posting's exact terminology where it fits the candidate's real experience
- Avoid generic phrases; be specific with tools, technologies, methodologies
- Use the vocabulary that recruiters in this sector actually search for
`;
  } else {
    prompt += `

## Instructions:
1. Create a professional headline that captures the candidate's expertise and value
   - Format: "[Primary Role] | [Key Specialization]"
   - Example: "Software Engineer | Full-Stack Development & Cloud Architecture"
   - Should highlight their strongest professional identity
   - NEVER mention years of experience in the headline
2. Create a general professional CV highlighting the candidate's strengths
3. Write compelling experience highlights that demonstrate achievements
4. Create a strong professional summary
5. Order skills by importance/expertise level
`;
  }

  prompt += `

## CV Writing Best Practices - MUST FOLLOW:

### CRITICAL: Use Pre-Computed Durations
The experience durations shown in parentheses (e.g. "4 years, 2 months") next to each role
are pre-computed from the actual dates. Use THESE numbers — do NOT calculate durations
yourself. When mentioning years of experience in the summary or elsewhere, use the total
unique career duration provided above the experience list. Never estimate, inflate, or
infer extra years from overlapping roles, side projects, or adjacent experience.

### Professional Summary Rules:
- Start with a strong positioning statement: "Results-driven [title]" or a similarly grounded role statement
- ONLY mention "[X years]" when that number is directly supported by the pre-computed unique career duration above
- Include 2-3 key competencies that directly match the job requirements
- End with a clear value proposition (what you bring to the employer)
- Maximum 3 sentences - be impactful, not lengthy
- AVOID vague phrases like "passionate professional" or "seeking opportunities"

### Experience Bullets — concrete action + context

Every bullet should have:
1. **Action verb** to start (Led, Developed, Increased, Reduced, Implemented, etc.)
2. **Specific action** describing what was done
3. **Result OR scope/context** — quantify ONLY when the profile contains the number; otherwise describe scope concretely (what kind of team, what kind of system, what kind of customer)

**Quantified examples (use this style ONLY when the profile gives the number):**
✅ "Reduced page load time by 40% through lazy loading and image optimization"
✅ "Led cross-functional team of 8 engineers to deliver e-commerce platform ahead of schedule"
✅ "Automated manual reporting process, saving 20 hours/week"
   *(Use these only if 40%, 8, 20 are in the profile. If not — drop the numbers.)*

**Unquantified examples (use these when the profile lacks numbers — these are strong without inventing metrics):**
✅ "Owned the API contract between checkout and the order-management system"
✅ "Introduced code-review standards that the rest of the platform team adopted"
✅ "Rebuilt the onboarding flow after qualitative user research"
✅ "Coördineerde de overdracht van legacy-systemen naar het nieuwe data-platform"
✅ "Was eerste aanspreekpunt voor enterprise-klanten in de migratiefase"

Both styles are excellent. The fabricated-metric anti-pattern is worse than either.

**Poor bullets (NEVER USE THESE PATTERNS):**
❌ "Responsible for managing projects" (passive, no scope)
❌ "Worked on various tasks" (vague, meaningless)
❌ "Team player with good communication skills" (cliché, not an achievement)
❌ "Helped with customer support" (weak verb, no scope)
❌ "Participated in meetings" (not an achievement)
❌ "Successfully completed all assigned tasks" (generic, "successfully" is redundant)
❌ "Increased revenue by 30%" — **when the profile says only "increased revenue"** (fabricated metric)
❌ "Managed team of 5" — **when the profile says only "managed a team"** (fabricated number)

### Power Words - Start Bullets With These:

**Achievement verbs:** Achieved, Delivered, Generated, Exceeded, Surpassed, Attained, Won, Earned
**Leadership verbs:** Led, Directed, Coordinated, Mentored, Supervised, Managed, Guided, Orchestrated
**Improvement verbs:** Optimized, Streamlined, Enhanced, Transformed, Modernized, Revamped, Accelerated
**Creation verbs:** Developed, Designed, Built, Launched, Established, Created, Pioneered, Initiated
**Analysis verbs:** Analyzed, Evaluated, Assessed, Researched, Identified, Diagnosed, Investigated
**Growth verbs:** Increased, Expanded, Grew, Boosted, Amplified, Scaled, Maximized

### Words and Phrases to AVOID:
❌ "Responsible for" → Replace with "Managed" or "Led"
❌ "Helped with" → Replace with "Contributed to" or "Supported"
❌ "Worked on" → Use specific action verb
❌ "Various" or "Multiple" → Be specific with numbers
❌ "Successfully" → The result shows success, this word is redundant
❌ "Utilized" → Use "Used" or more specific verb
❌ "Leveraged" → Often overused, be specific about what you did
❌ "Synergy", "Synergize" → Corporate jargon, avoid
❌ "Think outside the box" → Cliché
❌ "Go-getter", "Self-starter" → Show, don't tell

### Quantification — strict rules

**Use numbers ONLY when the profile actually contains them.**

Permitted sources of a number in a bullet:
- A figure stated literally in the profile's experience description, headline, summary, or projects
- A figure clearly implied by the profile (e.g. "managed the EU team" + listed team members = team size)

If neither applies: **do not include a number**. Describe scope qualitatively instead.
Qualitative scope (always safe — no fabrication):
- "enterprise-level", "company-wide", "cross-functional", "multi-team"
- "production system", "customer-facing", "internal-facing"
- "platform migration", "greenfield project", "legacy modernization"

Forbidden moves:
- Adding "%" when the profile gave no percentage
- Adding "€X" or "$X" when no monetary figure is in the profile
- Adding "X hours/week" or "X days" when no time figure is in the profile
- Adding "team of X" when only "team" was mentioned

A bullet with concrete action + qualitative scope is professional and credible.
A bullet with a fabricated number is a CV-killer.

${experienceFormatInstruction}

## Output Requirements:
- Professional, concise language
- Active voice and action verbs (avoid passive voice when an active alternative exists)
- Every experience bullet has a concrete ACTION + scope; results/metrics ONLY when the profile contains them
- Keep summary to 2-3 sentences maximum
- ${descriptionFormat === 'bullets' ? `${bulletCount} bullet points per experience entry` : '2-3 sentences per experience'}
- ${descriptionFormat === 'bullets' ? bulletLength : 'Keep descriptions focused and impactful'}
- Focus on what the candidate concretely did and the scope/context; surface real metrics where available
- Mirror exact terminology from the job posting where it fits naturally

## Final anti-hallucinatie checklist (apply before returning)

Scan everything you've generated and verify:
- [ ] Every job title in \`experience\` is either the original from the profile OR a defensible reframing supported by the described work — never an invented title.
- [ ] Every percentage, euro amount, time saving, team size, customer count, project budget can be traced to a literal number in the profile. If not — remove the number, keep the action.
- [ ] Every technology in \`skills.technical\` is mentioned somewhere in the profile (skills, experience descriptions, projects, or certifications). No invented tools.
- [ ] Every certification in \`certifications\` exists in the profile's certifications list. If the profile has none — return an empty array, do not invent one.
- [ ] Every project in \`projects\` exists in the profile's projects list. If the profile has no projects — return an empty array.
- [ ] The summary doesn't claim more years of experience than the pre-computed unique career duration above.
- [ ] No fabricated achievement (e.g. "winner of...", "speaker at...", "published in...") unless explicitly in the profile.

When in doubt about a single item, REMOVE IT. A shorter, fully truthful CV beats a longer one with a fabricated detail every time.`;

  return prompt;
}

export interface GenerateCVResult {
  content: GeneratedCVContent;
  usage: TokenUsage;
}

export async function generateCV(
  linkedIn: ParsedLinkedIn,
  jobVacancy: JobVacancy | null,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  designTokens?: CVDesignTokens,
  language: OutputLanguage = 'nl',
  descriptionFormat: ExperienceDescriptionFormat = 'bullets',
  fitAnalysis?: FitAnalysis | null,
  includeInterests: boolean = false,
): Promise<GenerateCVResult> {
  const prompt = buildPrompt(linkedIn, jobVacancy, designTokens, language, descriptionFormat, fitAnalysis, includeInterests);

  try {
    const { value, usage } = await generateObjectResilient({
      provider,
      apiKey,
      model,
      schema: cvContentSchema,
      prompt,
      temperature: resolveTemperature(provider, model, 0.5),
      normalize: (raw) => normalizeCVContent(raw, linkedIn, jobVacancy, includeInterests),
      logTag: 'CV Gen',
    });

    return { content: value, usage };
  } catch (error) {
    console.error('[CV Gen] Failed after all attempts:', error);
    throw error;
  }
}

// Normalize what the LLM returned into a fully-populated GeneratedCVContent.
//
// Claude Opus 4.7 structured-output has four failure modes we handle here:
//   1. {} — model returned nothing useful → throw a user-facing error
//   2. {data: {...}} — model wrapped the payload in `data` → unwrap it
//   3. missing `headline` or individual top-level arrays → fill from context
//   4. The entire JSON response stuffed as a string into `summary` (seen in
//      the wild — summary renders as raw `{ "headline": ..., "skills": ... }`
//      text in the preview). Detect via parse + shape-check; unwrap or retry.
function normalizeCVContent(
  rawInput: unknown,
  linkedIn: ParsedLinkedIn,
  jobVacancy: JobVacancy | null,
  includeInterests: boolean = false,
): GeneratedCVContent {
  type RawShape = Partial<GeneratedCVContent> & { data?: Partial<GeneratedCVContent> };
  let raw = (rawInput ?? {}) as RawShape;

  if (
    raw.data &&
    typeof raw.data === 'object' &&
    !raw.summary &&
    !raw.experience &&
    !raw.skills
  ) {
    raw = raw.data as RawShape;
  }

  // JSON-in-summary recovery: the model sometimes returns the entire CV as a
  // stringified JSON stuffed into the `summary` field — the preview then
  // renders `{ "headline": ..., "skills": ... }` as literal text. Detect by
  // looking for leading `{` plus structural field names we'd only see when
  // the full payload was serialized in there. Try to unwrap; if that fails,
  // throw a schema error so the resilient wrapper retries.
  if (typeof raw.summary === 'string') {
    const s = raw.summary.trim();
    const looksStringified =
      (s.startsWith('{') || s.startsWith('[')) &&
      /"(?:headline|summary|experience|skills|education)"\s*:/.test(s);

    if (looksStringified) {
      try {
        const parsed = JSON.parse(s);
        const looksLikeCV =
          parsed &&
          typeof parsed === 'object' &&
          (
            (typeof parsed.summary === 'string' && parsed.summary.length > 0 && !parsed.summary.trim().startsWith('{')) ||
            (Array.isArray(parsed.experience) && parsed.experience.length > 0) ||
            (parsed.skills && Array.isArray(parsed.skills.technical))
          );
        if (looksLikeCV) {
          console.warn('[CV Gen] Recovered JSON-in-summary anti-pattern — unwrapping stringified payload');
          raw = parsed as RawShape;
        } else {
          throw new Error('response did not match schema (summary looked stringified but parsed payload was not CV-shaped)');
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('response did not match schema')) {
          throw err;
        }
        // It LOOKED stringified (starts with { + has "summary":) but didn't
        // parse. That's a broken generation — retry rather than render junk.
        throw new Error('response did not match schema (summary field contains malformed JSON-like text)');
      }
    }
  }

  const hasContent =
    (raw.summary && raw.summary.trim().length > 0) ||
    (raw.experience && raw.experience.length > 0) ||
    (raw.skills?.technical && raw.skills.technical.length > 0);

  if (!hasContent) {
    throw new Error(
      'Het AI-model gaf een leeg antwoord terug. Probeer het opnieuw — dit gebeurt af en toe bij lange prompts. Je credit is niet afgeschreven.',
    );
  }

  if (!raw.headline || raw.headline.trim().length === 0) {
    if (jobVacancy?.title) {
      const topKeyword = jobVacancy.keywords?.find((k) => k && k.trim().length > 0);
      raw.headline = topKeyword ? `${jobVacancy.title} | ${topKeyword}` : jobVacancy.title;
    } else if (linkedIn.headline) {
      raw.headline = linkedIn.headline;
    } else {
      raw.headline = '';
    }
  }

  const uniqueCareerMonths = computeUniqueCareerMonths(linkedIn.experience);
  const maxWholeYears = Math.floor(uniqueCareerMonths / 12);

  if (typeof raw.headline === 'string' && raw.headline.length > 0) {
    raw.headline = stripUnsupportedYearClaims(raw.headline, maxWholeYears, true);
  }
  if (typeof raw.summary === 'string' && raw.summary.length > 0) {
    raw.summary = stripUnsupportedYearClaims(raw.summary, maxWholeYears, false);
  }

  // Interests gating: if the user opted out at the wizard, force an empty
  // array regardless of what the model returned. If opted in, intersect with
  // the profile's interests so we never surface a hallucinated hobby.
  let interests: string[] = [];
  if (includeInterests && linkedIn.interests && linkedIn.interests.length > 0) {
    const profileInterestsLower = new Set(linkedIn.interests.map((i) => i.trim().toLowerCase()).filter(Boolean));
    interests = (raw.interests ?? []).filter((i) => i && profileInterestsLower.has(i.trim().toLowerCase()));
    // If the model silently dropped them, fall back to the profile list verbatim.
    if (interests.length === 0) {
      interests = linkedIn.interests.filter((i) => i && i.trim().length > 0);
    }
  }

  const filled: GeneratedCVContent = {
    headline: raw.headline ?? '',
    summary: raw.summary ?? '',
    experience: raw.experience ?? [],
    education: raw.education ?? [],
    skills: raw.skills ?? { technical: [], soft: [] },
    languages: raw.languages ?? [],
    certifications: raw.certifications ?? [],
    projects: raw.projects ?? [],
    interests,
  } as GeneratedCVContent;

  // Deterministic claim validation — strip anything the model fabricated
  // despite the prompt's "do not fabricate" rules. The prompt is guidance;
  // this is the guarantee.
  const validation = validateCVContent(filled, linkedIn);
  if (validation.hasAnyStripped) {
    console.warn('[CV Gen] Stripped fabricated content not found in profile:', JSON.stringify(validation.log));
  }
  return validation.cleaned;
}
