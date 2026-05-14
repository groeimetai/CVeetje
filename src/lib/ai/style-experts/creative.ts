/**
 * Creative expert — editorial / magazine CVs with strong art direction.
 *
 * Position in the creativity ladder:
 *   conservative < balanced < CREATIVE < experimental
 *
 * Creative is "AI decides more" territory. Compared to balanced it picks:
 *   - a layoutArchetype (5 distinct compositions, not just header variants)
 *   - a multi-color editorial palette (2-3 colors used as design colors,
 *     not one accent on neutral)
 *   - a bag of decorative elements (drop caps, pull quotes, decorative
 *     numerals, marginalia, kicker labels, colored section titles)
 *   - the full set of orthogonal editorial primitives
 *
 * Compared to experimental: still readable, no riso-grain / clash colors,
 * no Canva-style skill bars. Designed, not loud.
 */

import { z } from 'zod';
import type { CVDesignTokens } from '@/types/design-tokens';
import type {
  EditorialDecorElement,
  EditorialLayoutArchetype,
  EditorialColorPolicy,
} from '@/types/design-tokens';
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
  // High-level composition pick — the AI's biggest layout decision
  layoutArchetype: z.enum([
    'magazine-column', 'editorial-spread', 'asymmetric-feature', 'feature-sidebar', 'manuscript-mono',
  ]).optional().describe(
    `THE BIGGEST DECISION. Picks the overall page composition:
- magazine-column: single column, strong masthead, decorative dividers, dense type
- editorial-spread: 2-col with margin-notes column (dates, company names float left)
- asymmetric-feature: full-width hero band + offset main column flowing under
- feature-sidebar: dense main column + tinted skills/certs sidebar
- manuscript-mono: centered manuscript with optical proportions, NO sidebar`,
  ),
  // Color policy — how many palette colors actually appear on the page
  colorPolicy: z.enum(['mono-accent', 'duotone', 'tritone']).optional().describe(
    `Color richness:
- mono-accent: one accent on neutral (classic)
- duotone: primary + accent both as visible design colors
- tritone: primary + secondaryColor + accent — true magazine palette`,
  ),
  secondaryColor: z.string().optional().describe(
    'Second design color (hex) when colorPolicy = "tritone". Used for marginalia, decorative numerals, and a second-tier accent. Must contrast against the page bg and not clash with primary/accent.',
  ),
  // Decorative element toggles — pick 2-4 of these to layer on
  decorElements: z.array(z.enum([
    'drop-cap', 'pull-quote', 'decorative-numerals', 'marginalia',
    'rule-ornaments', 'kicker-labels', 'colored-section-titles', 'first-line-emphasis',
  ])).optional().describe(
    `Decorative elements to layer on. PICK 2-4 — too many fights for attention. Each element adds a clearly designed detail:
- drop-cap: first letter of summary as oversized decorative cap
- pull-quote: pull a phrase from experience as a magazine-style quote
- decorative-numerals: huge chapter-style 01/02 numerals on section titles
- marginalia: dates/company names float into the left margin (only with editorial-spread)
- rule-ornaments: ✦ ornaments on horizontal dividers
- kicker-labels: small-caps kicker above each section title
- colored-section-titles: section titles use secondaryColor or accent
- first-line-emphasis: first sentence of summary set in display font + larger`,
  ),
  // Existing primitives — the AI still tunes these freely
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
    `Name typography — the biggest typographic choice. Match to the font pairing.`,
  ),
  accentTreatment: z.enum([
    'thin-rule', 'vertical-bar', 'marker-highlight', 'ornament', 'number-prefix',
  ]).optional().describe('Small visual accent marking the header as designed, not templated.'),
  sectionTreatment: z.enum(['numbered', 'kicker', 'sidenote', 'drop-cap', 'pull-quote']).optional().describe(
    'How section titles are typeset.',
  ),
  grid: z.enum([
    'asymmetric-60-40', 'asymmetric-70-30', 'full-bleed', 'manuscript', 'three-column-intro',
  ]).optional().describe('Page grid (fine-grained — the archetype is the main switch).'),
  divider: z.enum(['none', 'hairline', 'double-rule', 'ornament', 'whitespace-large']).optional().describe(
    'How sections are separated.',
  ),
  typographyScale: z.enum(['modest', 'editorial', 'hero']).optional().describe('Overall type scale.'),
  sectionNumbering: z.boolean().optional().describe('Whether sections get 01/02/03 prefixes.'),
  pullQuoteSource: z.string().optional().describe('Section for pull quote (only when decorElements includes pull-quote or sectionTreatment=pull-quote).'),
  dropCapSection: z.string().optional().describe('Section for drop-cap (only when decorElements includes drop-cap or sectionTreatment=drop-cap).'),
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
  layoutArchetype: [
    'magazine-column', 'editorial-spread', 'asymmetric-feature', 'feature-sidebar', 'manuscript-mono',
  ] as const,
  colorPolicy: ['mono-accent', 'duotone', 'tritone'] as const,
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
  decorElements: [
    'drop-cap', 'pull-quote', 'decorative-numerals', 'marginalia',
    'rule-ornaments', 'kicker-labels', 'colored-section-titles', 'first-line-emphasis',
  ] as const,
};

