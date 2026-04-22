/**
 * Conservative expert — ATS-friendly, traditional CVs.
 *
 * Constraints are strict: safe themes, safe fonts, simple/accented headers
 * only, no decorations, no sidebar layouts. Meant for candidates applying
 * at banks, legal, government, or anywhere an ATS might reject
 * decorated/colored output.
 */

import type { CVDesignTokens } from '@/types/design-tokens';
import type { StyleExpert, PromptContext, BuiltPrompt } from './types';
import { baseDesignTokensSchema } from './shared/base-schema';
import { creativityConstraints, themeDefaults } from '@/lib/cv/templates/themes';
import {
  commonSystemHeader,
  commonSectionOrderFooter,
  buildCommonUserPreamble,
} from './shared/prompt-fragments';
import {
  applyBaseValidations,
  clearOtherRendererTokens,
} from './shared/normalize-base';
import { rotateLeastUsed } from './shared/variation';

const LOG_TAG = 'Style Gen [conservative]';

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints.conservative;

  return `${commonSystemHeader(hasPhoto)}

CREATIVITY LEVEL: conservative

- Themes: ONLY ${constraints.allowedThemes.join(', ')}
- Fonts: ONLY ${constraints.allowedFontPairings.join(', ')}
- Headers: ONLY ${constraints.allowedHeaderVariants.join(', ')}
- Colors: professional, conservative colors appropriate for the company's industry
- showPhoto: false (ATS compatibility)
- sectionStyle: clean or underlined only
- decorations: MUST be 'none' (no background shapes)
- contactLayout: 'single-row' (classic inline format)
- headerGradient: 'none' (solid color only)
${commonSectionOrderFooter}`;
}

function buildUserPrompt(ctx: PromptContext): string {
  let prompt = buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences);

  if (ctx.jobVacancy) {
    prompt += `
COMPANY ANALYSIS TASK:
Based on the company name "${ctx.jobVacancy.company || 'Unknown'}" and industry "${ctx.jobVacancy.industry || 'Unknown'}":
1. Consider what type of company this is (startup, corporate, consulting, tech, finance, creative, government, etc.)
2. Think about their likely brand values and culture
3. Consider what style of CV would impress their hiring managers
4. If you're 100% CERTAIN about the company's brand colors, use them to make the CV look like company marketing material

Style guidance by company type:
- Big Tech (Google, Amazon, Microsoft, etc.): Modern, clean, innovative feel
- Consulting/Professional Services: Conservative, executive, structured
- Startups/Scale-ups: Dynamic, bold, shows personality
- Banks/Finance: Traditional, trustworthy, professional
- Healthcare/Pharma: Clean, professional, approachable
- Creative/Marketing/Design agencies: Show design sense, stand out
- Government/Public sector: Conservative, accessible, clear
- Manufacturing/Industrial: Professional, structured, reliable
`;
  }

  prompt += `
Generate design tokens that:
1. Match what this specific company and industry would appreciate
2. Reflect the company's likely culture and values
3. Would impress a hiring manager at this organization
4. Are visually appealing and professional
5. Will render well in both screen preview and PDF print
6. Use colors that work well together and have proper contrast

IMPORTANT: Adapt the style specifically for "${ctx.jobVacancy?.company || 'the target company'}"!
Think about what kind of candidate they want to see - and design accordingly.`;

  return prompt;
}

function getFallback(industry?: string): CVDesignTokens {
  const defaults = themeDefaults['professional'];
  return {
    styleName: 'Professional Modern',
    styleRationale: 'A clean, professional design that works well across industries.',
    industryFit: industry || 'general',
    themeBase: 'professional',
    colors: defaults.suggestedColors,
    fontPairing: defaults.fontPairing,
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: defaults.headerVariant,
    sectionStyle: defaults.sectionStyle,
    skillsDisplay: defaults.skillsDisplay,
    experienceDescriptionFormat: 'bullets',
    contactLayout: 'single-row',
    headerGradient: 'none',
    showPhoto: false,
    useIcons: defaults.useIcons,
    roundedCorners: defaults.roundedCorners,
    headerFullBleed: false,
    decorations: 'none',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'],
  };
}

function normalize(raw: unknown, ctx: PromptContext): CVDesignTokens {
  const constraints = creativityConstraints.conservative;
  const fallback = getFallback(ctx.jobVacancy?.industry);
  const rawPartial = (raw ?? {}) as Partial<CVDesignTokens>;
  const aiColors = rawPartial.colors || {};
  const tokens: CVDesignTokens = {
    ...fallback,
    ...rawPartial,
    colors: { ...fallback.colors, ...aiColors },
  };

  // Clamp enums to allowed values for this level
  if (!constraints.allowedThemes.includes(tokens.themeBase)) tokens.themeBase = constraints.allowedThemes[0];
  if (!constraints.allowedFontPairings.includes(tokens.fontPairing)) tokens.fontPairing = constraints.allowedFontPairings[0];
  const allowedHeaders = constraints.allowedHeaderVariants as readonly string[];
  if (!allowedHeaders.includes(tokens.headerVariant)) tokens.headerVariant = constraints.allowedHeaderVariants[0];
  const allowedSections = constraints.allowedSectionStyles as readonly string[];
  if (!allowedSections.includes(tokens.sectionStyle)) tokens.sectionStyle = constraints.allowedSectionStyles[0];

  // Conservative must be 'none' decorations
  tokens.decorations = 'none';
  tokens.headerGradient = 'none';
  tokens.contactLayout = 'single-row';
  tokens.showPhoto = false;

  // Standard post-processing
  applyBaseValidations(tokens, LOG_TAG);
  clearOtherRendererTokens(tokens, 'none');

  // Rotate the fields that actually vary at this level
  rotateLeastUsed(
    tokens,
    ctx.styleHistory,
    {
      fontPairing: constraints.allowedFontPairings,
      headerVariant: allowedHeaders,
    },
    LOG_TAG,
  );

  return tokens;
}

export const conservativeExpert: StyleExpert = {
  level: 'conservative',
  schema: baseDesignTokensSchema,
  preferredTemperature: 0.2,
  buildPrompt(ctx: PromptContext): BuiltPrompt {
    return {
      system: buildSystemPrompt(ctx.hasPhoto),
      user: buildUserPrompt(ctx),
    };
  },
  normalize,
  getFallback,
};
