/**
 * Motivation Letter Generator
 *
 * Generates personalized motivation letters based on:
 * - User's profile/LinkedIn data
 * - Job vacancy details
 * - Generated CV content (for consistency)
 * - Optional personal motivation input
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

// Schema for structured motivation letter output
const motivationLetterSchema = z.object({
  opening: z.string().describe('Opening paragraph: a compelling hook that grabs attention and immediately shows understanding of the company/role. 2-3 sentences.'),
  whyCompany: z.string().describe('Why this company/role: demonstrate research about the company, understanding of their mission/values/products, and genuine interest. 2-3 sentences.'),
  whyMe: z.string().describe('Why I am a good fit: connect specific experiences and skills to the job requirements. Use concrete examples. 3-4 sentences.'),
  motivation: z.string().describe('Personal motivation and enthusiasm: what drives you, why this role excites you, how it fits your career goals. Include personal motivation if provided. 2-3 sentences.'),
  closing: z.string().describe('Final call to action paragraph: express enthusiasm, mention availability for an interview. 1-2 sentences. DO NOT include a greeting or sign-off like "Kind regards" - that will be added separately.'),
});

// Build the system prompt for motivation letter generation
function buildSystemPrompt(language: OutputLanguage): string {
  const languageInstructions = language === 'nl'
    ? `Write the entire letter in Dutch (Nederlands). Use formal but warm "u" form.
       Use professional Dutch business letter conventions.`
    : `Write the entire letter in English. Use professional but personable tone.
       Use standard business letter conventions.`;

  return `You are an expert cover letter writer who creates compelling, personalized motivation letters that get results.

${languageInstructions}

KEY PRINCIPLES:
1. **Be Specific, Not Generic**: Never use generic phrases like "I am writing to apply for..." Instead, open with something that shows you understand the company or role.

2. **Show, Don't Tell**: Instead of saying "I am a hard worker", give a specific example that demonstrates it.

3. **Connect Experience to Requirements**: For each key requirement, provide evidence from your experience.

4. **Demonstrate Company Knowledge**: Show you've researched the company - mention specific products, values, recent news, or company culture.

5. **Be Authentic**: If personal motivation is provided, weave it naturally into the letter.

6. **Keep It Concise**: Each paragraph should be focused and impactful. Total letter should be 300-400 words.

STRUCTURE:
- Opening: Hook that shows immediate value or connection
- Why Company: Demonstrate genuine interest and research
- Why Me: Evidence-based pitch connecting your experience to their needs
- Motivation: Personal drive and enthusiasm (incorporate user's motivation if provided)
- Closing: Confident call to action (DO NOT include sign-off greeting like "Kind regards" - it will be added automatically)

TONE:
- Professional but personable
- Confident but not arrogant
- Enthusiastic but not desperate
- Specific but concise`;
}

// Build the user prompt with all context
function buildUserPrompt(
  linkedInData: ParsedLinkedIn,
  jobVacancy: JobVacancy,
  cvContent: GeneratedCVContent,
  personalMotivation?: string
): string {
  // Summarize key experiences
  const topExperiences = linkedInData.experience.slice(0, 3).map(exp =>
    `- ${exp.title} at ${exp.company}${exp.description ? `: ${exp.description.slice(0, 150)}...` : ''}`
  ).join('\n');

  // Key skills
  const topSkills = linkedInData.skills.slice(0, 10).map(s => s.name).join(', ');

  // Build the prompt
  let prompt = `Generate a motivation letter for:

CANDIDATE:
Name: ${linkedInData.fullName}
${linkedInData.headline ? `Current Role: ${linkedInData.headline}` : ''}
${linkedInData.location ? `Location: ${linkedInData.location}` : ''}

${linkedInData.about ? `ABOUT:\n${linkedInData.about.slice(0, 500)}\n` : ''}

KEY EXPERIENCE:
${topExperiences}

KEY SKILLS: ${topSkills}

---

TARGET JOB:
Position: ${jobVacancy.title}
${jobVacancy.company ? `Company: ${jobVacancy.company}` : ''}
${jobVacancy.industry ? `Industry: ${jobVacancy.industry}` : ''}
${jobVacancy.location ? `Location: ${jobVacancy.location}` : ''}

JOB DESCRIPTION:
${jobVacancy.description.slice(0, 1000)}

REQUIREMENTS:
${jobVacancy.requirements.slice(0, 8).map(r => `- ${r}`).join('\n')}

KEY KEYWORDS: ${jobVacancy.keywords.slice(0, 10).join(', ')}

---

CV SUMMARY (for consistency):
${cvContent.summary}
`;

  // Add personal motivation if provided
  if (personalMotivation && personalMotivation.trim()) {
    prompt += `
---

PERSONAL MOTIVATION (from the candidate - IMPORTANT, incorporate this):
"${personalMotivation}"

The candidate has shared this personal motivation. Please weave these sentiments naturally into the letter, especially in the motivation paragraph.
`;
  }

  prompt += `
---

Generate a compelling, personalized motivation letter that:
1. Opens with a strong hook (not "I am writing to apply...")
2. Shows genuine understanding of the company and role
3. Connects specific experiences to the job requirements
4. Conveys authentic enthusiasm and motivation
5. Closes with confidence and a clear call to action`;

  return prompt;
}

// Generate complete formatted letter
function formatFullLetter(
  sections: z.infer<typeof motivationLetterSchema>,
  fullName: string,
  jobTitle: string,
  companyName: string | null,
  language: OutputLanguage
): string {
  const date = new Date().toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const greeting = language === 'nl'
    ? 'Geachte heer/mevrouw,'
    : 'Dear Hiring Manager,';

  const closing = language === 'nl'
    ? 'Met vriendelijke groet,'
    : 'Kind regards,';

  return `${date}

${language === 'nl' ? 'Betreft' : 'Re'}: ${language === 'nl' ? 'Sollicitatie' : 'Application'} ${jobTitle}${companyName ? ` - ${companyName}` : ''}

${greeting}

${sections.opening}

${sections.whyCompany}

${sections.whyMe}

${sections.motivation}

${sections.closing}

${closing}

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
  personalMotivation?: string
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
      })
    );

    // Format the complete letter
    const fullText = formatFullLetter(
      result.object,
      linkedInData.fullName,
      jobVacancy.title,
      jobVacancy.company,
      language
    );

    const letter: GeneratedMotivationLetter = {
      opening: result.object.opening,
      whyCompany: result.object.whyCompany,
      whyMe: result.object.whyMe,
      motivation: result.object.motivation,
      closing: result.object.closing,
      fullText,
    };

    const usage: TokenUsage = {
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
    };

    console.log(`[Motivation Gen] Generated letter: ${usage.promptTokens} input, ${usage.completionTokens} output tokens`);

    return { letter, usage };
  } catch (error) {
    console.error('[Motivation Gen] Failed after retries:', error);
    throw error;
  }
}
