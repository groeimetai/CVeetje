import { z } from 'zod';
import { resolveTemperature } from './temperature';
import { generateObjectResilient } from './generate-resilient';
import { getCurrentDateContext } from './date-context';
import type {
  ParsedLinkedIn,
  JobVacancy,
  FitAnalysis,
  FitVerdict,
  FitWarning,
  FitStrength,
  LLMProvider,
  TokenUsage,
} from '@/types';

// Schema for AI-generated fit analysis.
// Top-level fields are OPTIONAL for robustness against Opus 4.7 structured
// output flakes ({} or {data: ...}); normalizeFitAnalysis fills defaults.
const fitAnalysisSchema = z.object({
  overallScore: z.number().optional().describe('Overall fit score from 0-100. Tiers: 70+ = excellent, 50-69 = good, 30-49 = moderate, 15-29 = challenging, <15 = unlikely. Lifted rubric: capable candidates with transferable seniority must land in good (50+) or higher.'),
  verdict: z.enum(['excellent', 'good', 'moderate', 'challenging', 'unlikely']).optional().describe('Overall verdict on the fit'),
  verdictExplanation: z.string().optional().describe('Brief explanation of the verdict (1-2 sentences)'),

  warnings: z.array(z.object({
    severity: z.enum(['info', 'warning', 'critical']).describe('info = minor gap, warning = significant gap, critical = likely dealbreaker'),
    category: z.enum(['experience', 'skills', 'education', 'industry', 'certification']),
    message: z.string().describe('Short message (max 10 words)'),
    detail: z.string().describe('Detailed explanation (1-2 sentences)'),
  })).optional().describe('List of warnings/gaps identified'),

  strengths: z.array(z.object({
    category: z.enum(['experience', 'skills', 'education', 'industry', 'certification', 'general']),
    message: z.string().describe('Short strength description (max 10 words)'),
    detail: z.string().describe('Why this is a strength (1-2 sentences)'),
  })).optional().describe('List of strengths/matches identified'),

  skillMatch: z.object({
    matched: z.array(z.string()).describe('Skills the candidate has that match job requirements — INCLUDING functional equivalents, implicit evidence, and transferable seniority'),
    missing: z.array(z.string()).describe('Only VERIFIED must-haves (passed step 2a — confirmed as hard requirements in raw vacancy text) where the profile shows zero matching signals. Empty array is fine for strong candidates. Never include parser-hallucinated must-haves.'),
    bonus: z.array(z.string()).describe('Nice-to-have skills the candidate has (direct or equivalent)'),
    matchPercentage: z.number().describe('Percentage of VERIFIED must-haves matched (0-100). Calculated over verified must-haves only, not over the raw parser output.'),
  }).optional(),

  experienceMatch: z.object({
    candidateYears: z.number().describe('Estimated years of RELEVANT experience including transferable work'),
    requiredYears: z.number().describe('Years required by the vacancy. Use 0 when the vacancy does not literally state a years requirement — never invent a number based on the job title.'),
    gap: z.number().describe('candidateYears - requiredYears'),
    levelMatch: z.boolean().describe('Does candidate experience level match required level?'),
  }).optional(),

  advice: z.string().optional().describe('Actionable advice for the candidate (2-3 sentences)'),
});

