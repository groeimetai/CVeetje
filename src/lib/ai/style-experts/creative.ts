/**
 * Creative expert — editorial / magazine CVs.
 *
 * Uses a dedicated schema extension (`editorial` object with 8 orthogonal
 * primitives) that maps to the editorial renderer. Variation rotation now
 * targets those primitives directly — this is half of the fix for "creative
 * always looks the same" (the other half is the same treatment for experimental).
 */

import { z } from 'zod';
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

// ============ Editorial schema ============

const editorialSchema = z.object({
  headerLayout: z.enum(['stacked', 'split', 'band', 'overlap']).optional().describe(
    `Header composition:
- stacked: vertical stack (name, headline, contact)
- split: name/headline left, portrait + contact right-aligned
- band: full-width colored band behind the header
- overlap: portrait left, name/headline flowing right`,
  ),
  nameTreatment: z.enum([
    'oversized-serif', 'oversized-sans', 'uppercase-tracked', 'mixed-italic', 'condensed-impact',
  ]).optional().describe(
    `Name typography — the biggest visual choice. Match to the font pairing.`,
  ),
  accentTreatment: z.enum([
    'thin-rule', 'vertical-bar', 'marker-highlight', 'ornament', 'number-prefix',
  ]).optional().describe('Small visual accent marking the header as designed, not templated.'),
  sectionTreatment: z.enum(['numbered', 'kicker', 'sidenote', 'drop-cap', 'pull-quote']).optional().describe(
    'How section titles are typeset.',
  ),
  grid: z.enum([
    'asymmetric-60-40', 'asymmetric-70-30', 'full-bleed', 'manuscript', 'three-column-intro',
  ]).optional().describe('Page grid.'),
  divider: z.enum(['none', 'hairline', 'double-rule', 'ornament', 'whitespace-large']).optional().describe(
    'How sections are separated.',
  ),
  typographyScale: z.enum(['modest', 'editorial', 'hero']).optional().describe('Overall type scale.'),
  sectionNumbering: z.boolean().optional().describe('Whether sections get 01/02/03 prefixes.'),
  pullQuoteSource: z.string().optional().describe('Section for pull quote (only when sectionTreatment=pull-quote).'),
  dropCapSection: z.string().optional().describe('Section for drop-cap (only when sectionTreatment=drop-cap).'),
});

const creativeSchema = baseDesignTokensSchema.extend({
  editorial: editorialSchema.optional().describe(
    'Editorial layout tokens — drive the magazine-style renderer.',
  ),
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract']).optional(),
  layout: z.enum(['single-column', 'sidebar-left', 'sidebar-right']).optional(),
  sidebarSections: z.array(z.string()).optional(),
});

// ============ Editorial pools + font pairing rules ============

const EDITORIAL_POOLS = {
  headerLayout: ['stacked', 'split', 'band', 'overlap'] as const,
  nameTreatment: [
    'oversized-serif', 'oversized-sans', 'uppercase-tracked', 'mixed-italic', 'condensed-impact',
  ] as const,
  accentTreatment: [
    'thin-rule', 'vertical-bar', 'marker-highlight', 'ornament', 'number-prefix',
  ] as const,
  sectionTreatment: ['numbered', 'kicker', 'sidenote', 'drop-cap', 'pull-quote'] as const,
  grid: [
    'asymmetric-60-40', 'asymmetric-70-30', 'full-bleed', 'manuscript', 'three-column-intro',
  ] as const,
  divider: ['hairline', 'double-rule', 'ornament', 'whitespace-large'] as const,
  typographyScale: ['modest', 'editorial', 'hero'] as const,
};

const nameTreatmentFontPreference: Record<string, string[]> = {
  'oversized-serif': ['playfair-inter', 'dm-serif-dm-sans', 'merriweather-source-sans', 'libre-baskerville-source-sans'],
  'oversized-sans': ['montserrat-open-sans', 'poppins-nunito', 'raleway-lato', 'space-grotesk-work-sans'],
  'mixed-italic': ['playfair-inter', 'libre-baskerville-source-sans', 'dm-serif-dm-sans'],
  'uppercase-tracked': ['inter-inter', 'montserrat-open-sans', 'raleway-lato', 'space-grotesk-work-sans', 'playfair-inter'],
  'condensed-impact': ['oswald-source-sans'],
};

