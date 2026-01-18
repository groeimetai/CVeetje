import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import type {
  ParsedLinkedIn,
  JobVacancy,
  GeneratedCVContent,
  LLMProvider,
  CVStyleConfig,
  TokenUsage,
} from '@/types';

// Schema for structured CV output
// Helper function to get industry-specific content guidance
function getIndustryGuidance(industry: string | undefined): string {
  if (!industry) return '';

  const industryLower = industry.toLowerCase();

  if (industryLower.includes('tech') || industryLower.includes('software') || industryLower.includes('it')) {
    return `
**Industry Focus (Technology):**
- Emphasize technical skills, programming languages, frameworks, and tools
- Highlight innovation, problem-solving, and measurable technical impact
- Include specific technologies and methodologies used
- Quantify performance improvements, scale, or efficiency gains`;
  }

  if (industryLower.includes('finance') || industryLower.includes('bank') || industryLower.includes('accounting')) {
    return `
**Industry Focus (Finance/Banking):**
- Emphasize compliance, accuracy, and attention to detail
- Highlight risk management and regulatory knowledge
- Focus on financial metrics and business impact
- Include relevant certifications and regulatory experience`;
  }

  if (industryLower.includes('health') || industryLower.includes('medical') || industryLower.includes('pharma')) {
    return `
**Industry Focus (Healthcare/Medical):**
- Emphasize patient care, safety protocols, and quality standards
- Highlight certifications, licenses, and compliance experience
- Focus on healthcare-specific methodologies and systems
- Include regulatory knowledge (HIPAA, FDA, etc.)`;
  }

  if (industryLower.includes('consult')) {
    return `
**Industry Focus (Consulting):**
- Emphasize problem-solving, client management, and project delivery
- Highlight methodologies, frameworks, and strategic thinking
- Focus on business impact and client outcomes
- Include stakeholder management and presentation skills`;
  }

  if (industryLower.includes('marketing') || industryLower.includes('creative') || industryLower.includes('design')) {
    return `
**Industry Focus (Marketing/Creative):**
- Emphasize campaign results, creative achievements, and brand impact
- Highlight metrics like engagement, conversion, and ROI
- Focus on tools, platforms, and creative processes
- Include portfolio-worthy projects and awards`;
  }

  if (industryLower.includes('retail') || industryLower.includes('sales')) {
    return `
**Industry Focus (Retail/Sales):**
- Emphasize revenue generation, customer relationships, and targets achieved
- Highlight sales metrics, conversion rates, and customer satisfaction
- Focus on negotiation, relationship building, and market knowledge
- Include CRM experience and customer success stories`;
  }

  return `
**Industry Focus (${industry}):**
- Tailor language and terminology to this specific industry
- Highlight relevant experience and transferable skills
- Focus on achievements that resonate with this sector`;
}

const cvContentSchema = z.object({
  summary: z.string().describe('A professional summary tailored to the target job, 2-3 sentences'),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      location: z.string().nullable(),
      period: z.string().describe('Format: "Month Year - Month Year" or "Month Year - Present"'),
      highlights: z.array(z.string()).describe('3-5 bullet points, tailored to the job requirements'),
    })
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string(),
      details: z.string().nullable().describe('Optional: relevant coursework, honors, GPA'),
    })
  ),
  skills: z.object({
    technical: z.array(z.string()).describe('Technical/hard skills relevant to the job'),
    soft: z.array(z.string()).describe('Soft skills relevant to the job'),
  }),
  languages: z.array(
    z.object({
      language: z.string(),
      level: z.string().describe('Proficiency level: Native, Fluent, Professional, Conversational, Basic'),
    })
  ),
  certifications: z.array(z.string()).describe('Relevant certifications'),
});