function buildFitAnalysisPrompt(linkedIn: ParsedLinkedIn, jobVacancy: JobVacancy): string {
  // Calculate total experience years from profile
  const experienceSummary = linkedIn.experience.map(exp => {
    const start = exp.startDate;
    const end = exp.endDate || 'Present';
    return `- ${exp.title} at ${exp.company} (${start} - ${end}): ${exp.description || 'No description'}`;
  }).join('\n');

  const skillsList = linkedIn.skills.map(s => s.name).join(', ');
  const certsList = linkedIn.certifications.map(c => c.name).join(', ');
  const educationSummary = linkedIn.education.map(edu =>
    `- ${edu.degree || 'Degree'} ${edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''} at ${edu.school} (${edu.endYear || 'N/A'})`
  ).join('\n');

  // Job requirements
  const mustHaveSkills = jobVacancy.mustHaveSkills?.join(', ') || 'Not specified';
  const niceToHaveSkills = jobVacancy.niceToHaveSkills?.join(', ') || 'Not specified';
  const requiredExp = jobVacancy.experienceRequired;
  const expRequirement = requiredExp
    ? `${requiredExp.minYears}${requiredExp.maxYears ? `-${requiredExp.maxYears}` : '+'} years, ${requiredExp.level} level${requiredExp.isStrict ? ' (strict requirement)' : ' (flexible)'}`
    : 'Not specified';

  return `You are an expert HR analyst and career coach. Analyze how well a candidate matches a job vacancy.

${getCurrentDateContext('nl')}

## CORE PRINCIPLES (override everything below)

**1. Default to MATCHED when ambiguous.** Profiles rarely use the exact vacancy wording. The cost of a false miss is much higher than a generous match. When evidence is ambiguous, count the skill as MATCHED.

**2. Terminology gaps are NOT skill gaps.** If the candidate has the capability under a different word, it counts as MATCHED. Never raise a warning purely because words differ — linguistic mismatches belong in \`advice\` as CV-rewriting suggestions.

**3. Trust seniority over titles.** Years under a title are evidence of capability. Team-leading in one domain is people management. Shipping production systems is software engineering.

**4. The parser may have hallucinated.** Cross-check every parsed must-have against the RAW VACANCY TEXT. If it is not literally a hard requirement there (signal words: "vereist", "must have", "noodzakelijk", "je hebt minimaal", "wij verwachten", or under an explicit "Eisen" / "Wat wij vragen" header), treat it as nice-to-have — do NOT raise a missing-skill warning for it.

**5. Never invent years requirements.** If the vacancy does not literally state years of experience, set \`requiredYears\` to 0. Do not infer years from "Senior" / "Lead" in the title or from seniority language.

## WHAT COUNTS AS A MATCH

A must-have is MATCHED when ANY signal is present:
- **Direct mention** — the term appears in skills, experience, or about.
- **Synonym / functional equivalent** — same capability, different name.
- **Implicit evidence** — described work clearly requires this capability.
- **Transferable seniority** — equivalent craft in an adjacent domain.

MISSING only when NONE of those signals is present. If you have to squint, it's MATCHED. Don't fabricate matches either — honesty cuts both ways. The typical failure mode is being too strict, not too generous.

## CANDIDATE PROFILE

**Name:** ${linkedIn.fullName}
**Current/Last Title:** ${linkedIn.headline || 'Not specified'}
**Location:** ${linkedIn.location || 'Not specified'}

**About/Summary:**
${linkedIn.about || 'No summary provided'}

**Work Experience:**
${experienceSummary || 'No experience listed'}

**Education:**
${educationSummary || 'No education listed'}

**Skills:**
${skillsList || 'No skills listed'}

**Certifications:**
${certsList || 'No certifications listed'}

**Languages:**
${linkedIn.languages.map(l => `${l.language} (${l.proficiency || 'N/A'})`).join(', ') || 'Not specified'}

**Projects:**
${linkedIn.projects && linkedIn.projects.length > 0 ? linkedIn.projects.map(p => `- ${p.title}${p.technologies.length > 0 ? ` [${p.technologies.join(', ')}]` : ''}`).join('\n') : 'No projects listed'}

---

## JOB VACANCY (parser output)

**Title:** ${jobVacancy.title}
**Company:** ${jobVacancy.company || 'Not specified'}
**Industry:** ${jobVacancy.industry || 'Not specified'}
**Location:** ${jobVacancy.location || 'Not specified'}

**Description:**
${jobVacancy.description}

**Key Requirements (parsed):**
${jobVacancy.requirements.map(r => `- ${r}`).join('\n')}

**Experience Required:** ${expRequirement}

**Must-Have Skills (parsed — VERIFY against raw text below):** ${mustHaveSkills}
**Nice-to-Have Skills (parsed):** ${niceToHaveSkills}

**Required Education (parsed):** ${jobVacancy.requiredEducation || 'Not specified'}
**Required Certifications (parsed):** ${jobVacancy.requiredCertifications?.join(', ') || 'None specified'}

## RAW VACANCY TEXT (source of truth)

This is the original vacancy text. Use it to verify whether the parsed must-haves above are actually hard requirements or just mentioned in passing. If a must-have skill above does NOT appear as a literal hard requirement in this raw text (signal words: "vereist", "must have", "noodzakelijk", "je hebt minimaal", "wij verwachten", or listed under an explicit "Eisen"/"Wat wij vragen" header), treat it as nice-to-have and do NOT raise a missing-skill warning for it.

\`\`\`
${jobVacancy.rawText || '(raw text not available — rely on parsed fields only)'}
\`\`\`

---

## ANALYSIS WORKFLOW

Apply the CORE PRINCIPLES at every step. Default to generosity when ambiguous.

1. **Experience.** Count relevant experience generously, including work under different titles when responsibilities overlap. Senior in an adjacent field ≠ junior in the target field. If the vacancy states no years requirement → \`requiredYears = 0\`.

2. **Skills workflow:**
   - **2a — Verify must-haves against RAW VACANCY TEXT.** If a parsed must-have is not a literal hard requirement there, silently demote to nice-to-have. Do NOT include it in \`skillMatch.missing\`.
   - **2b — Match each verified must-have** against the four signals. Any signal → MATCHED. Zero signals → MISSING. Uncertain → default MATCHED.
   - **2c — Bonus:** nice-to-haves the candidate has (direct or equivalent) → \`skillMatch.bonus\`.
   - **2d — matchPercentage:** calculated over VERIFIED must-haves only, not raw parser output.

3. **Education & Certifications.** Senior experience can compensate for a missing degree unless the vacancy explicitly says otherwise. Only flag missing certifications when literally required (not preferred).

4. **Industry.** Different industry is NEUTRAL by default. Only flag as a warning when the target sector requires deep domain knowledge that cannot be picked up quickly.

5. **Warnings — be sparing.**
   - **CRITICAL**: genuine dealbreakers (missing legally required license, fundamental experience-level mismatch).
   - **WARNING**: 2+ verified must-haves with zero matching signals and no plausible equivalent.
   - **INFO**: minor gaps, growth areas, industry-knowledge notes.
   - **Never** raise a warning for terminology differences (→ \`advice\` instead) or for must-haves that failed step 2a.
   - Empty warnings is correct and expected for strong candidates.

6. **Strengths — be generous.** Name transferable skills, equivalent capabilities and senior responsibilities explicitly. Every must-have matched via equivalence is a strength worth naming — it prevents the candidate from being unfairly screened out.

7. **Overall Score.**
   - **Mandatory lift check:** capable candidates with transferable seniority, matched must-haves via equivalents, and no critical warnings MUST land at minimum in the "good" tier (50+). Under-scoring capable candidates whose vocabulary differs from the vacancy is the bug we are fixing.
   - Use the tier ranges defined in the \`overallScore\` schema description. The rubric measures probability of being a strong hire, not literal keyword overlap.

8. **Advice.** Concrete actions. Name specific profile experiences and the vacancy term they should be reframed as. If the main gap is LINGUISTIC, say so explicitly. Mention extra certifications ONLY if the vacancy actually requires them. Warm, constructive tone — not gatekeeping.

Be constructive AND honest. Goal: accurate picture of actual chances — not gatekeeping, not flattery.`;
}