function readContextSignals(ctx: PromptContext) {
  const industry = (ctx.jobVacancy?.industry || '').toLowerCase();
  const prefs = (ctx.userPreferences || '').toLowerCase();
  const title = (ctx.jobVacancy?.title || '').toLowerCase();
  const combined = `${industry} ${title} ${prefs}`;

  return {
    industry,
    wantsTwoColumn: /\b(two column|2 column|two-column|2-column|twee kolom|twee kolommen|sidebar|compact)\b/.test(combined),
    wantsMinimal: /\b(minimal|minimalistisch|strak|clean|cleaner|subtle|subtiel)\b/.test(combined),
    wantsLoud: /\b(bold|edgy|opvallend|statement|expressive|editorial|magazine)\b/.test(combined),
    isCorporate: /\b(finance|bank|consult|consulting|legal|jurid|account|strategy|enterprise|b2b)\b/.test(combined),
    isCreativeRole: /\b(creative|design|designer|marketing|brand|art|fashion|agency|copy|content)\b/.test(combined),
  };
}

function getContextualFallback(ctx: PromptContext): CVDesignTokens {
  const signals = readContextSignals(ctx);
  const base = getFallback(ctx.jobVacancy?.industry);

  if (signals.isCorporate) {
    return {
      ...base,
      styleName: 'Editorial Executive',
      styleRationale: 'Editorial restraint with clearer structure for corporate and strategy roles.',
      industryFit: ctx.jobVacancy?.industry || 'finance',
      fontPairing: 'dm-serif-dm-sans',
      colors: {
        primary: '#1f2233',
        secondary: '#f6f1e8',
        accent: '#9a6b45',
        text: '#1d1d1d',
        muted: '#6c655b',
      },
      editorial: {
        headerLayout: 'split',
        nameTreatment: 'uppercase-tracked',
        accentTreatment: 'thin-rule',
        sectionTreatment: 'numbered',
        grid: 'asymmetric-70-30',
        divider: 'hairline',
        typographyScale: 'modest',
        sectionNumbering: true,
      },
      layout: 'sidebar-right',
      sidebarSections: ['skills', 'languages', 'certifications'],
    };
  }

  if (signals.isCreativeRole || signals.wantsLoud) {
    return {
      ...base,
      styleName: 'Editorial Feature',
      styleRationale: 'More expressive magazine direction for creative, brand and culture roles.',
      industryFit: ctx.jobVacancy?.industry || 'creative',
      fontPairing: 'oswald-source-sans',
      colors: {
        primary: '#26213a',
        secondary: '#faf5ee',
        accent: '#d86d43',
        text: '#171717',
        muted: '#6d655e',
      },
      editorial: {
        headerLayout: 'band',
        nameTreatment: 'condensed-impact',
        accentTreatment: 'marker-highlight',
        sectionTreatment: 'kicker',
        grid: 'asymmetric-60-40',
        divider: 'whitespace-large',
        typographyScale: 'hero',
        sectionNumbering: true,
      },
      layout: 'sidebar-left',
      sidebarSections: ['skills', 'projects', 'languages', 'certifications'],
    };
  }

  if (signals.wantsMinimal) {
    return {
      ...base,
      fontPairing: 'libre-baskerville-source-sans',
      editorial: {
        headerLayout: 'stacked',
        nameTreatment: 'oversized-serif',
        accentTreatment: 'thin-rule',
        sectionTreatment: 'numbered',
        grid: 'manuscript',
        divider: 'hairline',
        typographyScale: 'modest',
        sectionNumbering: true,
      },
      layout: 'single-column',
      sidebarSections: ['skills', 'languages', 'certifications'],
    };
  }

  if (signals.wantsTwoColumn) {
    return {
      ...base,
      editorial: {
        ...base.editorial!,
        grid: 'asymmetric-60-40',
      },
      layout: 'sidebar-right',
      sidebarSections: ['skills', 'languages', 'certifications'],
    };
  }

  return base;
}

