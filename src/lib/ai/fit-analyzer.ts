import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
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
    matched: z.array(z.string()).describe('Skills candidate has that match job requirements'),
    missing: z.array(z.string()).describe('Required skills candidate appears to lack'),
    bonus: z.array(z.string()).describe('Nice-to-have skills candidate has'),
    matchPercentage: z.number().describe('Percentage of must-have skills matched (0-100)'),
  }),

  experienceMatch: z.object({
    candidateYears: z.number().describe('Estimated total years of relevant experience'),
    requiredYears: z.number().describe('Years of experience required by the job'),
    gap: z.number().describe('Difference: candidateYears - requiredYears (negative = shortfall)'),
    levelMatch: z.boolean().describe('Does candidate experience level match the required level?'),
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
Be HONEST and REALISTIC - don't sugarcoat significant gaps, but also recognize genuine strengths.

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

Perform a thorough fit analysis:

1. **Experience Analysis:**
   - Count the candidate's years of RELEVANT experience (not total career length)
   - Compare to the job requirements
   - Consider if their experience level matches (junior/medior/senior/lead)

2. **Skills Analysis:**
   - Match candidate skills against must-have skills (be case-insensitive, consider synonyms)
   - Identify any critical missing skills
   - Note bonus/nice-to-have skills the candidate has

3. **Education & Certifications:**
   - Check if education meets requirements
   - Note any missing required certifications

4. **Industry Fit:**
   - Consider if the candidate has relevant industry experience
   - Note if they're transitioning from a different industry

5. **Generate Warnings:**
   - CRITICAL: Gaps that are likely dealbreakers (e.g., job requires 10 years, candidate has 2)
   - WARNING: Significant gaps that may need addressing (e.g., missing 2-3 key skills)
   - INFO: Minor gaps or areas for growth (e.g., different industry background)

6. **Identify Strengths:**
   - What makes this candidate stand out?
   - What transferable skills do they have?
   - Any overqualification in certain areas?

7. **Overall Score:**
   - 80-100: Excellent fit - strong match, minor gaps at most
   - 60-79: Good fit - solid match with some gaps
   - 40-59: Moderate fit - has potential but significant gaps
   - 20-39: Challenging fit - major gaps, would need strong case
   - 0-19: Unlikely fit - fundamental mismatches

8. **Actionable Advice:**
   - What could the candidate do to strengthen their application?
   - Are there skills they should highlight differently?
   - Should they consider additional certifications?

Be constructive but honest. The goal is to help the candidate understand their realistic chances and what they can do to improve them.`;
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

  const { object, usage } = await generateObject({
    model: aiProvider(modelId),
    schema: fitAnalysisSchema,
    prompt,
  });

  return {
    analysis: object as FitAnalysis,
    usage: {
      promptTokens: usage?.inputTokens ?? 0,
      completionTokens: usage?.outputTokens ?? 0,
    },
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
