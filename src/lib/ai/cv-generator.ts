import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import { withRetry } from './retry';
import { getCurrentDateContext } from './date-context';
import type {
  ParsedLinkedIn,
  JobVacancy,
  GeneratedCVContent,
  LLMProvider,
  CVStyleConfig,
  TokenUsage,
  OutputLanguage,
  FitAnalysis,
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

4. **Estimate reasonable metrics** where the source implies scale.
   - "Handled many customer requests" → "Handled 50+ customer requests daily"
     (only if realistic for the described role)
   - "Managed a small team" → "Managed team of 3-5"

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
    outputNote: 'Write ALL output in English. Use professional English language appropriate for CVs.',
  },
  nl: {
    intro: 'Je bent een expert CV-schrijver. Maak een professionele, op maat gemaakte CV op basis van de volgende profielgegevens.',
    outputNote: `Write ALL output in Dutch (Nederlands). Use professional Dutch language appropriate for CVs.
Examples of Dutch CV language:
- "Verantwoordelijk voor" → "Leidde" or "Beheerde"
- "Worked on" → "Werkte aan"
- "Led a team" → "Leidde een team van"
- "Increased" → "Verhoogde" or "Groeide"
- "Implemented" → "Implementeerde"
- "Developed" → "Ontwikkelde"`,
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

function buildPrompt(
  linkedIn: ParsedLinkedIn,
  jobVacancy: JobVacancy | null,
  styleConfig?: CVStyleConfig,
  language: OutputLanguage = 'nl',
  descriptionFormat: ExperienceDescriptionFormat = 'bullets',
  fitAnalysis?: FitAnalysis | null
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
  descriptionFormat: ExperienceDescriptionFormat = 'bullets',
  fitAnalysis?: FitAnalysis | null
): Promise<GenerateCVResult> {
  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);

  const prompt = buildPrompt(linkedIn, jobVacancy, styleConfig, language, descriptionFormat, fitAnalysis);

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
