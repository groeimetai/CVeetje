/**
 * Creative expert — expressive output on the STANDARD renderer.
 *
 * The user expectation is: creative gets richer art direction and better
 * prompts, but should still render through the same reliable HTML/CSS
 * pipeline as balanced. So this expert only produces base design tokens and
 * explicitly clears editorial/bold renderer tokens.
 */

import type { CVDesignTokens } from '@/types/design-tokens';
import type { StyleExpert, PromptContext, BuiltPrompt } from './types';
import { baseDesignTokensSchema } from './shared/base-schema';
import { creativityConstraints } from '@/lib/cv/templates/themes';
import {
  commonSystemHeader,
  commonSectionOrderFooter,
  buildCommonUserPreamble,
} from './shared/prompt-fragments';
import {
  applyBaseValidations,
  clearOtherRendererTokens,
  industryToDecorationTheme,
} from './shared/normalize-base';
import { pickFrom, rotateLeastUsed } from './shared/variation';
import { colorMoods } from './shared/color-moods';
import { fontDirections } from './shared/font-directions';

const LOG_TAG = 'Style Gen [creative]';

function readContextSignals(ctx: PromptContext) {
  const industry = (ctx.jobVacancy?.industry || '').toLowerCase();
  const prefs = (ctx.userPreferences || '').toLowerCase();
  const title = (ctx.jobVacancy?.title || '').toLowerCase();
  const combined = `${industry} ${title} ${prefs}`;

  return {
    wantsTwoColumn: /\b(two column|2 column|two-column|2-column|twee kolom|twee kolommen|sidebar|compact)\b/.test(combined),
    wantsMinimal: /\b(minimal|minimalistisch|strak|clean|cleaner|subtle|subtiel)\b/.test(combined),
    wantsLoud: /\b(bold|edgy|opvallend|statement|expressive|editorial|magazine|poster)\b/.test(combined),
    isCorporate: /\b(finance|bank|consult|consulting|legal|jurid|account|strategy|enterprise|b2b)\b/.test(combined),
    isCreativeRole: /\b(creative|design|designer|marketing|brand|art|fashion|agency|copy|content)\b/.test(combined),
  };
}

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints.creative;
  return `${commonSystemHeader(hasPhoto)}

*** CREATIVE MODE — EXPRESSIVE, BUT ON THE STANDARD RENDERER ***

Important architecture rule:
- Generate ONLY base design tokens from the shared schema
- DO NOT invent or rely on an \`editorial\` object
- This CV must render through the SAME reliable renderer as balanced, just
  with more personality, richer typography, stronger headers and better use
  of sidebars, spacing and color

Think:
- editorial taste, but implementation-safe
- art-directed, but not fragile
- a CV that feels designed, not a magazine layout system

Allowed choices:
- Themes: ${constraints.allowedThemes.join(', ')}
- Fonts: ${constraints.allowedFontPairings.join(' | ')}
- Headers: ${constraints.allowedHeaderVariants.join(', ')}
- Section styles: ${constraints.allowedSectionStyles.join(', ')}
- Layouts: ${constraints.allowedLayouts.join(', ')}
- Decorations: ${constraints.allowedDecorations.join(', ')}

Creative direction:
- Use typography as the main differentiator
- Use the sidebar intelligently to prevent one endless column
- Use stronger color and contrast than balanced, but remain professional
- Prioritize layouts that preview cleanly and export predictably to PDF

Non-negotiables:
- showPhoto: ${hasPhoto ? 'true' : 'false'}
- useIcons: often true, unless a minimal instruction clearly argues against it
- sidebar layout is preferred for this level
- pageBackground must stay very light

Priority order:
1. Respect the vacancy and company context
2. Respect explicit style instructions from the user
3. Then express creative/editorial taste inside the standard renderer
${commonSectionOrderFooter}`;
}