function validateAndFixEditorialTokens(
  raw: CVDesignTokens['editorial'] | undefined,
  fontPairing: string,
): NonNullable<CVDesignTokens['editorial']> {
  const isValid = <T extends string>(val: unknown, allowed: readonly T[]): val is T =>
    typeof val === 'string' && allowed.includes(val as T);

  const headerLayout = isValid(raw?.headerLayout, EDITORIAL_POOLS.headerLayout)
    ? raw!.headerLayout
    : pickFrom(EDITORIAL_POOLS.headerLayout);

  let nameTreatment = isValid(raw?.nameTreatment, EDITORIAL_POOLS.nameTreatment)
    ? raw!.nameTreatment
    : pickFrom(EDITORIAL_POOLS.nameTreatment);

  const preferred = nameTreatmentFontPreference[nameTreatment];
  if (preferred && !preferred.includes(fontPairing)) {
    const candidates = EDITORIAL_POOLS.nameTreatment.filter(t => nameTreatmentFontPreference[t]?.includes(fontPairing));
    if (candidates.length > 0) {
      const better = pickFrom(candidates);
      console.log(`[${LOG_TAG}] nameTreatment ${nameTreatment} → ${better} to match font ${fontPairing}`);
      nameTreatment = better;
    }
  }

  const accentTreatment = isValid(raw?.accentTreatment, EDITORIAL_POOLS.accentTreatment)
    ? raw!.accentTreatment
    : pickFrom(EDITORIAL_POOLS.accentTreatment);
  const sectionTreatment = isValid(raw?.sectionTreatment, EDITORIAL_POOLS.sectionTreatment)
    ? raw!.sectionTreatment
    : pickFrom(EDITORIAL_POOLS.sectionTreatment);
  const grid = isValid(raw?.grid, EDITORIAL_POOLS.grid) ? raw!.grid : pickFrom(EDITORIAL_POOLS.grid);
  const dividerAll = ['none', ...EDITORIAL_POOLS.divider] as const;
  const divider = isValid(raw?.divider, dividerAll) ? raw!.divider : pickFrom(EDITORIAL_POOLS.divider);
  const typographyScale = isValid(raw?.typographyScale, EDITORIAL_POOLS.typographyScale)
    ? raw!.typographyScale
    : 'editorial';

  let pullQuoteSource: string | undefined;
  if (sectionTreatment === 'pull-quote') pullQuoteSource = (raw?.pullQuoteSource || 'experience').toString();
  let dropCapSection: string | undefined;
  if (sectionTreatment === 'drop-cap') dropCapSection = (raw?.dropCapSection || 'summary').toString();

  const sectionNumbering = typeof raw?.sectionNumbering === 'boolean' ? raw!.sectionNumbering : true;

  return {
    headerLayout, nameTreatment, accentTreatment, sectionTreatment, grid, divider,
    typographyScale, sectionNumbering, pullQuoteSource, dropCapSection,
  };
}

