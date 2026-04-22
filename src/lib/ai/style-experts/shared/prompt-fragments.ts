/**
 * Prompt fragments reused across every expert.
 *
 * The previous style-generator had all of these inline in one giant
 * buildSystemPrompt function. Centralizing them here keeps each expert
 * short and lets us tweak common rules in one place.
 */

import type { JobVacancy } from '@/types';
import { getIndustryStyleProfile } from '@/lib/cv/templates/themes';

/** Opening boilerplate every expert starts with. */
export function commonSystemHeader(hasPhoto: boolean): string {
  return `You are a professional CV/resume design expert. Your task is to generate design tokens for a CV based on the candidate's profile and target job.

IMPORTANT COLOR RULES:
1. Every color MUST be a valid hex code starting with #
2. For BANNER headers: primary color MUST be DARK (it becomes the background, with white text on top)
3. For NON-BANNER headers: primary color should have good contrast against white
4. Secondary color should be very light (tinted version of primary or neutral)
5. Accent color should be vibrant and complement the primary
6. Text and muted colors should be readable (dark grays work well)

COLOR SELECTION STRATEGY:
- The CV should look like it could be company marketing material - matching their brand style
- ONLY use brand colors if you are 100% CERTAIN about them (ING=orange, Rabobank=blue/orange, KPN=green, PostNL=orange, Coolblue=blue, etc.)
- If you're NOT CERTAIN about a company's brand colors: DO NOT GUESS! Create a professional palette that fits the industry instead
- When uncertain, pick colors based on industry conventions and create something unique
- Always ensure colors work well together with good contrast

PHOTO AVAILABILITY: ${hasPhoto ? 'User HAS uploaded a photo - you SHOULD set showPhoto to true' : 'No photo available - set showPhoto to false'}`;
}

/** Common footer appearing at the end of every expert's system prompt. */
export const commonSectionOrderFooter = `
SECTION ORDER GUIDELINES:
- Most jobs: summary, experience, projects, education, skills, languages, certifications
- Entry-level: summary, education, experience, skills, languages, certifications
- Technical: summary, skills, experience, education, certifications, languages`;

/** Standard user-prompt preamble: profile + (optional) job + industry + user prefs. */
export function buildCommonUserPreamble(
  linkedInSummary: string,
  jobVacancy: JobVacancy | null,
  userPreferences: string | undefined,
): string {
  let prompt = `Generate CV design tokens for this candidate:

CANDIDATE PROFILE:
${linkedInSummary}
`;

  if (jobVacancy) {
    prompt += `
TARGET JOB:
- Title: ${jobVacancy.title}
${jobVacancy.company ? `- Company: ${jobVacancy.company}` : ''}
${jobVacancy.industry ? `- Industry: ${jobVacancy.industry}` : ''}
- Key requirements: ${jobVacancy.keywords.slice(0, 10).join(', ')}
${jobVacancy.description ? `- Job description excerpt: ${jobVacancy.description.slice(0, 500)}...` : ''}
`;

    const industryProfile = getIndustryStyleProfile(jobVacancy.industry);
    if (industryProfile) {
      prompt += `
INDUSTRY STYLE PROFILE — **${industryProfile.label}**

These are the visual conventions that work for this industry. Use them
as STARTING POINTS within your creativity-level constraints, not as a
straitjacket. The combination of these directives + your creativity
level should produce a CV that feels native to this field.

- **Color direction**: ${industryProfile.colorMood}
- **Decoration theme**: ${industryProfile.decorationTheme}
- **Font character**: ${industryProfile.fontCharacter}
- **Preferred theme bases**: ${industryProfile.preferredThemes.join(', ')}

Do NOT default to generic navy + inter. The whole point of these
directives is to make a finance CV look like a finance CV, a creative
agency CV look like an agency CV, and a tech CV look like a tech CV.
`;
    }
  }

  if (userPreferences) {
    prompt += `
USER PREFERENCES:
${userPreferences}
`;
  }

  return prompt;
}