function buildUserPrompt(ctx: PromptContext): string {
  let prompt = buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences);

  if (ctx.jobVacancy) {
    prompt += `
CREATIVE POSITIONING FOR THIS VACANCY:
This is still a job-targeted CV, not a free-form art exercise.

- A creative/design/brand role should feel more expressive and visually bold
- A finance/consulting/legal role should feel more restrained, premium and structured
- A tech role should feel modern, sharp and product-minded
- A healthcare/public role should feel clear, human and accessible

Use the vacancy to decide HOW expressive to be, not whether to ignore the brief.
`;
  }

  const mood = pickFrom(colorMoods);
  const fontDir = pickFrom(fontDirections);
  prompt += `
VARIATION NUDGE:
- Suggested color mood: "${mood.mood}" — ${mood.description}
- Typography flavour: ${fontDir.hint}
- Try a stronger standard-renderer combo this round:
  - headerVariant = "${pickFrom(['banner', 'asymmetric'])}"
  - sectionStyle = "${pickFrom(['timeline', 'card', 'alternating', 'magazine'])}"
  - layout = "${pickFrom(['sidebar-left', 'sidebar-right'])}"

Generate a creative CV that still uses the STANDARD renderer. That means:
- create variety through colors, fonts, spacing, header, section styles and sidebar usage
- do not rely on custom magazine-only layout primitives
- make it feel intentional, not generic
`;

  return prompt;
}

function getFallback(industry?: string): CVDesignTokens {
  const decorationTheme = industryToDecorationTheme(industry, 'creative');
  return {
    styleName: 'Creative Professional',
    styleRationale: 'Expressive typography and color on top of the standard, reliable CV renderer.',
    industryFit: industry || 'creative',
    themeBase: 'creative',
    colors: {
      primary: '#26213a',
      secondary: '#faf5ee',
      accent: '#d86d43',
      text: '#171717',
      muted: '#6d655e',
    },
    fontPairing: 'playfair-inter',
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'banner',
    sectionStyle: 'magazine',
    skillsDisplay: 'tags',
    experienceDescriptionFormat: 'paragraph',
    contactLayout: 'single-row',
    headerGradient: 'subtle',
    showPhoto: true,
    useIcons: false,
    roundedCorners: true,
    headerFullBleed: false,
    decorations: 'minimal',
    decorationTheme,
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'],
    layout: 'sidebar-left',
    sidebarSections: ['skills', 'projects', 'languages', 'certifications'],
    accentStyle: 'quote',
    borderRadius: 'medium',
    pageBackground: '#faf5ee',
    nameStyle: 'extra-bold',
    skillTagStyle: 'pill',
  };
}

function getContextualFallback(ctx: PromptContext): CVDesignTokens {
  const signals = readContextSignals(ctx);
  const base = getFallback(ctx.jobVacancy?.industry);

  if (signals.isCorporate) {
    return {
      ...base,
      styleName: 'Creative Executive',
      styleRationale: 'Premium, restrained creative styling for corporate and strategy-facing roles.',
      industryFit: ctx.jobVacancy?.industry || 'finance',
      themeBase: 'modern',
      fontPairing: 'dm-serif-dm-sans',
      colors: {
        primary: '#1f2233',
        secondary: '#f6f1e8',
        accent: '#9a6b45',
        text: '#1d1d1d',
        muted: '#6c655b',
      },
      headerVariant: 'split',
      sectionStyle: 'underlined',
      experienceDescriptionFormat: 'bullets',
      contactLayout: 'double-row',
      headerGradient: 'none',
      useIcons: false,
      roundedCorners: false,
      decorations: 'minimal',
      layout: 'sidebar-right',
      sidebarSections: ['skills', 'languages', 'certifications'],
      accentStyle: 'border-left',
      borderRadius: 'small',
      nameStyle: 'uppercase',
      skillTagStyle: 'outlined',
    };
  }

  if (signals.isCreativeRole || signals.wantsLoud) {
    return {
      ...base,
      styleName: 'Creative Feature',
      styleRationale: 'Bolder contrast and a stronger typographic voice for brand, design and culture roles.',
      industryFit: ctx.jobVacancy?.industry || 'creative',
      fontPairing: 'oswald-source-sans',
      headerVariant: 'asymmetric',
      sectionStyle: 'alternating',
      experienceDescriptionFormat: 'paragraph',
      contactLayout: 'single-column',
      headerGradient: 'radial',
      useIcons: true,
      decorations: 'moderate',
      layout: 'sidebar-left',
      sidebarSections: ['skills', 'projects', 'languages', 'certifications'],
      accentStyle: 'background',
      borderRadius: 'large',
      nameStyle: 'extra-bold',
      skillTagStyle: 'pill',
    };
  }

  if (signals.wantsMinimal) {
    return {
      ...base,
      styleName: 'Creative Minimal',
      styleRationale: 'Editorial restraint with cleaner hierarchy and lower visual noise.',
      themeBase: 'modern',
      fontPairing: 'libre-baskerville-source-sans',
      headerVariant: 'split',
      sectionStyle: 'clean',
      experienceDescriptionFormat: 'paragraph',
      contactLayout: 'double-row',
      headerGradient: 'none',
      useIcons: false,
      roundedCorners: false,
      decorations: 'none',
      layout: 'sidebar-right',
      sidebarSections: ['skills', 'languages', 'certifications'],
      accentStyle: 'none',
      borderRadius: 'none',
      nameStyle: 'normal',
      skillTagStyle: 'outlined',
    };
  }

  if (signals.wantsTwoColumn) {
    return {
      ...base,
      layout: 'sidebar-right',
      sidebarSections: ['skills', 'languages', 'certifications'],
      contactLayout: 'double-row',
      experienceDescriptionFormat: 'bullets',
    };
  }

  return base;
}

