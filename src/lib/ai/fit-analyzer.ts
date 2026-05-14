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
  overallScore: z.number().optional().describe('Overall fit score from 0-100. 80+ = excellent, 60-79 = good, 40-59 = moderate, 20-39 = challenging, <20 = unlikely'),
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
    requiredYears: z.number().describe('Years of experience required by the job'),
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

## CORE PRINCIPLES (READ FIRST — these override everything below)

**Principle 1 — Default to MATCHED, not missing.**
When the evidence is ambiguous, count the skill as MATCHED. A profile rarely uses the exact wording of a vacancy. Recruiters compensate for this; you must too. The cost of a false miss (a strong candidate gets a low score) is much higher than the cost of a generous match.

**Principle 2 — Terminology gaps are NOT skill gaps.**
If the candidate has the capability under a different word, the skill counts as MATCHED — full stop. Different vocabulary is a CV-writing problem, not a fit problem. Never raise a warning purely because words differ between profile and vacancy.

**Principle 3 — Trust the candidate's seniority over literal titles.**
Someone who ran a 5-person team in logistics has "people management" experience. Someone who built and shipped production systems has "software engineering" experience. Years under a title are evidence of capability, not the whole picture.

**Principle 4 — The parser may have hallucinated.**
The list of must-have skills you receive was extracted by another model and may include items that are NOT actually hard requirements in the vacancy text. Cross-check every must-have against the RAW VACANCY TEXT below. If a must-have is not LITERALLY a hard requirement in the original text (e.g. it's a "nice to have", a working-tool mention, or implied), TREAT IT AS NICE-TO-HAVE — never raise a missing-skill warning for it.

## WHAT COUNTS AS A MATCH (be generous)

A must-have skill is MATCHED when ANY of these signals is present:
- **Direct mention**: the exact term appears in skills, experience, or about
- **Synonym / functional equivalent**: same capability, different name
  (e.g. "Kubernetes" ↔ "container orchestration"; "Salesforce admin" ↔ "CRM experience")
- **Implicit evidence**: described work clearly requires this capability
  (e.g. "5 years DevOps with AWS" ↔ "cloud infrastructure experience")
- **Transferable seniority**: equivalent craft in adjacent domain
  (e.g. senior PM in fintech applying to senior PM in healthtech — the PM craft transfers; only industry-specific regulation is a learnable gap)

A skill is MISSING only when NONE of those four signals is present. If you have to squint, it's MATCHED.

## EXAMPLES OF READING GENEROUSLY BUT HONESTLY

- Candidate has "Kubernetes", vacancy asks for "container orchestration" → MATCHED
- Candidate has 5 years AWS DevOps, vacancy asks for "cloud infrastructure" → MATCHED
- Senior fintech PM → senior healthtech PM: PM seniority MATCHED; industry knowledge is INFO-level note, not a warning
- Candidate ran a logistics team of 5, vacancy asks for "people management" → MATCHED
- Candidate did "klantenservice" 4y, vacancy asks "customer success" → MATCHED on customer-facing competency (note retention/upsell as growth area if relevant)

Don't fabricate matches either. A graphic designer applying to a backend dev role with no overlap is genuinely unlikely. Honesty cuts both ways — but the typical failure mode of this analyzer is being too strict, not too generous.

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

## ANALYSIS INSTRUCTIONS

Apply the CORE PRINCIPLES above to every step. The typical failure mode of this analyzer is being too strict — over-correct toward generosity when ambiguous.

1. **Experience Analysis:**
   - Count RELEVANT experience generously. Include work under different titles when the described responsibilities clearly overlap with the target role.
   - A senior in an adjacent field is NOT a junior in the target field — judge by craft level, not title.
   - When the vacancy has no explicit years requirement, do not invent one (set requiredYears to 0).

2. **Skills Analysis — apply this workflow strictly:**

   **Step 2a (must-have validation):** For each parsed must-have, look at the RAW VACANCY TEXT. Does it appear as a literal hard requirement (signal words: "vereist", "must have", "noodzakelijk", "je hebt minimaal", "wij verwachten", or under an explicit Eisen/Wat-wij-vragen header)?
   - If NO → silently demote it to nice-to-have. Do NOT include it in skillMatch.missing even if absent from profile. The parser was wrong.
   - If YES → proceed to step 2b.

   **Step 2b (matching):** For each VERIFIED must-have, scan the candidate profile for the four signals: direct mention, synonym/equivalent, implicit evidence, or transferable seniority.
   - ANY signal present → MATCHED (add to skillMatch.matched).
   - ZERO signals present → MISSING (add to skillMatch.missing).
   - Genuinely uncertain → default to MATCHED.

   **Step 2c (bonus):** Note nice-to-have skills the candidate has (direct or equivalent) in skillMatch.bonus.

   **Step 2d (matchPercentage):** Calculate over VERIFIED must-haves only. If the parser produced 10 must-haves but only 6 survive step 2a, then percentage = matched / 6, not matched / 10.

3. **Education & Certifications:**
   - Check if education meets requirements. Years of senior experience can
     compensate for a missing degree unless the vacancy explicitly states
     otherwise.
   - Only flag missing certifications when the vacancy lists them as required,
     not merely preferred.

4. **Industry Fit:**
   - A different industry background is NEUTRAL by default — many roles
     transfer cleanly between sectors.
   - Only flag industry as a warning when the target sector requires
     domain-specific knowledge that genuinely cannot be picked up quickly
     (e.g. medical device regulation, securities law, pharma GxP, aviation
     safety standards). For most roles, industry transition is not a gap.

5. **Generate Warnings — be sparing:**
   - **CRITICAL**: Genuine dealbreakers. Concrete examples: vacancy requires an active professional license (BIG, Wft, advocaat) that the candidate clearly lacks, OR asks for 10+ years senior leadership and the candidate has under 3 years total experience.
   - **WARNING**: Significant gaps the candidate should explicitly address — typically 2+ VERIFIED must-haves with zero matching signals, AND no plausible equivalent in the profile.
   - **INFO**: Minor gaps, growth areas, industry-knowledge notes.
   - **NEVER raise a warning purely because terminology differs.** If the capability is present under a different word, it is MATCHED, not a gap. Linguistic mismatches belong in \`advice\` as a CV-rewriting suggestion, NOT in warnings.
   - **NEVER raise a warning for a must-have that failed step 2a** (parser hallucinated it).
   - It is correct and expected for the warnings array to be short or even empty for a strong candidate.

6. **Identify Strengths (be generous — surface real value):**
   - What makes this candidate stand out?
   - Which transferable skills, equivalent capabilities and senior
     responsibilities should the recruiter notice?
   - Any overqualification in certain areas?
   - For every must-have skill the candidate matches via equivalence or
     implicit evidence, that is a strength worth naming explicitly — it
     prevents the candidate from being unfairly screened out.

7. **Overall Score — apply the mandatory lift check BEFORE picking a tier:**

   **Mandatory lift check:** If the candidate shows clear transferable seniority for the target role (substantial relevant experience, matched must-haves via equivalents, no critical warnings), the score MUST land at minimum in the "good" tier (50+). Under-scoring capable candidates whose CV vocabulary differs from the vacancy is the explicit bug we are fixing.

   **Rubric (after lift check):**
   - **70-100 — Excellent fit**: strong direct match, minor gaps at most
   - **50-69 — Good fit**: solid match with some gaps; includes capable candidates whose phrasing differs from the vacancy but whose evidence clearly supports the role
   - **30-49 — Moderate fit**: real potential but significant verified gaps (2-3+ missing must-haves with no equivalent)
   - **15-29 — Challenging fit**: major verified gaps; would need a strong narrative case
   - **0-14 — Unlikely fit**: fundamental mismatch (e.g. graphic designer applying for backend developer with no programming evidence anywhere)

   A 50% must-have match WITH transferable seniority and equivalent evidence should land in 60-75, not 40-55. The rubric measures probability of being a strong hire, not literal keyword overlap.

8. **Actionable Advice:**
   - Concrete actions the candidate can take to strengthen their application.
   - **Reframing tips**: Name specific profile experiences and the vacancy term they should be reframed as. Concrete is better: "Reframe je 'klantenservice'-ervaring als 'customer success' — voeg toe wat je deed rond retentie/upsell."
   - Mention additional certifications ONLY if the vacancy actually requires them.
   - If the main gap is LINGUISTIC rather than substantive, say so explicitly — the candidate may already qualify and just needs to phrase it right.
   - Warm and constructive tone, not gatekeeping.

Be constructive AND honest. The goal is an accurate picture of the candidate's actual chances — not gatekeeping, not flattery.`;
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