// ============ Prompts ============

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints.creative;
  return `${commonSystemHeader(hasPhoto)}

*** CREATIVE MODE — EDITORIAL / MAGAZINE OUTPUT ***

Think Kinfolk, Wallpaper*, The Gentlewoman, Apartamento. Editorial layout
with real typographic hierarchy, asymmetric grids, print-quality proportions.

A dedicated editorial renderer handles this level. Fill the \`editorial\`
object with compositional primitives — all orthogonal, renderer combines freely.

THE EDITORIAL PRIMITIVES:

- **headerLayout** — stacked | split | band | overlap
- **nameTreatment** — oversized-serif | oversized-sans | uppercase-tracked | mixed-italic | condensed-impact
  Match to the font pairing:
  - oversized-serif → playfair-inter, dm-serif-dm-sans, merriweather, libre-baskerville
  - oversized-sans → montserrat, poppins, raleway, space-grotesk
  - mixed-italic → playfair-inter, libre-baskerville, dm-serif
  - uppercase-tracked → any
  - condensed-impact → oswald-source-sans (only)
- **accentTreatment** — thin-rule | vertical-bar | marker-highlight | ornament | number-prefix
- **sectionTreatment** — numbered | kicker | sidenote | drop-cap | pull-quote
- **grid** — asymmetric-60-40 | asymmetric-70-30 | full-bleed | manuscript | three-column-intro
- **divider** — none | hairline | double-rule | ornament | whitespace-large
- **typographyScale** — modest | editorial | hero
- **sectionNumbering** — true | false
- **pullQuoteSource** — set to "experience" ONLY when sectionTreatment = 'pull-quote'
- **dropCapSection** — set to "summary" ONLY when sectionTreatment = 'drop-cap'

FONTS (required from): ${constraints.allowedFontPairings.join(' | ')}

COLORS: restrained editorial palettes.
- Primary: deep and confident (ink, burgundy, forest, navy, plum)
- Accent: a single pop color (amber, terracotta, emerald, coral, marigold)
- Secondary: paper-tinted (#faf8f4, #f5f2eb)
- Text: near-black (#1a1a1a — #2a2a2a)
- Muted: warm grey (#6b6459 — #7a7468)
Avoid neon and saturated blues — those belong to experimental.

OTHER TOKENS (required on base schema, ignored by editorial renderer):
- themeBase: 'creative' or 'modern'
- showPhoto: ${hasPhoto ? 'true' : 'false'}
- useIcons: false (typography does the work)
- headerVariant/sectionStyle: any — ignored

EXAMPLES:
1. Elegant tech consultant — playfair-inter, oversized-serif name, thin-rule accent, numbered sections, asymmetric-60-40, hairline dividers.
2. Fashion / marketing — oswald, condensed-impact, marker-highlight, kicker sections, full-bleed, whitespace-large.
3. Editor / literary — libre-baskerville, mixed-italic, ornament, sidenote sections, manuscript, ornament dividers.
4. Strategy senior — dm-serif, uppercase-tracked, number-prefix, numbered, three-column-intro, double-rule.
${commonSectionOrderFooter}`;
}

function buildUserPrompt(ctx: PromptContext): string {
  let prompt = buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences);

  if (ctx.jobVacancy) {
    prompt += `
DESIGN INSPIRATION:
Industry: "${ctx.jobVacancy.industry || 'Unknown'}", Company: "${ctx.jobVacancy.company || 'Unknown'}".
Use this as INSPIRATION — keep it relevant. If you're 100% CERTAIN about the
company's brand colors, incorporate them boldly. Otherwise create a striking
editorial palette that fits the industry vibe.
`;
  }

  // Variation nudge — each render uses fresh randomized primitives picked
  // from the per-level pools.
  const mood = pickFrom(colorMoods);
  const fontDir = pickFrom(fontDirections);
  prompt += `
VARIATION NUDGE (a diversity signal — the industry profile above is still the
primary driver, but use these to avoid repeating the same combination):
- Suggested color mood: "${mood.mood}" — ${mood.description}
- Typography flavour: ${fontDir.hint}
- Try editorial.headerLayout = "${pickFrom(EDITORIAL_POOLS.headerLayout)}"
- Try editorial.grid = "${pickFrom(EDITORIAL_POOLS.grid)}"
- Try editorial.sectionTreatment = "${pickFrom(EDITORIAL_POOLS.sectionTreatment)}"
- Try editorial.nameTreatment = "${pickFrom(EDITORIAL_POOLS.nameTreatment)}"
`;

  prompt += `
Generate tokens for the EDITORIAL RENDERER. The most important part is the
\`editorial\` object — fill it thoughtfully.

Non-negotiables:
1. Fill the \`editorial\` object with ALL required fields. Match nameTreatment
   to the fontPairing (see the system prompt pairing table).
2. If sectionTreatment = 'pull-quote', set pullQuoteSource = "experience".
   If sectionTreatment = 'drop-cap', set dropCapSection = "summary".
3. Use an editorial color palette.
4. VARY your choices — two creative CVs in a row should NOT share the same
   combination of grid + sectionTreatment + nameTreatment.

IMPORTANT: think like a magazine art director, not a resume-builder.`;

  return prompt;
}