// Default decor bags per archetype — used by the fallback. The AI is free to
// override these but they're a reasonable starting point per layout.
const ARCHETYPE_DEFAULTS: Record<EditorialLayoutArchetype, {
  decor: EditorialDecorElement[];
  grid: typeof EDITORIAL_POOLS.grid[number];
  layout: 'single-column' | 'sidebar-right' | 'sidebar-left';
  divider: typeof EDITORIAL_POOLS.divider[number];
  headerLayout: typeof EDITORIAL_POOLS.headerLayout[number];
  policy: EditorialColorPolicy;
}> = {
  'magazine-column': {
    decor: ['drop-cap', 'kicker-labels', 'rule-ornaments'],
    grid: 'full-bleed',
    layout: 'single-column',
    divider: 'ornament',
    headerLayout: 'stacked',
    policy: 'duotone',
  },
  'editorial-spread': {
    decor: ['marginalia', 'pull-quote', 'colored-section-titles', 'first-line-emphasis'],
    grid: 'asymmetric-70-30',
    layout: 'single-column',
    divider: 'hairline',
    headerLayout: 'split',
    policy: 'tritone',
  },
  'asymmetric-feature': {
    decor: ['decorative-numerals', 'first-line-emphasis', 'kicker-labels'],
    grid: 'full-bleed',
    layout: 'single-column',
    divider: 'whitespace-large',
    headerLayout: 'band',
    policy: 'duotone',
  },
  'feature-sidebar': {
    decor: ['decorative-numerals', 'kicker-labels', 'colored-section-titles'],
    grid: 'asymmetric-60-40',
    layout: 'sidebar-right',
    divider: 'hairline',
    headerLayout: 'split',
    policy: 'tritone',
  },
  'manuscript-mono': {
    decor: ['drop-cap', 'rule-ornaments', 'kicker-labels'],
    grid: 'manuscript',
    layout: 'single-column',
    divider: 'ornament',
    headerLayout: 'stacked',
    policy: 'mono-accent',
  },
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
      styleRationale: 'Editorial restraint with structured marginalia and a deep tritone palette for strategy roles.',
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
        layoutArchetype: 'editorial-spread',
        colorPolicy: 'tritone',
        secondaryColor: '#5e2a2a',
        decorElements: ['marginalia', 'first-line-emphasis', 'colored-section-titles', 'pull-quote'],
        headerLayout: 'split',
        nameTreatment: 'uppercase-tracked',
        accentTreatment: 'thin-rule',
        sectionTreatment: 'numbered',
        grid: 'asymmetric-70-30',
        divider: 'hairline',
        typographyScale: 'modest',
        sectionNumbering: true,
      },
      layout: 'single-column',
      sidebarSections: ['skills', 'languages', 'certifications'],
    };
  }

  if (signals.isCreativeRole || signals.wantsLoud) {
    return {
      ...base,
      styleName: 'Editorial Feature',
      styleRationale: 'Big hero band, decorative numerals and a duotone palette — feels like a feature article in a culture magazine.',
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
        layoutArchetype: 'asymmetric-feature',
        colorPolicy: 'duotone',
        decorElements: ['decorative-numerals', 'first-line-emphasis', 'kicker-labels', 'pull-quote'],
        headerLayout: 'band',
        nameTreatment: 'condensed-impact',
        accentTreatment: 'marker-highlight',
        sectionTreatment: 'kicker',
        grid: 'full-bleed',
        divider: 'whitespace-large',
        typographyScale: 'hero',
        sectionNumbering: true,
      },
      layout: 'single-column',
    };
  }

  if (signals.wantsMinimal) {
    return {
      ...base,
      fontPairing: 'libre-baskerville-source-sans',
      editorial: {
        layoutArchetype: 'manuscript-mono',
        colorPolicy: 'mono-accent',
        decorElements: ['drop-cap', 'rule-ornaments', 'kicker-labels'],
        headerLayout: 'stacked',
        nameTreatment: 'oversized-serif',
        accentTreatment: 'thin-rule',
        sectionTreatment: 'numbered',
        grid: 'manuscript',
        divider: 'ornament',
        typographyScale: 'modest',
        sectionNumbering: true,
      },
      layout: 'single-column',
    };
  }

  if (signals.wantsTwoColumn) {
    return {
      ...base,
      editorial: {
        ...base.editorial!,
        layoutArchetype: 'feature-sidebar',
        grid: 'asymmetric-60-40',
        colorPolicy: 'tritone',
        decorElements: ['decorative-numerals', 'colored-section-titles', 'kicker-labels'],
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
  colors: CVDesignTokens['colors'],
): NonNullable<CVDesignTokens['editorial']> {
  const isValid = <T extends string>(val: unknown, allowed: readonly T[]): val is T =>
    typeof val === 'string' && allowed.includes(val as T);
  const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

  // 1. Archetype (the big decision) — pick first because it informs defaults
  const layoutArchetype = isValid(raw?.layoutArchetype, EDITORIAL_POOLS.layoutArchetype)
    ? raw!.layoutArchetype
    : pickFrom(EDITORIAL_POOLS.layoutArchetype);
  const archDefault = ARCHETYPE_DEFAULTS[layoutArchetype];

  const headerLayout = isValid(raw?.headerLayout, EDITORIAL_POOLS.headerLayout)
    ? raw!.headerLayout
    : archDefault.headerLayout;

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
  const grid = isValid(raw?.grid, EDITORIAL_POOLS.grid) ? raw!.grid : archDefault.grid;
  const dividerAll = ['none', ...EDITORIAL_POOLS.divider] as const;
  const divider = isValid(raw?.divider, dividerAll) ? raw!.divider : archDefault.divider;
  const typographyScale = isValid(raw?.typographyScale, EDITORIAL_POOLS.typographyScale)
    ? raw!.typographyScale
    : 'editorial';

  // 2. Color policy + secondaryColor
  const colorPolicy = isValid(raw?.colorPolicy, EDITORIAL_POOLS.colorPolicy)
    ? raw!.colorPolicy
    : archDefault.policy;

  let secondaryColor: string | undefined;
  if (raw?.secondaryColor && HEX_RE.test(raw.secondaryColor)) {
    secondaryColor = raw.secondaryColor;
  } else if (colorPolicy === 'tritone') {
    // Derive a second design color: prefer accent-shifted hue or a deep tone
    secondaryColor = deriveSecondaryColor(colors.primary, colors.accent);
  }

  // 3. Decor elements — keep 2-4, dedupe, validate
  let decorElements: EditorialDecorElement[] = [];
  if (Array.isArray(raw?.decorElements)) {
    const seen = new Set<string>();
    for (const el of raw!.decorElements) {
      if (
        typeof el === 'string' &&
        (EDITORIAL_POOLS.decorElements as readonly string[]).includes(el) &&
        !seen.has(el)
      ) {
        decorElements.push(el as EditorialDecorElement);
        seen.add(el);
      }
    }
  }
  if (decorElements.length === 0) {
    decorElements = [...archDefault.decor];
  }
  // Cap at 4 — anything more fights for attention
  if (decorElements.length > 4) decorElements = decorElements.slice(0, 4);
  // Archetype-specific constraint: marginalia only makes sense in editorial-spread
  if (layoutArchetype !== 'editorial-spread') {
    decorElements = decorElements.filter(el => el !== 'marginalia');
  }
  // colored-section-titles requires a secondaryColor when policy is mono
  if (decorElements.includes('colored-section-titles') && colorPolicy === 'mono-accent') {
    // Allow it but the renderer falls back to accent
  }

  // 4. Reconcile pull-quote / drop-cap sources
  let pullQuoteSource: string | undefined;
  const wantsPullQuote = sectionTreatment === 'pull-quote' || decorElements.includes('pull-quote');
  if (wantsPullQuote) pullQuoteSource = (raw?.pullQuoteSource || 'experience').toString();
  let dropCapSection: string | undefined;
  const wantsDropCap = sectionTreatment === 'drop-cap' || decorElements.includes('drop-cap');
  if (wantsDropCap) dropCapSection = (raw?.dropCapSection || 'summary').toString();

  const sectionNumbering = typeof raw?.sectionNumbering === 'boolean'
    ? raw!.sectionNumbering
    : decorElements.includes('decorative-numerals') || true;

  return {
    layoutArchetype,
    colorPolicy,
    secondaryColor,
    decorElements,
    headerLayout, nameTreatment, accentTreatment, sectionTreatment, grid, divider,
    typographyScale, sectionNumbering, pullQuoteSource, dropCapSection,
  };
}

/** Derive a coherent secondary design color from primary + accent.
 *
 * Heuristic: take primary, shift its hue toward a complementary direction
 * for stronger contrast, lighten slightly so it can be used at body sizes
 * without overwhelming. If the result clashes (close to accent) we re-shift.
 */
function deriveSecondaryColor(primary: string, accent: string): string {
  // Convert primary hex to HSL, shift hue, return as hex
  const hsl = hexToHsl(primary);
  const accentHsl = hexToHsl(accent);
  if (!hsl || !accentHsl) return primary;

  // Shift hue ~30deg from primary, but make sure we're at least 40deg away
  // from the accent so the two colors don't clash.
  let h = (hsl.h + 35) % 360;
  const accentDistance = Math.min(
    Math.abs(h - accentHsl.h),
    360 - Math.abs(h - accentHsl.h),
  );
  if (accentDistance < 40) {
    h = (hsl.h + 320) % 360; // shift the other way
  }

  // Keep it readable: medium saturation, deep-ish lightness
  const s = Math.max(0.35, Math.min(hsl.s, 0.55));
  const l = Math.max(0.22, Math.min(hsl.l, 0.40));

  return hslToHex(h, s, l);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d) + (g < b ? 6 : 0); break;
      case g: h = ((b - r) / d) + 2; break;
      case b: h = ((r - g) / d) + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v: number) => {
    const n = Math.round((v + m) * 255);
    return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ============ Prompts ============

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints.creative;
  return `${commonSystemHeader(hasPhoto)}

*** CREATIVE MODE — EDITORIAL / MAGAZINE OUTPUT — AI DECIDES MORE ***

Think Kinfolk, Wallpaper*, The Gentlewoman, Apartamento, MIT Tech Review,
Frieze. Editorial layout with real typographic hierarchy, asymmetric grids,
print-quality proportions — and visible art direction.

This is the level where YOU make most of the design decisions: layout
archetype, color richness (mono/duo/tritone), and which decorative elements
to layer on. Bolder than the balanced level. More designed than a typical
CV. Still readable, still print-safe.

A dedicated editorial renderer handles this level. Fill the \`editorial\`
object thoroughly. The renderer combines ALL of these freely.

================================
THE PRIMITIVES (in order of importance):
================================

**1. layoutArchetype** — THE BIG DECISION
- magazine-column: single column, strong masthead, decorative dividers
- editorial-spread: 2-col layout with margin-notes (dates, company names float left)
- asymmetric-feature: full-width hero band + offset main column
- feature-sidebar: dense main + tinted skills/certs sidebar
- manuscript-mono: centered manuscript, optical proportions, NO sidebar

**2. colorPolicy** — how many colors are visible
- mono-accent: classic editorial restraint (1 accent on neutral)
- duotone: primary + accent both as visible design colors
- tritone: primary + secondaryColor + accent (true magazine palette)
PREFER duotone or tritone — that's how Creative clears the Balanced bar.

**3. secondaryColor** — set when colorPolicy = 'tritone'. A real hex code
that contrasts against the page background and doesn't clash with primary
or accent. Used for marginalia, decorative numerals, and section titles.

**4. decorElements** — pick 2-4 decorative treatments
- drop-cap: first letter of summary as oversized cap
- pull-quote: a phrase from experience set as magazine pull quote
- decorative-numerals: huge chapter-style 01/02 next to section titles
- marginalia: dates/company in left margin (REQUIRES editorial-spread)
- rule-ornaments: ✦ on dividers
- kicker-labels: small-caps kicker above each section title
- colored-section-titles: section titles take secondaryColor or accent
- first-line-emphasis: first sentence of summary set in display font, larger

**5. Existing primitives (orthogonal):**
- headerLayout — stacked | split | band | overlap
- nameTreatment — oversized-serif | oversized-sans | uppercase-tracked | mixed-italic | condensed-impact
  Match to the font pairing:
  - oversized-serif → playfair-inter, dm-serif-dm-sans, merriweather, libre-baskerville
  - oversized-sans → montserrat, poppins, raleway, space-grotesk
  - mixed-italic → playfair-inter, libre-baskerville, dm-serif
  - uppercase-tracked → any
  - condensed-impact → oswald-source-sans (only)
- accentTreatment — thin-rule | vertical-bar | marker-highlight | ornament | number-prefix
- sectionTreatment — numbered | kicker | sidenote | drop-cap | pull-quote
- grid — asymmetric-60-40 | asymmetric-70-30 | full-bleed | manuscript | three-column-intro
- divider — none | hairline | double-rule | ornament | whitespace-large
- typographyScale — modest | editorial | hero
- sectionNumbering — true | false
- pullQuoteSource — set to "experience" when pull-quote is active
- dropCapSection — set to "summary" when drop-cap is active

FONTS (required from): ${constraints.allowedFontPairings.join(' | ')}

COLORS — multi-color editorial palettes (NOT single accent on neutral):
- Primary: deep and confident (ink, burgundy, forest, navy, plum, oxblood, slate, charcoal)
- Accent: a deliberate pop color (amber, terracotta, emerald, coral, marigold, rose, ochre, mustard, copper)
- secondaryColor (tritone only): a real second design color — burgundy/teal/olive/forest/oxblood pairs that hold their own at section-title size. Must contrast with primary and not clash with accent (≥40deg hue distance).
- Secondary (the BACKGROUND tint): paper-tinted (#faf8f4, #f5f2eb, #f7f4ec)
- Text: near-black (#1a1a1a — #2a2a2a)
- Muted: warm grey (#6b6459 — #7a7468)
Brand-aware allowed when company brand is genuinely common knowledge.
Avoid neon and electric saturated blues — those belong to experimental.

EXAMPLES OF GOOD CREATIVE OUTPUT:

1. Elegant tech consultant (asymmetric-feature, duotone)
   - playfair-inter, oversized-serif, hero scale, hero-band header
   - decorElements: ['decorative-numerals', 'first-line-emphasis', 'kicker-labels']
   - palette: ink primary + amber accent (#1d1d2b + #e0a14a)

2. Fashion / marketing (asymmetric-feature, duotone)
   - oswald, condensed-impact, hero scale, band header
   - decorElements: ['decorative-numerals', 'pull-quote', 'kicker-labels', 'first-line-emphasis']
   - palette: oxblood + ochre + clay

3. Editor / literary (editorial-spread, tritone)
   - libre-baskerville, mixed-italic, modest scale, split header
   - decorElements: ['marginalia', 'pull-quote', 'first-line-emphasis', 'colored-section-titles']
   - palette: forest primary + burgundy secondaryColor + ochre accent

4. Strategy senior (feature-sidebar, tritone)
   - dm-serif, uppercase-tracked, editorial scale, split header
   - decorElements: ['decorative-numerals', 'kicker-labels', 'colored-section-titles']
   - palette: deep navy + burgundy secondaryColor + terracotta accent

5. Calm minimalist (manuscript-mono, mono-accent)
   - libre-baskerville, oversized-serif, modest scale, stacked header
   - decorElements: ['drop-cap', 'rule-ornaments', 'kicker-labels']
   - palette: charcoal + restrained brass accent

OTHER TOKENS (required on base schema):
- themeBase: 'creative' or 'modern'
- showPhoto: ${hasPhoto ? 'true' : 'false'}
- useIcons: false (typography does the work)
- headerVariant/sectionStyle: any — ignored by editorial renderer
${commonSectionOrderFooter}`;
}

function buildUserPrompt(ctx: PromptContext): string {
  let prompt = buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences);

  if (ctx.jobVacancy) {
    prompt += `
DESIGN INSPIRATION:
Industry: "${ctx.jobVacancy.industry || 'Unknown'}", Company: "${ctx.jobVacancy.company || 'Unknown'}".
Use this as INSPIRATION — keep it relevant. If you're 100% CERTAIN about the
company's brand colors, incorporate them boldly (potentially as secondaryColor
or accent). Otherwise create a striking editorial palette that fits the
industry vibe.
`;
  }

  // Variation nudge — each render uses fresh randomized primitives picked
  // from the per-level pools.
  const mood = pickFrom(colorMoods);
  const fontDir = pickFrom(fontDirections);
  prompt += `
VARIATION NUDGE (diversity signal — the industry profile above is still the
primary driver, but use these to avoid repeating the same combination):
- Suggested color mood: "${mood.mood}" — ${mood.description}
- Typography flavour: ${fontDir.hint}
- Try editorial.layoutArchetype = "${pickFrom(EDITORIAL_POOLS.layoutArchetype)}"
- Try editorial.colorPolicy = "${pickFrom(EDITORIAL_POOLS.colorPolicy)}"
- Try editorial.headerLayout = "${pickFrom(EDITORIAL_POOLS.headerLayout)}"
- Try editorial.nameTreatment = "${pickFrom(EDITORIAL_POOLS.nameTreatment)}"
`;

  prompt += `
Generate tokens for the EDITORIAL RENDERER. The most important parts are:
1. editorial.layoutArchetype (the page composition)
2. editorial.colorPolicy (mono/duo/tritone) — prefer duotone or tritone
3. editorial.decorElements (pick 2-4, not too many)
4. editorial.secondaryColor (when colorPolicy=tritone — must be a real hex)

Non-negotiables:
1. Fill editorial.layoutArchetype AND editorial.colorPolicy.
2. If colorPolicy = 'tritone', provide editorial.secondaryColor as a real hex.
3. Match nameTreatment to the fontPairing (see system prompt table).
4. If decorElements includes 'pull-quote', set pullQuoteSource = "experience".
5. If decorElements includes 'drop-cap', set dropCapSection = "summary".
6. 'marginalia' only with layoutArchetype = 'editorial-spread'.
7. VARY your choices — two creative CVs in a row should NOT share the same
   layoutArchetype + colorPolicy + nameTreatment combination.

IMPORTANT: think like a magazine art director, not a resume-builder. Show
that the AI is making strong design decisions, not picking conservative
defaults.`;

  return prompt;
}