export interface AnalyzeFitResult {
  analysis: FitAnalysis;
  usage: TokenUsage;
}

export async function analyzeFit(
  linkedIn: ParsedLinkedIn,
  jobVacancy: JobVacancy,
  provider: LLMProvider,
  apiKey: string,
  model: string
): Promise<AnalyzeFitResult> {
  const prompt = buildFitAnalysisPrompt(linkedIn, jobVacancy);

  try {
    const { value, usage } = await generateObjectResilient({
      provider,
      apiKey,
      model,
      schema: fitAnalysisSchema,
      prompt,
      temperature: resolveTemperature(provider, model, 0.2),
      normalize: normalizeFitAnalysis,
      logTag: 'Fit Analyzer',
    });

    return { analysis: value, usage };
  } catch (error) {
    console.error('[Fit Analyzer] Failed after all attempts:', error);
    throw error;
  }
}

// Normalize what the LLM returned into a fully-populated FitAnalysis.
// Same failure modes as cv-generator / job-parser — {} or {data: ...}.
function normalizeFitAnalysis(rawInput: unknown): FitAnalysis {
  type RawShape = Partial<FitAnalysis> & { data?: Partial<FitAnalysis> };
  let raw = (rawInput ?? {}) as RawShape;

  if (
    raw.data &&
    typeof raw.data === 'object' &&
    raw.overallScore === undefined &&
    !raw.verdict &&
    !raw.skillMatch
  ) {
    raw = raw.data as RawShape;
  }

  const hasContent =
    typeof raw.overallScore === 'number' ||
    !!raw.verdict ||
    !!raw.skillMatch ||
    !!raw.experienceMatch;

  if (!hasContent) {
    throw new Error(
      'Het AI-model gaf een leeg antwoord terug bij de fit-analyse. Probeer het opnieuw — dit gebeurt af en toe bij lange prompts. Je credit is niet afgeschreven.',
    );
  }

  return {
    overallScore: typeof raw.overallScore === 'number' ? raw.overallScore : 50,
    verdict: (raw.verdict as FitVerdict) ?? 'moderate',
    verdictExplanation: raw.verdictExplanation ?? '',
    warnings: (raw.warnings ?? []) as FitWarning[],
    strengths: (raw.strengths ?? []) as FitStrength[],
    skillMatch: raw.skillMatch ?? {
      matched: [],
      missing: [],
      bonus: [],
      matchPercentage: 0,
    },
    experienceMatch: raw.experienceMatch ?? {
      candidateYears: 0,
      requiredYears: 0,
      gap: 0,
      levelMatch: false,
    },
    advice: raw.advice ?? '',
  };
}

// Helper function to get verdict color (for UI)
export function getVerdictColor(verdict: FitVerdict): string {
  switch (verdict) {
    case 'excellent':
      return 'green';
    case 'good':
      return 'blue';
    case 'moderate':
      return 'yellow';
    case 'challenging':
      return 'orange';
    case 'unlikely':
      return 'red';
    default:
      return 'gray';
  }
}

// Helper function to get severity color (for UI)
export function getSeverityColor(severity: 'info' | 'warning' | 'critical'): string {
  switch (severity) {
    case 'info':
      return 'blue';
    case 'warning':
      return 'yellow';
    case 'critical':
      return 'red';
    default:
      return 'gray';
  }
}
