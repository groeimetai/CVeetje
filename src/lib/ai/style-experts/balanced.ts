/**
 * Balanced expert — modern professional CVs.
 *
 * Slightly more expressive than conservative: accent colors, underlined
 * sections, minimal decorations allowed, photo allowed. Meant for most
 * industries where a clean-but-designed CV is the expectation.
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

const LOG_TAG = 'Style Gen [balanced]';

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints.balanced;
  return `${commonSystemHeader(hasPhoto)}

CREATIVITY LEVEL: balanced

- Themes: ${constraints.allowedThemes.join(', ')}
- Fonts: preferably ${constraints.allowedFontPairings.join(', ')}
- Headers: simple, accented, or split (avoid banner)
- Colors: base on the target company's brand and industry
- showPhoto: ${hasPhoto ? 'true' : 'false'}
- Try underlined section style with accent color
- decorations: SHOULD be 'minimal' (adds subtle background shapes for visual interest - recommended!)
- contactLayout: 'single-row' or 'double-row' based on content length
- headerGradient: 'none' or 'subtle' for a touch of elegance
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
- Big Tech: Modern, clean, innovative feel
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
  const defaults = themeDefaults['modern'];
  return {
    styleName: 'Modern Professional',
    styleRationale: 'A modern design that balances style with professionalism.',
    industryFit: industry || 'general',
    themeBase: 'modern',
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
    decorations: 'minimal',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'],
  };
}

function normalize(raw: unknown, ctx: PromptContext): CVDesignTokens {
  const constraints = creativityConstraints.balanced;
  const fallback = getFallback(ctx.jobVacancy?.industry);
  const rawPartial = (raw ?? {}) as Partial<CVDesignTokens>;
  const aiColors = rawPartial.colors || {};
  const tokens: CVDesignTokens = {
    ...fallback,
    ...rawPartial,
    colors: { ...fallback.colors, ...aiColors },
  };

  if (!constraints.allowedThemes.includes(tokens.themeBase)) tokens.themeBase = constraints.allowedThemes[0];
  if (!constraints.allowedFontPairings.includes(tokens.fontPairing)) tokens.fontPairing = constraints.allowedFontPairings[0];
  const allowedHeaders = constraints.allowedHeaderVariants as readonly string[];
  if (!allowedHeaders.includes(tokens.headerVariant)) tokens.headerVariant = constraints.allowedHeaderVariants[0];
  const allowedSections = constraints.allowedSectionStyles as readonly string[];
  if (!allowedSections.includes(tokens.sectionStyle)) tokens.sectionStyle = constraints.allowedSectionStyles[0];

  applyBaseValidations(tokens, LOG_TAG);
  clearOtherRendererTokens(tokens, 'none');

  rotateLeastUsed(
    tokens,
    ctx.styleHistory,
    {
      fontPairing: constraints.allowedFontPairings,
      headerVariant: allowedHeaders,
      sectionStyle: allowedSections,
    },
    LOG_TAG,
  );

  return tokens;
}

export const balancedExpert: StyleExpert = {
  level: 'balanced',
  schema: baseDesignTokensSchema,
  preferredTemperature: 0.5,
  buildPrompt(ctx: PromptContext): BuiltPrompt {
    return {
      system: buildSystemPrompt(ctx.hasPhoto),
      user: buildUserPrompt(ctx),
    };
  },
  normalize,
  getFallback,
};