function getFallback(industry?: string): CVDesignTokens {
  const decorationTheme = industryToDecorationTheme(industry, 'creative');
  return {
    styleName: 'Editorial',
    styleRationale: 'Magazine-style editorial layout with refined typography and a duotone palette.',
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
      layoutArchetype: 'magazine-column',
      colorPolicy: 'duotone',
      decorElements: ['drop-cap', 'kicker-labels', 'rule-ornaments'],
      headerLayout: 'stacked',
      nameTreatment: 'oversized-serif',
      accentTreatment: 'thin-rule',
      sectionTreatment: 'numbered',
      grid: 'full-bleed',
      divider: 'ornament',
      typographyScale: 'editorial',
      sectionNumbering: true,
      dropCapSection: 'summary',
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

  // Resolve editorial sub-tokens (fills missing fields, font-pair fix-up,
  // archetype + colorPolicy + decor + secondaryColor)
  tokens.editorial = validateAndFixEditorialTokens(tokens.editorial, tokens.fontPairing, tokens.colors);

  // Layout flows from the archetype — but user override wins
  if (!rawPartial.layout) {
    const archetype = tokens.editorial.layoutArchetype || 'magazine-column';
    const archDefault = ARCHETYPE_DEFAULTS[archetype].layout;
    tokens.layout = (signals.wantsTwoColumn || signals.isCorporate)
      ? (archetype === 'feature-sidebar' ? archDefault : 'sidebar-right')
      : archDefault;
  }
  if (!rawPartial.sidebarSections || rawPartial.sidebarSections.length === 0) {
    tokens.sidebarSections = fallback.sidebarSections || ['skills', 'languages', 'certifications'];
  }

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

  // Rotate primitives the renderer actually keys off of — including the new
  // archetype + colorPolicy axes — to prevent same-look-twice convergence.
  rotateLeastUsed(
    tokens,
    ctx.styleHistory,
    {
      'editorial.layoutArchetype': EDITORIAL_POOLS.layoutArchetype,
      'editorial.colorPolicy': EDITORIAL_POOLS.colorPolicy,
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

  // If history rotated nameTreatment/archetype to one that doesn't match the
  // font anymore, fix-up again (cheap) — keeps invariants.
  tokens.editorial = validateAndFixEditorialTokens(tokens.editorial, tokens.fontPairing, tokens.colors);

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
