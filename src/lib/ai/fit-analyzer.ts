import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import { withRetry } from './retry';
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

// Schema for AI-generated fit analysis
// Note: Anthropic doesn't support min/max on numbers, so constraints are in descriptions
const fitAnalysisSchema = z.object({
  overallScore: z.number().describe('Overall fit score from 0-100. Must be between 0 and 100. 80+ = excellent, 60-79 = good, 40-59 = moderate, 20-39 = challenging, <20 = unlikely'),
  verdict: z.enum(['excellent', 'good', 'moderate', 'challenging', 'unlikely']).describe('Overall verdict on the fit'),
  verdictExplanation: z.string().describe('Brief explanation of the verdict (1-2 sentences)'),

  warnings: z.array(z.object({
    severity: z.enum(['info', 'warning', 'critical']).describe('info = minor gap, warning = significant gap, critical = likely dealbreaker'),
    category: z.enum(['experience', 'skills', 'education', 'industry', 'certification']),
    message: z.string().describe('Short message (max 10 words)'),
    detail: z.string().describe('Detailed explanation (1-2 sentences)'),
  })).describe('List of warnings/gaps identified'),

  strengths: z.array(z.object({
    category: z.enum(['experience', 'skills', 'education', 'industry', 'certification', 'general']),
    message: z.string().describe('Short strength description (max 10 words)'),
    detail: z.string().describe('Why this is a strength (1-2 sentences)'),
  })).describe('List of strengths/matches identified'),

  skillMatch: z.object({
    matched: z.array(z.string()).describe('Skills the candidate has that match job requirements — INCLUDING functional equivalents (e.g. list "container orchestration" as matched if the candidate has Kubernetes experience, even if the word "Kubernetes" is what appears in their profile)'),
    missing: z.array(z.string()).describe('Skills the job requires for which the candidate has neither direct nor functional-equivalent experience nor any reasonable claim via transferable background. Be strict here: a skill only counts as "missing" if there is genuinely nothing in the profile that demonstrates it, not merely if the exact word does not appear.'),
    bonus: z.array(z.string()).describe('Nice-to-have skills the candidate has (direct or equivalent)'),
    matchPercentage: z.number().describe('Percentage of must-have skills matched, counting functional equivalents and transferable experience as matches (0-100)'),
  }),

  experienceMatch: z.object({
    candidateYears: z.number().describe('Estimated years of RELEVANT experience — including transferable experience from adjacent roles, not only experience with the literal job title'),
    requiredYears: z.number().describe('Years of experience required by the job'),
    gap: z.number().describe('Difference: candidateYears - requiredYears. Compute candidateYears generously (transferable counts), so a senior professional switching domains should not show a deep negative gap purely because their previous title was different.'),
    levelMatch: z.boolean().describe('Does candidate experience level (junior/medior/senior/lead) match the required level? Judge by seniority of responsibilities, not by the literal job title.'),
  }),

  advice: z.string().describe('Actionable advice for the candidate (2-3 sentences). Be constructive and specific.'),
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

## SCORING PHILOSOPHY (READ FIRST)

Be honest about real, hard gaps — but give the candidate FULL credit for:
- **Functional equivalents**: skills that are the same capability under a different name
- **Implicit skills**: capabilities that are obviously implied by described work, even if not listed
- **Transferable experience**: senior responsibilities and domain expertise that carry across sectors
- **Adjacent-domain seniority**: a senior in a related field is not a junior in the target field

The most common analyst error is mechanical literal matching: declaring a skill
"missing" because the exact word isn't in the profile, or counting only years
spent under the literal job title. DO NOT do that. Read between the lines.

Examples of how to read generously but honestly:
- Candidate has "Kubernetes" in skills, vacancy asks for "container orchestration"
  → MATCHED (functional equivalent, same capability, different word)
- Candidate worked 5 years as DevOps engineer with AWS, vacancy asks for "cloud
  infrastructure experience" → MATCHED (implicit, this is literally the job)
- Candidate has 8 years as senior product manager in fintech, vacancy is senior
  PM in healthtech → NOT a junior, NOT missing PM experience. Industry domain
  may be a learnable gap (info-level), but seniority and craft transfer fully.
- Candidate ran a 5-person team at a logistics company, vacancy asks for "people
  management" → MATCHED.
- Candidate has Salesforce admin experience, vacancy asks for "CRM experience"
  → MATCHED.
- Candidate did "klantenservice" for 4 years, vacancy asks for "customer
  success" → MATCHED at minimum on the customer-facing competency; whether it
  rises to full "customer success" depends on whether retention/upsell tasks
  are described.

A skill is only TRULY "missing" when there is genuinely no direct, equivalent,
or transferable evidence in the profile. Don't equate "different word" with
"missing skill". That is the bug we are explicitly avoiding.

Equally, don't fabricate matches. If the candidate is a graphic designer
applying for a backend developer role, no amount of generous reading turns
that into a match. Honesty cuts both ways.

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

## JOB VACANCY

**Title:** ${jobVacancy.title}
**Company:** ${jobVacancy.company || 'Not specified'}
**Industry:** ${jobVacancy.industry || 'Not specified'}
**Location:** ${jobVacancy.location || 'Not specified'}

**Description:**
${jobVacancy.description}

**Key Requirements:**
${jobVacancy.requirements.map(r => `- ${r}`).join('\n')}

**Experience Required:** ${expRequirement}

**Must-Have Skills:** ${mustHaveSkills}
**Nice-to-Have Skills:** ${niceToHaveSkills}

**Required Education:** ${jobVacancy.requiredEducation || 'Not specified'}
**Required Certifications:** ${jobVacancy.requiredCertifications?.join(', ') || 'None specified'}

---

## ANALYSIS INSTRUCTIONS

Perform a thorough fit analysis. Apply the SCORING PHILOSOPHY above
throughout — every step below should treat functional equivalents and
transferable experience as real matches.

1. **Experience Analysis:**
   - Count the candidate's years of RELEVANT experience generously: include
     experience under different titles when the described work clearly
     overlaps with the target role's responsibilities.
   - Compare to the job requirements. A senior in an adjacent field is not
     a junior in the target field — judge by craft level, not title.
   - When the vacancy has no explicit years requirement, do not invent one.

2. **Skills Analysis:**
   - For each must-have skill in the vacancy, scan the profile for: direct
     mentions, synonyms, functional equivalents, AND implicit evidence from
     described responsibilities.
   - A skill counts as MATCHED when any of those four signals is present.
   - A skill counts as MISSING ONLY when none of those four signals is
     present. "The exact word doesn't appear" is NOT a missing-skill signal.
   - Note bonus/nice-to-have skills the candidate has, including equivalents.

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

5. **Generate Warnings (be sparing — only real gaps):**
   - CRITICAL: Genuine dealbreakers — e.g. vacancy requires an active
     professional license the candidate clearly lacks, or asks for 10 years
     of senior leadership and the candidate has 2 years total experience.
   - WARNING: Significant gaps that the candidate should address in their
     application (e.g. 2-3 key must-have skills with no equivalent evidence).
   - INFO: Minor gaps or areas for growth.
   - Do NOT raise a warning purely because terminology differs between
     profile and vacancy. That is a CV-writing problem, not a fit problem.

6. **Identify Strengths (be generous — surface real value):**
   - What makes this candidate stand out?
   - Which transferable skills, equivalent capabilities and senior
     responsibilities should the recruiter notice?
   - Any overqualification in certain areas?
   - For every must-have skill the candidate matches via equivalence or
     implicit evidence, that is a strength worth naming explicitly — it
     prevents the candidate from being unfairly screened out.

7. **Overall Score:**
   Apply this rubric, AND apply this lift rule: if the candidate has clear
   transferable experience and demonstrable seniority for the target role,
   you may lift the score by one tier (e.g. moderate → good) — under-scoring
   capable career-switchers is the failure mode we are explicitly avoiding.
   - 80-100: Excellent fit — strong match, minor gaps at most
   - 60-79: Good fit — solid match with some gaps; includes capable
     candidates whose phrasing differs from the vacancy but whose evidence
     clearly supports the role
   - 40-59: Moderate fit — has potential but significant real gaps
   - 20-39: Challenging fit — major real gaps, would need strong case
   - 0-19: Unlikely fit — fundamental mismatch (e.g. graphic designer applying
     for backend developer with no overlap)

8. **Actionable Advice:**
   - What could the candidate do to strengthen their application?
   - Which existing experiences should they reframe in the vacancy's
     vocabulary? (Be concrete: name the experience and the term.)
   - Should they consider additional certifications?
   - If the main gap is linguistic rather than substantive, say so — the
     candidate may already qualify and just needs to phrase it right.

Be constructive AND honest. Both directions matter: don't sugarcoat real
mismatches, don't penalize real qualifications just because the words don't
align. The goal is an accurate picture of the candidate's actual chances.`;
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
  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);

  const prompt = buildFitAnalysisPrompt(linkedIn, jobVacancy);

  try {
    const { object, usage } = await withRetry(() =>
      generateObject({
        model: aiProvider(modelId),
        schema: fitAnalysisSchema,
        prompt,
        temperature: 0.3,
      })
    );

    return {
      analysis: object as FitAnalysis,
      usage: {
        promptTokens: usage?.inputTokens ?? 0,
        completionTokens: usage?.outputTokens ?? 0,
      },
    };
  } catch (error) {
    console.error('[Fit Analyzer] Failed after retries:', error);
    throw error;
  }
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