function getFallback(industry?: string): CVDesignTokens {
  const decorationTheme = industryToDecorationTheme(industry, 'creative');
  return {
    styleName: 'Editorial',
    styleRationale: 'Magazine-style editorial layout with refined typography.',
    industryFit: industry || 'creative',
    themeBase: 'creative',
    colors: {
      primary: '#1f2233',
      secondary: '#faf8f4',
      accent: '#c77757',
      text: '#1a1a1a',
      muted: '#6b6459',
    },
    fontPairing: 'playfair-inter',
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'asymmetric',
    sectionStyle: 'magazine',
    skillsDisplay: 'compact',
    experienceDescriptionFormat: 'paragraph',
    contactLayout: 'single-row',
    headerGradient: 'none',
    showPhoto: true,
    useIcons: false,
    roundedCorners: false,
    headerFullBleed: false,
    decorations: 'none',
    decorationTheme,
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications', 'interests'],
    layout: 'single-column',
    pageBackground: '#faf8f4',
    editorial: {
      headerLayout: 'stacked',
      nameTreatment: 'oversized-serif',
      accentTreatment: 'thin-rule',
      sectionTreatment: 'numbered',
      grid: 'asymmetric-60-40',
      divider: 'hairline',
      typographyScale: 'editorial',
      sectionNumbering: true,
    },
  };
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

  if (!constraints.allowedThemes.includes(tokens.themeBase)) tokens.themeBase = constraints.allowedThemes[0];
  if (!constraints.allowedFontPairings.includes(tokens.fontPairing)) tokens.fontPairing = constraints.allowedFontPairings[0];

  if (typeof rawPartial.showPhoto !== 'boolean') {
    tokens.showPhoto = ctx.hasPhoto;
  }

  const signals = readContextSignals(ctx);
  if (!rawPartial.layout) {
    tokens.layout = signals.wantsTwoColumn || signals.isCorporate ? 'sidebar-right' : fallback.layout;
  }
  if (!rawPartial.sidebarSections || rawPartial.sidebarSections.length === 0) {
    tokens.sidebarSections = fallback.sidebarSections || ['skills', 'languages', 'certifications'];
  }

  // Resolve editorial sub-tokens (fills missing fields, font-pair fix-up)
  tokens.editorial = validateAndFixEditorialTokens(tokens.editorial, tokens.fontPairing);

  // Keep corporate / compact requests in a true multi-column grid unless the
  // AI explicitly chose the manuscript layout.
  if (
    tokens.editorial.grid === 'three-column-intro' ||
    ((signals.wantsTwoColumn || signals.isCorporate) && !rawPartial.editorial?.grid && tokens.editorial.grid === 'full-bleed')
  ) {
    tokens.editorial.grid = signals.isCorporate ? 'asymmetric-70-30' : 'asymmetric-60-40';
  }

  applyBaseValidations(tokens, LOG_TAG);
  clearOtherRendererTokens(tokens, 'editorial');

  // THE FIX: rotate editorial.* primitives (not base headerVariant/sectionStyle
  // which the editorial renderer ignores entirely).
  rotateLeastUsed(
    tokens,
    ctx.styleHistory,
    {
      'editorial.headerLayout': EDITORIAL_POOLS.headerLayout,
      'editorial.nameTreatment': EDITORIAL_POOLS.nameTreatment,
      'editorial.sectionTreatment': EDITORIAL_POOLS.sectionTreatment,
      'editorial.grid': EDITORIAL_POOLS.grid,
      'editorial.divider': EDITORIAL_POOLS.divider,
      'editorial.accentTreatment': EDITORIAL_POOLS.accentTreatment,
      'editorial.typographyScale': EDITORIAL_POOLS.typographyScale,
      fontPairing: constraints.allowedFontPairings,
    },
    LOG_TAG,
  );

  // If history rotated nameTreatment to one that doesn't match the font
  // anymore, fix-up again (cheap) — keeps the pairing rule invariant.
  tokens.editorial = validateAndFixEditorialTokens(tokens.editorial, tokens.fontPairing);

  return tokens;
}

export const creativeExpert: StyleExpert = {
  level: 'creative',
  schema: creativeSchema,
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