function buildPrompt(linkedIn: ParsedLinkedIn, jobVacancy: JobVacancy | null, styleConfig?: CVStyleConfig): string {
  // Layout-aware instructions (single-column only now for reliable PDF)
  const isCompact = styleConfig?.layout.spacing === 'compact';
  const bulletCount = isCompact ? '2-3' : '3-5';
  const bulletLength = isCompact ? 'Keep bullet points concise (max 15 words each)' : 'Bullet points can be detailed (max 25 words each)';

  let prompt = `You are an expert CV writer. Create a professional, tailored CV based on the following LinkedIn profile data.

## LinkedIn Profile Data:

**Name:** ${linkedIn.fullName}
${linkedIn.headline ? `**Current Title:** ${linkedIn.headline}` : ''}
${linkedIn.location ? `**Location:** ${linkedIn.location}` : ''}
${linkedIn.about ? `**About:** ${linkedIn.about}` : ''}

### Experience:
${linkedIn.experience
  .map(
    (exp) => `
- **${exp.title}** at ${exp.company}
  ${exp.location ? `Location: ${exp.location}` : ''}
  ${exp.startDate} - ${exp.endDate || 'Present'}
  ${exp.description || ''}
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
${linkedIn.certifications.map((c) => `${c.name}${c.issuer ? ` - ${c.issuer}` : ''}`).join(', ')}
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

    // Build industry guidance
    const industryGuidance = getIndustryGuidance(jobVacancy.industry);

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
${keywordsSection}
${industryGuidance}

## Strategic Matching Instructions:

**Step 1 - Analyze Requirements:**
For each job requirement listed above, identify which of the candidate's experiences best demonstrates that skill or capability.

**Step 2 - Professional Summary Strategy:**
Write a summary that:
- Opens with positioning for "${jobVacancy.title}" role
${topKeywords ? `- Naturally includes keywords like: ${topKeywords}` : ''}
- References 1-2 key requirements the candidate clearly meets
- Closes with value proposition relevant to ${jobVacancy.company || 'this opportunity'}

**Step 3 - Experience Tailoring:**
- PRIORITIZE experience bullets that directly address the key requirements
- REWRITE highlights using terminology FROM the job posting
- QUANTIFY achievements where possible (%, numbers, scale, impact)
- For each role, lead with the most job-relevant accomplishments
- Keep less relevant experience but make bullets shorter

**Step 4 - Skills Optimization:**
- Order technical skills by relevance to this specific job
- Include job keywords in skills where the candidate has matching experience
- Match skill names exactly as they appear in the job posting when applicable

## ATS Optimization:
- Mirror the job posting's exact terminology where it fits naturally
- Avoid generic phrases; be specific with tools, technologies, methodologies
- Include industry-standard terms for this ${jobVacancy.industry || 'field'}
`;
  } else {
    prompt += `

## Instructions:
1. Create a general professional CV highlighting the candidate's strengths
2. Write compelling experience highlights that demonstrate achievements
3. Create a strong professional summary
4. Order skills by importance/expertise level
`;
  }

  prompt += `

## CV Writing Best Practices - MUST FOLLOW:

### Professional Summary Rules:
- Start with a strong positioning statement: "Results-driven [title]" or "Experienced [role] with [X years]"
- Include 2-3 key competencies that directly match the job requirements
- End with a clear value proposition (what you bring to the employer)
- Maximum 3 sentences - be impactful, not lengthy
- AVOID vague phrases like "passionate professional" or "seeking opportunities"

### Experience Bullets - STAR Format (Situation, Task, Action, Result):
Every bullet point MUST include:
1. **Action verb** to start (Led, Developed, Increased, Reduced, Implemented, etc.)
2. **Specific action** describing what you did
3. **Measurable result** with numbers (%, €, time saved, scale, team size)

**EXCELLENT bullet point examples (USE AS MODELS):**
✅ "Reduced page load time by 40% through implementing lazy loading and image optimization, improving user retention by 15%"
✅ "Led cross-functional team of 8 engineers to deliver €2M e-commerce platform 2 weeks ahead of schedule"
✅ "Increased customer retention by 25% by redesigning onboarding flow based on user research insights"
✅ "Automated manual reporting process, saving 20 hours/week and reducing errors by 90%"
✅ "Managed portfolio of 15 enterprise clients generating €3.5M annual recurring revenue"
✅ "Implemented CI/CD pipeline reducing deployment time from 4 hours to 15 minutes"

**POOR bullet points (NEVER USE THESE PATTERNS):**
❌ "Responsible for managing projects" (passive, no result)
❌ "Worked on various tasks" (vague, meaningless)
❌ "Team player with good communication skills" (cliché, not an achievement)
❌ "Helped with customer support" (weak verb, no impact)
❌ "Participated in meetings" (not an achievement)
❌ "Successfully completed all assigned tasks" (generic, "successfully" is redundant)

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

### Quantification Guidelines:
When exact numbers aren't available, use reasonable estimates with context:
- Revenue/Sales: "€X in revenue" or "X% increase in sales"
- Time: "X hours/week saved" or "reduced processing time by X%"
- Scale: "team of X" or "X customers" or "X projects"
- Efficiency: "X% improvement" or "X% reduction in errors"
- If you can't quantify, at least show scope: "enterprise-level", "company-wide", "cross-functional"

## Output Requirements:
- Professional, concise language
- Active voice and action verbs (NEVER passive voice)
- EVERY experience bullet MUST have a measurable result or clear impact
- Keep summary to 2-3 sentences maximum
- ${bulletCount} bullet points per experience entry
- ${bulletLength}
- Focus on achievements and RESULTS, not just responsibilities
- Mirror exact terminology from the job posting where it fits naturally`;

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
  styleConfig?: CVStyleConfig
): Promise<GenerateCVResult> {
  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);

  const prompt = buildPrompt(linkedIn, jobVacancy, styleConfig);

  const { object, usage } = await generateObject({
    model: aiProvider(modelId),
    schema: cvContentSchema,
    prompt,
  });

  return {
    content: object as GeneratedCVContent,
    usage: {
      promptTokens: usage?.inputTokens ?? 0,
      completionTokens: usage?.outputTokens ?? 0,
    },
  };
}
