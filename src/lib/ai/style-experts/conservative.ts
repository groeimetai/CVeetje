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
  buildCompanyAnalysisBlock,
  buildClosingDirectives,
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
  return [
    buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences),
    buildCompanyAnalysisBlock(ctx.jobVacancy),
    buildClosingDirectives(ctx.jobVacancy?.company),
  ].filter(Boolean).join('\n');
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
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications', 'interests'],
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
