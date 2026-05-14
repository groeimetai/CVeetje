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
- Default: build a palette from the industry style profile (provided in the user prompt). That profile encodes which color mood fits the sector.
- Brand colors: only use a specific company brand color if it is COMMON KNOWLEDGE and you are highly confident it is current. Brand identities change — when in doubt, do NOT guess a specific brand color. Build a palette from the industry profile instead.
- Never invent a brand color claim ("company X uses purple") and then build the palette around it. If you're not sure, fall back to the industry profile.
- Always check the final palette: good contrast, no clashing hues, primary + secondary + accent form a coherent set.

STYLE RATIONALE RULES:
- The styleRationale field describes WHY you chose these tokens. It must match the tokens you actually chose — don't describe a "bold creative" style if you picked a conservative theme.
- Keep it specific: name the theme, font character, and color mood. Avoid generic marketing copy like "modern and professional design that balances elegance with functionality".
- One or two short sentences is enough.

PHOTO AVAILABILITY: ${hasPhoto ? 'User HAS uploaded a photo - you SHOULD set showPhoto to true' : 'No photo available - set showPhoto to false'}`;
}

/**
 * Company-and-industry analysis block — used by every expert's user prompt
 * to ground style choices in the target company's likely culture. Returns
 * empty string when no job vacancy is set.
 */
export function buildCompanyAnalysisBlock(jobVacancy: import('@/types').JobVacancy | null): string {
  if (!jobVacancy) return '';

  return `
COMPANY ANALYSIS TASK:
Based on the company name "${jobVacancy.company || 'Unknown'}" and industry "${jobVacancy.industry || 'Unknown'}":
1. Consider what type of company this is (startup, corporate, consulting, tech, finance, creative, government, etc.)
2. Think about their likely brand values and culture from the vacancy text itself — not from outside assumptions
3. Consider what style of CV would impress their hiring managers
4. Only use specific brand colors if they are common knowledge and current — otherwise build a palette from the industry profile

Style guidance by company type (as starting points, not rules):
- Big Tech: modern, clean, innovative feel
- Consulting/Professional Services: conservative, executive, structured
- Startups/Scale-ups: dynamic, shows personality
- Banks/Finance: traditional, trustworthy
- Healthcare/Pharma: clean, professional, approachable
- Creative/Marketing/Design agencies: show design sense
- Government/Public sector: conservative, accessible
- Manufacturing/Industrial: professional, structured
`;
}

/**
 * Closing block for the user prompt — what the generated tokens must achieve.
 */
export function buildClosingDirectives(companyName: string | null | undefined): string {
  return `
Generate design tokens that:
1. Match what this specific company and industry would appreciate
2. Reflect the company's likely culture and values (as inferred from the vacancy text)
3. Would impress a hiring manager at this organization
4. Are visually appealing and professional
5. Render well in both screen preview and PDF print
6. Use colors with good contrast and a coherent palette

Adapt the style specifically for "${companyName || 'the target company'}". Think about what kind of candidate they want to see — and design accordingly.`;
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
