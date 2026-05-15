/**
 * Experimental expert — v4: concept-first, content-driven art direction.
 *
 * Previous version (v3) gave the AI a bag of orthogonal primitives to pick
 * from. It worked, but two CVs for the same vacancy landed on the same
 * archetype + palette combo too often. The renderer's fixed CSS per
 * archetype meant the visual skeleton was identical even when the tokens
 * differed.
 *
 * v4 fixes this with three levers:
 *
 *   1. CONCEPT-FIRST. The AI writes a single-sentence art-direction
 *      statement BEFORE picking any tokens. The concept primes every
 *      downstream choice and makes the variation legible (it's much
 *      harder to converge on the same idea twice).
 *
 *   2. CONTENT-DRIVEN. The AI picks which content gets the loud
 *      treatment: which summary line becomes a poster, which job
 *      keywords get accent highlights, which numeral anchors the page.
 *      The renderer elevates the chosen content to art-directed scale.
 *      Two CVs for the same person with the same archetype still differ
 *      because they emphasize different lines / words / numbers.
 *
 *   3. PALETTE-RULES. Instead of picking from a fixed pool of 10
 *      palettes, the AI picks a palette *rule* and invents the hexes
 *      that satisfy it. Palettes are no longer the bottleneck on variety.
 *
 * The renderer (bold.ts) reads these new fields and applies them. The
 * old fields (headerLayout, sidebarStyle, surfaceTexture, etc) still
 * work — backwards-compatible.
 *
 * References for art direction: MSCHF, Toilet Paper magazine, Barbara
 * Kruger, David Carson, Peter Saville, Aries Moross, Stedelijk Museum,
 * Centre Pompidou, Massimo Vignelli, Wim Crouwel, Jonathan Castro.
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
import { pickFrom, rotateLeastUsed, getAtPath } from './shared/variation';

const LOG_TAG = 'Style Gen [experimental]';

// ============ Schema ============

const boldSchema = z.object({
  // ===== CONCEPT-FIRST (the AI writes this BEFORE everything else) =====
  conceptStatement: z.string().optional().describe(
    `ONE-SENTENCE ART-DIRECTION STATEMENT. Write this FIRST, before any
    other token. The whole rest of the object should flow from this idea.
    Examples of strong concepts:
    - "Riso-printed dispatch from a designer whose career reads like a
      wheat-paste poster — loud, urgent, hand-set."
    - "Type-specimen-sheet for a strategy consultant; restraint as the
      loudest possible move, set in dm-serif on bone paper."
    - "Photocopied protest pamphlet for an art-director who cuts through
      noise — black, neon-yellow, off-register."
    - "Museum wall-text retrospective for a creative who has earned the
      Pompidou treatment — terracotta and teal, generous whitespace."
    DO NOT be generic ("modern bold creative CV"). Name the visual world.`,
  ),
  conceptMotif: z.enum([
    'archive', 'broadcast', 'manifesto', 'gallery',
    'specimen', 'manuscript', 'protest', 'editorial',
  ]).optional().describe(
    `Controlled-vocab shorthand of the concept. Picks the visual world:
    - archive: library catalog / index card / specimen sheet
    - broadcast: news ticker / dispatch / breaking news
    - manifesto: activist poster / wheat-paste / pamphlet
    - gallery: museum poster / exhibition catalog / wall text
    - specimen: type specimen / foundry catalogue / wood type
    - manuscript: hand-set book / private press / colophon
    - protest: photocopy / zine / DIY anti-aesthetic
    - editorial: magazine spread / long-form journalism`,
  ),

  // ===== TOP-LEVEL ARCHETYPE =====
  layoutArchetype: z.enum([
    'sidebar-canva', 'manifesto', 'magazine-cover', 'editorial-inversion',
    'brutalist-grid', 'vertical-rail', 'mosaic',
    'typographic-poster', 'photo-montage',
  ]).optional().describe(
    `THE big page-skeleton decision — pick ONE first, then everything
    else layers on top:
    - sidebar-canva: classic Canva look. RESERVED for regulated roles only.
    - manifesto: huge typographic opening + compressed grid below
    - magazine-cover: name as cover headline filling upper half
    - editorial-inversion: lead paragraph on top, contact at bottom
    - brutalist-grid: hard rectilinear N-column grid (Vignelli)
    - vertical-rail: name as a vertical strip on the left edge (Saville)
    - mosaic: asymmetric mosaic of colored blocks (Kruger)
    - typographic-poster: type-only protest poster. Name fills the upper
      half. Everything else collapses to dense small print. NO photo.
      Best for designers / writers / activists / strong personal brand.
    - photo-montage: portrait-dominant magazine cover. Photo bleeds
      across ~60% of the page; info overlaid in stacked cards. Best
      for performers / creatives where the face IS the brand.

    DEFAULT BIAS: pick anything EXCEPT sidebar-canva. typographic-poster
    and photo-montage are the wildest — bias to those when the role can
    carry them.`,
  ),
  columnCount: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional().describe(
    'Columns in the main content area. 1=single editorial, 2=standard, 3-4=dense brutalist.',
  ),
  backgroundNumeral: z.enum(['none', 'initials', 'year', 'section-number', 'role']).optional().describe(
    `Optional huge faded background element anchoring the page.`,
  ),
  marginalia: z.enum(['none', 'vertical-strip', 'numbered', 'kicker-callouts']).optional().describe(
    `Side-margin annotation treatment.`,
  ),
  paletteSaturation: z.enum(['monochrome-plus-one', 'duotone', 'tri-tone', 'full-palette']).optional().describe(
    `How aggressively to deploy the palette across the page.`,
  ),
  manifestoOpener: z.boolean().optional().describe(
    'Renders the summary as an oversized opening statement.',
  ),

  // ===== CONTENT-DRIVEN PRIMITIVES (new) =====
  posterLine: z.string().optional().describe(
    `The single LINE OF COPY (max ~14 words) that becomes oversized
    poster-scale type on the page. PICK FROM THE CANDIDATE'S ACTUAL
    CONTENT — the opening sentence of their summary, a quotable phrase
    from their experience, or their role title. Or write a short tagline
    that genuinely fits them. NEVER generic ("Driven Professional",
    "Passionate about technology") — that fails the rejection test.`,
  ),
  posterLineSource: z.enum([
    'summary-first-sentence', 'summary-extract', 'role-title', 'invented-tagline',
  ]).optional().describe(
    `Tag for where posterLine came from. Helps the renderer place it.`,
  ),
  accentKeywords: z.array(z.string()).max(7).optional().describe(
    `3-7 KEYWORDS from the job vacancy or candidate's experience that
    will get accent-color highlights wherever they appear in body text.
    Pick WORDS THAT MATTER — domain terms ("computer vision",
    "circular economy", "API design"), not stop-words or generic verbs.
    Case-insensitive substring match in the renderer.`,
  ),
  heroNumeralValue: z.string().optional().describe(
    `When backgroundNumeral != 'none', the actual content the renderer
    should show. Examples: "8" for 8 years experience, "2026" for
    target year, "DESIGN" for role, candidate's initials. Letting you
    pick the literal value means the page anchor is meaningful, not
    generic. Keep it short (1-4 chars works best).`,
  ),
  nameTreatment: z.enum([
    'unified', 'first-name-dominant', 'last-name-dominant', 'stacked',
    'separated-by-rule', 'first-letter-massive', 'inline-with-role',
  ]).optional().describe(
    `How the candidate's name is typeset. Pick based on which part
    carries the most weight or makes the best typographic move.`,
  ),

  // ===== TYPOGRAPHY RHYTHM =====
  headingScaleRatio: z.number().min(1.0).max(4.0).optional().describe(
    `Continuous heading-to-body ratio. 1.2=modest, 1.6=comfortable,
    2.0=poster, 3.0=brutalist. Pick the ratio that fits the concept.`,
  ),
  bodyDensity: z.enum(['whisper', 'normal', 'shout']).optional().describe(
    `Body-text density. whisper=tight tracking + small leading
    (specimen feel), shout=loose tracking + extra leading (protest feel).`,
  ),
  asymmetryStrength: z.enum(['none', 'subtle', 'strong', 'extreme']).optional().describe(
    `Strength of asymmetric composition. extreme=off-balance to the
    point of discomfort (Carson). Only pick extreme when the concept
    explicitly calls for it.`,
  ),

  // ===== PALETTE GENERATION =====
  paletteRule: z.enum([
    'split-complement-clash', 'mono-with-scream', 'analog-warm', 'analog-cool',
    'tri-clash', 'duo-riso', 'paper-and-ink', 'fluorescent-pop', 'museum-restraint',
  ]).optional().describe(
    `Palette-generation rule. Use this to invent a palette that fits
    your concept — don't reach for default Tailwind colors.
    - split-complement-clash: primary + two split-complementaries (Toilet Paper)
    - mono-with-scream: near-black + single screaming accent (Kruger / Vignelli)
    - analog-warm: 3 adjacent warm hues (terracotta / mustard / coral)
    - analog-cool: 3 adjacent cool hues (teal / navy / sage)
    - tri-clash: 3 mutually-clashing hues across the wheel
    - duo-riso: 2 saturated hues that mis-register beautifully (pink+blue, red+teal)
    - paper-and-ink: bone/cream + carbon + one accent (Vignelli)
    - fluorescent-pop: neutral page + one neon hit (Kunsthalle)
    - museum-restraint: muted, dusty, gallery-poster colors`,
  ),

  // ===== LAYERED PRIMITIVES (existing v3 — kept) =====
  headerLayout: z.enum(['hero-band', 'split-photo', 'tiled', 'asymmetric-burst']).optional().describe(
    'Header composition (only consumed by sidebar-canva archetype).',
  ),
  sidebarStyle: z.enum(['solid-color', 'gradient', 'photo-hero', 'transparent']).optional().describe(
    'Sidebar treatment (only consumed by sidebar-canva archetype).',
  ),
  skillStyle: z.enum(['bars-gradient', 'dots-rating', 'icon-tagged', 'colored-pills']).optional(),
  photoTreatment: z.enum(['circle-halo', 'squircle', 'color-overlay', 'badge-framed']).optional(),
  accentShape: z.enum(['diagonal-stripe', 'angled-corner', 'colored-badge', 'hex-pattern']).optional(),
  iconTreatment: z.enum(['solid-filled', 'duotone', 'line-with-accent']).optional(),
  headingStyle: z.enum([
    'oversized-numbered', 'kicker-bar', 'gradient-text', 'bracketed', 'stacked-caps', 'overlap-block',
  ]).optional(),
  gradientDirection: z.enum([
    'none', 'linear-vertical', 'linear-diagonal', 'radial-burst', 'duotone-split', 'offset-clash',
  ]).optional(),
  surfaceTexture: z.enum(['none', 'halftone', 'riso-grain', 'screen-print', 'stripe-texture']).optional(),
});

const experimentalSchema = baseDesignTokensSchema.extend({
  bold: boldSchema.optional().describe('Bold layout tokens — drive the avant-garde renderer.'),
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract']).optional(),
  layout: z.enum(['sidebar-left', 'sidebar-right']).optional(),
});

// ============ Pools ============

const BOLD_POOLS = {
  // sidebar-canva intentionally out of pool — bias away from it.
  layoutArchetype: [
    'manifesto', 'magazine-cover', 'editorial-inversion', 'brutalist-grid',
    'vertical-rail', 'mosaic', 'typographic-poster', 'photo-montage',
  ] as const,
  columnCount: [1, 2, 3, 4] as const,
  backgroundNumeral: ['none', 'initials', 'year', 'section-number', 'role'] as const,
  marginalia: ['none', 'vertical-strip', 'numbered', 'kicker-callouts'] as const,
  paletteSaturation: ['monochrome-plus-one', 'duotone', 'tri-tone', 'full-palette'] as const,
  manifestoOpener: [true, false] as const,
  conceptMotif: [
    'archive', 'broadcast', 'manifesto', 'gallery',
    'specimen', 'manuscript', 'protest', 'editorial',
  ] as const,
  posterLineSource: [
    'summary-first-sentence', 'summary-extract', 'role-title', 'invented-tagline',
  ] as const,
  nameTreatment: [
    'unified', 'first-name-dominant', 'last-name-dominant', 'stacked',
    'separated-by-rule', 'first-letter-massive', 'inline-with-role',
  ] as const,
  bodyDensity: ['whisper', 'normal', 'shout'] as const,
  asymmetryStrength: ['none', 'subtle', 'strong', 'extreme'] as const,
  paletteRule: [
    'split-complement-clash', 'mono-with-scream', 'analog-warm', 'analog-cool',
    'tri-clash', 'duo-riso', 'paper-and-ink', 'fluorescent-pop', 'museum-restraint',
  ] as const,
  headerLayout: ['hero-band', 'split-photo', 'tiled', 'asymmetric-burst'] as const,
  sidebarStyle: ['solid-color', 'gradient', 'photo-hero', 'transparent'] as const,
  skillStyle: ['bars-gradient', 'dots-rating', 'icon-tagged', 'colored-pills'] as const,
  photoTreatment: ['circle-halo', 'squircle', 'color-overlay', 'badge-framed'] as const,
  accentShape: ['diagonal-stripe', 'angled-corner', 'colored-badge', 'hex-pattern'] as const,
  iconTreatment: ['solid-filled', 'duotone', 'line-with-accent'] as const,
  headingStyle: [
    'oversized-numbered', 'kicker-bar', 'gradient-text', 'bracketed', 'stacked-caps', 'overlap-block',
  ] as const,
  gradientDirection: [
    'none', 'linear-vertical', 'linear-diagonal', 'radial-burst', 'duotone-split', 'offset-clash',
  ] as const,
  surfaceTexture: ['none', 'halftone', 'riso-grain', 'screen-print', 'stripe-texture'] as const,
};

const ALL_ARCHETYPES = [
  'sidebar-canva', 'manifesto', 'magazine-cover', 'editorial-inversion',
  'brutalist-grid', 'vertical-rail', 'mosaic',
  'typographic-poster', 'photo-montage',
] as const;

// ============ Avant-garde palette references (fallback only) ============
//
// These are reference palettes for the fallback path. The PRIMARY route
// now asks the AI to invent a palette guided by paletteRule — these only
// kick in when generation fails completely.
interface AvantPalette {
  name: string;
  description: string;
  primary: string;
  accent: string;
  rule: NonNullable<CVDesignTokens['bold']>['paletteRule'];
}

const avantGardePalettes: AvantPalette[] = [
  { name: 'riso-red-teal', description: 'Toilet Paper energy', primary: '#d73838', accent: '#1d8a99', rule: 'duo-riso' },
  { name: 'hot-pink-forest', description: 'Aries Moross', primary: '#e91e63', accent: '#1b5e20', rule: 'split-complement-clash' },
  { name: 'mustard-plum', description: 'Bauhaus reprint', primary: '#5a2442', accent: '#d4a21a', rule: 'analog-warm' },
  { name: 'electric-violet-olive', description: 'Stedelijk', primary: '#6b21a8', accent: '#6e7e3c', rule: 'split-complement-clash' },
  { name: 'sage-hot-coral', description: 'Apartamento', primary: '#5b7a5c', accent: '#f96958', rule: 'museum-restraint' },
  { name: 'paper-bone-black-red', description: 'Kruger / Vignelli', primary: '#0f0f0f', accent: '#d9322b', rule: 'mono-with-scream' },
  { name: 'navy-mustard-pink', description: '1970s art-book', primary: '#1e2847', accent: '#d6a42b', rule: 'tri-clash' },
  { name: 'terracotta-teal', description: 'Centre Pompidou', primary: '#b8613b', accent: '#155e63', rule: 'duo-riso' },
  { name: 'riso-pink-blue', description: 'Riso duotone', primary: '#ff3d7f', accent: '#2d5fff', rule: 'duo-riso' },
  { name: 'black-neon-yellow', description: 'Kunsthalle Basel', primary: '#0a0a0a', accent: '#e8fc4a', rule: 'fluorescent-pop' },
];

// ============ Context signals ============

function readContextSignals(ctx: PromptContext) {
  const industry = (ctx.jobVacancy?.industry || '').toLowerCase();
  const prefs = (ctx.userPreferences || '').toLowerCase();
  const title = (ctx.jobVacancy?.title || '').toLowerCase();
  const combined = `${industry} ${title} ${prefs}`;

  return {
    industry,
    wantsMinimal: /\b(minimal|minimalistisch|clean|strak|subtle|subtiel|restrained|ingetogen)\b/.test(combined),
    wantsLoud: /\b(bold|avant|avant-garde|edgy|opvallend|statement|experimental|poster)\b/.test(combined),
    isCorporate: /\b(finance|bank|consult|consulting|legal|account|strategy|enterprise)\b/.test(combined),
    isCreativeRole: /\b(creative|design|designer|marketing|brand|art|fashion|agency|content|writer|director)\b/.test(combined),
    isPerformerRole: /\b(actor|performer|presenter|host|musician|artist|model|photograph|video|film|director)\b/.test(combined),
  };
}

// ============ History snapshot for prompt injection ============
//
// We surface the last 3 archetype+motif+paletteRule combos directly in the
// prompt so the AI can see what NOT to repeat. This is stronger than the
// lazy rotateLeastUsed mechanism.
interface HistorySnapshot {
  archetype: string | undefined;
  motif: string | undefined;
  paletteRule: string | undefined;
  primary: string | undefined;
}

function snapshotHistory(history: CVDesignTokens[] | undefined): HistorySnapshot[] {
  if (!history || history.length === 0) return [];
  return history.slice(0, 3).map(t => ({
    archetype: getAtPath(t, 'bold.layoutArchetype'),
    motif: getAtPath(t, 'bold.conceptMotif'),
    paletteRule: getAtPath(t, 'bold.paletteRule'),
    primary: getAtPath(t, 'colors.primary'),
  }));
}

// ============ Bold validator ============

function validateAndFixBoldTokens(
  raw: CVDesignTokens['bold'] | undefined,
  showPhoto: boolean,
): NonNullable<CVDesignTokens['bold']> {
  const isValid = <T extends string>(val: unknown, allowed: readonly T[]): val is T =>
    typeof val === 'string' && allowed.includes(val as T);
  const isValidNum = <T extends number>(val: unknown, allowed: readonly T[]): val is T =>
    typeof val === 'number' && allowed.includes(val as T);

  // ===== Concept (always pick a motif; conceptStatement may be undefined) =====
  const conceptMotif = isValid(raw?.conceptMotif, BOLD_POOLS.conceptMotif)
    ? raw!.conceptMotif
    : pickFrom(BOLD_POOLS.conceptMotif);
  const conceptStatement = (typeof raw?.conceptStatement === 'string' && raw.conceptStatement.trim().length > 0)
    ? raw.conceptStatement.trim().slice(0, 240)
    : undefined;

  // ===== Archetype =====
  const layoutArchetype = isValid(raw?.layoutArchetype, ALL_ARCHETYPES)
    ? raw!.layoutArchetype
    : pickFrom(BOLD_POOLS.layoutArchetype);

  const columnCount = isValidNum(raw?.columnCount, BOLD_POOLS.columnCount)
    ? raw!.columnCount
    : (layoutArchetype === 'brutalist-grid' ? 3
       : layoutArchetype === 'manifesto' || layoutArchetype === 'mosaic' ? 2
       : 1);

  const backgroundNumeral = isValid(raw?.backgroundNumeral, BOLD_POOLS.backgroundNumeral)
    ? raw!.backgroundNumeral
    : pickFrom(BOLD_POOLS.backgroundNumeral);

  const marginalia = isValid(raw?.marginalia, BOLD_POOLS.marginalia)
    ? raw!.marginalia
    : pickFrom(BOLD_POOLS.marginalia);

  const paletteSaturation = isValid(raw?.paletteSaturation, BOLD_POOLS.paletteSaturation)
    ? raw!.paletteSaturation
    : pickFrom(BOLD_POOLS.paletteSaturation);

  const manifestoOpener = typeof raw?.manifestoOpener === 'boolean'
    ? raw!.manifestoOpener
    : (layoutArchetype === 'manifesto' || layoutArchetype === 'magazine-cover'
      || layoutArchetype === 'editorial-inversion' || layoutArchetype === 'typographic-poster');

  // ===== Content-driven primitives =====
  const posterLineSource = isValid(raw?.posterLineSource, BOLD_POOLS.posterLineSource)
    ? raw!.posterLineSource
    : 'summary-first-sentence';
  const posterLine = (typeof raw?.posterLine === 'string' && raw.posterLine.trim().length > 0)
    ? raw.posterLine.trim().slice(0, 160)
    : undefined;
  const accentKeywords = Array.isArray(raw?.accentKeywords)
    ? raw!.accentKeywords
      .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim())
      .slice(0, 7)
    : undefined;
  const heroNumeralValue = (typeof raw?.heroNumeralValue === 'string' && raw.heroNumeralValue.trim().length > 0)
    ? raw.heroNumeralValue.trim().slice(0, 12)
    : undefined;
  const nameTreatment = isValid(raw?.nameTreatment, BOLD_POOLS.nameTreatment)
    ? raw!.nameTreatment
    : pickFrom(BOLD_POOLS.nameTreatment);

  // ===== Typography rhythm =====
  let headingScaleRatio: number;
  if (typeof raw?.headingScaleRatio === 'number' && Number.isFinite(raw.headingScaleRatio)) {
    headingScaleRatio = Math.max(1.0, Math.min(4.0, raw.headingScaleRatio));
  } else {
    // Archetype-biased default
    headingScaleRatio = (layoutArchetype === 'typographic-poster' || layoutArchetype === 'manifesto') ? 2.6
      : layoutArchetype === 'brutalist-grid' ? 2.2
      : layoutArchetype === 'magazine-cover' ? 2.4
      : 1.8;
  }
  const bodyDensity = isValid(raw?.bodyDensity, BOLD_POOLS.bodyDensity)
    ? raw!.bodyDensity
    : 'normal';
  const asymmetryStrength = isValid(raw?.asymmetryStrength, BOLD_POOLS.asymmetryStrength)
    ? raw!.asymmetryStrength
    : (layoutArchetype === 'mosaic' || layoutArchetype === 'editorial-inversion' ? 'strong' : 'subtle');

  // ===== Palette =====
  const paletteRule = isValid(raw?.paletteRule, BOLD_POOLS.paletteRule)
    ? raw!.paletteRule
    : pickFrom(BOLD_POOLS.paletteRule);

  // ===== Legacy primitives =====
  const headerLayout = isValid(raw?.headerLayout, BOLD_POOLS.headerLayout)
    ? raw!.headerLayout
    : pickFrom(BOLD_POOLS.headerLayout);

  let sidebarStyle = isValid(raw?.sidebarStyle, BOLD_POOLS.sidebarStyle)
    ? raw!.sidebarStyle
    : pickFrom(BOLD_POOLS.sidebarStyle);
  if (sidebarStyle === 'photo-hero' && !showPhoto) sidebarStyle = 'gradient';

  const skillStyle = isValid(raw?.skillStyle, BOLD_POOLS.skillStyle) ? raw!.skillStyle : pickFrom(BOLD_POOLS.skillStyle);
  const photoTreatment = isValid(raw?.photoTreatment, BOLD_POOLS.photoTreatment) ? raw!.photoTreatment : pickFrom(BOLD_POOLS.photoTreatment);
  const accentShape = isValid(raw?.accentShape, BOLD_POOLS.accentShape) ? raw!.accentShape : pickFrom(BOLD_POOLS.accentShape);
  const iconTreatment = isValid(raw?.iconTreatment, BOLD_POOLS.iconTreatment) ? raw!.iconTreatment : pickFrom(BOLD_POOLS.iconTreatment);
  const headingStyle = isValid(raw?.headingStyle, BOLD_POOLS.headingStyle) ? raw!.headingStyle : pickFrom(BOLD_POOLS.headingStyle);
  const gradientDirection = isValid(raw?.gradientDirection, BOLD_POOLS.gradientDirection)
    ? raw!.gradientDirection
    : pickFrom(BOLD_POOLS.gradientDirection);
  let surfaceTexture = isValid(raw?.surfaceTexture, BOLD_POOLS.surfaceTexture)
    ? raw!.surfaceTexture
    : pickFrom(BOLD_POOLS.surfaceTexture);
  if (surfaceTexture === 'none') surfaceTexture = 'riso-grain';

  // typographic-poster can't render a photo (it's type-only)
  // photo-montage requires a photo
  const archetypeNeedsPhoto = layoutArchetype === 'photo-montage';
  const archetypeForbidsPhoto = layoutArchetype === 'typographic-poster';

  return {
    conceptStatement,
    conceptMotif,
    layoutArchetype,
    columnCount,
    backgroundNumeral,
    marginalia,
    paletteSaturation,
    manifestoOpener,
    posterLine,
    posterLineSource,
    accentKeywords,
    heroNumeralValue,
    nameTreatment,
    headingScaleRatio,
    bodyDensity,
    asymmetryStrength,
    paletteRule,
    headerLayout,
    sidebarStyle,
    skillStyle,
    photoTreatment,
    accentShape,
    iconTreatment,
    headingStyle,
    gradientDirection,
    surfaceTexture,
    // Re-export the archetype-photo signals so the caller can adjust showPhoto.
    ...(archetypeNeedsPhoto || archetypeForbidsPhoto ? {} : {}),
  };
}

// ============ Prompts ============

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints.experimental;
  return `${commonSystemHeader(hasPhoto)}

*** EXPERIMENTAL MODE — CONCEPT-FIRST ART DIRECTION ***

You are the ART DIRECTOR for this CV, not a template picker. The brief is
*overboard*. The result should NOT resemble a standard CV. A recruiter
should think "this person had it MADE, not generated."

References: MSCHF, Toilet Paper, Barbara Kruger, David Carson, Peter
Saville, Aries Moross, Stedelijk Museum, Centre Pompidou, Massimo
Vignelli, Wim Crouwel, Jonathan Castro, John Maeda.

==================================================================
STEP 0 — WRITE THE CONCEPT FIRST (\`bold.conceptStatement\`)
==================================================================

Before anything else, write a ONE-SENTENCE art-direction statement that
names the visual world this CV lives in. Then write \`bold.conceptMotif\`
as a controlled-vocab shorthand. EVERYTHING downstream — archetype,
palette rule, typography rhythm, name treatment, poster line —
should flow from this concept.

Strong concepts (notice they reference the candidate, not just style):
- "Riso-printed dispatch from a designer whose career reads like a
  wheat-paste poster — loud, urgent, hand-set."
- "Type-specimen sheet for a strategy consultant; restraint as the
  loudest possible move, set in dm-serif on bone paper."
- "Photocopied protest pamphlet for an art-director who cuts through
  noise — black, neon-yellow, off-register."
- "Museum wall-text retrospective for a creative who has earned the
  Pompidou treatment — terracotta and teal, generous whitespace."
- "Index-card archive from a researcher who is mostly fieldwork —
  navy ink on bone, marginalia everywhere, nothing wasted."

WEAK concepts (rewrite if you find yourself writing this):
- "Modern bold creative CV with strong visual identity"
- "Eye-catching layout that reflects the candidate's experience"
- "Professional yet creative design"

==================================================================
STEP 1 — PICK CONTENT TO ELEVATE
==================================================================

Read the candidate's profile. Pick:

- \`bold.posterLine\` — the ONE sentence (max ~14 words) that becomes
  oversized poster-scale type. Take it from the candidate's actual
  summary, OR pull a phrase from their experience, OR write a tagline
  that genuinely fits them. NEVER generic ("Driven Professional",
  "Passionate about technology"). Specifics WIN.

- \`bold.posterLineSource\` — tag where it came from.

- \`bold.accentKeywords\` — 3 to 7 keywords from the JOB VACANCY or the
  candidate's experience that should get accent-color highlights in
  body text. Pick DOMAIN TERMS, not stop-words. Examples:
  - For a data engineer applying at a fintech: "real-time pricing",
    "Kafka", "PostgreSQL", "EUR/USD"
  - For a brand strategist: "circular economy", "type system",
    "brand voice", "Pompidou"
  - For a software architect: "API contracts", "event sourcing",
    "domain modeling", "Kotlin"

- \`bold.heroNumeralValue\` — if \`backgroundNumeral\` is anything other
  than 'none', this is the actual ghost-scale content on the page.
  Pick what is MEANINGFUL: "8" (years of experience), "2026" (target
  year), "DESIGN" (role's first word), initials. NEVER pick a random
  number — pick the one that earns its space.

- \`bold.nameTreatment\` — typeset the name based on what looks best.
  If the candidate has a striking first name, dominate it. If their
  surname is iconic, dominate that. If both are short, stack them.

==================================================================
STEP 2 — PICK A LAYOUT ARCHETYPE
==================================================================

\`bold.layoutArchetype\` restructures the whole DOM:

- **manifesto** — Huge typographic opening + compressed grid below
- **magazine-cover** — Name as ENORMOUS cover headline filling upper half
- **editorial-inversion** — Lead at top, photo right, contact at bottom
- **brutalist-grid** — Hard 3- or 4-column grid (Vignelli)
- **vertical-rail** — Name as vertical strip down the left edge (Saville)
- **mosaic** — Asymmetric mosaic of colored blocks (Kruger / De Stijl)
- **typographic-poster** — Type-only protest poster, NO PHOTO. Name
  fills the upper half. Summary becomes a giant blockquote. Everything
  else is dense small print. Best for: designers, writers, strategists,
  activists, anyone whose voice IS the brand.
- **photo-montage** — Portrait-dominant magazine cover. Photo bleeds
  ~60% of the page. Info overlaid in stacked cards. Best for:
  performers, art directors, anyone whose face IS the brand. REQUIRES
  a photo to be uploaded.

DEFAULT BIAS: pick anything except sidebar-canva. typographic-poster
and photo-montage are the wildest — bias to those when the role can
carry them.

==================================================================
STEP 3 — PICK A PALETTE RULE + COLORS
==================================================================

\`bold.paletteRule\` — choose the GENERATION RULE, then fill in the
actual hex values that satisfy it:

- **split-complement-clash** — primary + two split-complementary
  accents. Toilet Paper energy. Tight, hot, off-key.
- **mono-with-scream** — near-black primary + ONE screaming accent.
  Vignelli / Kruger. Everything else greyscale.
- **analog-warm** — 3 adjacent warm hues (terracotta + mustard + coral).
- **analog-cool** — 3 adjacent cool hues (teal + navy + sage).
- **tri-clash** — 3 mutually clashing hues spread across the wheel.
- **duo-riso** — 2 saturated hues that mis-register (pink+blue,
  red+teal). Print-zine.
- **paper-and-ink** — bone/cream + carbon + ONE accent. Vignelli.
- **fluorescent-pop** — neutral page + ONE neon hit. Kunsthalle.
- **museum-restraint** — muted, dusty, gallery-poster colors.

Then fill \`colors.primary\` / \`colors.accent\` / \`colors.secondary\` /
\`colors.text\` / \`colors.muted\` with REAL hex values that satisfy the
rule. NEVER pick Tailwind defaults (#0891b2, #be185d, #4f46e5,
#f59e0b) — those are SaaS dashboard colors and the recruiter will
spot them.

Match palette to paletteSaturation:
- mono-with-scream / fluorescent-pop → use monochrome-plus-one
- duo-riso → use duotone
- analog-warm / analog-cool / tri-clash / split-complement-clash → use tri-tone or duotone
- paper-and-ink / museum-restraint → use monochrome-plus-one or tri-tone

==================================================================
STEP 4 — TYPOGRAPHY RHYTHM
==================================================================

- \`bold.headingScaleRatio\` — continuous number 1.0–4.0. 1.2=modest,
  1.6=comfortable, 2.0=poster, 3.0=brutalist. Pick the ratio that
  fits your concept. typographic-poster + manifesto want ~2.5+;
  manuscript / archive concepts want ~1.4.
- \`bold.bodyDensity\` — whisper / normal / shout. whisper = tight
  tracking + small leading (specimen feel). shout = loose tracking
  + extra leading (protest feel).
- \`bold.asymmetryStrength\` — none / subtle / strong / extreme.
  extreme = off-balance to discomfort (Carson). Only when concept
  calls for it.

==================================================================
STEP 5 — LAYERED PRIMITIVES (apply within chosen archetype)
==================================================================

- **headingStyle** — for avant-garde, stacked-caps and overlap-block
  are strongest.
- **gradientDirection** — duotone-split (hard edge, riso) and
  offset-clash (contrasting bands) are the most distinctive.
- **surfaceTexture** — REQUIRED non-'none'. This lifts the design out
  of "SaaS flat".
- **skillStyle, photoTreatment, accentShape, iconTreatment** — pick
  whatever fits.
- **headerLayout, sidebarStyle** — only matter for sidebar-canva.

==================================================================
TYPE
==================================================================

FONTS: ${constraints.allowedFontPairings.join(' | ')}
- oswald-source-sans = condensed impact (Carson / concert posters)
- dm-serif-dm-sans = sharp editorial serif
- playfair-inter = literary high-contrast
- space-grotesk-work-sans = techno-gallery (Kunsthalle)
- libre-baskerville-source-sans = old-school book editorial
- merriweather-source-sans = serif workhorse

For manifesto / magazine-cover / typographic-poster: oswald or dm-serif.
For brutalist-grid / vertical-rail: oswald or space-grotesk.
For editorial-inversion / photo-montage: playfair, libre-baskerville, dm-serif.
For specimen / archive concepts: libre-baskerville or merriweather.

==================================================================
REQUIRED BASE TOKENS
==================================================================

- showPhoto: ${hasPhoto ? 'true' : 'false'} (typographic-poster forces false; photo-montage requires true)
- useIcons: true
- roundedCorners: false (sharp corners feel more gallery)
- experienceDescriptionFormat: 'bullets'
- themeBase: 'bold' or 'creative'

==================================================================
REJECTION TEST
==================================================================

Before finalising, ask: "could this come from Canva in 10 minutes?"
If yes, START OVER. Sidebar-canva archetype + default Tailwind colors
+ generic posterLine = automatic fail.

Two experimental CVs for the same person on different days MUST share
NO archetype + paletteRule + posterLine combo. Look at the history
section in the user prompt before deciding.

==================================================================
ARCHETYPE → ROLE MATCHING
==================================================================

1. **typographic-poster** — designers, writers, strategists, activists,
   anyone whose voice IS the brand.
2. **photo-montage** — performers, art directors, anyone whose face IS
   the brand. Requires uploaded photo.
3. **manifesto** — designers, journalists, founders, creative directors.
4. **magazine-cover** — cultural curator, fashion editor, cinematographer.
5. **editorial-inversion** — long-form storyteller, strategist, researcher.
6. **brutalist-grid** — architect, industrial designer, engineer with taste.
7. **vertical-rail** — music industry, gallery curator, boutique consultancy.
8. **mosaic** — visual artist, photographer, multimedia, brand strategist.
9. **sidebar-canva** — RESERVED for regulated/conservative roles only.
${commonSectionOrderFooter}`;
}

function buildUserPrompt(ctx: PromptContext): string {
  let prompt = buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences);

  if (ctx.jobVacancy) {
    prompt += `
INDUSTRY AS STARTING POINT, NOT CONSTRAINT:
Industry: "${ctx.jobVacancy.industry || 'Unknown'}", Company: "${ctx.jobVacancy.company || 'Unknown'}".

Experimental mode is art-directed — the industry tells you WHICH
avant-garde language to speak, not whether to speak one.

- Tech / creative tech → riso-print energy, space-grotesk or oswald,
  duo-riso or fluorescent-pop palette rule.
- Finance / consulting → gallery-restrained avant-garde, dm-serif,
  paper-and-ink or museum-restraint rule. Screen-print texture.
- Creative / agency / fashion → full Toilet-Paper energy, playfair
  or oswald, split-complement-clash or tri-clash rule. Halftone.
- Healthcare / academic → museum-poster restrained, playfair or
  dm-serif, museum-restraint or analog-cool rule. Riso-grain.
- Industrial / engineering → Bauhaus-reprint, space-grotesk or oswald,
  analog-warm or paper-and-ink. Stripe-texture.

If you're 100% CERTAIN about brand colors, incorporate them — but only
as ONE half of a clashing pair, not the whole palette.
`;
  }

  // ===== HISTORY HINT (this is the strongest anti-convergence signal) =====
  const history = snapshotHistory(ctx.styleHistory);
  if (history.length > 0) {
    prompt += `\nPRIOR CVs YOU MADE FOR THIS USER — DO NOT REPEAT ANY OF THESE COMBINATIONS:\n`;
    history.forEach((h, i) => {
      prompt += `  ${i + 1}. archetype=${h.archetype || '?'}, motif=${h.motif || '?'}, paletteRule=${h.paletteRule || '?'}, primary=${h.primary || '?'}\n`;
    });
    prompt += `Your output MUST differ on at least 2 of (archetype, motif, paletteRule) from EVERY prior CV.\n`;
  }

  // ===== VARIATION NUDGE — concrete starting point this round =====
  const archetypePool = ctx.hasPhoto
    ? BOLD_POOLS.layoutArchetype
    : BOLD_POOLS.layoutArchetype.filter(a => a !== 'photo-montage');
  const archetypeNudge = pickFrom(archetypePool);
  const motifNudge = pickFrom(BOLD_POOLS.conceptMotif);
  const paletteRuleNudge = pickFrom(BOLD_POOLS.paletteRule);
  const nameNudge = pickFrom(BOLD_POOLS.nameTreatment);
  const densityNudge = pickFrom(BOLD_POOLS.bodyDensity);
  const asymmetryNudge = pickFrom(BOLD_POOLS.asymmetryStrength);
  const numeralNudge = pickFrom(BOLD_POOLS.backgroundNumeral.filter(n => n !== 'none'));
  const marginaliaNudge = pickFrom(BOLD_POOLS.marginalia);

  prompt += `
VARIATION NUDGE — concrete starting point for this round. Override only
if the role pulls strongly elsewhere:

CONCEPT: motif = "${motifNudge}"
ARCHETYPE: bold.layoutArchetype = "${archetypeNudge}"
PALETTE RULE: bold.paletteRule = "${paletteRuleNudge}"
NAME TREATMENT: bold.nameTreatment = "${nameNudge}"
BODY DENSITY: bold.bodyDensity = "${densityNudge}"
ASYMMETRY: bold.asymmetryStrength = "${asymmetryNudge}"
BACKGROUND NUMERAL: bold.backgroundNumeral = "${numeralNudge}"
MARGINALIA: bold.marginalia = "${marginaliaNudge}"
HEADING STYLE: bold.headingStyle = "${pickFrom(BOLD_POOLS.headingStyle)}"
GRADIENT DIRECTION: bold.gradientDirection = "${pickFrom(BOLD_POOLS.gradientDirection)}"
SURFACE TEXTURE: bold.surfaceTexture = "${pickFrom(BOLD_POOLS.surfaceTexture.filter(t => t !== 'none'))}"
SKILL STYLE: bold.skillStyle = "${pickFrom(BOLD_POOLS.skillStyle)}"
ACCENT SHAPE: bold.accentShape = "${pickFrom(BOLD_POOLS.accentShape)}"
HEADER LAYOUT: bold.headerLayout = "${pickFrom(BOLD_POOLS.headerLayout)}"  (ignored unless archetype=sidebar-canva)
SIDEBAR STYLE: bold.sidebarStyle = "${pickFrom(BOLD_POOLS.sidebarStyle.filter(s => ctx.hasPhoto || s !== 'photo-hero'))}"  (ignored unless archetype=sidebar-canva)
`;

  prompt += `
==================================================================
THE BRIEF — REQUIRED OUTPUT
==================================================================

1. \`bold.conceptStatement\` — write the one-sentence art-direction
   statement FIRST. It must reference the candidate or the role.

2. \`bold.conceptMotif\` — pick the controlled-vocab shorthand.

3. \`bold.posterLine\` — pick the actual line of copy (max ~14 words)
   that becomes oversized type. From the candidate's content, not generic.

4. \`bold.accentKeywords\` — 3-7 meaningful keywords from the vacancy
   or candidate's experience. NOT stop-words.

5. \`bold.heroNumeralValue\` — the actual numeral/word for the page
   anchor (when backgroundNumeral != 'none').

6. \`bold.nameTreatment\` — how to typeset the name based on which
   part carries weight.

7. \`bold.layoutArchetype\` — pick anything except sidebar-canva
   unless the role demands restraint.

8. \`bold.paletteRule\` — pick the rule, then fill the actual hex
   values in \`colors.*\` that satisfy it. NEVER Tailwind defaults.

9. \`bold.headingScaleRatio\` — continuous number 1.0–4.0 matching
   the archetype + concept.

10. \`bold.bodyDensity\` + \`bold.asymmetryStrength\` — set the rhythm.

11. A complete \`bold\` object — fill ALL fields including the
    layered primitives (headingStyle, gradientDirection,
    surfaceTexture, skillStyle, accentShape, etc).

12. surfaceTexture != 'none'.

13. nameStyle = 'uppercase' or 'extra-bold'.

14. headerFullBleed = true unless archetype = sidebar-canva.

REJECTION TEST: If your output could plausibly come from Canva in 10
minutes, REJECT IT and pick a wilder combination. The whole point of
experimental is the strong opinion.

Priority order:
1. Respect the target vacancy and company context
2. Respect explicit user style instructions
3. Then use avant-garde references/examples as a language, never a template
4. Always pick the wildest archetype the role can plausibly carry
5. DIFFER from history (see section above if present)`;

  return prompt;
}

// ============ Fallbacks ============

function getFallback(industry?: string): CVDesignTokens {
  const industryPalettes: Record<string, AvantPalette> = {
    technology: avantGardePalettes.find(p => p.name === 'riso-red-teal')!,
    finance: avantGardePalettes.find(p => p.name === 'navy-mustard-pink')!,
    creative: avantGardePalettes.find(p => p.name === 'hot-pink-forest')!,
    healthcare: avantGardePalettes.find(p => p.name === 'sage-hot-coral')!,
    consulting: avantGardePalettes.find(p => p.name === 'terracotta-teal')!,
  };
  const palette = industryPalettes[industry || ''] || avantGardePalettes[0];
  const decorationTheme = industryToDecorationTheme(industry, 'abstract');

  return {
    styleName: 'Avant-garde',
    styleRationale: 'Art-directed, content-driven, gallery-poster sensibility.',
    industryFit: industry || 'creative',
    themeBase: 'bold',
    colors: {
      primary: palette.primary,
      secondary: '#faf7f2',
      accent: palette.accent,
      text: '#1a1a1a',
      muted: '#5a5a5a',
    },
    fontPairing: 'oswald-source-sans',
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'asymmetric',
    sectionStyle: 'magazine',
    skillsDisplay: 'tags',
    experienceDescriptionFormat: 'bullets',
    contactLayout: 'single-column',
    headerGradient: 'none',
    showPhoto: true,
    useIcons: true,
    roundedCorners: false,
    headerFullBleed: false,
    decorations: 'none',
    decorationTheme,
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications', 'interests'],
    layout: 'single-column',
    sidebarSections: [],
    borderRadius: 'none',
    accentStyle: 'border-left',
    nameStyle: 'uppercase',
    skillTagStyle: 'outlined',
    pageBackground: '#faf7f2',
    bold: {
      conceptStatement: 'Fallback brief: art-directed avant-garde dispatch.',
      conceptMotif: 'manifesto',
      layoutArchetype: 'manifesto',
      columnCount: 2,
      backgroundNumeral: 'initials',
      marginalia: 'numbered',
      paletteSaturation: 'duotone',
      manifestoOpener: true,
      posterLineSource: 'summary-first-sentence',
      nameTreatment: 'first-name-dominant',
      headingScaleRatio: 2.4,
      bodyDensity: 'normal',
      asymmetryStrength: 'strong',
      paletteRule: palette.rule,
      headerLayout: 'tiled',
      sidebarStyle: 'solid-color',
      skillStyle: 'colored-pills',
      photoTreatment: 'color-overlay',
      accentShape: 'diagonal-stripe',
      iconTreatment: 'solid-filled',
      headingStyle: 'stacked-caps',
      gradientDirection: 'duotone-split',
      surfaceTexture: 'halftone',
    },
  };
}

function getContextualFallback(ctx: PromptContext): CVDesignTokens {
  const signals = readContextSignals(ctx);
  const base = getFallback(ctx.jobVacancy?.industry);

  if (signals.isPerformerRole && ctx.hasPhoto) {
    return {
      ...base,
      styleName: 'Photo Montage',
      styleRationale: 'Portrait-dominant magazine cover for performance-driven role.',
      industryFit: ctx.jobVacancy?.industry || 'creative',
      fontPairing: 'playfair-inter',
      bold: {
        ...base.bold!,
        conceptStatement: 'Magazine-cover retrospective where the portrait IS the headline.',
        conceptMotif: 'editorial',
        layoutArchetype: 'photo-montage',
        nameTreatment: 'stacked',
        headingScaleRatio: 2.6,
        paletteRule: 'museum-restraint',
        asymmetryStrength: 'strong',
      },
    };
  }

  if (signals.isCorporate || signals.wantsMinimal) {
    return {
      ...base,
      styleName: 'Gallery Restraint',
      styleRationale: 'Restrained gallery poster energy for finance / consulting / strategy.',
      industryFit: ctx.jobVacancy?.industry || 'finance',
      fontPairing: 'dm-serif-dm-sans',
      colors: {
        primary: '#1e2847',
        secondary: '#f7f2ea',
        accent: '#d6a42b',
        text: '#171717',
        muted: '#5d5d5d',
      },
      bold: {
        ...base.bold!,
        conceptStatement: 'Type-specimen sheet — restraint as the loudest possible move.',
        conceptMotif: 'specimen',
        layoutArchetype: 'editorial-inversion',
        columnCount: 1,
        backgroundNumeral: 'year',
        marginalia: 'numbered',
        paletteSaturation: 'tri-tone',
        nameTreatment: 'last-name-dominant',
        headingScaleRatio: 1.6,
        bodyDensity: 'whisper',
        asymmetryStrength: 'subtle',
        paletteRule: 'paper-and-ink',
        headingStyle: 'overlap-block',
        gradientDirection: 'offset-clash',
        surfaceTexture: 'screen-print',
      },
    };
  }

  if (signals.isCreativeRole || signals.wantsLoud) {
    return {
      ...base,
      styleName: 'Poster Manifesto',
      styleRationale: 'High-contrast typographic-poster energy for creative roles.',
      industryFit: ctx.jobVacancy?.industry || 'creative',
      fontPairing: 'oswald-source-sans',
      colors: {
        primary: '#e91e63',
        secondary: '#faf7f2',
        accent: '#1b5e20',
        text: '#151515',
        muted: '#595959',
      },
      bold: {
        ...base.bold!,
        conceptStatement: 'Wheat-paste poster from a designer with a strong voice.',
        conceptMotif: 'protest',
        layoutArchetype: 'typographic-poster',
        columnCount: 1,
        backgroundNumeral: 'initials',
        nameTreatment: 'first-letter-massive',
        headingScaleRatio: 2.8,
        bodyDensity: 'shout',
        asymmetryStrength: 'strong',
        paletteRule: 'split-complement-clash',
        paletteSaturation: 'duotone',
        headingStyle: 'stacked-caps',
        gradientDirection: 'duotone-split',
        surfaceTexture: 'halftone',
      },
    };
  }

  return base;
}

// ============ columnCount rotation (numbers — rotateLeastUsed only handles strings) ============

function rotateColumnCount(
  current: 1 | 2 | 3 | 4,
  history: CVDesignTokens[] | undefined,
  archetype: NonNullable<CVDesignTokens['bold']>['layoutArchetype'],
): 1 | 2 | 3 | 4 {
  // Only archetypes that consume columnCount
  const usesColumns = archetype === 'manifesto' || archetype === 'brutalist-grid' || archetype === 'mosaic';
  if (!usesColumns) return current;
  if (!history || history.length === 0) return current;

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const t of history) {
    const c = t.bold?.columnCount;
    if (c && counts[c] !== undefined) counts[c] += 1;
  }
  const allowed: Array<1 | 2 | 3 | 4> = archetype === 'brutalist-grid' ? [2, 3, 4] : [1, 2, 3];
  const maxCount = Math.max(...Object.values(counts));
  if ((counts[current] || 0) < maxCount) return current;

  const minCount = Math.min(...allowed.map(v => counts[v] || 0));
  const candidates = allowed.filter(v => (counts[v] || 0) === minCount);
  return candidates[Math.floor(Math.random() * candidates.length)] || current;
}

// ============ Normalize ============

function normalize(raw: unknown, ctx: PromptContext): CVDesignTokens {
  const constraints = creativityConstraints.experimental;
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

  // Pre-validate bold so we know the archetype before deciding layout.
  tokens.bold = validateAndFixBoldTokens(tokens.bold, !!tokens.showPhoto);

  // Photo-dependent archetypes adjust showPhoto
  if (tokens.bold.layoutArchetype === 'typographic-poster') {
    tokens.showPhoto = false;
  }
  if (tokens.bold.layoutArchetype === 'photo-montage' && !ctx.hasPhoto) {
    // Can't render photo-montage without a photo — downgrade to magazine-cover
    console.log(`[${LOG_TAG}] photo-montage requested but no photo — downgrading to magazine-cover`);
    tokens.bold.layoutArchetype = 'magazine-cover';
  }

  // Only sidebar-canva archetype needs the sidebar-* layout flag.
  if (tokens.bold.layoutArchetype === 'sidebar-canva') {
    if (tokens.layout !== 'sidebar-left' && tokens.layout !== 'sidebar-right') {
      tokens.layout = Math.random() > 0.5 ? 'sidebar-left' : 'sidebar-right';
    }
    if (!tokens.sidebarSections || tokens.sidebarSections.length === 0) {
      tokens.sidebarSections = ['skills', 'languages', 'certifications'];
    }
  } else {
    tokens.layout = 'single-column';
    tokens.sidebarSections = [];
  }

  applyBaseValidations(tokens, LOG_TAG);
  clearOtherRendererTokens(tokens, 'bold');

  // Rotate string primitives across history.
  rotateLeastUsed(
    tokens,
    ctx.styleHistory,
    {
      'bold.layoutArchetype': BOLD_POOLS.layoutArchetype,
      'bold.conceptMotif': BOLD_POOLS.conceptMotif,
      'bold.paletteRule': BOLD_POOLS.paletteRule,
      'bold.nameTreatment': BOLD_POOLS.nameTreatment,
      'bold.bodyDensity': BOLD_POOLS.bodyDensity,
      'bold.asymmetryStrength': BOLD_POOLS.asymmetryStrength,
      'bold.backgroundNumeral': BOLD_POOLS.backgroundNumeral,
      'bold.marginalia': BOLD_POOLS.marginalia,
      'bold.paletteSaturation': BOLD_POOLS.paletteSaturation,
      'bold.headerLayout': BOLD_POOLS.headerLayout,
      'bold.sidebarStyle': tokens.showPhoto
        ? BOLD_POOLS.sidebarStyle
        : BOLD_POOLS.sidebarStyle.filter(s => s !== 'photo-hero'),
      'bold.skillStyle': BOLD_POOLS.skillStyle,
      'bold.headingStyle': BOLD_POOLS.headingStyle,
      'bold.gradientDirection': BOLD_POOLS.gradientDirection,
      'bold.accentShape': BOLD_POOLS.accentShape,
      'bold.photoTreatment': BOLD_POOLS.photoTreatment,
      'bold.surfaceTexture': BOLD_POOLS.surfaceTexture,
      'bold.posterLineSource': BOLD_POOLS.posterLineSource,
      fontPairing: constraints.allowedFontPairings,
      ...(tokens.bold.layoutArchetype === 'sidebar-canva'
        ? { layout: ['sidebar-left', 'sidebar-right'] }
        : {}),
    },
    LOG_TAG,
  );

  // Custom number rotation for columnCount (not a string — rotateLeastUsed skips it)
  if (tokens.bold.columnCount) {
    tokens.bold.columnCount = rotateColumnCount(
      tokens.bold.columnCount,
      ctx.styleHistory,
      tokens.bold.layoutArchetype,
    );
  }

  // Final pass after rotation — the archetype may have flipped which
  // means the constraints (photo-required / column-required) may need
  // to fire again.
  tokens.bold = validateAndFixBoldTokens(tokens.bold, !!tokens.showPhoto);
  if (tokens.bold.layoutArchetype === 'typographic-poster') tokens.showPhoto = false;
  if (tokens.bold.layoutArchetype === 'photo-montage' && !ctx.hasPhoto) {
    tokens.bold.layoutArchetype = 'magazine-cover';
  }

  // Re-align layout / sidebarSections to the final archetype
  if (tokens.bold.layoutArchetype === 'sidebar-canva') {
    if (tokens.layout !== 'sidebar-left' && tokens.layout !== 'sidebar-right') {
      tokens.layout = 'sidebar-left';
    }
    if (!tokens.sidebarSections || tokens.sidebarSections.length === 0) {
      tokens.sidebarSections = ['skills', 'languages', 'certifications'];
    }
  } else {
    tokens.layout = 'single-column';
    tokens.sidebarSections = [];
  }

  return tokens;
}

export const experimentalExpert: StyleExpert = {
  level: 'experimental',
  schema: experimentalSchema,
  preferredTemperature: 1.2,
  buildPrompt(ctx: PromptContext): BuiltPrompt {
    return {
      system: buildSystemPrompt(ctx.hasPhoto),
      user: buildUserPrompt(ctx),
    };
  },
  normalize,
  getFallback,
};
