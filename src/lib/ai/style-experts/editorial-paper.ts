/**
 * Editorial Paper expert — matches the Cveetje brand look.
 *
 * Cream paper background, navy ink text, clay terracotta accent, serif
 * headings (Libre Baskerville / DM Serif / Playfair). Single column,
 * underlined or magazine section style, minimal decoration.
 *
 * This is the most opinionated expert: the LLM picks variations (font
 * pairing, section style, header variant), but the palette is fixed to
 * the brand tokens defined in `globals.css`.
 */

import type { CVDesignTokens } from '@/types/design-tokens';
import type { StyleExpert, PromptContext, BuiltPrompt } from './types';
import { baseDesignTokensSchema } from './shared/base-schema';
import { creativityConstraints, themeDefaults } from '@/lib/cv/templates/themes';
import {
  commonSystemHeader,
  commonSectionOrderFooter,
  buildCommonUserPreamble,
  buildClosingDirectives,
} from './shared/prompt-fragments';
import { applyBaseValidations, clearOtherRendererTokens } from './shared/normalize-base';
import { rotateLeastUsed } from './shared/variation';

const LOG_TAG = 'Style Gen [editorial-paper]';

// Brand palette — must stay in sync with src/app/globals.css :root tokens.
const BRAND_COLORS: CVDesignTokens['colors'] = {
  primary: '#1a2540',   // var(--primary)  — deep navy
  secondary: '#f9f3e3', // var(--card-tinted)
  accent: '#c2410c',    // var(--accent)   — clay terracotta
  text: '#1a1f3a',      // var(--ink)
  muted: '#7a7363',     // var(--muted)
};

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints['editorial-paper'];
  return `${commonSystemHeader(hasPhoto)}

CREATIVITY LEVEL: editorial-paper

This is a BRAND-MATCHED level. The visual identity is fixed:
- Background: cream paper (#fffdf6) — DO NOT change secondary color significantly
- Text: deep navy ink (#1a1f3a)
- Accent: clay terracotta (#c2410c) — used for eyebrows, italic accents, dot markers
- Headings: serif (Instrument Serif aesthetic — Libre Baskerville or DM Serif Display)
- Body: clean sans (DM Sans aesthetic — Source Sans or DM Sans)
- Layout: single-column with strong masthead
- Decorations: minimal (subtle horizontal rules between sections)
- Section style: underlined or magazine — NO boxes, NO cards
- Skill display: outlined or pill tags, never solid filled

CONSTRAINTS:
- Themes: ${constraints.allowedThemes.join(', ')}
- Fonts: ${constraints.allowedFontPairings.join(', ')}
- Headers: ${constraints.allowedHeaderVariants.join(', ')}
- Section styles: ${constraints.allowedSectionStyles.join(', ')}
- Layouts: ${constraints.allowedLayouts.join(', ')}
- showPhoto: ${hasPhoto ? 'true' : 'false'}

DO:
- Keep the palette warm and editorial — paper, ink, clay
- Use the accent color sparingly: section eyebrows, dates, key role titles
- Treat the CV like a printed magazine spread, not a corporate document

DO NOT:
- Pick a banner or asymmetric header (those belong to creative/experimental)
- Use bright primaries (cobalt, magenta, neon) — the palette is muted and warm
- Add abundant decorations or background shapes
${commonSectionOrderFooter}`;
}

function buildUserPrompt(ctx: PromptContext): string {
  return [
    buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences),
    buildClosingDirectives(ctx.jobVacancy?.company),
  ].filter(Boolean).join('\n');
}

function getFallback(industry?: string): CVDesignTokens {
  const defaults = themeDefaults['modern'];
  return {
    styleName: 'Editorial Paper',
    styleRationale: 'The Cveetje brand look — cream paper, navy ink, clay accent, serif headings. Reads like a printed magazine spread.',
    industryFit: industry || 'general',
    themeBase: 'modern',
    colors: { ...BRAND_COLORS },
    fontPairing: 'libre-baskerville-source-sans',
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'simple',
    sectionStyle: 'underlined',
    skillsDisplay: 'tags',
    experienceDescriptionFormat: 'bullets',
    contactLayout: 'single-row',
    headerGradient: 'none',
    showPhoto: true,
    useIcons: defaults.useIcons,
    roundedCorners: true,
    headerFullBleed: false,
    decorations: 'minimal',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications', 'interests'],
  };
}

function normalize(raw: unknown, ctx: PromptContext): CVDesignTokens {
  const constraints = creativityConstraints['editorial-paper'];
  const fallback = getFallback(ctx.jobVacancy?.industry);
  const rawPartial = (raw ?? {}) as Partial<CVDesignTokens>;
  const aiColors = rawPartial.colors || {};

  const tokens: CVDesignTokens = {
    ...fallback,
    ...rawPartial,
    // Force brand palette — the AI is not allowed to deviate on colors here.
    colors: { ...BRAND_COLORS, ...aiColors, accent: BRAND_COLORS.accent, text: BRAND_COLORS.text, secondary: BRAND_COLORS.secondary },
  };

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

export const editorialPaperExpert: StyleExpert = {
  level: 'editorial-paper',
  schema: baseDesignTokensSchema,
  preferredTemperature: 0.3,
  buildPrompt(ctx: PromptContext): BuiltPrompt {
    return {
      system: buildSystemPrompt(ctx.hasPhoto),
      user: buildUserPrompt(ctx),
    };
  },
  normalize,
  getFallback,
};
