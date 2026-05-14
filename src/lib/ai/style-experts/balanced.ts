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
  buildCompanyAnalysisBlock,
  buildClosingDirectives,
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
  return [
    buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences),
    buildCompanyAnalysisBlock(ctx.jobVacancy),
    buildClosingDirectives(ctx.jobVacancy?.company),
  ].filter(Boolean).join('\n');
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
    showPhoto: true,
    useIcons: defaults.useIcons,
    roundedCorners: defaults.roundedCorners,
    headerFullBleed: false,
    decorations: 'minimal',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications', 'interests'],
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

  // Balanced should show a portrait whenever one is available unless the AI
  // explicitly opted out. The fallback previously hard-disabled photos.
  if (typeof rawPartial.showPhoto !== 'boolean') {
    tokens.showPhoto = ctx.hasPhoto;
  }

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