function normalize(raw: unknown, ctx: PromptContext): CVDesignTokens {
  const constraints = creativityConstraints.creative;
  const fallback = getContextualFallback(ctx);
  const rawPartial = (raw ?? {}) as Partial<CVDesignTokens>;
  const aiColors = rawPartial.colors || {};
  const tokens: CVDesignTokens = {
    ...fallback,
    ...rawPartial,
    colors: { ...fallback.colors, ...aiColors },
  };

  if (!constraints.allowedThemes.includes(tokens.themeBase)) tokens.themeBase = fallback.themeBase;
  if (!constraints.allowedFontPairings.includes(tokens.fontPairing)) tokens.fontPairing = fallback.fontPairing;

  const allowedHeaders = constraints.allowedHeaderVariants as readonly string[];
  if (!allowedHeaders.includes(tokens.headerVariant)) tokens.headerVariant = fallback.headerVariant;

  const allowedSections = constraints.allowedSectionStyles as readonly string[];
  if (!allowedSections.includes(tokens.sectionStyle)) tokens.sectionStyle = fallback.sectionStyle;

  const allowedLayouts = constraints.allowedLayouts as readonly string[];
  if (!allowedLayouts.includes(tokens.layout || '')) tokens.layout = fallback.layout;

  if (typeof rawPartial.showPhoto !== 'boolean') {
    tokens.showPhoto = ctx.hasPhoto;
  }
  if (!tokens.sidebarSections || tokens.sidebarSections.length === 0) {
    tokens.sidebarSections = fallback.sidebarSections || ['skills', 'languages', 'certifications'];
  }

  applyBaseValidations(tokens, LOG_TAG);
  clearOtherRendererTokens(tokens, 'none');

  rotateLeastUsed(
    tokens,
    ctx.styleHistory,
    {
      fontPairing: constraints.allowedFontPairings,
      headerVariant: allowedHeaders,
      sectionStyle: allowedSections,
      layout: allowedLayouts,
      accentStyle: ['border-left', 'background', 'quote'],
      nameStyle: ['uppercase', 'extra-bold'],
      skillTagStyle: ['outlined', 'pill'],
      contactLayout: ['single-row', 'double-row', 'single-column', 'double-column'],
    },
    LOG_TAG,
  );

  return tokens;
}

export const creativeExpert: StyleExpert = {
  level: 'creative',
  schema: baseDesignTokensSchema,
  preferredTemperature: 0.9,
  buildPrompt(ctx: PromptContext): BuiltPrompt {
    return {
      system: buildSystemPrompt(ctx.hasPhoto),
      user: buildUserPrompt(ctx),
    };
  },
  normalize,
  getFallback,
};
