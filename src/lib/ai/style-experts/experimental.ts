/**
 * Experimental expert — avant-garde / gallery-style CVs.
 *
 * References: MSCHF, Toilet Paper magazine, David Carson, Peter Saville,
 * Barbara Kruger, Aries Moross, modern museum identities (Stedelijk,
 * Centre Pompidou, MoMA PS1). The goal is "made by someone with a voice",
 * not "made by a SaaS template wizard".
 *
 * Uses a dedicated `bold` object with orthogonal primitives that map to the
 * bold renderer. Variation rotation targets those primitives directly so
 * the level doesn't converge on the same look.
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

const LOG_TAG = 'Style Gen [experimental]';

// ============ Bold schema ============

const boldSchema = z.object({
  // ===== Top-level archetype — THE most important decision =====
  layoutArchetype: z.enum([
    'sidebar-canva',
    'manifesto',
    'magazine-cover',
    'editorial-inversion',
    'brutalist-grid',
    'vertical-rail',
    'mosaic',
  ]).optional().describe(
    `THE top-level page structure decision — pick ONE first, then everything else
    layers on top:
    - sidebar-canva: classic Canva look (use sparingly — feels safest)
    - manifesto: huge typographic opening statement, compressed grid below
    - magazine-cover: name treated as cover headline filling the upper half
    - editorial-inversion: lead paragraph on top, contact at bottom, photo right
    - brutalist-grid: hard rectilinear N-column grid, no sidebar (Vignelli / Massimo)
    - vertical-rail: name as a vertical strip running the full left edge (Saville)
    - mosaic: asymmetric mosaic of colored blocks — no rigid columns (Kruger)

    DEFAULT BIAS: pick one of manifesto / brutalist-grid / vertical-rail / mosaic /
    editorial-inversion / magazine-cover. Only fall back to sidebar-canva when the
    role / context strongly demands restraint (e.g. legal, regulated banking).`,
  ),
  columnCount: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional().describe(
    'Number of columns in the main content area. 1 = single editorial column, 2 = standard grid, 3-4 = dense brutalist. Only consumed by manifesto / brutalist-grid / mosaic.',
  ),
  backgroundNumeral: z.enum(['none', 'initials', 'year', 'section-number', 'role']).optional().describe(
    `Optional huge faded background element that anchors the page:
    - initials: candidate's initials at giant scale, ghosted
    - year: a year (current or first year of experience) as page anchor
    - section-number: big numerals per section bleeding into the background
    - role: first word of target role at editorial scale
    - none: no background numeral`,
  ),
  marginalia: z.enum(['none', 'vertical-strip', 'numbered', 'kicker-callouts']).optional().describe(
    `Side-margin annotation treatment:
    - vertical-strip: vertical-rl text rotated along one page edge
    - numbered: small numbered annotations beside sections
    - kicker-callouts: short kicker labels floated into the margin
    - none: no marginalia`,
  ),
  paletteSaturation: z.enum(['monochrome-plus-one', 'duotone', 'tri-tone', 'full-palette']).optional().describe(
    `How many palette colors to actually deploy:
    - monochrome-plus-one: greyscale + single screaming accent (Kruger)
    - duotone: two strong colors only, riso vibe
    - tri-tone: three colors in equal weight, museum-poster feel
    - full-palette: deploy all 5 palette colors freely`,
  ),
  manifestoOpener: z.boolean().optional().describe(
    'When true, the summary section is rendered as a manifesto-style oversized opening statement instead of normal body text. Strongest in manifesto / magazine-cover / editorial-inversion archetypes.',
  ),

  // ===== Layered primitives (apply within the chosen archetype) =====
  headerLayout: z.enum(['hero-band', 'split-photo', 'tiled', 'asymmetric-burst']).optional().describe(
    'Header composition (only consumed by sidebar-canva archetype — other archetypes own their own header treatment).',
  ),
  sidebarStyle: z.enum(['solid-color', 'gradient', 'photo-hero', 'transparent']).optional().describe(
    'Sidebar treatment (only consumed by sidebar-canva archetype).',
  ),
  skillStyle: z.enum(['bars-gradient', 'dots-rating', 'icon-tagged', 'colored-pills']).optional().describe(
    'Skills rendering style.',
  ),
  photoTreatment: z.enum(['circle-halo', 'squircle', 'color-overlay', 'badge-framed']).optional().describe(
    'Photo frame treatment.',
  ),
  accentShape: z.enum(['diagonal-stripe', 'angled-corner', 'colored-badge', 'hex-pattern']).optional().describe(
    'Structural accent applied to sections.',
  ),
  iconTreatment: z.enum(['solid-filled', 'duotone', 'line-with-accent']).optional().describe(
    'Contact icons style.',
  ),
  headingStyle: z.enum([
    'oversized-numbered',
    'kicker-bar',
    'gradient-text',
    'bracketed',
    'stacked-caps',
    'overlap-block',
  ]).optional().describe(
    `Section titles:
    - oversized-numbered: big 01/02/03 numerals
    - kicker-bar: small colored bar over big title
    - gradient-text: gradient fill on title
    - bracketed: [ SECTION ] wrapped uppercase
    - stacked-caps: title stacked vertically in ENORMOUS caps (Peter Saville)
    - overlap-block: title set against a colored block that bleeds past it`,
  ),
  gradientDirection: z.enum([
    'none', 'linear-vertical', 'linear-diagonal', 'radial-burst', 'duotone-split', 'offset-clash',
  ]).optional().describe(
    `Gradient mode: none | linear-vertical | linear-diagonal | radial-burst | duotone-split (riso-style hard split) | offset-clash (two contrasting color bands)`,
  ),
  surfaceTexture: z.enum(['none', 'halftone', 'riso-grain', 'screen-print', 'stripe-texture']).optional().describe(
    `Overlay texture on colored surfaces (header, sidebar):
    - none: flat color
    - halftone: screen-printed dot pattern
    - riso-grain: subtle riso-print noise
    - screen-print: slight mis-registered color offset (Peter Saville)
    - stripe-texture: fine repeating diagonal lines`,
  ),
});

const experimentalSchema = baseDesignTokensSchema.extend({
  bold: boldSchema.optional().describe('Bold layout tokens — drive the avant-garde renderer.'),
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract']).optional(),
  layout: z.enum(['sidebar-left', 'sidebar-right']).optional(),
});

// ============ Bold pools ============

const BOLD_POOLS = {
  // The "wild" archetypes — sidebar-canva is intentionally excluded from
  // the rotation pool so the AI biases away from the safest layout. The
  // schema still allows it; only `rotateLeastUsed` won't pull it back.
  layoutArchetype: [
    'manifesto', 'magazine-cover', 'editorial-inversion', 'brutalist-grid',
    'vertical-rail', 'mosaic',
  ] as const,
  columnCount: [1, 2, 3, 4] as const,
  backgroundNumeral: ['none', 'initials', 'year', 'section-number', 'role'] as const,
  marginalia: ['none', 'vertical-strip', 'numbered', 'kicker-callouts'] as const,
  paletteSaturation: ['monochrome-plus-one', 'duotone', 'tri-tone', 'full-palette'] as const,
  manifestoOpener: [true, false] as const,

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

// ============ Avant-garde color palettes ============
//
// These REPLACE the generic color-moods pool for experimental. Each is a
// deliberate clash — the kind that makes a CV look art-directed instead of
// Tailwind-defaulted. Hex codes are suggestions only; the AI is expected
// to riff on them, not copy verbatim.
interface AvantPalette {
  name: string;
  description: string;
  primary: string;
  accent: string;
}

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
    isCreativeRole: /\b(creative|design|designer|marketing|brand|art|fashion|agency|content)\b/.test(combined),
  };
}

const avantGardePalettes: AvantPalette[] = [
  {
    name: 'riso-red-teal',
    description: 'Riso-print red + teal. Bright hot red + turquoise, clashing in the best way. Toilet Paper magazine energy.',
    primary: '#d73838',
    accent: '#1d8a99',
  },
  {
    name: 'hot-pink-forest',
    description: 'Hot pink primary + deep forest green accent. Aries Moross poster vibe — unapologetic, confident.',
    primary: '#e91e63',
    accent: '#1b5e20',
  },
  {
    name: 'mustard-plum',
    description: 'Mustard yellow + aubergine plum. Mid-century avant-garde, Bauhaus reprint.',
    primary: '#5a2442',
    accent: '#d4a21a',
  },
  {
    name: 'electric-violet-olive',
    description: 'Electric violet primary + dusty olive accent. Museum identity feel (MoMA PS1, Stedelijk).',
    primary: '#6b21a8',
    accent: '#6e7e3c',
  },
  {
    name: 'sage-hot-coral',
    description: 'Sage green primary + hot coral accent. Unexpected warm-cool split. Apartamento/Cereal hybrid.',
    primary: '#5b7a5c',
    accent: '#f96958',
  },
  {
    name: 'paper-bone-black-red',
    description: 'Bone white page, carbon black primary, single screaming red accent. Barbara Kruger / Vignelli.',
    primary: '#0f0f0f',
    accent: '#d9322b',
  },
  {
    name: 'navy-mustard-pink',
    description: 'Deep navy primary + mustard accent, slight dusty-pink highlights. 1970s art-book feel.',
    primary: '#1e2847',
    accent: '#d6a42b',
  },
  {
    name: 'terracotta-teal',
    description: 'Warm terracotta primary + deep teal accent. Centre Pompidou ceramic-show palette.',
    primary: '#b8613b',
    accent: '#155e63',
  },
  {
    name: 'riso-pink-blue',
    description: 'Hot pink + electric blue — classic riso duotone. Print-zine energy.',
    primary: '#ff3d7f',
    accent: '#2d5fff',
  },
  {
    name: 'black-neon-yellow',
    description: 'Pure black primary with one single neon-yellow accent. Modern gallery poster (Kunsthalle Basel style).',
    primary: '#0a0a0a',
    accent: '#e8fc4a',
  },
];

// ============ Bold validator ============

// All possible archetypes the schema allows. Pools above intentionally
// omit sidebar-canva to bias rotation, but we still need to validate it.
const ALL_ARCHETYPES = [
  'sidebar-canva', 'manifesto', 'magazine-cover', 'editorial-inversion',
  'brutalist-grid', 'vertical-rail', 'mosaic',
] as const;

function validateAndFixBoldTokens(
  raw: CVDesignTokens['bold'] | undefined,
  showPhoto: boolean,
): NonNullable<CVDesignTokens['bold']> {
  const isValid = <T extends string>(val: unknown, allowed: readonly T[]): val is T =>
    typeof val === 'string' && allowed.includes(val as T);
  const isValidNum = <T extends number>(val: unknown, allowed: readonly T[]): val is T =>
    typeof val === 'number' && allowed.includes(val as T);

  // ===== New v3 primitives =====
  const layoutArchetype = isValid(raw?.layoutArchetype, ALL_ARCHETYPES)
    ? raw!.layoutArchetype
    : pickFrom(BOLD_POOLS.layoutArchetype);

  const columnCount = isValidNum(raw?.columnCount, BOLD_POOLS.columnCount)
    ? raw!.columnCount
    : pickFrom(BOLD_POOLS.columnCount);

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
      || layoutArchetype === 'editorial-inversion');

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
  // Experimental should virtually never be SaaS-flat — bump 'none' to riso-grain.
  if (surfaceTexture === 'none') surfaceTexture = 'riso-grain';

  return {
    layoutArchetype,
    columnCount,
    backgroundNumeral,
    marginalia,
    paletteSaturation,
    manifestoOpener,
    headerLayout,
    sidebarStyle,
    skillStyle,
    photoTreatment,
    accentShape,
    iconTreatment,
    headingStyle,
    gradientDirection,
    surfaceTexture,
  };
}

// ============ Prompts ============

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints.experimental;
  return `${commonSystemHeader(hasPhoto)}

*** EXPERIMENTAL MODE — ART-DIRECTED, OVERBOARD, ZERO COMPROMISE ***

You are the ART DIRECTOR for this CV, not a template picker. The brief:
*overboard*. The result should NOT resemble a standard CV. Anything but
boring. A recruiter looking at it should think "this person had it MADE,
not generated."

References: MSCHF, Toilet Paper magazine, Barbara Kruger, David Carson,
Peter Saville, Aries Moross, Stedelijk Museum identity, Centre Pompidou
posters, Massimo Vignelli, Wim Crouwel, Jonathan Castro, John Maeda.

This level MUST clearly out-do "creative" — creative is an editorial
magazine layout, this is a gallery wall, a zine, a manifesto poster.

==================================================================
STEP 1 — PICK A LAYOUT ARCHETYPE  (this is the BIG decision)
==================================================================

Pick \`bold.layoutArchetype\`. This radically restructures the WHOLE
page — not just a header variant, an entire DOM skeleton.

- **manifesto** — Huge typographic opening (the summary becomes a
  poster-scale statement). Below: a compressed N-column grid of
  experience + education + skills. No sidebar. Like a zine cover.

- **magazine-cover** — Name treated as a magazine cover headline filling
  the upper half of the page (ENORMOUS display type, kicker labels in
  smaller caps, oversized issue-number style). Story content flows
  below in a single dense column.

- **editorial-inversion** — Inverts the conventional order: a "lead
  paragraph" summary at the very top, photo on the right, experience
  in the middle, contact info pushed to the BOTTOM of the page (not
  the top — that's the inversion). Feels like a long-form article.

- **brutalist-grid** — Hard rectilinear N-column grid (3 or 4 columns).
  No sidebar. Every section is its own bordered cell. Vignelli /
  Massimo Vignelli / Crouwel. Sharp corners, generous whitespace
  inside cells, blocks of pure color used as section dividers.

- **vertical-rail** — Name set as a VERTICAL strip running the full
  height of the left page edge (writing-mode vertical-rl, oversized
  caps). The rest of the content sits in a single column to the right.
  Peter Saville / album-sleeve energy.

- **mosaic** — Asymmetric mosaic of colored blocks. Sections live in
  rectangles of different sizes and clashing colors arranged in a
  Mondrian-ish composition. Some blocks have a section title, some
  have body text, some are just pure color "breathing" blocks. Barbara
  Kruger / De Stijl reprint.

- **sidebar-canva** — The classic Canva sidebar layout. ONLY use this
  when the role explicitly demands restraint (regulated banking, big-4
  audit, government). For most experimental CVs this is OFF THE TABLE.

DEFAULT BIAS: choose anything EXCEPT sidebar-canva. If you find
yourself reaching for sidebar-canva, push back — the user explicitly
asked for "anything but boring". Pick the archetype the role can
SUPPORT, not the safest one.

==================================================================
STEP 2 — LAYER COMPOSITIONAL PRIMITIVES
==================================================================

- **columnCount** — 1 | 2 | 3 | 4. Number of columns in the main
  content grid. Use 1 for single editorial column. 2 for standard.
  3-4 for dense brutalist. Only consumed by manifesto, brutalist-grid,
  mosaic.

- **backgroundNumeral** — none | initials | year | section-number | role
  A huge faded anchor element behind the content. Common in editorial
  design (think: massive ghosted "01" or "2026" or "DESIGN" sitting
  behind a column of text). Adds depth + scale. Use OFTEN.

- **marginalia** — none | vertical-strip | numbered | kicker-callouts
  Side-margin annotations. vertical-strip = vertical text running on
  one edge; numbered = small numbered footnotes beside sections;
  kicker-callouts = short kicker labels floating in margins.

- **paletteSaturation** — monochrome-plus-one | duotone | tri-tone | full-palette
  How aggressively to use the palette. monochrome-plus-one = greyscale
  + one screaming accent (Kruger). duotone = two strong colors only.
  tri-tone = three colors equal weight. full-palette = use all 5.

- **manifestoOpener** — boolean. When true, the summary becomes a
  manifesto-scale statement at the top of the page. Strongest with
  manifesto, magazine-cover, editorial-inversion.

==================================================================
STEP 3 — LAYERED PRIMITIVES (apply within chosen archetype)
==================================================================

- **headingStyle** — oversized-numbered | kicker-bar | gradient-text | bracketed | stacked-caps | overlap-block
  For avant-garde: stacked-caps and overlap-block are strongest.

- **gradientDirection** — none | linear-vertical | linear-diagonal | radial-burst | duotone-split | offset-clash
  duotone-split = hard edge, riso energy. offset-clash = two contrasting
  bands. radial-burst = museum-poster.

- **surfaceTexture** — halftone | riso-grain | screen-print | stripe-texture
  REQUIRED. Pick a non-'none' value. This is what lifts the design out
  of "SaaS flat".

- **skillStyle, photoTreatment, accentShape, iconTreatment** — as before,
  pick whatever fits the archetype. These get used regardless.

- **headerLayout, sidebarStyle** — Only matter for sidebar-canva
  archetype; ignored by other archetypes. Still fill them.

==================================================================
COLORS — STATEMENT, NOT DECORATION
==================================================================

Experimental EXISTS to use color as a statement. The palette MUST be
unexpected. NEVER reach for Tailwind defaults (#0891b2, #be185d,
#4f46e5, #f59e0b) — those are SaaS dashboard colors and the user will
spot them immediately.

Off-key combinations that work:
- hot-pink + forest-green (Aries Moross)
- red + teal (riso-print)
- mustard + aubergine plum (Bauhaus reprint)
- electric-violet + dusty-olive (Stedelijk)
- sage-green + hot-coral (Apartamento)
- bone-white + pure-black + one screaming red (Kruger / Vignelli)
- navy + mustard + dusty-pink (1970s art-book)
- terracotta + deep-teal (Centre Pompidou ceramics)
- black + single neon-yellow accent (Kunsthalle Basel)
- electric-blue + hot-pink (riso duotone)

Match palette to paletteSaturation:
- monochrome-plus-one → primary near-black, accent loud (red/yellow/pink)
- duotone → two strong colors of equal weight (red+teal, pink+blue)
- tri-tone → three confident colors (navy/mustard/pink, terracotta/teal/cream)
- full-palette → all 5 palette tokens get airtime

==================================================================
TYPE
==================================================================

FONTS (pick from): ${constraints.allowedFontPairings.join(' | ')}
- oswald-source-sans = condensed impact (David Carson / concert posters)
- dm-serif-dm-sans = sharp editorial serif
- playfair-inter = literary high-contrast
- space-grotesk-work-sans = techno-gallery (Kunsthalle)
- libre-baskerville-source-sans = old-school book editorial
- merriweather-source-sans = serif workhorse

For manifesto / magazine-cover: pick oswald or dm-serif (display weight matters).
For brutalist-grid / vertical-rail: oswald or space-grotesk.
For editorial-inversion: playfair, libre-baskerville, dm-serif (long-form serif).

==================================================================
REQUIRED BASE TOKENS
==================================================================

- showPhoto: ${hasPhoto ? 'true' : 'false'}
- useIcons: true
- roundedCorners: false (sharp corners feel more gallery)
- experienceDescriptionFormat: 'bullets'
- themeBase: 'bold' or 'creative'

==================================================================
THE REJECTION TEST
==================================================================

Before finalising, ask: "does this look like a CV someone could have
made in Canva in 10 minutes?" If yes, START OVER. The brief is
overboard, art-directed, made-by-a-person. Sidebar-canva archetype +
default colors = automatic fail.

Two experimental CVs for the same industry should share NO archetype
and NO palette.

==================================================================
ARCHETYPE → ENERGY MATCHING
==================================================================

1. Manifesto — "I'M HERE, READ ME" energy. Designers, journalists,
   founders, activists, creative directors.

2. Magazine-cover — Cultural curator, fashion editor, cinematographer,
   art director. Anyone whose role is a brand of one.

3. Editorial-inversion — Long-form storyteller. Strategist,
   policymaker, researcher, writer, designer with depth.

4. Brutalist-grid — Architect, industrial designer, engineer with
   strong design taste, museum identity work, art director with
   Swiss-school taste.

5. Vertical-rail — Music industry, gallery curator, music producer,
   anyone with Saville reference. Also works for boutique consultancy.

6. Mosaic — Visual artist, photographer, multimedia, brand
   strategist, anyone who needs visual variety.

7. Sidebar-canva — RESERVED for regulated/conservative roles only.
${commonSectionOrderFooter}`;
}

function buildUserPrompt(ctx: PromptContext): string {
  let prompt = buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences);

  if (ctx.jobVacancy) {
    prompt += `
INDUSTRY AS STARTING POINT, NOT CONSTRAINT:
Industry: "${ctx.jobVacancy.industry || 'Unknown'}", Company: "${ctx.jobVacancy.company || 'Unknown'}".

Experimental mode is art-directed — the industry tells you WHICH avant-garde
language to speak, not whether to speak one.

- Tech / creative tech → riso-print energy (red+teal, pink+blue). Halftone
  or riso-grain. space-grotesk or oswald.
- Finance / consulting → gallery-restrained avant-garde (navy+mustard,
  black+neon-yellow, terracotta+teal). Screen-print texture. dm-serif.
- Creative / agency / fashion → full Toilet-Paper / Aries-Moross
  (hot-pink+forest, mustard+plum, electric-violet+olive). Halftone.
  playfair or oswald.
- Healthcare / academic → museum-poster restrained (sage-green+coral,
  terracotta+teal, bone+black+red). Riso-grain. playfair or dm-serif.
- Industrial / engineering → Bauhaus-reprint (mustard+plum, black+yellow,
  navy+mustard). Stripe-texture. space-grotesk or oswald.

If you're 100% CERTAIN about brand colors, you may incorporate them — but
only as ONE half of a clashing pair, not the whole palette. The other half
should come from the avant-garde family.
`;
  }

  // Variation nudge — pick concrete bold primitives to try this round.
  const sidebarPool = ctx.hasPhoto
    ? BOLD_POOLS.sidebarStyle
    : BOLD_POOLS.sidebarStyle.filter(s => s !== 'photo-hero');
  const palette = pickFrom(avantGardePalettes);
  const archetypeNudge = pickFrom(BOLD_POOLS.layoutArchetype);
  const paletteSatNudge = pickFrom(BOLD_POOLS.paletteSaturation);
  const numeralNudge = pickFrom(BOLD_POOLS.backgroundNumeral.filter(n => n !== 'none'));
  const marginaliaNudge = pickFrom(BOLD_POOLS.marginalia);
  const colCountNudge = pickFrom(BOLD_POOLS.columnCount);
  prompt += `
VARIATION NUDGE — concrete starting point for this round (override only
if the role pulls strongly elsewhere):

ARCHETYPE: try \`bold.layoutArchetype\` = "${archetypeNudge}"
  → If this doesn't fit the role, pick a DIFFERENT non-sidebar-canva
    archetype. Do NOT fall back to sidebar-canva unless the role is
    regulated/conservative.

PALETTE: "${palette.name}" — ${palette.description}
  (suggested primary ${palette.primary}, accent ${palette.accent})
PALETTE SATURATION: try \`bold.paletteSaturation\` = "${paletteSatNudge}"

LAYOUT DETAILS:
- columnCount = ${colCountNudge}  (override based on archetype: brutalist-grid needs 3 or 4, manifesto often 2, mosaic 2 or 3)
- backgroundNumeral = "${numeralNudge}"
- marginalia = "${marginaliaNudge}"
- manifestoOpener = ${archetypeNudge === 'manifesto' || archetypeNudge === 'magazine-cover' || archetypeNudge === 'editorial-inversion'}

LAYERED:
- bold.headingStyle = "${pickFrom(BOLD_POOLS.headingStyle)}"
- bold.gradientDirection = "${pickFrom(BOLD_POOLS.gradientDirection)}"
- bold.surfaceTexture = "${pickFrom(BOLD_POOLS.surfaceTexture.filter(t => t !== 'none'))}"
- bold.skillStyle = "${pickFrom(BOLD_POOLS.skillStyle)}"
- bold.accentShape = "${pickFrom(BOLD_POOLS.accentShape)}"
- bold.headerLayout = "${pickFrom(BOLD_POOLS.headerLayout)}"  (ignored unless archetype is sidebar-canva)
- bold.sidebarStyle = "${pickFrom(sidebarPool)}"  (ignored unless archetype is sidebar-canva)
`;

  prompt += `
==================================================================
THE BRIEF
==================================================================

You're designing a CV that goes OVERBOARD. The user explicitly asked
for "anything but boring". Your output must include:

1. \`bold.layoutArchetype\` — pick something OTHER than sidebar-canva
   unless the role truly demands restraint. The default expectation is
   manifesto, magazine-cover, brutalist-grid, vertical-rail, mosaic, or
   editorial-inversion.

2. A complete \`bold\` object — ALL fields filled, including the new
   archetype-driver fields (layoutArchetype, columnCount,
   backgroundNumeral, marginalia, paletteSaturation, manifestoOpener)
   AND the layered primitives (headingStyle, gradientDirection,
   surfaceTexture etc).

3. An avant-garde palette (NOT Tailwind defaults). Bias toward
   off-key combinations.

4. surfaceTexture != 'none'. Always texture.

5. nameStyle = 'uppercase' or 'extra-bold'. Never 'normal'.

6. headerFullBleed = true unless the archetype is sidebar-canva.

REJECTION TEST: If your output could plausibly come from Canva in 10
minutes, REJECT IT and pick a wilder combination. The whole point of
experimental is the strong opinion.

Priority order:
1. Respect the target vacancy and company context
2. Respect explicit user style instructions
3. Then use avant-garde references/examples as a language, never as a fixed template
4. Always pick the wildest archetype the role can plausibly carry`;

  return prompt;
}

function getFallback(industry?: string): CVDesignTokens {
  // Industry → curated avant-garde palette (NOT Tailwind-pop colors).
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
    styleRationale: 'Art-directed, unexpected colors, gallery-poster sensibility.',
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
    layout: 'sidebar-left',
    sidebarSections: ['skills', 'languages', 'certifications'],
    borderRadius: 'none',
    accentStyle: 'border-left',
    nameStyle: 'uppercase',
    skillTagStyle: 'outlined',
    pageBackground: '#faf7f2',
    bold: {
      layoutArchetype: 'manifesto',
      columnCount: 2,
      backgroundNumeral: 'initials',
      marginalia: 'numbered',
      paletteSaturation: 'duotone',
      manifestoOpener: true,
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

  if (signals.isCorporate || signals.wantsMinimal) {
    return {
      ...base,
      styleName: 'Gallery Corporate',
      styleRationale: 'Restrained gallery poster energy suited to finance, consulting and strategy roles.',
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
        layoutArchetype: 'editorial-inversion',
        columnCount: 1,
        backgroundNumeral: 'year',
        marginalia: 'numbered',
        paletteSaturation: 'tri-tone',
        manifestoOpener: true,
        headerLayout: 'asymmetric-burst',
        sidebarStyle: 'gradient',
        skillStyle: 'dots-rating',
        photoTreatment: 'badge-framed',
        accentShape: 'angled-corner',
        iconTreatment: 'line-with-accent',
        headingStyle: 'overlap-block',
        gradientDirection: 'offset-clash',
        surfaceTexture: 'screen-print',
      },
    };
  }

  if (signals.isCreativeRole || signals.wantsLoud) {
    return {
      ...base,
      styleName: 'Poster Experimental',
      styleRationale: 'High-contrast poster language for creative, brand and culture roles.',
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
        layoutArchetype: 'mosaic',
        columnCount: 3,
        backgroundNumeral: 'initials',
        marginalia: 'vertical-strip',
        paletteSaturation: 'duotone',
        manifestoOpener: false,
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

  return base;
}

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

  // Only the sidebar-canva archetype needs the sidebar-* layout flag. The
  // other archetypes own their own structure inside bold.ts.
  if (tokens.bold.layoutArchetype === 'sidebar-canva') {
    if (tokens.layout !== 'sidebar-left' && tokens.layout !== 'sidebar-right') {
      tokens.layout = Math.random() > 0.5 ? 'sidebar-left' : 'sidebar-right';
    }
    if (!tokens.sidebarSections || tokens.sidebarSections.length === 0) {
      tokens.sidebarSections = ['skills', 'languages', 'certifications'];
    }
  } else {
    // Non-sidebar archetypes default to single-column; sidebarSections is moot.
    tokens.layout = 'single-column';
    tokens.sidebarSections = [];
  }

  applyBaseValidations(tokens, LOG_TAG);
  clearOtherRendererTokens(tokens, 'bold');

  // Rotate the bold primitives across history — THE variation fix.
  // rotateLeastUsed only handles string values, so columnCount stays a
  // plain field (rotation handled by validator's pickFrom for fresh runs).
  rotateLeastUsed(
    tokens,
    ctx.styleHistory,
    {
      // ===== Archetype rotation is the most important — bias diversity at the top =====
      'bold.layoutArchetype': BOLD_POOLS.layoutArchetype,
      'bold.backgroundNumeral': BOLD_POOLS.backgroundNumeral,
      'bold.marginalia': BOLD_POOLS.marginalia,
      'bold.paletteSaturation': BOLD_POOLS.paletteSaturation,
      // ===== Layered primitives =====
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
      fontPairing: constraints.allowedFontPairings,
      // Only rotate the layout token for sidebar-canva archetype; the
      // other archetypes don't use this field.
      ...(tokens.bold.layoutArchetype === 'sidebar-canva'
        ? { layout: ['sidebar-left', 'sidebar-right'] }
        : {}),
    },
    LOG_TAG,
  );

  // Final pass after rotation
  tokens.bold = validateAndFixBoldTokens(tokens.bold, !!tokens.showPhoto);

  // Final consistency: archetype may have flipped during rotation, so
  // re-align layout / sidebarSections to match the *final* archetype.
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
