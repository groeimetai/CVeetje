/**
 * Creative expert — v4: concept-first, content-driven editorial direction.
 *
 * Position in the creativity ladder:
 *   conservative < balanced < CREATIVE < experimental
 *
 * Where experimental v4 went avant-garde (loud, art-directed), creative v4
 * goes editorial-restrained — Kinfolk, Wallpaper*, Frieze, The Gentlewoman,
 * Monocle. Designed, considered, readable. Multi-color palettes (mono /
 * duotone / tritone) and real typographic hierarchy.
 *
 * v4 brings the same three architectural moves as experimental:
 *
 *   1. CONCEPT-FIRST. AI writes a one-sentence art-direction statement
 *      BEFORE picking tokens. The concept primes everything downstream
 *      and makes variation legible across generations.
 *
 *   2. CONTENT-DRIVEN. AI picks WHICH content gets the editorial treatment:
 *      which sentence becomes the lede, which experience-highlight becomes
 *      the pull quote, which letter gets the drop-cap, which keywords get
 *      accent-color highlights. Two CVs for the same person with the same
 *      archetype differ because the content treatment differs.
 *
 *   3. PALETTE-RULES. Instead of picking from a fixed mood pool, the AI
 *      picks a palette *rule* and invents the hexes that satisfy it.
 *
 * Plus: 2 new archetypes (cover-feature, index-card) and a direct history
 * hint in the user prompt so the AI sees what NOT to repeat.
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
import { pickFrom, rotateLeastUsed, getAtPath } from './shared/variation';

const LOG_TAG = 'Style Gen [creative]';

// ============ Schema ============

const editorialSchema = z.object({
  // ===== CONCEPT-FIRST (v4) — AI writes this BEFORE everything else =====
  conceptStatement: z.string().optional().describe(
    `ONE-SENTENCE EDITORIAL ART-DIRECTION STATEMENT. Write this FIRST,
    before any other token. Everything downstream — archetype, palette
    rule, decor elements, pull-quote text, lede — should flow from it.

    Strong concepts reference the candidate AND the visual world:
    - "Kinfolk-calm retrospective for a strategist who spends weekends
      gardening — bone paper, dusty sage, generous whitespace."
    - "Frieze-style gallery essay for a curator whose career reads like
      a long-form exhibition catalog — dense, footnoted, terracotta."
    - "Wallpaper modernist spread for an architect who edits as much as
      she designs — asymmetric, navy + ochre, considered."
    - "Gentlewoman portrait of a literary editor; italic kickers, generous
      margins, oxblood + ivory."

    WEAK concepts to rewrite:
    - "Modern editorial CV with magazine flair"
    - "Refined and creative design"
    - "Stylish layout for a creative professional"`,
  ),
  conceptMotif: z.enum([
    'kinfolk', 'wallpaper', 'gentlewoman', 'frieze',
    'apartamento', 'monocle', 'cabinet', 'tech-review',
  ]).optional().describe(
    `Controlled-vocab shorthand for the editorial visual world:
    - kinfolk: calm, generous whitespace, warm restraint
    - wallpaper: modernist, asymmetric, considered
    - gentlewoman: literary, italic, generous, slightly nostalgic
    - frieze: gallery-academic, dense, footnoted
    - apartamento: warm, slightly off-key, hand-set feel
    - monocle: corporate-luxury, italic kickers, dense pages
    - cabinet: antiquarian, sepia, marginalia-rich
    - tech-review: clean, infographic-adjacent, accent-driven`,
  ),

  // ===== TOP-LEVEL ARCHETYPE =====
  layoutArchetype: z.enum([
    'magazine-column', 'editorial-spread', 'asymmetric-feature',
    'feature-sidebar', 'manuscript-mono',
    'cover-feature', 'index-card',
  ]).optional().describe(
    `THE big page-skeleton decision:
    - magazine-column: single column, strong masthead, decorative dividers
    - editorial-spread: 2-col with margin-notes column (sidenotes / dates)
    - asymmetric-feature: full-width hero band + offset main column
    - feature-sidebar: dense main + tinted skills/certs sidebar
    - manuscript-mono: centered manuscript, optical proportions, NO sidebar
    - cover-feature (v4): magazine cover with hero portrait, oversized
      title, lede on cover, table-of-contents-like section list below
    - index-card (v4): library catalog aesthetic — boxed sections with
      small caps tabs, dense paragraph layouts, librarian feel`,
  ),

  colorPolicy: z.enum(['mono-accent', 'duotone', 'tritone']).optional().describe(
    `Color richness:
    - mono-accent: classic editorial restraint (1 accent on neutral)
    - duotone: primary + accent both as visible design colors
    - tritone: primary + secondaryColor + accent (true magazine palette)
    PREFER duotone or tritone — that's how Creative clears the Balanced bar.`,
  ),
  secondaryColor: z.string().optional().describe(
    'Second design color (hex) when colorPolicy = "tritone". Must contrast against page bg and be ≥40deg hue distance from primary AND accent.',
  ),

  // ===== Decorative element bag =====
  decorElements: z.array(z.enum([
    'drop-cap', 'pull-quote', 'decorative-numerals', 'marginalia',
    'rule-ornaments', 'kicker-labels', 'colored-section-titles', 'first-line-emphasis',
  ])).optional().describe(
    `Decorative elements to layer on. PICK 2-4 — too many fight for attention.`,
  ),

  // ===== CONTENT-DRIVEN PRIMITIVES (v4) =====
  pullQuoteText: z.string().optional().describe(
    `The actual pull-quote text (max ~30 words). PICK FROM THE CANDIDATE'S
    EXPERIENCE HIGHLIGHTS or SUMMARY — the most quotable, specific phrase.
    When set, the renderer uses this instead of the default first-highlight.
    NEVER generic ("Passionate about innovation") — specifics WIN.`,
  ),
  pullQuoteAttribution: z.string().optional().describe(
    `Attribution line for the pull quote. Example: "— Senior Strategist,
    Stedelijk" or "— Founder, Studio Atlas, 2024". When unset the renderer
    derives from experience[0].title + company.`,
  ),
  dropCapLetter: z.string().optional().describe(
    `The actual letter to use for drop-cap when active. Defaults to the
    first letter of the summary. Letting you pick allows typographic moves
    like using the candidate's initial or a deliberate consonant.`,
  ),
  ledeText: z.string().optional().describe(
    `The opening sentence rendered in display font when first-line-emphasis
    is active. PICK FROM THE CANDIDATE'S SUMMARY — the most quotable opener.
    When unset, the renderer uses the actual first sentence of summary.`,
  ),
  nameTagline: z.string().optional().describe(
    `A Monocle-style tagline below the candidate's name. 2-6 words describing
    voice or angle, e.g. "Strategist, writer, gardener" or "Curator at
    large". Rendered as small caps with separators. NEVER cliche
    ("Driven professional", "Creative thinker").`,
  ),
  accentKeywords: z.array(z.string()).max(7).optional().describe(
    `3-7 keywords from the vacancy or candidate's experience that get
    accent-color highlights in body text. Pick DOMAIN TERMS — "circular
    economy", "long-form journalism", "type system" — not stop-words.`,
  ),
  marginNoteCopy: z.array(z.string()).max(8).optional().describe(
    `Custom marginalia text for the editorial-spread gutter — short
    phrases (period, company, locale, pivot moment) that float into the
    left column. One entry per experience item, in order. When unset,
    the renderer derives from period+location. PICK MEANINGFUL labels
    ("Berlin", "Sabbatical", "Promotion") instead of just dates.`,
  ),

  // ===== PALETTE GENERATION (v4) =====
  paletteRule: z.enum([
    'ink-and-paper', 'kinfolk-calm', 'literary-tritone', 'gallery-restraint',
    'ochre-paper', 'modernist-clash', 'tri-warmth', 'tri-cool', 'riso-zine',
  ]).optional().describe(
    `Palette-generation rule. Pick the rule, then fill hex values that
    satisfy it. NEVER reach for Tailwind defaults.
    - ink-and-paper: near-black + cream + ONE warm accent
    - kinfolk-calm: bone + dusty greens/blues + warm accent
    - literary-tritone: primary + burgundy/oxblood + warm accent
    - gallery-restraint: muted, dusty, gallery-poster colors
    - ochre-paper: cream + ochre + deep ink
    - modernist-clash: primary + complementary accent (one tension)
    - tri-warmth: three warm hues (ochre / terracotta / clay)
    - tri-cool: three cool hues (forest / teal / slate)
    - riso-zine: two saturated hues with print-zine energy (use sparingly)`,
  ),

  // ===== TYPOGRAPHY RHYTHM (v4) =====
  headingScaleRatio: z.number().min(1.0).max(3.0).optional().describe(
    `Continuous heading-to-body ratio. 1.2=modest, 1.6=comfortable,
    2.0=editorial-feature, 2.4+=cover/hero. Pick to match the concept —
    cover-feature wants ~2.4, manuscript-mono wants ~1.4.`,
  ),
  bodyDensity: z.enum(['whisper', 'normal', 'airy']).optional().describe(
    `Body-text density. whisper=tight tracking + small leading (archive/
    specimen feel), normal=standard editorial body, airy=generous tracking
    + leading (Kinfolk-spacious).`,
  ),
  asymmetryStrength: z.enum(['none', 'subtle', 'considered']).optional().describe(
    `Strength of asymmetric composition. Tame compared to experimental's
    'extreme' — caps at 'considered' (Wallpaper-modernist tension).`,
  ),

  // ===== Existing primitives — the AI still tunes these =====
  headerLayout: z.enum(['stacked', 'split', 'band', 'overlap']).optional(),
  nameTreatment: z.enum([
    'oversized-serif', 'oversized-sans', 'uppercase-tracked', 'mixed-italic', 'condensed-impact',
  ]).optional(),
  accentTreatment: z.enum([
    'thin-rule', 'vertical-bar', 'marker-highlight', 'ornament', 'number-prefix',
  ]).optional(),
  sectionTreatment: z.enum(['numbered', 'kicker', 'sidenote', 'drop-cap', 'pull-quote']).optional(),
  grid: z.enum([
    'asymmetric-60-40', 'asymmetric-70-30', 'full-bleed', 'manuscript', 'three-column-intro',
  ]).optional(),
  divider: z.enum(['none', 'hairline', 'double-rule', 'ornament', 'whitespace-large']).optional(),
  typographyScale: z.enum(['modest', 'editorial', 'hero']).optional(),
  sectionNumbering: z.boolean().optional(),
  pullQuoteSource: z.string().optional(),
  dropCapSection: z.string().optional(),
});

const creativeSchema = baseDesignTokensSchema.extend({
  editorial: editorialSchema.optional().describe(
    'Editorial layout tokens — drive the magazine-style renderer.',
  ),
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract']).optional(),
  layout: z.enum(['single-column', 'sidebar-left', 'sidebar-right']).optional(),
  sidebarSections: z.array(z.string()).optional(),
});

// ============ Pools ============

const EDITORIAL_POOLS = {
  layoutArchetype: [
    'magazine-column', 'editorial-spread', 'asymmetric-feature',
    'feature-sidebar', 'manuscript-mono',
    'cover-feature', 'index-card',
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
  // v4 pools
  conceptMotif: [
    'kinfolk', 'wallpaper', 'gentlewoman', 'frieze',
    'apartamento', 'monocle', 'cabinet', 'tech-review',
  ] as const,
  paletteRule: [
    'ink-and-paper', 'kinfolk-calm', 'literary-tritone', 'gallery-restraint',
    'ochre-paper', 'modernist-clash', 'tri-warmth', 'tri-cool', 'riso-zine',
  ] as const,
  bodyDensity: ['whisper', 'normal', 'airy'] as const,
  asymmetryStrength: ['none', 'subtle', 'considered'] as const,
};

// ============ Archetype defaults ============

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
    grid: 'full-bleed', layout: 'single-column', divider: 'ornament', headerLayout: 'stacked', policy: 'duotone',
  },
  'editorial-spread': {
    decor: ['marginalia', 'pull-quote', 'colored-section-titles', 'first-line-emphasis'],
    grid: 'asymmetric-70-30', layout: 'single-column', divider: 'hairline', headerLayout: 'split', policy: 'tritone',
  },
  'asymmetric-feature': {
    decor: ['decorative-numerals', 'first-line-emphasis', 'kicker-labels'],
    grid: 'full-bleed', layout: 'single-column', divider: 'whitespace-large', headerLayout: 'band', policy: 'duotone',
  },
  'feature-sidebar': {
    decor: ['decorative-numerals', 'kicker-labels', 'colored-section-titles'],
    grid: 'asymmetric-60-40', layout: 'sidebar-right', divider: 'hairline', headerLayout: 'split', policy: 'tritone',
  },
  'manuscript-mono': {
    decor: ['drop-cap', 'rule-ornaments', 'kicker-labels'],
    grid: 'manuscript', layout: 'single-column', divider: 'ornament', headerLayout: 'stacked', policy: 'mono-accent',
  },
  'cover-feature': {
    decor: ['first-line-emphasis', 'kicker-labels', 'colored-section-titles'],
    grid: 'full-bleed', layout: 'single-column', divider: 'hairline', headerLayout: 'band', policy: 'duotone',
  },
  'index-card': {
    decor: ['kicker-labels', 'rule-ornaments', 'colored-section-titles'],
    grid: 'three-column-intro', layout: 'single-column', divider: 'double-rule', headerLayout: 'stacked', policy: 'mono-accent',
  },
};

const nameTreatmentFontPreference: Record<string, string[]> = {
  'oversized-serif': ['playfair-inter', 'dm-serif-dm-sans', 'merriweather-source-sans', 'libre-baskerville-source-sans'],
  'oversized-sans': ['montserrat-open-sans', 'poppins-nunito', 'raleway-lato', 'space-grotesk-work-sans'],
  'mixed-italic': ['playfair-inter', 'libre-baskerville-source-sans', 'dm-serif-dm-sans'],
  'uppercase-tracked': ['inter-inter', 'montserrat-open-sans', 'raleway-lato', 'space-grotesk-work-sans', 'playfair-inter'],
  'condensed-impact': ['oswald-source-sans'],
};

// ============ Context signals ============

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
    isCreativeRole: /\b(creative|design|designer|marketing|brand|art|fashion|agency|copy|content|writer|editor|curator)\b/.test(combined),
    isLiteraryRole: /\b(editor|writer|journalist|author|publish|literary|copy|content)\b/.test(combined),
  };
}

// ============ History snapshot ============

interface HistorySnapshot {
  archetype: string | undefined;
  motif: string | undefined;
  paletteRule: string | undefined;
  primary: string | undefined;
}

function snapshotHistory(history: CVDesignTokens[] | undefined): HistorySnapshot[] {
  if (!history || history.length === 0) return [];
  return history.slice(0, 3).map(t => ({
    archetype: getAtPath(t, 'editorial.layoutArchetype'),
    motif: getAtPath(t, 'editorial.conceptMotif'),
    paletteRule: getAtPath(t, 'editorial.paletteRule'),
    primary: getAtPath(t, 'colors.primary'),
  }));
}

// ============ Validator ============

function validateAndFixEditorialTokens(
  raw: CVDesignTokens['editorial'] | undefined,
  fontPairing: string,
  colors: CVDesignTokens['colors'],
): NonNullable<CVDesignTokens['editorial']> {
  const isValid = <T extends string>(val: unknown, allowed: readonly T[]): val is T =>
    typeof val === 'string' && allowed.includes(val as T);
  const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

  // ===== Concept =====
  const conceptMotif = isValid(raw?.conceptMotif, EDITORIAL_POOLS.conceptMotif)
    ? raw!.conceptMotif
    : pickFrom(EDITORIAL_POOLS.conceptMotif);
  const conceptStatement = (typeof raw?.conceptStatement === 'string' && raw.conceptStatement.trim().length > 0)
    ? raw.conceptStatement.trim().slice(0, 240)
    : undefined;

  // ===== Archetype =====
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

  // ===== Color policy + secondaryColor =====
  const colorPolicy = isValid(raw?.colorPolicy, EDITORIAL_POOLS.colorPolicy)
    ? raw!.colorPolicy
    : archDefault.policy;

  let secondaryColor: string | undefined;
  if (raw?.secondaryColor && HEX_RE.test(raw.secondaryColor)) {
    secondaryColor = raw.secondaryColor;
  } else if (colorPolicy === 'tritone') {
    secondaryColor = deriveSecondaryColor(colors.primary, colors.accent);
  }

  // ===== Decor elements — 2-4, dedupe, archetype-aware =====
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
  if (decorElements.length === 0) decorElements = [...archDefault.decor];
  if (decorElements.length > 4) decorElements = decorElements.slice(0, 4);
  if (layoutArchetype !== 'editorial-spread') {
    decorElements = decorElements.filter(el => el !== 'marginalia');
  }
  if (sectionTreatment === 'sidenote') {
    decorElements = decorElements.filter(el => el !== 'decorative-numerals' && el !== 'kicker-labels');
  } else if (sectionTreatment === 'kicker') {
    decorElements = decorElements.filter(el => el !== 'kicker-labels');
  }

  // ===== Reconcile pull-quote / drop-cap sources =====
  let pullQuoteSource: string | undefined;
  const wantsPullQuote = sectionTreatment === 'pull-quote' || decorElements.includes('pull-quote');
  if (wantsPullQuote) pullQuoteSource = (raw?.pullQuoteSource || 'experience').toString();
  let dropCapSection: string | undefined;
  const wantsDropCap = sectionTreatment === 'drop-cap' || decorElements.includes('drop-cap');
  if (wantsDropCap) dropCapSection = (raw?.dropCapSection || 'summary').toString();

  const sectionNumbering = typeof raw?.sectionNumbering === 'boolean'
    ? raw!.sectionNumbering
    : decorElements.includes('decorative-numerals') || true;

  // ===== v4 content-driven primitives =====
  const pullQuoteText = (typeof raw?.pullQuoteText === 'string' && raw.pullQuoteText.trim().length > 0)
    ? raw.pullQuoteText.trim().slice(0, 240)
    : undefined;
  const pullQuoteAttribution = (typeof raw?.pullQuoteAttribution === 'string' && raw.pullQuoteAttribution.trim().length > 0)
    ? raw.pullQuoteAttribution.trim().slice(0, 80)
    : undefined;
  // dropCapLetter: keep exactly 1 character, uppercase
  let dropCapLetter: string | undefined;
  if (typeof raw?.dropCapLetter === 'string' && raw.dropCapLetter.trim().length > 0) {
    dropCapLetter = raw.dropCapLetter.trim().charAt(0).toUpperCase();
  }
  const ledeText = (typeof raw?.ledeText === 'string' && raw.ledeText.trim().length > 0)
    ? raw.ledeText.trim().slice(0, 220)
    : undefined;
  const nameTagline = (typeof raw?.nameTagline === 'string' && raw.nameTagline.trim().length > 0)
    ? raw.nameTagline.trim().slice(0, 80)
    : undefined;
  const accentKeywords = Array.isArray(raw?.accentKeywords)
    ? raw!.accentKeywords
      .filter((k): k is string => typeof k === 'string' && k.trim().length >= 3)
      .map(k => k.trim())
      .slice(0, 7)
    : undefined;
  const marginNoteCopy = Array.isArray(raw?.marginNoteCopy)
    ? raw!.marginNoteCopy
      .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim().slice(0, 32))
      .slice(0, 8)
    : undefined;

  // ===== v4 palette rule =====
  const paletteRule = isValid(raw?.paletteRule, EDITORIAL_POOLS.paletteRule)
    ? raw!.paletteRule
    : pickFrom(EDITORIAL_POOLS.paletteRule);

  // ===== v4 typography rhythm =====
  let headingScaleRatio: number;
  if (typeof raw?.headingScaleRatio === 'number' && Number.isFinite(raw.headingScaleRatio)) {
    headingScaleRatio = Math.max(1.0, Math.min(3.0, raw.headingScaleRatio));
  } else {
    headingScaleRatio = layoutArchetype === 'cover-feature' ? 2.4
      : layoutArchetype === 'asymmetric-feature' ? 2.0
      : layoutArchetype === 'manuscript-mono' ? 1.4
      : layoutArchetype === 'index-card' ? 1.3
      : 1.7;
  }
  const bodyDensity = isValid(raw?.bodyDensity, EDITORIAL_POOLS.bodyDensity)
    ? raw!.bodyDensity
    : (conceptMotif === 'kinfolk' || conceptMotif === 'gentlewoman' ? 'airy'
       : conceptMotif === 'cabinet' || conceptMotif === 'frieze' ? 'whisper'
       : 'normal');
  const asymmetryStrength = isValid(raw?.asymmetryStrength, EDITORIAL_POOLS.asymmetryStrength)
    ? raw!.asymmetryStrength
    : (conceptMotif === 'wallpaper' || layoutArchetype === 'asymmetric-feature' ? 'considered' : 'subtle');

  return {
    layoutArchetype,
    colorPolicy,
    secondaryColor,
    decorElements,
    headerLayout, nameTreatment, accentTreatment, sectionTreatment, grid, divider,
    typographyScale, sectionNumbering, pullQuoteSource, dropCapSection,
    // v4
    conceptStatement, conceptMotif,
    pullQuoteText, pullQuoteAttribution, dropCapLetter, ledeText, nameTagline,
    accentKeywords, marginNoteCopy,
    paletteRule, headingScaleRatio, bodyDensity, asymmetryStrength,
  };
}

function deriveSecondaryColor(primary: string, accent: string): string {
  const hsl = hexToHsl(primary);
  const accentHsl = hexToHsl(accent);
  if (!hsl || !accentHsl) return primary;
  let h = (hsl.h + 35) % 360;
  const accentDistance = Math.min(
    Math.abs(h - accentHsl.h),
    360 - Math.abs(h - accentHsl.h),
  );
  if (accentDistance < 40) h = (hsl.h + 320) % 360;
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
  let r = 0, g = 0, b = 0;
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

*** CREATIVE MODE — EDITORIAL ART DIRECTION ***

Think Kinfolk, Wallpaper*, The Gentlewoman, Frieze, Apartamento, Monocle,
MIT Tech Review. Editorial restraint with real typographic hierarchy.
Designed, considered, READABLE. Multi-color palettes (mono / duotone /
tritone).

Where experimental goes art-directed loud, creative goes editorial quiet.
Both are designed — creative is the designed magazine spread, not the
designed protest poster.

==================================================================
STEP 0 — WRITE THE CONCEPT FIRST (\`editorial.conceptStatement\`)
==================================================================

Before anything else, write a ONE-SENTENCE editorial art-direction
statement and pick \`editorial.conceptMotif\`. Everything downstream —
archetype, palette rule, decor elements, pull-quote, lede — should flow
from this concept.

Strong concepts reference the candidate AND the visual world:
- "Kinfolk-calm retrospective for a strategist who gardens on weekends —
  bone paper, dusty sage, generous whitespace."
- "Frieze gallery essay for a curator whose career reads like an
  exhibition catalog — dense, footnoted, terracotta."
- "Wallpaper modernist spread for an architect who edits as much as she
  designs — asymmetric, navy + ochre."
- "Gentlewoman portrait of a literary editor; italic kickers, oxblood +
  ivory, generous margins."

WEAK concepts (rewrite):
- "Modern editorial CV with magazine flair"
- "Refined and creative design"

==================================================================
STEP 1 — PICK CONTENT TO ELEVATE
==================================================================

Read the candidate's profile. Pick:

- \`editorial.ledeText\` — the OPENING SENTENCE rendered in display font
  when first-line-emphasis is active. Pull from the candidate's actual
  summary. Pick the most quotable opener — specific, not generic.

- \`editorial.pullQuoteText\` — the actual pull-quote text (max ~30 words).
  PICK FROM EXPERIENCE HIGHLIGHTS or SUMMARY — the most quotable phrase.
  Don't pick a generic statement; pick a SPECIFIC achievement or claim.

- \`editorial.pullQuoteAttribution\` — the attribution line, e.g. "—
  Senior Strategist, Stedelijk" or "— Founder, Studio Atlas, 2024".

- \`editorial.dropCapLetter\` — when drop-cap is active. Default is the
  first letter of summary. Override only if it makes a better
  typographic move (e.g. using initials, or picking a striking
  consonant the summary starts with).

- \`editorial.nameTagline\` — a Monocle-style tagline below the name.
  2-6 words describing voice or angle, e.g. "Strategist, writer,
  gardener" or "Curator at large". NEVER cliché.

- \`editorial.accentKeywords\` — 3-7 keywords from the vacancy or
  candidate's experience that get accent-color highlights in body
  text. Pick DOMAIN TERMS — "circular economy", "long-form journalism",
  "type system". Not stop-words.

- \`editorial.marginNoteCopy\` — for editorial-spread archetype with
  marginalia. One entry per experience item, in order. Pick MEANINGFUL
  short labels ("Berlin", "Sabbatical", "Promotion") instead of just
  dates. When unset, the renderer uses period+location.

==================================================================
STEP 2 — PICK A LAYOUT ARCHETYPE
==================================================================

\`editorial.layoutArchetype\` — the page-skeleton decision:

- **magazine-column** — single column, strong masthead, decorative dividers
- **editorial-spread** — 2-col with margin-notes column (gutter sidenotes)
- **asymmetric-feature** — full-width hero band + offset main column
- **feature-sidebar** — dense main + tinted skills/certs sidebar
- **manuscript-mono** — centered manuscript, optical proportions, NO sidebar
- **cover-feature** (v4) — magazine cover with hero portrait, oversized
  title, lede on cover, sections listed table-of-contents-style below.
  Best for: editors, curators, creative directors, founders.
- **index-card** (v4) — library catalog aesthetic. Sections in boxed
  index-card-like cells with small-caps tabs, dense paragraph layouts.
  Best for: researchers, archivists, academics, librarians, anyone
  whose work is fundamentally archival.

==================================================================
STEP 3 — PICK A PALETTE RULE + COLORS
==================================================================

\`editorial.paletteRule\` — pick the GENERATION RULE then fill the
hex values:

- **ink-and-paper** — near-black + cream + ONE warm accent (Vignelli-quiet)
- **kinfolk-calm** — bone + dusty greens/blues + warm accent
- **literary-tritone** — primary + burgundy/oxblood + warm accent
- **gallery-restraint** — muted, dusty, gallery-poster colors
- **ochre-paper** — cream + ochre + deep ink
- **modernist-clash** — primary + complementary accent (one tension)
- **tri-warmth** — three warm hues (ochre / terracotta / clay)
- **tri-cool** — three cool hues (forest / teal / slate)
- **riso-zine** — two saturated hues with print-zine energy (use sparingly
  — leans toward experimental)

NEVER reach for default Tailwind colors. Build a palette that satisfies
the rule with REAL editorial hex values.

==================================================================
STEP 4 — TYPOGRAPHY RHYTHM
==================================================================

- \`editorial.headingScaleRatio\` — continuous 1.0–3.0. 1.2=modest,
  1.6=comfortable, 2.0=editorial-feature, 2.4=cover/hero. Match concept.
- \`editorial.bodyDensity\` — whisper / normal / airy. Kinfolk + Gentlewoman
  want 'airy'. Cabinet + Frieze want 'whisper'.
- \`editorial.asymmetryStrength\` — none / subtle / considered. Caps at
  'considered' (Wallpaper-tension), no extremes.

==================================================================
STEP 5 — DECOR + LAYERED PRIMITIVES
==================================================================

- \`editorial.decorElements\` — pick 2-4 from drop-cap / pull-quote /
  decorative-numerals / marginalia / rule-ornaments / kicker-labels /
  colored-section-titles / first-line-emphasis.
  - marginalia ONLY with editorial-spread
  - pull-quote pairs with pullQuoteText + pullQuoteAttribution
  - drop-cap pairs with dropCapLetter + dropCapSection
  - first-line-emphasis pairs with ledeText
- \`editorial.colorPolicy\` — mono-accent / duotone / tritone. Match to
  paletteRule (ink-and-paper → mono; modernist-clash → duotone; tri-*
  rules → tritone).
- \`editorial.headerLayout\` — stacked / split / band / overlap
- \`editorial.nameTreatment\` — match to fontPairing:
  - oversized-serif → playfair, dm-serif, merriweather, libre-baskerville
  - oversized-sans → montserrat, poppins, raleway, space-grotesk
  - mixed-italic → playfair, libre-baskerville, dm-serif
  - condensed-impact → oswald (only)
- \`editorial.accentTreatment\` — thin-rule / vertical-bar /
  marker-highlight / ornament / number-prefix
- \`editorial.sectionTreatment\` — numbered / kicker / sidenote /
  drop-cap / pull-quote
- \`editorial.grid\` — asymmetric-60-40 / asymmetric-70-30 / full-bleed /
  manuscript / three-column-intro
- \`editorial.divider\` — none / hairline / double-rule / ornament /
  whitespace-large

FONTS: ${constraints.allowedFontPairings.join(' | ')}

==================================================================
REQUIRED BASE TOKENS
==================================================================

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

The industry tells you WHICH editorial language to speak:
- Tech / creative tech → modernist-clash or tri-cool, montserrat or space-grotesk
- Finance / consulting → ink-and-paper or literary-tritone, dm-serif or libre-baskerville
- Creative / agency / fashion → tri-warmth or modernist-clash, oswald or playfair
- Healthcare / academic → kinfolk-calm or gallery-restraint, dm-serif or libre-baskerville
- Editorial / publishing → literary-tritone or ochre-paper, playfair or libre-baskerville
- Industrial / architecture → ink-and-paper or modernist-clash, space-grotesk or montserrat

If you're 100% CERTAIN about the company's brand colors, incorporate them
boldly (as secondaryColor or accent). Otherwise build a striking editorial
palette that fits the industry vibe.
`;
  }

  // ===== HISTORY HINT — DO NOT repeat prior combos =====
  const history = snapshotHistory(ctx.styleHistory);
  if (history.length > 0) {
    prompt += `\nPRIOR CVs YOU MADE FOR THIS USER — DO NOT REPEAT ANY OF THESE COMBINATIONS:\n`;
    history.forEach((h, i) => {
      prompt += `  ${i + 1}. archetype=${h.archetype || '?'}, motif=${h.motif || '?'}, paletteRule=${h.paletteRule || '?'}, primary=${h.primary || '?'}\n`;
    });
    prompt += `Your output MUST differ on at least 2 of (archetype, motif, paletteRule) from EVERY prior CV.\n`;
  }

  // ===== Variation nudge =====
  const motifNudge = pickFrom(EDITORIAL_POOLS.conceptMotif);
  const archetypeNudge = pickFrom(EDITORIAL_POOLS.layoutArchetype);
  const paletteRuleNudge = pickFrom(EDITORIAL_POOLS.paletteRule);
  const densityNudge = pickFrom(EDITORIAL_POOLS.bodyDensity);
  const asymmetryNudge = pickFrom(EDITORIAL_POOLS.asymmetryStrength);

  prompt += `
VARIATION NUDGE — concrete starting point for this round. Override only
if the role pulls strongly elsewhere:

CONCEPT MOTIF: editorial.conceptMotif = "${motifNudge}"
ARCHETYPE: editorial.layoutArchetype = "${archetypeNudge}"
PALETTE RULE: editorial.paletteRule = "${paletteRuleNudge}"
BODY DENSITY: editorial.bodyDensity = "${densityNudge}"
ASYMMETRY: editorial.asymmetryStrength = "${asymmetryNudge}"
COLOR POLICY: editorial.colorPolicy = "${pickFrom(EDITORIAL_POOLS.colorPolicy)}"
HEADER LAYOUT: editorial.headerLayout = "${pickFrom(EDITORIAL_POOLS.headerLayout)}"
NAME TREATMENT: editorial.nameTreatment = "${pickFrom(EDITORIAL_POOLS.nameTreatment)}"
SECTION TREATMENT: editorial.sectionTreatment = "${pickFrom(EDITORIAL_POOLS.sectionTreatment)}"
DIVIDER: editorial.divider = "${pickFrom(EDITORIAL_POOLS.divider)}"
`;

  prompt += `
==================================================================
THE BRIEF — REQUIRED OUTPUT
==================================================================

1. \`editorial.conceptStatement\` — one-sentence editorial art-direction
   statement. References the candidate AND the visual world.
2. \`editorial.conceptMotif\` — controlled-vocab shorthand.
3. \`editorial.layoutArchetype\` — page skeleton.
4. \`editorial.paletteRule\` + actual hex values in \`colors.*\` that
   satisfy the rule. NEVER Tailwind defaults.
5. \`editorial.colorPolicy\` — mono / duotone / tritone. Match to paletteRule.
6. \`editorial.decorElements\` — pick 2-4.
7. **Content picks** (the v4 leverage points):
   - \`editorial.ledeText\` (when first-line-emphasis is active)
   - \`editorial.pullQuoteText\` + \`editorial.pullQuoteAttribution\` (when pull-quote is active)
   - \`editorial.dropCapLetter\` (when drop-cap is active, optional override)
   - \`editorial.nameTagline\` — Monocle-style 2-6 words
   - \`editorial.accentKeywords\` — 3-7 domain terms
   - \`editorial.marginNoteCopy\` — for editorial-spread with marginalia
8. \`editorial.headingScaleRatio\` — continuous, match concept.
9. \`editorial.bodyDensity\` + \`editorial.asymmetryStrength\` — set rhythm.
10. Match \`nameTreatment\` to \`fontPairing\`.
11. Non-negotiables:
    - If colorPolicy='tritone', provide \`editorial.secondaryColor\` (real hex)
    - 'marginalia' only with layoutArchetype='editorial-spread'
    - Pull-quote / drop-cap / first-line-emphasis all need their content pair

Priority order:
1. Respect the target vacancy and company context
2. Respect explicit user style instructions
3. Then use editorial references as a language, never as a template
4. DIFFER from history (see section above if present)

Think like a magazine art director, not a resume builder.`;

  return prompt;
}

// ============ Fallbacks ============

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
      conceptStatement: 'Fallback brief: classic editorial magazine spread with drop-cap and rule ornaments.',
      conceptMotif: 'monocle',
      layoutArchetype: 'magazine-column',
      colorPolicy: 'duotone',
      paletteRule: 'ink-and-paper',
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
      headingScaleRatio: 1.7,
      bodyDensity: 'normal',
      asymmetryStrength: 'subtle',
    },
  };
}

function getContextualFallback(ctx: PromptContext): CVDesignTokens {
  const signals = readContextSignals(ctx);
  const base = getFallback(ctx.jobVacancy?.industry);

  if (signals.isLiteraryRole) {
    return {
      ...base,
      styleName: 'Literary Portrait',
      styleRationale: 'Gentlewoman-style portrait — literary, italic, generous margins, oxblood and ivory.',
      industryFit: ctx.jobVacancy?.industry || 'editorial',
      fontPairing: 'libre-baskerville-source-sans',
      colors: { primary: '#3a1a1a', secondary: '#fbf5ea', accent: '#9a6b45', text: '#1a1a1a', muted: '#7a6f60' },
      editorial: {
        ...base.editorial!,
        conceptStatement: 'Gentlewoman portrait — italic kickers, generous whitespace, oxblood ink on cream paper.',
        conceptMotif: 'gentlewoman',
        layoutArchetype: 'cover-feature',
        colorPolicy: 'tritone',
        secondaryColor: '#6a3a3a',
        paletteRule: 'literary-tritone',
        decorElements: ['drop-cap', 'pull-quote', 'first-line-emphasis', 'kicker-labels'],
        headerLayout: 'split',
        nameTreatment: 'mixed-italic',
        sectionTreatment: 'kicker',
        grid: 'full-bleed',
        divider: 'hairline',
        typographyScale: 'hero',
        headingScaleRatio: 2.2,
        bodyDensity: 'airy',
        asymmetryStrength: 'subtle',
      },
    };
  }

  if (signals.isCorporate) {
    return {
      ...base,
      styleName: 'Editorial Executive',
      styleRationale: 'Editorial restraint with marginalia and a deep tritone palette for strategy roles.',
      industryFit: ctx.jobVacancy?.industry || 'finance',
      fontPairing: 'dm-serif-dm-sans',
      colors: { primary: '#1f2233', secondary: '#f6f1e8', accent: '#9a6b45', text: '#1d1d1d', muted: '#6c655b' },
      editorial: {
        ...base.editorial!,
        conceptStatement: 'Monocle-style executive brief — italic kickers, dense pages, navy ink with ochre accent.',
        conceptMotif: 'monocle',
        layoutArchetype: 'editorial-spread',
        colorPolicy: 'tritone',
        secondaryColor: '#5e2a2a',
        paletteRule: 'literary-tritone',
        decorElements: ['marginalia', 'first-line-emphasis', 'colored-section-titles', 'pull-quote'],
        headerLayout: 'split',
        nameTreatment: 'uppercase-tracked',
        accentTreatment: 'thin-rule',
        sectionTreatment: 'numbered',
        grid: 'asymmetric-70-30',
        divider: 'hairline',
        typographyScale: 'modest',
        sectionNumbering: true,
        headingScaleRatio: 1.5,
        bodyDensity: 'whisper',
        asymmetryStrength: 'subtle',
      },
      layout: 'single-column',
      sidebarSections: ['skills', 'languages', 'certifications'],
    };
  }

  if (signals.isCreativeRole || signals.wantsLoud) {
    return {
      ...base,
      styleName: 'Editorial Feature',
      styleRationale: 'Big hero band, decorative numerals and a duotone palette — culture-magazine feature article.',
      industryFit: ctx.jobVacancy?.industry || 'creative',
      fontPairing: 'oswald-source-sans',
      colors: { primary: '#26213a', secondary: '#faf5ee', accent: '#d86d43', text: '#171717', muted: '#6d655e' },
      editorial: {
        ...base.editorial!,
        conceptStatement: 'Wallpaper feature article — asymmetric, navy and ochre, considered.',
        conceptMotif: 'wallpaper',
        layoutArchetype: 'asymmetric-feature',
        colorPolicy: 'duotone',
        paletteRule: 'modernist-clash',
        decorElements: ['decorative-numerals', 'first-line-emphasis', 'kicker-labels', 'pull-quote'],
        headerLayout: 'band',
        nameTreatment: 'condensed-impact',
        accentTreatment: 'marker-highlight',
        sectionTreatment: 'kicker',
        grid: 'full-bleed',
        divider: 'whitespace-large',
        typographyScale: 'hero',
        sectionNumbering: true,
        headingScaleRatio: 2.2,
        bodyDensity: 'normal',
        asymmetryStrength: 'considered',
      },
      layout: 'single-column',
    };
  }

  if (signals.wantsMinimal) {
    return {
      ...base,
      fontPairing: 'libre-baskerville-source-sans',
      editorial: {
        ...base.editorial!,
        conceptStatement: 'Manuscript-mono — generous margins, drop-cap, restrained brass accent on cream.',
        conceptMotif: 'kinfolk',
        layoutArchetype: 'manuscript-mono',
        colorPolicy: 'mono-accent',
        paletteRule: 'kinfolk-calm',
        decorElements: ['drop-cap', 'rule-ornaments', 'kicker-labels'],
        headerLayout: 'stacked',
        nameTreatment: 'oversized-serif',
        accentTreatment: 'thin-rule',
        sectionTreatment: 'numbered',
        grid: 'manuscript',
        divider: 'ornament',
        typographyScale: 'modest',
        sectionNumbering: true,
        headingScaleRatio: 1.4,
        bodyDensity: 'airy',
        asymmetryStrength: 'none',
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

// ============ Normalize ============

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

  // Validate + fill editorial sub-tokens (incl. v4 fields)
  tokens.editorial = validateAndFixEditorialTokens(tokens.editorial, tokens.fontPairing, tokens.colors);

  // Layout flows from the archetype — user override wins
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

  if (
    tokens.editorial.grid === 'three-column-intro' &&
    tokens.editorial.layoutArchetype !== 'index-card'
  ) {
    // three-column-intro is the index-card signature; keep elsewhere only when AI explicitly chose it
    if (!rawPartial.editorial?.grid) {
      tokens.editorial.grid = signals.isCorporate ? 'asymmetric-70-30' : 'full-bleed';
    }
  }
  if (
    (signals.wantsTwoColumn || signals.isCorporate) &&
    !rawPartial.editorial?.grid &&
    tokens.editorial.grid === 'full-bleed'
  ) {
    tokens.editorial.grid = signals.isCorporate ? 'asymmetric-70-30' : 'asymmetric-60-40';
  }

  applyBaseValidations(tokens, LOG_TAG);
  clearOtherRendererTokens(tokens, 'editorial');

  // Rotate primitives the renderer actually keys off of.
  rotateLeastUsed(
    tokens,
    ctx.styleHistory,
    {
      'editorial.layoutArchetype': EDITORIAL_POOLS.layoutArchetype,
      'editorial.conceptMotif': EDITORIAL_POOLS.conceptMotif,
      'editorial.paletteRule': EDITORIAL_POOLS.paletteRule,
      'editorial.colorPolicy': EDITORIAL_POOLS.colorPolicy,
      'editorial.headerLayout': EDITORIAL_POOLS.headerLayout,
      'editorial.nameTreatment': EDITORIAL_POOLS.nameTreatment,
      'editorial.sectionTreatment': EDITORIAL_POOLS.sectionTreatment,
      'editorial.grid': EDITORIAL_POOLS.grid,
      'editorial.divider': EDITORIAL_POOLS.divider,
      'editorial.accentTreatment': EDITORIAL_POOLS.accentTreatment,
      'editorial.typographyScale': EDITORIAL_POOLS.typographyScale,
      'editorial.bodyDensity': EDITORIAL_POOLS.bodyDensity,
      'editorial.asymmetryStrength': EDITORIAL_POOLS.asymmetryStrength,
      fontPairing: constraints.allowedFontPairings,
    },
    LOG_TAG,
  );

  // Re-validate after rotation in case archetype/nameTreatment got flipped
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
