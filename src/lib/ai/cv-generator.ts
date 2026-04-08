import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import { withRetry } from './retry';
import { honestyRules } from './prompts/honesty-rules';
import { languageInstructions } from './prompts/language-instructions';
import { getIndustryGuidance } from './prompts/industry-guidance';
import type {
  ParsedLinkedIn,
  JobVacancy,
  GeneratedCVContent,
  LLMProvider,
  CVStyleConfig,
  TokenUsage,
  OutputLanguage,
} from '@/types';
import type { ExperienceDescriptionFormat } from '@/types/design-tokens';

// Schema for structured CV output
const cvContentSchema = z.object({
  headline: z.string().describe('A professional headline/title that positions the candidate for the TARGET JOB. This appears under the name. Examples: "Senior Software Engineer | Cloud & DevOps Specialist" or "Marketing Manager | Digital Strategy & Brand Development". Should bridge the candidates background WITH the target role - not just copy their current title!'),
  summary: z.string().describe('A professional summary tailored to the target job, 2-3 sentences'),
  experience: z.array(
    z.object({
      title: z.string().describe('Job title - MUST be adapted to align with target job. If target is "ServiceNow Developer" and original was "IT Consultant", use "ServiceNow Consultant" or "Technical Consultant (ServiceNow)". Always reframe titles to show relevance while staying truthful.'),
      company: z.string(),
      location: z.string().nullable(),
      period: z.string().describe('Format: "Month Year - Month Year" or "Month Year - Present"'),
      highlights: z.array(z.string()).describe('2-5 bullet points. More bullets (4-5) for highly relevant roles, fewer (2-3) for less relevant ones. Used when format is bullets.'),
      description: z.string().optional().describe('2-3 sentences of flowing prose describing the role. Used when format is paragraph instead of bullets.'),
      relevanceScore: z.number().describe('How relevant is this role to the target job? Use scale 1-5 where 5=highly relevant, 1=minimally relevant'),
    })
  ).describe('Experiences ORDERED BY RELEVANCE to target job (most relevant first), not just chronologically'),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string(),
      details: z.string().nullable().describe('Optional: relevant coursework, honors, GPA'),
    })
  ),
  skills: z.object({
    technical: z.array(z.string()).describe('Technical/hard skills relevant to the job, ordered by relevance'),
    soft: z.array(z.string()).describe('Soft skills relevant to the job'),
  }),
  languages: z.array(
    z.object({
      language: z.string(),
      level: z.string().describe('Proficiency level: Native, Fluent, Professional, Conversational, Basic'),
    })
  ),
  certifications: z.array(z.string()).describe('Relevant certifications'),
  projects: z.array(
    z.object({
      title: z.string().describe('Project name, refined for relevance to target job'),
      description: z.string().describe('Tailored project description highlighting relevance to target job'),
      technologies: z.array(z.string()).describe('Technologies/tools used, ordered by relevance to target job'),
      url: z.string().nullable().describe('Link to project/repo if available from profile data'),
      period: z.string().describe('Date range or "Ongoing"'),
      highlights: z.array(z.string()).describe('1-3 key achievements or results from the project'),
    })
  ).describe('Projects ordered by relevance to target job. Include personal projects, open source, academic work.'),
});

function buildPrompt(
  linkedIn: ParsedLinkedIn,
  jobVacancy: JobVacancy | null,
  styleConfig?: CVStyleConfig,
  language: OutputLanguage = 'nl',
  descriptionFormat: ExperienceDescriptionFormat = 'bullets'
): string {
  // Layout-aware instructions (single-column only now for reliable PDF)
  const isCompact = styleConfig?.layout.spacing === 'compact';
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

  let prompt = `${langInstructions.intro}

${honestyRules}

## CRITICAL: Output Language
${langInstructions.outputNote}

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

### Projects:
${linkedIn.projects && linkedIn.projects.length > 0
  ? linkedIn.projects.map((p) => `- **${p.title}**${p.description ? `: ${p.description}` : ''}${p.technologies.length > 0 ? ` [${p.technologies.join(', ')}]` : ''}${p.url ? ` (${p.url})` : ''}`).join('\n')
  : 'No projects listed'}
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

**Step 2 - CRITICAL: Experience Relevance Assessment:**
Before writing, score EACH experience 1-5 on relevance to "${jobVacancy.title}":
- **5 (Highly Relevant):** Direct match - same role/field, directly applicable skills
- **4 (Very Relevant):** Strong overlap - related role, most skills transfer
- **3 (Moderately Relevant):** Some overlap - transferable skills apply
- **2 (Slightly Relevant):** Limited overlap - only soft skills or general experience applies
- **1 (Minimally Relevant):** Little connection - include briefly or consider omitting

**OUTPUT experiences ORDERED BY RELEVANCE (highest first), NOT chronologically!**

**Step 3 - Job Title Adaptation (HONESTY FIRST!):**
You may adapt job titles ONLY to highlight aspects that are TRUE about their actual work:
- ✅ "Software Engineer" → "Software Engineer (Backend Focus)" - ONLY if job description shows they did backend work
- ✅ "Project Lead" → "Project Lead / Product Owner" - ONLY if they actually did product ownership tasks
- ✅ "IT Consultant" → "ServiceNow Consultant" - ONLY if they specifically worked with ServiceNow
- ❌ NEVER add specializations they didn't actually do
- ❌ NEVER upgrade job levels (Developer → Senior Developer) unless explicitly stated
- ❌ NEVER add technologies to titles they didn't work with
- When in doubt, keep the ORIGINAL title - misleading titles are worse than generic ones

**Step 4 - Professional Headline (CRITICAL!):**
Create a headline that BRIDGES the candidate's experience WITH the target role:
- Target role: "${jobVacancy.title}"
- DO NOT just copy the candidate's current LinkedIn headline!
- The headline should position them AS a potential "${jobVacancy.title}"
- Format: "[Role/Expertise] | [Specialization relevant to job]"
- Examples of GOOD headlines for this job:
  - If applying for "Backend Developer": "Software Engineer | Backend Development & API Architecture"
  - If applying for "Product Manager": "Product Lead | Tech Product Strategy & Agile Delivery"
  - If applying for "Data Analyst": "Analytics Professional | Data-Driven Business Intelligence"
- The headline should feel natural, not forced - bridge their real experience to the target

**Step 5 - Professional Summary Strategy:**
Write a summary that:
- Opens with positioning for "${jobVacancy.title}" role
${topKeywords ? `- Naturally includes keywords like: ${topKeywords}` : ''}
- References 1-2 key requirements the candidate clearly meets
- Closes with value proposition relevant to ${jobVacancy.company || 'this opportunity'}

**Step 6 - Experience Tailoring by Relevance:**
- **Score 5-4 roles:** 4-5 detailed bullet points, lead with job-relevant achievements
- **Score 3 roles:** 3 bullet points, focus on transferable skills
- **Score 2-1 roles:** 2 brief bullet points OR omit if CV is already long enough

For ALL roles:
- REWRITE highlights using terminology FROM the job posting
- QUANTIFY achievements where possible (%, numbers, scale, impact)
- Lead with the most job-relevant accomplishments

**Step 7 - Skills Optimization:**
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
1. Create a professional headline that captures the candidate's expertise and value
   - Format: "[Primary Role] | [Key Specialization]"
   - Example: "Software Engineer | Full-Stack Development & Cloud Architecture"
   - Should highlight their strongest professional identity
2. Create a general professional CV highlighting the candidate's strengths
3. Write compelling experience highlights that demonstrate achievements
4. Create a strong professional summary
5. Order skills by importance/expertise level
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

${experienceFormatInstruction}

## Output Requirements:
- Professional, concise language
- Active voice and action verbs (NEVER passive voice)
- EVERY experience bullet MUST have a measurable result or clear impact
- Keep summary to 2-3 sentences maximum
- ${descriptionFormat === 'bullets' ? `${bulletCount} bullet points per experience entry` : '2-3 sentences per experience'}
- ${descriptionFormat === 'bullets' ? bulletLength : 'Keep descriptions focused and impactful'}
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
  styleConfig?: CVStyleConfig,
  language: OutputLanguage = 'nl',
  descriptionFormat: ExperienceDescriptionFormat = 'bullets'
): Promise<GenerateCVResult> {
  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);

  const prompt = buildPrompt(linkedIn, jobVacancy, styleConfig, language, descriptionFormat);

  try {
    const { object, usage } = await withRetry(() =>
      generateObject({
        model: aiProvider(modelId),
        schema: cvContentSchema,
        prompt,
        temperature: 0.5,
      })
    );

    return {
      content: object as GeneratedCVContent,
      usage: {
        promptTokens: usage?.inputTokens ?? 0,
        completionTokens: usage?.outputTokens ?? 0,
      },
    };
  } catch (error) {
    console.error('[CV Gen] Failed after retries:', error);
    throw error;
  }
}
