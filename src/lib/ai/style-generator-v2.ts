/**
 * Style Generator v2 - Token-Based Approach
 *
 * Generates CVDesignTokens with a single LLM API call (~20 properties)
 * instead of the original 12+ calls for 150+ properties.
 *
 * Temperature is based on creativity level:
 * - conservative: 0.3 (safe, predictable)
 * - balanced: 0.5 (reasonable variation)
 * - creative: 0.7 (more expressive)
 * - experimental: 0.9 (maximum variation)
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import { withRetry } from './retry';
import type {
  JobVacancy,
  LLMProvider,
  TokenUsage,
  StyleCreativityLevel,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { creativityConstraints, themeDefaults, getIndustryStyleProfile } from '@/lib/cv/templates/themes';
import { validateAndFixColorContrast } from '@/lib/cv/templates/color-utils';
import { resolveTemperature } from './temperature';

// ============ Zod Schema for Design Tokens ============

// Every field is OPTIONAL at the schema level. Claude Opus 4.7 under
// structured output sometimes returns only a subset of fields, which used
// to cause a ZodError that bubbled past our retry layer. We now accept any
// shape and rely on validateAndFixTokens() to fill every missing field
// with an industry-aware default — the function's return type is
// CVDesignTokens (fully populated), so downstream code sees no undefineds.
const designTokensSchema = z.object({
  // Metadata
  styleName: z.string().optional().describe('A descriptive name for this style, e.g., "Executive Professional"'),
  styleRationale: z.string().optional().describe('Brief explanation (2-3 sentences) of why this style fits.'),
  industryFit: z.string().optional().describe('Industry this style is optimized for (e.g., "technology").'),

  themeBase: z.enum(['professional', 'modern', 'creative', 'minimal', 'bold']).optional()
    .describe('Base theme direction'),

  colors: z.object({
    primary: z.string().optional().describe('Primary color, hex code (e.g. #1a365d). Dark enough for white text when used as a band background.'),
    secondary: z.string().optional().describe('Secondary color, hex code — very light tinted neutral.'),
    accent: z.string().optional().describe('Accent color, hex code — vibrant, complements primary.'),
    text: z.string().optional().describe('Body text color, hex code (e.g. #333333).'),
    muted: z.string().optional().describe('Muted text color, hex code (e.g. #666666).'),
  }).optional(),

  fontPairing: z.enum([
    'inter-inter',
    'playfair-inter',
    'montserrat-open-sans',
    'raleway-lato',
    'poppins-nunito',
    'roboto-roboto',
    'lato-lato',
    'merriweather-source-sans',
    'oswald-source-sans',
    'dm-serif-dm-sans',
    'space-grotesk-work-sans',
    'libre-baskerville-source-sans',
  ]).optional().describe('Font combination: heading font + body font'),

  scale: z.enum(['small', 'medium', 'large']).optional().describe('Typography scale'),
  spacing: z.enum(['compact', 'comfortable', 'spacious']).optional().describe('Overall spacing density'),

  headerVariant: z.enum(['simple', 'accented', 'banner', 'split', 'asymmetric']).optional()
    .describe('Header layout (ignored by editorial/bold renderers — they use their own primitives)'),
  sectionStyle: z.enum(['clean', 'underlined', 'boxed', 'timeline', 'accent-left', 'card', 'alternating', 'magazine']).optional()
    .describe('Section styling (ignored by editorial/bold renderers)'),
  skillsDisplay: z.enum(['tags', 'list', 'compact', 'bars']).optional()
    .describe('Skills display style (ignored by editorial/bold renderers)'),
  experienceDescriptionFormat: z.enum(['bullets', 'paragraph']).optional()
    .describe('Experience format: bullets or paragraph'),
  contactLayout: z.enum(['single-row', 'double-row', 'single-column', 'double-column']).optional()
    .describe('Contact info layout'),
  headerGradient: z.enum(['none', 'subtle', 'radial']).optional().describe('Header gradient effect'),

  showPhoto: z.boolean().optional(),
  useIcons: z.boolean().optional(),
  roundedCorners: z.boolean().optional(),
  headerFullBleed: z.boolean().optional(),

  decorations: z.enum(['none', 'minimal', 'moderate', 'abundant']).optional(),

  sectionOrder: z.array(z.string()).optional()
    .describe('Section order. Use: summary, experience, projects, education, skills, languages, certifications'),

  // Extended styling tokens (optional)
  accentStyle: z.enum(['none', 'border-left', 'background', 'quote']).optional()
    .describe('Summary section styling: none (plain), border-left (accent border), background (subtle bg), quote (italic with border)'),
  borderRadius: z.enum(['none', 'small', 'medium', 'large', 'pill']).optional()
    .describe('Corner rounding scale: none (sharp), small (4px), medium (8px), large (12px), pill (fully rounded)'),
  pageBackground: z.string().optional()
    .describe('Page background color (hex). Must be very light (near white). Leave empty for white.'),
  nameStyle: z.enum(['normal', 'uppercase', 'extra-bold']).optional()
    .describe('Name styling: normal, uppercase (with letter-spacing), extra-bold (weight 900)'),
  skillTagStyle: z.enum(['filled', 'outlined', 'pill']).optional()
    .describe('Skill tag variant: filled (default bg), outlined (border only), pill (fully rounded)'),
});

// ============ Editorial schema (creative mode) ============
//
// Creative mode uses a completely separate render pipeline: the editorial
// renderer. The AI is given a compositional set of primitives (headerLayout ×
// nameTreatment × accentTreatment × sectionTreatment × grid × divider ×
// typographyScale) that the renderer handles in any combination.
//
// This replaces the old "sidebar + magazine section + banner header" approach
// for creative mode, which produced generic-looking output regardless of what
// the AI picked.

// Editorial fields are all optional — validator fills missing ones with
// sensible random defaults. This keeps the schema lenient for structured-
// output and prevents "response did not match schema" failures.
const editorialSchema = z.object({
  headerLayout: z.enum(['stacked', 'split', 'band', 'overlap']).optional().describe(
    `Header composition:
    - stacked: vertical stack (name, headline, contact)
    - split: name/headline left, portrait + contact right-aligned
    - band: full-width colored band behind the header (primary color)
    - overlap: portrait left (120px), name/headline flowing right`,
  ),
  nameTreatment: z.enum([
    'oversized-serif',
    'oversized-sans',
    'uppercase-tracked',
    'mixed-italic',
    'condensed-impact',
  ]).optional().describe(
    `Name typography (this is the single biggest visual choice):
    - oversized-serif: hero serif display (elegant, editorial) — best with playfair, dm-serif, merriweather, libre-baskerville
    - oversized-sans: hero grotesk, tight tracking (modern, confident) — best with montserrat, poppins, raleway, space-grotesk
    - uppercase-tracked: all caps, wide letter-spacing (Kinfolk / Zarina-style) — works with most fonts
    - mixed-italic: first name in italic serif accent color, rest in regular heading font (literary)
    - condensed-impact: condensed heavy weight (fashion-magazine) — best with oswald, montserrat`,
  ),
  accentTreatment: z.enum([
    'thin-rule',
    'vertical-bar',
    'marker-highlight',
    'ornament',
    'number-prefix',
  ]).optional().describe(
    `Small visual accent that marks the header as designed, not templated:
    - thin-rule: 1px hairlines above + accent-color rule below the name (classic magazine)
    - vertical-bar: 3px accent color bar left of the name block
    - marker-highlight: subtle highlighter effect behind the name (editorial)
    - ornament: small ✦ glyph after the name (decorative)
    - number-prefix: "No. 01 —" kicker above the name (editorial numbering)`,
  ),
  sectionTreatment: z.enum([
    'numbered',
    'kicker',
    'sidenote',
    'drop-cap',
    'pull-quote',
  ]).optional().describe(
    `How section titles are typeset:
    - numbered: large serif title + hairline underline (classic)
    - kicker: small uppercase label above a big display title (editorial)
    - sidenote: title pinned in left margin with vertical rule (manuscript style)
    - drop-cap: italic section title, first paragraph uses drop-cap first letter
    - pull-quote: title with accent-color underline, one highlight rendered as a big pull quote`,
  ),
  grid: z.enum([
    'asymmetric-60-40',
    'asymmetric-70-30',
    'full-bleed',
    'manuscript',
    'three-column-intro',
  ]).optional().describe(
    `Page grid:
    - asymmetric-60-40: main content 60%, sidenotes 40% (balanced magazine spread)
    - asymmetric-70-30: main content 70%, narrow sidenotes 30%
    - full-bleed: single column, generous margins (hero feel)
    - manuscript: classic book proportions (64ch max, centered) — best for text-heavy CVs
    - three-column-intro: opens with a 3-column intro row (focus | core | statement), then single column`,
  ),
  divider: z.enum([
    'none',
    'hairline',
    'double-rule',
    'ornament',
    'whitespace-large',
  ]).optional().describe(
    `How sections are separated:
    - none: only whitespace
    - hairline: 1px rule between sections
    - double-rule: 2 stacked hairlines (classic)
    - ornament: centered ✦ glyph between sections
    - whitespace-large: 2x vertical space (airy, hero feel)`,
  ),
  typographyScale: z.enum(['modest', 'editorial', 'hero']).optional().describe(
    `Overall type scale:
    - modest: restrained sizes, dense information (think resume)
    - editorial: clear hero/body contrast (default magazine feel)
    - hero: oversized display moments (name ~68pt, for impact CVs)`,
  ),
  sectionNumbering: z.boolean().optional().describe(
    'Whether sections get 01/02/03 numerical prefixes. true = editorial feel, false = quieter.',
  ),
  pullQuoteSource: z.string().optional().describe(
    'Section to source a pull quote from (only when sectionTreatment=pull-quote). Usually "experience". Leave empty otherwise.',
  ),
  dropCapSection: z.string().optional().describe(
    'Section to apply a drop-cap to (only when sectionTreatment=drop-cap). Usually "summary". Leave empty otherwise.',
  ),
});

// Extended schema for creative mode — editorial tokens are REQUIRED.
// Industry decoration theme is still supported (decorations are rendered as
// subtle page ornaments in the editorial renderer in a future pass; for now
// they're ignored if set, which is fine).
const creativeTokensSchema = designTokensSchema.extend({
  editorial: editorialSchema.optional().describe(
    'Editorial layout tokens. Drive the magazine-style renderer. Fill all sub-fields if you can; the validator handles any you omit.',
  ),
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract']).optional().describe(
    'Industry decoration theme (optional in creative mode — the editorial renderer uses typography and grid, not background shapes).',
  ),
  layout: z.enum(['single-column', 'sidebar-left', 'sidebar-right']).optional()
    .describe('Legacy layout field — IGNORE in creative mode. The editorial renderer uses its own `grid` token.'),
  sidebarSections: z.array(z.string()).optional()
    .describe('Legacy sidebar field — IGNORE in creative mode.'),
});

// ============ Bold schema (experimental mode) ============
//
// Experimental mode uses a completely separate render pipeline: the bold
// renderer. The AI fills a compositional `bold` object with 8 orthogonal
// primitives that map to Canva/Linear/Notion-style visual vocabulary.
//
// Decorations (floating SVG blobs) are deliberately DROPPED from this
// schema — they were the source of the "blob over content" rendering bug.
// Bold expression comes from STRUCTURAL color (sidebars, bands, badges),
// not from floating shapes.

// All bold fields are OPTIONAL. The AI should ideally fill all 8 but if it
// skips any, the validator picks a sensible random value. This prevents
// "response did not match schema" failures when Anthropic's structured
// output trims fields — and it keeps the schema lean for the LLM.
const boldSchema = z.object({
  headerLayout: z.enum(['hero-band', 'split-photo', 'tiled', 'asymmetric-burst']).optional().describe(
    'Header composition: hero-band (full-width gradient band) | split-photo (photo block + colored name block) | tiled (grid of colored tiles) | asymmetric-burst (diagonal gradient block)',
  ),
  sidebarStyle: z.enum(['solid-color', 'gradient', 'photo-hero', 'transparent']).optional().describe(
    'Sidebar treatment: solid-color (primary fill, white text) | gradient (primary→accent, white text) | photo-hero (big photo on top — only when photo available) | transparent (quiet tinted bg)',
  ),
  skillStyle: z.enum(['bars-gradient', 'dots-rating', 'icon-tagged', 'colored-pills']).optional().describe(
    'Skill display in sidebar: bars-gradient (progress bars) | dots-rating (● ● ● ○ ○) | icon-tagged | colored-pills',
  ),
  photoTreatment: z.enum(['circle-halo', 'squircle', 'color-overlay', 'badge-framed']).optional().describe(
    'Photo frame: circle-halo (colored ring) | squircle (rounded square) | color-overlay (primary tint) | badge-framed (colored badge)',
  ),
  accentShape: z.enum(['diagonal-stripe', 'angled-corner', 'colored-badge', 'hex-pattern']).optional().describe(
    'Structural accent: diagonal-stripe | angled-corner (colored vertical bar next to items) | colored-badge | hex-pattern (dotted bg)',
  ),
  iconTreatment: z.enum(['solid-filled', 'duotone', 'line-with-accent']).optional().describe(
    'Contact icons: solid-filled | duotone | line-with-accent',
  ),
  headingStyle: z.enum(['oversized-numbered', 'kicker-bar', 'gradient-text', 'bracketed']).optional().describe(
    'Section titles: oversized-numbered (01 02 03 Linear-style) | kicker-bar (accent bar above) | gradient-text (primary→accent fill) | bracketed ([ UPPER ])',
  ),
  gradientDirection: z.enum(['none', 'linear-vertical', 'linear-diagonal', 'radial-burst']).optional().describe(
    'Gradient: none | linear-vertical | linear-diagonal (primary→accent 45°, most expressive) | radial-burst',
  ),
});

// Experimental extends the base schema (not creative) so it doesn't inherit
// the required `editorial` field from creative. Bold and editorial are
// mutually exclusive — each creativity level owns its own renderer primitives.
const experimentalTokensSchema = designTokensSchema.extend({
  bold: boldSchema.optional().describe(
    'Bold layout tokens. Drive the Canva/Linear-style renderer. Fill all sub-fields if you can; the validator handles any you omit.',
  ),
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract']).optional().describe(
    'Industry decoration theme — optional hint, the bold renderer uses structural color not floating decorations.',
  ),
  layout: z.enum(['sidebar-left', 'sidebar-right']).optional().describe(
    'Which side the colored sidebar is on. Default: sidebar-left.',
  ),
});

// ============ Temperature by Creativity Level ============

const temperatureMap: Record<StyleCreativityLevel, number> = {
  conservative: 0.2,
  balanced: 0.5,
  creative: 0.9,
  experimental: 1.2,
};

// ============ Color Moods for Randomization ============

const colorMoods = [
  { mood: 'warm-earthy', description: 'Warm earth tones: terracotta, sienna, amber, olive. Think autumn, organic, grounded.' },
  { mood: 'cool-ocean', description: 'Cool ocean tones: teal, navy, seafoam, coral accent. Think depth, trust, calm.' },
  { mood: 'bold-contrast', description: 'High contrast bold: deep saturated primary with vibrant complementary accent. Think energy, confidence.' },
  { mood: 'luxe-dark', description: 'Dark luxury: deep jewel tones (midnight, plum, emerald) with metallic or warm accents. Think premium, exclusive.' },
  { mood: 'fresh-modern', description: 'Fresh modern: bright greens, teals, or electric blues with warm accent. Think startup, innovation.' },
  { mood: 'sunset-warm', description: 'Sunset warmth: coral, rose, burnt orange with cool contrast. Think creative, approachable.' },
  { mood: 'forest-natural', description: 'Forest tones: deep greens, moss, sage with warm wood accents. Think sustainable, natural, reliable.' },
  { mood: 'industrial-slate', description: 'Industrial: charcoal, slate, steel with a single bright accent. Think structured, engineering, precision.' },
  { mood: 'berry-rich', description: 'Rich berry: burgundy, plum, magenta with teal or gold contrast. Think sophisticated, distinctive.' },
  { mood: 'nordic-minimal', description: 'Nordic clean: muted blue-grays with one strong accent. Think Scandinavian, efficient, elegant.' },
];

const fontDirections = [
  { direction: 'serif-elegant', hint: 'Use a serif heading font for editorial elegance (playfair, dm-serif, libre-baskerville, merriweather)' },
  { direction: 'display-impact', hint: 'Use a bold display/condensed heading font for impact (oswald, space-grotesk, montserrat)' },
  { direction: 'geometric-clean', hint: 'Use a geometric sans-serif for modern cleanliness (poppins, raleway, inter)' },
  { direction: 'humanist-warm', hint: 'Use a humanist typeface for warmth and approachability (lato, nunito, open-sans)' },
];

// Bold/editorial primitive pools for the variation nudge. These are suggestions
// only — the AI should override any that don't fit the job, since the job
// context is the primary driver.
const editorialHeaderPool = ['stacked', 'split', 'band', 'overlap'] as const;
const editorialGridPool = ['asymmetric-60-40', 'asymmetric-70-30', 'full-bleed', 'manuscript', 'three-column-intro'] as const;
const editorialSectionTreatmentPool = ['numbered', 'kicker', 'sidenote', 'drop-cap', 'pull-quote'] as const;
const boldHeaderPool = ['hero-band', 'split-photo', 'tiled', 'asymmetric-burst'] as const;
const boldSidebarPool = ['solid-color', 'gradient', 'transparent'] as const; // exclude photo-hero from random pick
const boldHeadingPool = ['oversized-numbered', 'kicker-bar', 'gradient-text', 'bracketed'] as const;

function buildRandomSeed(creativityLevel: StyleCreativityLevel): string {
  if (creativityLevel === 'conservative' || creativityLevel === 'balanced') return '';

  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const mood = pick(colorMoods);
  const fontDir = pick(fontDirections);

  if (creativityLevel === 'creative') {
    return `
VARIATION NUDGE (use ONLY if the job/industry context doesn't already
dictate a clearly better choice — otherwise ignore this nudge and follow
the industry profile above):
- Suggested color mood if the industry is neutral or unclear: "${mood.mood}" — ${mood.description}
- Typography flavour suggestion: ${fontDir.hint}
- Try editorial.headerLayout = "${pick(editorialHeaderPool)}"
- Try editorial.grid = "${pick(editorialGridPool)}"
- Try editorial.sectionTreatment = "${pick(editorialSectionTreatmentPool)}"

The JOB CONTEXT and INDUSTRY STYLE PROFILE above are the PRIMARY drivers
of your choices. This nudge exists only to prevent two creative CVs with
the same job context from looking identical.`;
  }

  // experimental (bold renderer)
  return `
VARIATION NUDGE (use ONLY if the job/industry context doesn't already
dictate a clearly better choice — otherwise ignore this nudge and follow
the industry profile above):
- Suggested color mood if the industry is neutral or unclear: "${mood.mood}" — ${mood.description}
- Typography flavour suggestion: ${fontDir.hint}
- Try bold.headerLayout = "${pick(boldHeaderPool)}"
- Try bold.sidebarStyle = "${pick(boldSidebarPool)}"
- Try bold.headingStyle = "${pick(boldHeadingPool)}"

The JOB CONTEXT and INDUSTRY STYLE PROFILE above are the PRIMARY drivers
of your choices. This nudge exists only to prevent two experimental CVs
with the same job context from looking identical.`;
}

// ============ System Prompt ============

function buildSystemPrompt(creativityLevel: StyleCreativityLevel, hasPhoto: boolean): string {
  const constraints = creativityConstraints[creativityLevel];

  return `You are a professional CV/resume design expert. Your task is to generate design tokens for a CV based on the candidate's profile and target job.

IMPORTANT COLOR RULES:
1. Every color MUST be a valid hex code starting with #
2. For BANNER headers: primary color MUST be DARK (it becomes the background, with white text on top)
3. For NON-BANNER headers: primary color should have good contrast against white
4. Secondary color should be very light (tinted version of primary or neutral)
5. Accent color should be vibrant and complement the primary
6. Text and muted colors should be readable (dark grays work well)

COLOR SELECTION STRATEGY:
- The CV should look like it could be company marketing material - matching their brand style
- ONLY use brand colors if you are 100% CERTAIN about them (ING=orange, Rabobank=blue/orange, KPN=green, PostNL=orange, Coolblue=blue, etc.)
- If you're NOT CERTAIN about a company's brand colors: DO NOT GUESS! Create a professional palette that fits the industry instead
- When uncertain, pick colors based on industry conventions and create something unique
- Always ensure colors work well together with good contrast

PHOTO AVAILABILITY: ${hasPhoto ? 'User HAS uploaded a photo - you SHOULD set showPhoto to true' : 'No photo available - set showPhoto to false'}

CREATIVITY LEVEL: ${creativityLevel}
${creativityLevel === 'conservative' ? `
- Themes: ONLY ${constraints.allowedThemes.join(', ')}
- Fonts: ONLY ${constraints.allowedFontPairings.join(', ')}
- Headers: ONLY ${constraints.allowedHeaderVariants.join(', ')}
- Colors: professional, conservative colors appropriate for the company's industry
- showPhoto: false (ATS compatibility)
- sectionStyle: clean or underlined only
- decorations: MUST be 'none' (no background shapes)
- contactLayout: 'single-row' (classic inline format)
- headerGradient: 'none' (solid color only)
` : ''}
${creativityLevel === 'balanced' ? `
- Themes: ${constraints.allowedThemes.join(', ')}
- Fonts: preferably ${constraints.allowedFontPairings.join(', ')}
- Headers: simple, accented, or split (avoid banner)
- Colors: base on the target company's brand and industry
- showPhoto: ${hasPhoto ? 'true' : 'false'}
- Try underlined section style with accent color
- decorations: SHOULD be 'minimal' (adds subtle background shapes for visual interest - recommended!)
- contactLayout: 'single-row' or 'double-row' based on content length
- headerGradient: 'none' or 'subtle' for a touch of elegance
` : ''}
${creativityLevel === 'creative' ? `
*** CREATIVE MODE — EDITORIAL / MAGAZINE OUTPUT ***

Think Kinfolk, Wallpaper*, The Gentlewoman, Apartamento. This is NOT a
"nicer corporate CV" — this is an editorial layout with real typographic
hierarchy, asymmetric grids, and print-quality proportions.

A dedicated editorial renderer handles this level. You DO NOT pick from the
generic headerVariant/sectionStyle options — instead you fill an \`editorial\`
object with compositional primitives that the renderer combines freely.

YOUR JOB: compose the editorial object. Every field is independent. Pick the
combination that matches the candidate's story and the target industry.
Two creative CVs for the same industry should NOT look identical — vary
your choices.

THE EDITORIAL PRIMITIVES (all REQUIRED except pullQuoteSource/dropCapSection):

- **headerLayout** — stacked | split | band | overlap
  How the hero block is composed. 'band' means a full-width colored header
  (use the primary color); 'overlap' only makes sense with a portrait.

- **nameTreatment** — oversized-serif | oversized-sans | uppercase-tracked | mixed-italic | condensed-impact
  This is your single biggest visual decision. Match to the font pairing:
  serif fonts pair with oversized-serif / mixed-italic; grotesk fonts with
  oversized-sans; condensed fonts (oswald) with condensed-impact.

- **accentTreatment** — thin-rule | vertical-bar | marker-highlight | ornament | number-prefix
  A small signal that tells the reader "this is designed". Pick ONE, keep it subtle.

- **sectionTreatment** — numbered | kicker | sidenote | drop-cap | pull-quote
  How every section title is presented.
  - 'sidenote' produces the strongest magazine feel (titles float in the margin).
  - 'pull-quote' additionally extracts one highlight as a big italic quote.
  - 'drop-cap' drops the first letter of the summary.

- **grid** — asymmetric-60-40 | asymmetric-70-30 | full-bleed | manuscript | three-column-intro
  The page grid. 'three-column-intro' opens with a focus/core/statement row.
  'manuscript' is a narrow book column — good for text-heavy candidates.

- **divider** — none | hairline | double-rule | ornament | whitespace-large
  How sections are separated. 'whitespace-large' for hero feel, 'double-rule'
  for classic editorial, 'ornament' for decorative.

- **typographyScale** — modest | editorial | hero
  Overall size. 'hero' only when the name deserves a full-page moment.

- **sectionNumbering** — true | false
  Whether sections get 01/02/03 prefixes (editorial feel).

- **pullQuoteSource** — set to "experience" ONLY when sectionTreatment is 'pull-quote'.
- **dropCapSection** — set to "summary" ONLY when sectionTreatment is 'drop-cap'.

FONTS (required from): ${constraints.allowedFontPairings.join(' | ')}
Match the nameTreatment:
- oversized-serif → playfair-inter, dm-serif-dm-sans, merriweather-source-sans, libre-baskerville-source-sans
- oversized-sans → montserrat-open-sans, poppins-nunito, raleway-lato, space-grotesk-work-sans
- mixed-italic → playfair-inter, libre-baskerville-source-sans, dm-serif-dm-sans
- uppercase-tracked → any of the above
- condensed-impact → oswald-source-sans (only)

COLORS: restrained editorial palettes work best.
- Primary: deep and confident (ink, burgundy, forest, navy, plum) — NOT bright
- Accent: a single pop color (amber, terracotta, emerald, coral, marigold)
- Secondary: paper-tinted (#faf8f4, #f5f2eb, #faf9f6)
- Text: near-black (#1a1a1a to #2a2a2a)
- Muted: warm grey (#6b6459, #7a7468)
Avoid neon and saturated blues — those belong to the bold/experimental family.

OTHER TOKENS (still required on the base schema):
- themeBase: pick 'creative' or 'modern' (bold/professional/minimal feel wrong here)
- headerVariant/sectionStyle/skillsDisplay: still needed on the schema but
  IGNORED by the editorial renderer — set them to any allowed value, they
  don't affect output.
- showPhoto: ${hasPhoto ? 'true — the editorial renderer styles portraits with grace' : 'false'}
- useIcons: false (icons break the editorial mood — let typography do the work)
- pageBackground: optional tinted off-white like #faf8f4 or #f7f4ee

EXAMPLE COMBINATIONS (copy the reasoning, not the literal values):

1. *Elegant tech consultant* — playfair-inter, oversized-serif name, thin-rule
   accent, numbered sections, asymmetric-60-40 grid, hairline dividers, editorial
   scale, numbering on. Primary #1a2b3a, accent #c77757.

2. *Fashion / marketing lead* — oswald-source-sans, condensed-impact name,
   marker-highlight accent, kicker sections, full-bleed grid, whitespace-large
   dividers, hero scale. Primary #1a1a1a, accent #c93d3d.

3. *Editor / literary role* — libre-baskerville-source-sans, mixed-italic name,
   ornament accent, sidenote sections, manuscript grid, ornament dividers,
   modest scale. Primary #2a2418, accent #8a6d3a.

4. *Strategy / consulting senior* — dm-serif-dm-sans, uppercase-tracked name,
   number-prefix accent, numbered sections, three-column-intro grid,
   double-rule dividers, editorial scale. Primary #1e2a44, accent #b8864a.

Again: vary. Never produce the same combination twice in a session.
` : ''}
${creativityLevel === 'experimental' ? `
*** EXPERIMENTAL MODE — BOLD / CANVA-STYLE ***

Think Linear.app launch pages, Notion, Stripe, Spotify artist pages,
modern Canva resume templates. Saturated colors, gradients, iconography,
progress bars, colored sidebars. Structural color (colored blocks and
bands) instead of floating decorations.

A dedicated bold renderer handles this level. You DO NOT pick from the
generic headerVariant/sectionStyle options — instead you fill a \`bold\`
object with compositional primitives.

THE BOLD PRIMITIVES (all REQUIRED):

- **headerLayout** — hero-band | split-photo | tiled | asymmetric-burst
  'split-photo' is the most Canva-like (photo + colored block side-by-side).
  'tiled' breaks the header into a grid of colored tiles. 'hero-band' is
  a full-width gradient band. 'asymmetric-burst' has a diagonal gradient.

- **sidebarStyle** — solid-color | gradient | photo-hero | transparent
  The sidebar is ALWAYS present in bold mode. solid-color and gradient
  give the strongest Canva feel. photo-hero ONLY works with a photo.
  transparent is the quietest option.

- **skillStyle** — bars-gradient | dots-rating | icon-tagged | colored-pills
  How skills appear in the sidebar. bars-gradient is the most visual
  (progress bars with gradient fills). Dots-rating for a rating feel.

- **photoTreatment** — circle-halo | squircle | color-overlay | badge-framed
  Only matters when showPhoto is true. Match the overall vibe.

- **accentShape** — diagonal-stripe | angled-corner | colored-badge | hex-pattern
  Structural accent that reinforces hierarchy. hex-pattern adds a subtle
  dotted/geometric background to the main column.

- **iconTreatment** — solid-filled | duotone | line-with-accent
  Contact icons in the sidebar. solid-filled is boldest.

- **headingStyle** — oversized-numbered | kicker-bar | gradient-text | bracketed
  Section titles. oversized-numbered is very Linear-like (big 01 02 03
  numerals). gradient-text uses gradient text fill. bracketed uses
  [ UPPERCASE ] formatting.

- **gradientDirection** — none | linear-vertical | linear-diagonal | radial-burst
  How gradients are applied to header/sidebar. linear-diagonal is the
  most expressive (primary → accent 45°).

REQUIRED BASE TOKENS:

- **showPhoto**: ${hasPhoto ? 'true — bold treatments rely on photo presence' : 'false'}
- **useIcons**: true (icons are part of the bold aesthetic)
- **roundedCorners**: usually true (softer, more Canva)
- **experienceDescriptionFormat**: 'bullets' works best with bold layouts
- **themeBase**: 'bold' or 'creative'

FONTS (pick from): ${constraints.allowedFontPairings.join(' | ')}

COLORS — the whole point of experimental is saturated, unexpected color
choices. Pick from terracotta, emerald, burgundy, indigo, plum, sage,
deep teal, electric violet — or industry-specific brand-adjacent colors.
Never default to muted navy + grey.

EXAMPLE BOLD COMBINATIONS (copy the reasoning, vary the values):

1. *Product designer for a startup* — split-photo header, gradient sidebar,
   bars-gradient skills, squircle photo, colored-badge accent,
   line-with-accent icons, oversized-numbered headings, linear-diagonal
   gradient. Primary #4f46e5, accent #f59e0b.

2. *Marketing lead* — hero-band header, solid-color sidebar, colored-pills
   skills, circle-halo photo, hex-pattern accent, solid-filled icons,
   bracketed headings, linear-diagonal gradient. Primary #be185d,
   accent #fbbf24.

3. *Engineering manager* — asymmetric-burst header, gradient sidebar,
   icon-tagged skills, color-overlay photo, angled-corner accent,
   duotone icons, gradient-text headings, radial-burst gradient.
   Primary #0891b2, accent #10b981.

4. *Creative director* — tiled header, photo-hero sidebar (if photo
   available), dots-rating skills, badge-framed photo, diagonal-stripe
   accent, solid-filled icons, kicker-bar headings, linear-vertical
   gradient. Primary #7c2d12, accent #f97316.

Vary your combinations — two experimental CVs in a row should not share
the same headerLayout + sidebarStyle + headingStyle.
` : ''}

SECTION ORDER GUIDELINES:
- Most jobs: summary, experience, projects, education, skills, languages, certifications
- Entry-level: summary, education, experience, skills, languages, certifications
- Technical: summary, skills, experience, education, certifications, languages`;
}

// ============ User Prompt Builder ============

function buildUserPrompt(
  linkedInSummary: string,
  jobVacancy: JobVacancy | null,
  userPreferences?: string,
  creativityLevel: StyleCreativityLevel = 'balanced'
): string {
  let prompt = `Generate CV design tokens for this candidate:

CANDIDATE PROFILE:
${linkedInSummary}
`;

  if (jobVacancy) {
    prompt += `
TARGET JOB:
- Title: ${jobVacancy.title}
${jobVacancy.company ? `- Company: ${jobVacancy.company}` : ''}
${jobVacancy.industry ? `- Industry: ${jobVacancy.industry}` : ''}
- Key requirements: ${jobVacancy.keywords.slice(0, 10).join(', ')}
${jobVacancy.description ? `- Job description excerpt: ${jobVacancy.description.slice(0, 500)}...` : ''}
`;

    // Inject concrete industry styling directives. Without this the
    // model gets only the loose "industry is X" hint and defaults to
    // generic blue/gray sans-serif regardless of the field.
    const industryProfile = getIndustryStyleProfile(jobVacancy.industry);
    if (industryProfile) {
      prompt += `
INDUSTRY STYLE PROFILE — **${industryProfile.label}**

These are the visual conventions that work for this industry. Use them
as STARTING POINTS within your creativity-level constraints, not as a
straitjacket. The combination of these directives + your creativity
level should produce a CV that feels native to this field.

- **Color direction**: ${industryProfile.colorMood}
- **Decoration theme**: ${industryProfile.decorationTheme} (use this as decorationTheme value if your level uses decorations)
- **Font character**: ${industryProfile.fontCharacter}
- **Preferred theme bases**: ${industryProfile.preferredThemes.join(', ')}

Do NOT default to generic navy + inter. The whole point of these
directives is to make a finance CV look like a finance CV, a creative
agency CV look like an agency CV, and a tech CV look like a tech CV.
`;
    }

    // Company analysis varies by creativity level
    if (creativityLevel === 'conservative' || creativityLevel === 'balanced') {
      prompt += `
COMPANY ANALYSIS TASK:
Based on the company name "${jobVacancy.company || 'Unknown'}" and industry "${jobVacancy.industry || 'Unknown'}":
1. Consider what type of company this is (startup, corporate, consulting, tech, finance, creative, government, etc.)
2. Think about their likely brand values and culture
3. Consider what style of CV would impress their hiring managers
4. If you're 100% CERTAIN about the company's brand colors, use them to make the CV look like company marketing material

Style guidance by company type:
- Big Tech (Google, Amazon, Microsoft, etc.): Modern, clean, innovative feel
- Consulting/Professional Services: Conservative, executive, structured
- Startups/Scale-ups: Dynamic, bold, shows personality
- Banks/Finance: Traditional, trustworthy, professional
- Healthcare/Pharma: Clean, professional, approachable
- Creative/Marketing/Design agencies: Show design sense, stand out
- Government/Public sector: Conservative, accessible, clear
- Manufacturing/Industrial: Professional, structured, reliable
`;
    } else if (creativityLevel === 'creative') {
      prompt += `
DESIGN INSPIRATION:
The industry is "${jobVacancy.industry || 'Unknown'}" and the company is "${jobVacancy.company || 'Unknown'}".
Use this as INSPIRATION, not as a constraint. Be creative with the visual style while keeping it relevant.
If you're 100% CERTAIN about the company's brand colors, incorporate them boldly.
Otherwise, create a striking palette that fits the industry vibe.
`;
    } else {
      // experimental
      prompt += `
INDUSTRY & COMPANY DRIVE THIS DESIGN:
Industry: "${jobVacancy.industry || 'Unknown'}", Company: "${jobVacancy.company || 'Unknown'}".

Experimental mode is NOT "random visual statement". It's "boldest version
of what fits this specific role". A fintech role deserves a fintech-looking
bold CV — saturated but restrained, geometric, trust-signaling. A creative
agency role deserves a loud, expressive bold CV with daring color. A
healthcare role deserves warm, human bold choices. The Industry Style
Profile above tells you which direction to lean.

If you're 100% CERTAIN about the company's brand colors (ING=orange,
Bol.com=blue, Coolblue=blue+orange, etc.), incorporate them boldly into
the header/sidebar colors — it makes the CV look like company marketing
material.

Use the BOLD primitives (headerLayout, sidebarStyle, headingStyle etc.)
to translate the industry character into structural visual choices.
Don't copy the same bold-template to every vacancy — match the choices
to this specific job.
`;
    }
  }

  if (userPreferences) {
    prompt += `
USER PREFERENCES:
${userPreferences}
`;
  }

  // Inject random visual direction for creative/experimental
  const randomSeed = buildRandomSeed(creativityLevel);
  if (randomSeed) {
    prompt += `\n${randomSeed}\n`;
  }

  // Closing instructions vary by creativity level
  if (creativityLevel === 'experimental') {
    prompt += `
Generate tokens for the BOLD RENDERER. The most important part is the
\`bold\` object — fill it thoughtfully based on the job context.

Non-negotiables:
1. Fill the \`bold\` object with ALL required fields.
2. Match the bold choices to the JOB CONTEXT and INDUSTRY STYLE PROFILE
   above — don't pick random primitives. A finance role and a creative
   agency role should produce visibly different bold CVs.
3. Use a bold, saturated color palette that fits THIS specific industry.
   Brand colors if 100% certain; otherwise industry-driven (e.g. tech =
   electric blue/cyan accent; creative = magenta/coral; finance =
   deep-teal/gold; healthcare = emerald/violet).
4. The base schema fields (headerVariant, sectionStyle, skillsDisplay,
   contactLayout, accentStyle, etc.) are IGNORED by the bold renderer
   but still required by the schema. Pick any valid value.

IMPORTANT: think like an art director hired by THIS specific company
for THIS specific role. Not "generic bold CV".`;
  } else if (creativityLevel === 'creative') {
    prompt += `
Generate tokens for the EDITORIAL RENDERER. The most important part is the
\`editorial\` object — fill it thoughtfully.

Non-negotiables:
1. Fill the \`editorial\` object with ALL required fields. Match nameTreatment
   to the fontPairing (see the system prompt for the pairing table).
2. If sectionTreatment = 'pull-quote', set pullQuoteSource = "experience".
   If sectionTreatment = 'drop-cap', set dropCapSection = "summary".
3. Use an editorial color palette: deep primary + paper-tinted secondary +
   single pop accent. Avoid saturated blues and bright greens.
4. Vary your choices — two creative CVs in a row should NOT share the same
   combination of grid + sectionTreatment + nameTreatment.
5. The base schema fields (headerVariant, sectionStyle, skillsDisplay,
   contactLayout, etc.) are IGNORED by the editorial renderer but still
   required by the schema. Pick any valid value; don't overthink them.

IMPORTANT: think like a magazine art director, not a resume-builder.`;
  } else {
    prompt += `
Generate design tokens that:
1. Match what this specific company and industry would appreciate
2. Reflect the company's likely culture and values
3. Would impress a hiring manager at this organization
4. Are visually appealing and professional
5. Will render well in both screen preview and PDF print
6. Use colors that work well together and have proper contrast

IMPORTANT: Adapt the style specifically for "${jobVacancy?.company || 'the target company'}"!
Think about what kind of candidate they want to see - and design accordingly.`;
  }

  return prompt;
}

// ============ Main Generation Function ============

export interface StyleGenerationV2Result {
  tokens: CVDesignTokens;
  usage: TokenUsage;
}

export async function generateDesignTokens(
  linkedInSummary: string,
  jobVacancy: JobVacancy | null,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  userPreferences?: string,
  creativityLevel: StyleCreativityLevel = 'balanced',
  hasPhoto: boolean = false,
  styleHistory?: CVDesignTokens[],
): Promise<StyleGenerationV2Result> {
  const preferredTemperature = temperatureMap[creativityLevel];

  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);

  // Some Claude models (Opus 4.7+) deprecate the temperature parameter.
  // resolveTemperature returns undefined for those, in which case we omit
  // it entirely from generateObject (the SDK then drops it from the request).
  const temperature = resolveTemperature(provider, modelId, preferredTemperature);

  const systemPrompt = buildSystemPrompt(creativityLevel, hasPhoto);
  const userPrompt = buildUserPrompt(linkedInSummary, jobVacancy, userPreferences, creativityLevel);

  try {
    console.log(`[Style Gen] Starting LLM call: creativity=${creativityLevel}, hasPhoto=${hasPhoto}, temp=${temperature}`);

    // Select schema based on creativity level
    // Creative and experimental both get layout/sidebar support
    const schema = creativityLevel === 'experimental'
      ? experimentalTokensSchema
      : creativityLevel === 'creative'
        ? creativeTokensSchema
        : designTokensSchema;

    console.log(`[Style Gen] Using schema: ${creativityLevel === 'experimental' ? 'experimental' : creativityLevel === 'creative' ? 'creative' : 'base'}`);

    const result = await withRetry(() =>
      generateObject({
        model: aiProvider(modelId),
        schema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature,
      })
    );

    console.log(`[Style Gen] LLM returned:`, JSON.stringify(result.object, null, 2));

    // Validate and fix the generated tokens. The AI's output can be partial
    // (see schema comments); validateAndFixTokens merges with fallback first.
    const tokens = validateAndFixTokens(
      result.object as Partial<CVDesignTokens>,
      creativityLevel,
      styleHistory,
      jobVacancy?.industry,
    );

    console.log(`[Style Gen] After validation: theme=${tokens.themeBase}, header=${tokens.headerVariant}, photo=${tokens.showPhoto}, primary=${tokens.colors.primary}, decorationTheme=${tokens.decorationTheme || 'none'}, customDecorations=${tokens.customDecorations?.length || 0}`);

    // Extract usage (Vercel AI SDK uses inputTokens/outputTokens)
    const usage: TokenUsage = {
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
    };

    return { tokens, usage };
  } catch (error) {
    console.error('[Style Gen] LLM FAILED! Using fallback tokens. Error:', error);

    // Return fallback tokens based on creativity level
    return {
      tokens: getFallbackTokens(creativityLevel, jobVacancy?.industry),
      usage: { promptTokens: 0, completionTokens: 0 },
    };
  }
}

// ============ Style History Helpers ============

type UsageCounts = Record<string, Record<string, number>>;

/**
 * Count how often each token value has been used in recent style history.
 * Only tracks the most visually impactful fields.
 */
function buildUsageCounts(history: CVDesignTokens[]): UsageCounts {
  const counts: UsageCounts = {};

  const trackedFields = [
    'headerVariant',
    'sectionStyle',
    'fontPairing',
    'themeBase',
    'layout',
  ] as const;

  for (const field of trackedFields) {
    counts[field] = {};
    for (const tokens of history) {
      const value = tokens[field] as string | undefined;
      if (value) {
        counts[field][value] = (counts[field][value] || 0) + 1;
      }
    }
  }

  return counts;
}

/**
 * Pick the least-used value for a token field.
 * Only replaces if the current value is the most used AND there are alternatives with lower count.
 */
function pickLeastUsed(
  field: string,
  currentValue: string,
  counts: UsageCounts,
  allowedValues: readonly string[],
): string {
  const fieldCounts = counts[field];
  if (!fieldCounts || Object.keys(fieldCounts).length === 0) return currentValue;

  const currentCount = fieldCounts[currentValue] || 0;

  // Find the max count across all used values
  const maxCount = Math.max(...Object.values(fieldCounts));

  // Only rotate if the current value is the most used (or tied for most)
  if (currentCount < maxCount) return currentValue;

  // Find allowed values with the lowest usage count
  let minCount = Infinity;
  for (const val of allowedValues) {
    const count = fieldCounts[val] || 0;
    if (count < minCount) minCount = count;
  }

  // Collect all values tied for lowest count
  const leastUsed = allowedValues.filter(val => (fieldCounts[val] || 0) === minCount);

  if (leastUsed.length === 0) return currentValue;

  // Pick a random one among the least-used for variety
  const picked = leastUsed[Math.floor(Math.random() * leastUsed.length)];

  if (picked !== currentValue) {
    console.log(`[Style Gen] History rotation: ${field} "${currentValue}" (used ${currentCount}x) → "${picked}" (used ${minCount}x)`);
  }

  return picked;
}

// ============ Validation & Fixing ============

function validateAndFixTokens(
  rawTokens: Partial<CVDesignTokens>,
  creativityLevel: StyleCreativityLevel,
  styleHistory?: CVDesignTokens[],
  industry?: string,
): CVDesignTokens {
  const constraints = creativityConstraints[creativityLevel];

  // The schema now accepts any partial output from the AI. First: layer the
  // AI's (possibly sparse) output on top of a fully-populated fallback so
  // every downstream field is defined. After this merge we still run all
  // the specific validators below, which enforce creativity-level constraints.
  const fallback = getFallbackTokens(creativityLevel, industry);
  const aiColors = rawTokens.colors || {};
  const tokens: CVDesignTokens = {
    ...fallback,
    ...rawTokens,
    colors: {
      ...fallback.colors,
      ...aiColors,
    },
  };

  // Validate theme is allowed for creativity level
  if (!constraints.allowedThemes.includes(tokens.themeBase)) {
    tokens.themeBase = constraints.allowedThemes[0];
  }

  // Validate font pairing
  if (!constraints.allowedFontPairings.includes(tokens.fontPairing)) {
    tokens.fontPairing = constraints.allowedFontPairings[0];
  }

  // Validate header variant
  const allowedHeaders = constraints.allowedHeaderVariants as readonly string[];
  if (!allowedHeaders.includes(tokens.headerVariant)) {
    tokens.headerVariant = constraints.allowedHeaderVariants[0];
  }

  // For experimental: only 'asymmetric' is allowed by the new constraints,
  // so the validation above already pinned it. No further forcing needed.
  // (This used to randomize between asymmetric/split/accented but split and
  // accented are now creative/balanced territory.)

  // For creative: rotate among the allowed creative headers (banner +
  // asymmetric only, after the constraint tightening) for variety.
  if (creativityLevel === 'creative') {
    const allowed = constraints.allowedHeaderVariants as readonly string[];
    if (allowed.length > 1) {
      const randomHeader = allowed[Math.floor(Math.random() * allowed.length)];
      if (randomHeader !== tokens.headerVariant) {
        console.log(`[Style Gen] Creative header rotation: ${tokens.headerVariant} → ${randomHeader}`);
        tokens.headerVariant = randomHeader as CVDesignTokens['headerVariant'];
      }
    }
  }

  // Validate section style
  const allowedSections = constraints.allowedSectionStyles as readonly string[];
  if (!allowedSections.includes(tokens.sectionStyle)) {
    tokens.sectionStyle = constraints.allowedSectionStyles[0];
  }

  // Validate decorations - IMPORTANT: enforce based on creativity level
  const allowedDecorations = constraints.allowedDecorations as readonly string[];
  if (!tokens.decorations || !allowedDecorations.includes(tokens.decorations)) {
    // Use the default decorations for this creativity level
    tokens.decorations = constraints.defaultDecorations;
    console.log(`[Style Gen] Decorations set to ${tokens.decorations} for ${creativityLevel} mode`);
  }

  // For creative and experimental modes, ensure at least some decorations
  // Creative: force to 'moderate' (its default)
  // Experimental: allow any level except 'none' — at least 'minimal' for visual richness
  if (creativityLevel === 'creative' && tokens.decorations === 'none') {
    tokens.decorations = constraints.defaultDecorations;
    console.log(`[Style Gen] Forcing decorations to ${tokens.decorations} for creative mode (was 'none')`);
  }
  if (creativityLevel === 'experimental' && tokens.decorations === 'none') {
    tokens.decorations = 'minimal';
    console.log(`[Style Gen] Bumping decorations to 'minimal' for experimental mode (was 'none')`);
  }

  // Validate decorationTheme for creative and experimental modes
  if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const validThemes = ['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract'];
    if (!tokens.decorationTheme || !validThemes.includes(tokens.decorationTheme)) {
      // Default to 'abstract' if not set or invalid
      tokens.decorationTheme = 'abstract';
      console.log(`[Style Gen] Setting default decorationTheme to 'abstract' for ${creativityLevel} mode`);
    }
  }

  // Validate customDecorations for experimental mode
  if (creativityLevel === 'experimental') {
    if (!tokens.customDecorations || tokens.customDecorations.length === 0) {
      console.log(`[Style Gen] No customDecorations provided for experimental mode`);
    } else {
      // Validate each custom decoration
      tokens.customDecorations = tokens.customDecorations
        .filter(d => d.name && d.description && d.placement && d.size && d.quantity)
        .map(d => ({
          name: d.name,
          description: d.description,
          placement: ['corner', 'edge', 'scattered'].includes(d.placement) ? d.placement : 'corner',
          size: ['small', 'medium', 'large'].includes(d.size) ? d.size : 'medium',
          quantity: Math.min(Math.max(d.quantity, 1), 5),
        }));
      console.log(`[Style Gen] Validated ${tokens.customDecorations.length} customDecorations`);
    }
  }

  // Validate contactLayout - default to single-row if not set or invalid
  const validContactLayouts = ['single-row', 'double-row', 'single-column', 'double-column'];
  if (!tokens.contactLayout || !validContactLayouts.includes(tokens.contactLayout)) {
    tokens.contactLayout = 'single-row';
  }

  // Validate new optional tokens against creativity constraints
  const allowedLayouts = constraints.allowedLayouts as readonly string[];
  if (tokens.layout && !allowedLayouts.includes(tokens.layout)) {
    tokens.layout = undefined; // Falls back to single-column in HTML generator
  }

  const allowedBorderRadius = constraints.allowedBorderRadius as readonly string[];
  if (tokens.borderRadius && !allowedBorderRadius.includes(tokens.borderRadius)) {
    tokens.borderRadius = undefined;
  }

  const allowedAccentStyles = constraints.allowedAccentStyles as readonly string[];
  if (tokens.accentStyle && !allowedAccentStyles.includes(tokens.accentStyle)) {
    tokens.accentStyle = undefined;
  }

  const allowedNameStyles = constraints.allowedNameStyles as readonly string[];
  if (tokens.nameStyle && !allowedNameStyles.includes(tokens.nameStyle)) {
    tokens.nameStyle = undefined;
  }

  const allowedSkillTagStyles = constraints.allowedSkillTagStyles as readonly string[];
  if (tokens.skillTagStyle && !allowedSkillTagStyles.includes(tokens.skillTagStyle)) {
    tokens.skillTagStyle = undefined;
  }

  // === Style history rotation: prefer least-used values for variety ===
  if (styleHistory && styleHistory.length > 0 &&
      (creativityLevel === 'creative' || creativityLevel === 'experimental')) {
    const counts = buildUsageCounts(styleHistory);
    const allowedFonts = constraints.allowedFontPairings as readonly string[];

    tokens.headerVariant = pickLeastUsed('headerVariant', tokens.headerVariant, counts, allowedHeaders) as CVDesignTokens['headerVariant'];
    tokens.sectionStyle = pickLeastUsed('sectionStyle', tokens.sectionStyle, counts, allowedSections) as CVDesignTokens['sectionStyle'];
    tokens.fontPairing = pickLeastUsed('fontPairing', tokens.fontPairing, counts, allowedFonts) as CVDesignTokens['fontPairing'];
    tokens.themeBase = pickLeastUsed('themeBase', tokens.themeBase, counts, constraints.allowedThemes as readonly string[]) as CVDesignTokens['themeBase'];
    if (tokens.layout) {
      tokens.layout = pickLeastUsed('layout', tokens.layout, counts, allowedLayouts) as CVDesignTokens['layout'];
    }
  }

  // === 1A: Block dangerous token combinations ===

  // Sidebar + spacious + large = too narrow for main content
  const hasSidebar = tokens.layout === 'sidebar-left' || tokens.layout === 'sidebar-right';
  if (hasSidebar) {
    if (tokens.spacing === 'spacious' && tokens.scale === 'large') {
      tokens.spacing = 'comfortable';
      tokens.scale = 'medium';
      console.log('[Style Gen] Downgraded spacious+large to comfortable+medium for sidebar layout');
    } else if (tokens.spacing === 'spacious') {
      tokens.spacing = 'comfortable';
      console.log('[Style Gen] Downgraded spacious to comfortable for sidebar layout');
    } else if (tokens.scale === 'large') {
      tokens.scale = 'medium';
      console.log('[Style Gen] Downgraded large to medium for sidebar layout');
    }
  }

  // Banner full-bleed + sidebar = conflicting margins
  if (tokens.headerFullBleed && hasSidebar) {
    tokens.headerFullBleed = false;
    console.log('[Style Gen] Disabled headerFullBleed — conflicts with sidebar layout');
  }

  // Long-form content should never go in the narrow sidebar
  if (tokens.sidebarSections && tokens.sidebarSections.length > 0) {
    const heavySections = ['experience', 'summary', 'education'];
    const filtered = tokens.sidebarSections.filter(s => !heavySections.includes(s));
    if (filtered.length !== tokens.sidebarSections.length) {
      console.log(`[Style Gen] Removed heavy sections from sidebar: ${tokens.sidebarSections.filter(s => heavySections.includes(s)).join(', ')}`);
      tokens.sidebarSections = filtered.length > 0 ? filtered : ['skills', 'languages', 'certifications'];
    }
  }

  // Validate pageBackground: must be very light (luminance > 0.85)
  if (tokens.pageBackground) {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(tokens.pageBackground)) {
      tokens.pageBackground = undefined;
    } else {
      const luminance = getRelativeLuminance(tokens.pageBackground);
      if (luminance < 0.85) {
        console.log(`[Style Gen] pageBackground ${tokens.pageBackground} too dark (luminance ${luminance.toFixed(2)}), resetting to white`);
        tokens.pageBackground = undefined;
      }
    }
  }

  // Validate sidebarSections
  if (tokens.sidebarSections) {
    const validSections = ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'];
    tokens.sidebarSections = tokens.sidebarSections.filter(s => validSections.includes(s));
    if (tokens.sidebarSections.length === 0) {
      tokens.sidebarSections = undefined;
    }
  }

  // Validate experienceDescriptionFormat - default to bullets if not set or invalid
  const validDescriptionFormats = ['bullets', 'paragraph'];
  if (!tokens.experienceDescriptionFormat || !validDescriptionFormats.includes(tokens.experienceDescriptionFormat)) {
    tokens.experienceDescriptionFormat = 'bullets';
  }

  // Validate headerGradient - default to none if not set or invalid
  const validGradients = ['none', 'subtle', 'radial'];
  if (!tokens.headerGradient || !validGradients.includes(tokens.headerGradient)) {
    tokens.headerGradient = 'none';
  }

  // Validate colors are proper hex codes
  tokens.colors = validateColors(tokens.colors);

  // Validate and fix color contrast issues
  const contrastResult = validateAndFixColorContrast(tokens.colors, tokens.headerVariant);
  tokens.colors = contrastResult.colors;

  // Log any contrast fixes for debugging
  if (contrastResult.fixes.length > 0) {
    console.log(`[Style Gen] Color contrast fixes applied:`, contrastResult.fixes);
  }

  // Ensure section order includes all standard sections
  tokens.sectionOrder = validateSectionOrder(tokens.sectionOrder);

  // === Force creative+ to also have a sidebar layout ===
  // The constraint validation above already clamps invalid layouts to
  // the first allowed value, but creative AND experimental both need a
  // sidebar (since single-column is no longer in their allowed list).
  if ((creativityLevel === 'creative' || creativityLevel === 'experimental') && (!tokens.layout || tokens.layout === 'single-column')) {
    tokens.layout = Math.random() > 0.5 ? 'sidebar-left' : 'sidebar-right';
    if (!tokens.sidebarSections) {
      tokens.sidebarSections = ['skills', 'languages', 'certifications'];
    }
    console.log(`[Style Gen] Forced sidebar layout ${tokens.layout} for ${creativityLevel} mode`);
  }

  // Section style and font validation are now handled entirely by the
  // tightened constraint check above — there are no longer any "boring"
  // fallbacks within creative/experimental's allowed lists, so a separate
  // anti-boring sweep is unnecessary.

  // === 2C: Anti-saai validation — ensure enough variety for creative/experimental ===
  if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const interestingCount = countInterestingChoices(tokens);
    const minimum = creativityLevel === 'experimental' ? 8 : 5;

    if (interestingCount < minimum) {
      console.log(`[Style Gen] Only ${interestingCount} interesting choices for ${creativityLevel} (need ${minimum}), applying variety boosts`);
      applyVarietyBoosts(tokens, minimum - interestingCount, creativityLevel);
    }
  }

  // === 2D: Renderer-specific tokens per creativity level ===
  // Each mode routes through its own renderer with its own compositional
  // primitives. We fill missing fields with defaults so the renderer never
  // crashes, and we make sure tokens from one mode don't leak into another.
  if (creativityLevel === 'creative') {
    tokens.editorial = validateAndFixEditorialTokens(tokens.editorial, tokens.fontPairing);
    tokens.bold = undefined;
  } else if (creativityLevel === 'experimental') {
    tokens.bold = validateAndFixBoldTokens(tokens.bold, tokens.showPhoto);
    tokens.editorial = undefined;
  } else {
    tokens.editorial = undefined;
    tokens.bold = undefined;
  }

  return tokens;
}

// ============ Editorial Validation ============

const editorialDefaultsPool = {
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

// Font pairings that pair naturally with each name treatment. Used to
// correct mismatches without forcing a single choice on the AI.
const nameTreatmentFontPreference: Record<string, string[]> = {
  'oversized-serif': ['playfair-inter', 'dm-serif-dm-sans', 'merriweather-source-sans', 'libre-baskerville-source-sans'],
  'oversized-sans': ['montserrat-open-sans', 'poppins-nunito', 'raleway-lato', 'space-grotesk-work-sans'],
  'mixed-italic': ['playfair-inter', 'libre-baskerville-source-sans', 'dm-serif-dm-sans'],
  'uppercase-tracked': ['inter-inter', 'montserrat-open-sans', 'raleway-lato', 'space-grotesk-work-sans', 'playfair-inter'],
  'condensed-impact': ['oswald-source-sans'],
};

function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function validateAndFixEditorialTokens(
  raw: CVDesignTokens['editorial'] | undefined,
  fontPairing: string,
): NonNullable<CVDesignTokens['editorial']> {
  const isValid = <T extends string>(val: unknown, allowed: readonly T[]): val is T =>
    typeof val === 'string' && allowed.includes(val as T);

  const headerLayout = isValid(raw?.headerLayout, editorialDefaultsPool.headerLayout)
    ? raw!.headerLayout
    : pickFrom(editorialDefaultsPool.headerLayout);

  // Choose nameTreatment. If the AI's pick doesn't match the font pairing,
  // prefer a treatment that does — it's better to override the treatment
  // than the font (the font was chosen for the pairing context).
  let nameTreatment = isValid(raw?.nameTreatment, editorialDefaultsPool.nameTreatment)
    ? raw!.nameTreatment
    : pickFrom(editorialDefaultsPool.nameTreatment);

  const preferred = nameTreatmentFontPreference[nameTreatment];
  if (preferred && !preferred.includes(fontPairing)) {
    // Find a treatment whose preferred fonts include this pairing
    const candidates = editorialDefaultsPool.nameTreatment.filter((t) => {
      const prefs = nameTreatmentFontPreference[t];
      return prefs?.includes(fontPairing);
    });
    if (candidates.length > 0) {
      const better = pickFrom(candidates);
      console.log(`[Style Gen] Editorial nameTreatment rotated ${nameTreatment} → ${better} to match font ${fontPairing}`);
      nameTreatment = better;
    }
  }

  const accentTreatment = isValid(raw?.accentTreatment, editorialDefaultsPool.accentTreatment)
    ? raw!.accentTreatment
    : pickFrom(editorialDefaultsPool.accentTreatment);

  const sectionTreatment = isValid(raw?.sectionTreatment, editorialDefaultsPool.sectionTreatment)
    ? raw!.sectionTreatment
    : pickFrom(editorialDefaultsPool.sectionTreatment);

  const grid = isValid(raw?.grid, editorialDefaultsPool.grid)
    ? raw!.grid
    : pickFrom(editorialDefaultsPool.grid);

  const dividerAll = ['none', ...editorialDefaultsPool.divider] as const;
  const divider = isValid(raw?.divider, dividerAll)
    ? raw!.divider
    : pickFrom(editorialDefaultsPool.divider);

  const typographyScale = isValid(raw?.typographyScale, editorialDefaultsPool.typographyScale)
    ? raw!.typographyScale
    : 'editorial';

  // Pull-quote source only meaningful when treatment is pull-quote
  let pullQuoteSource: string | undefined;
  if (sectionTreatment === 'pull-quote') {
    pullQuoteSource = (raw?.pullQuoteSource || 'experience').toString();
  }

  // Drop-cap section only meaningful when treatment is drop-cap
  let dropCapSection: string | undefined;
  if (sectionTreatment === 'drop-cap') {
    dropCapSection = (raw?.dropCapSection || 'summary').toString();
  }

  const sectionNumbering = typeof raw?.sectionNumbering === 'boolean'
    ? raw!.sectionNumbering
    : true;

  return {
    headerLayout,
    nameTreatment,
    accentTreatment,
    sectionTreatment,
    grid,
    divider,
    typographyScale,
    sectionNumbering,
    pullQuoteSource,
    dropCapSection,
  };
}

// ============ Bold Validation (experimental mode) ============

const boldDefaultsPool = {
  headerLayout: ['hero-band', 'split-photo', 'tiled', 'asymmetric-burst'] as const,
  sidebarStyle: ['solid-color', 'gradient', 'photo-hero', 'transparent'] as const,
  skillStyle: ['bars-gradient', 'dots-rating', 'icon-tagged', 'colored-pills'] as const,
  photoTreatment: ['circle-halo', 'squircle', 'color-overlay', 'badge-framed'] as const,
  accentShape: ['diagonal-stripe', 'angled-corner', 'colored-badge', 'hex-pattern'] as const,
  iconTreatment: ['solid-filled', 'duotone', 'line-with-accent'] as const,
  headingStyle: ['oversized-numbered', 'kicker-bar', 'gradient-text', 'bracketed'] as const,
  gradientDirection: ['none', 'linear-vertical', 'linear-diagonal', 'radial-burst'] as const,
};

function validateAndFixBoldTokens(
  raw: CVDesignTokens['bold'] | undefined,
  showPhoto: boolean,
): NonNullable<CVDesignTokens['bold']> {
  const isValid = <T extends string>(val: unknown, allowed: readonly T[]): val is T =>
    typeof val === 'string' && allowed.includes(val as T);

  const headerLayout = isValid(raw?.headerLayout, boldDefaultsPool.headerLayout)
    ? raw!.headerLayout
    : pickFrom(boldDefaultsPool.headerLayout);

  // photo-hero sidebar requires an actual photo — downgrade to solid-color
  // if the candidate didn't upload one.
  let sidebarStyle = isValid(raw?.sidebarStyle, boldDefaultsPool.sidebarStyle)
    ? raw!.sidebarStyle
    : pickFrom(boldDefaultsPool.sidebarStyle);
  if (sidebarStyle === 'photo-hero' && !showPhoto) {
    sidebarStyle = 'gradient';
  }

  const skillStyle = isValid(raw?.skillStyle, boldDefaultsPool.skillStyle)
    ? raw!.skillStyle
    : pickFrom(boldDefaultsPool.skillStyle);

  const photoTreatment = isValid(raw?.photoTreatment, boldDefaultsPool.photoTreatment)
    ? raw!.photoTreatment
    : pickFrom(boldDefaultsPool.photoTreatment);

  const accentShape = isValid(raw?.accentShape, boldDefaultsPool.accentShape)
    ? raw!.accentShape
    : pickFrom(boldDefaultsPool.accentShape);

  const iconTreatment = isValid(raw?.iconTreatment, boldDefaultsPool.iconTreatment)
    ? raw!.iconTreatment
    : pickFrom(boldDefaultsPool.iconTreatment);

  const headingStyle = isValid(raw?.headingStyle, boldDefaultsPool.headingStyle)
    ? raw!.headingStyle
    : pickFrom(boldDefaultsPool.headingStyle);

  const gradientDirection = isValid(raw?.gradientDirection, boldDefaultsPool.gradientDirection)
    ? raw!.gradientDirection
    : pickFrom(boldDefaultsPool.gradientDirection);

  return {
    headerLayout,
    sidebarStyle,
    skillStyle,
    photoTreatment,
    accentShape,
    iconTreatment,
    headingStyle,
    gradientDirection,
  };
}

function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function validateColors(colors: CVDesignTokens['colors']): CVDesignTokens['colors'] {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  const defaults = {
    primary: '#1a365d',
    secondary: '#f7fafc',
    accent: '#2b6cb0',
    text: '#2d3748',
    muted: '#718096',
  };

  return {
    primary: hexRegex.test(colors.primary) ? colors.primary : defaults.primary,
    secondary: hexRegex.test(colors.secondary) ? colors.secondary : defaults.secondary,
    accent: hexRegex.test(colors.accent) ? colors.accent : defaults.accent,
    text: hexRegex.test(colors.text) ? colors.text : defaults.text,
    muted: hexRegex.test(colors.muted) ? colors.muted : defaults.muted,
  };
}

function validateSectionOrder(order: string[]): string[] {
  const allSections = ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'];

  // Start with provided order, filtering to valid sections
  const validOrder = order.filter(s => allSections.includes(s));

  // Add any missing sections at the end
  for (const section of allSections) {
    if (!validOrder.includes(section)) {
      validOrder.push(section);
    }
  }

  return validOrder;
}

// ============ Variety Helpers ============

/**
 * Count how many "interesting" (non-default) choices are in the tokens.
 * Used to ensure creative/experimental modes look sufficiently different.
 */
function countInterestingChoices(tokens: CVDesignTokens): number {
  let count = 0;

  // Non-boring font pairing
  if (!['inter-inter', 'roboto-roboto', 'lato-lato'].includes(tokens.fontPairing)) count++;
  // Non-simple header
  if (tokens.headerVariant !== 'simple') count++;
  // Non-default section style
  if (!['clean', 'underlined'].includes(tokens.sectionStyle)) count++;
  // Accent style set
  if (tokens.accentStyle && tokens.accentStyle !== 'none') count++;
  // Name style set
  if (tokens.nameStyle && tokens.nameStyle !== 'normal') count++;
  // Skill tag style set
  if (tokens.skillTagStyle && tokens.skillTagStyle !== 'filled') count++;
  // Non-basic border radius
  if (tokens.borderRadius && !['none', 'small'].includes(tokens.borderRadius)) count++;
  // Page background set
  if (tokens.pageBackground) count++;
  // Sidebar layout
  if (tokens.layout === 'sidebar-left' || tokens.layout === 'sidebar-right') count++;
  // Icons enabled
  if (tokens.useIcons) count++;
  // Header gradient
  if (tokens.headerGradient && tokens.headerGradient !== 'none') count++;
  // Non-default contact layout
  if (tokens.contactLayout && tokens.contactLayout !== 'single-row') count++;

  return count;
}

/**
 * Apply variety boosts to make tokens more visually interesting.
 * Upgrades the most impactful tokens to non-default values.
 */
function applyVarietyBoosts(tokens: CVDesignTokens, needed: number, level: StyleCreativityLevel): void {
  let applied = 0;

  // Priority order: most visual impact first
  if (applied < needed && tokens.sectionStyle === 'clean') {
    tokens.sectionStyle = level === 'experimental' ? 'card' : 'accent-left';
    applied++;
    console.log(`[Style Gen] Variety boost: sectionStyle → ${tokens.sectionStyle}`);
  }

  if (applied < needed && tokens.headerVariant === 'simple') {
    if (level === 'experimental') {
      const options = ['banner', 'split', 'accented'] as const;
      tokens.headerVariant = options[Math.floor(Math.random() * options.length)];
    } else {
      tokens.headerVariant = 'split';
    }
    applied++;
    console.log(`[Style Gen] Variety boost: headerVariant → ${tokens.headerVariant}`);
  }

  if (applied < needed && (!tokens.accentStyle || tokens.accentStyle === 'none')) {
    tokens.accentStyle = 'border-left';
    applied++;
    console.log('[Style Gen] Variety boost: accentStyle → border-left');
  }

  if (applied < needed && (!tokens.nameStyle || tokens.nameStyle === 'normal')) {
    tokens.nameStyle = 'uppercase';
    applied++;
    console.log('[Style Gen] Variety boost: nameStyle → uppercase');
  }

  if (applied < needed && (!tokens.skillTagStyle || tokens.skillTagStyle === 'filled')) {
    tokens.skillTagStyle = level === 'experimental' ? 'pill' : 'outlined';
    applied++;
    console.log(`[Style Gen] Variety boost: skillTagStyle → ${tokens.skillTagStyle}`);
  }

  if (applied < needed && (!tokens.borderRadius || ['none', 'small'].includes(tokens.borderRadius))) {
    tokens.borderRadius = level === 'experimental' ? 'large' : 'medium';
    applied++;
    console.log(`[Style Gen] Variety boost: borderRadius → ${tokens.borderRadius}`);
  }

  if (applied < needed && !tokens.useIcons) {
    tokens.useIcons = true;
    applied++;
    console.log('[Style Gen] Variety boost: useIcons → true');
  }

  if (applied < needed && (!tokens.headerGradient || tokens.headerGradient === 'none')) {
    tokens.headerGradient = level === 'experimental' ? 'radial' : 'subtle';
    applied++;
    console.log(`[Style Gen] Variety boost: headerGradient → ${tokens.headerGradient}`);
  }

  if (applied < needed && (!tokens.layout || tokens.layout === 'single-column')) {
    tokens.layout = Math.random() > 0.5 ? 'sidebar-left' : 'sidebar-right';
    if (!tokens.sidebarSections) {
      tokens.sidebarSections = ['skills', 'languages', 'certifications'];
    }
    applied++;
    console.log(`[Style Gen] Variety boost: layout → ${tokens.layout}`);
  }

  if (applied < needed && !tokens.pageBackground) {
    const bgOptions = ['#faf8f5', '#f5f0eb', '#f0f4f8', '#f5f0f5', '#f0f5f0', '#fef9f0'];
    tokens.pageBackground = bgOptions[Math.floor(Math.random() * bgOptions.length)];
    applied++;
    console.log(`[Style Gen] Variety boost: pageBackground → ${tokens.pageBackground}`);
  }

  if (applied < needed && tokens.contactLayout === 'single-row') {
    const options = ['double-row', 'single-column', 'double-column'] as const;
    tokens.contactLayout = options[Math.floor(Math.random() * options.length)];
    applied++;
    console.log(`[Style Gen] Variety boost: contactLayout → ${tokens.contactLayout}`);
  }
}

// ============ Fallback Tokens ============

function getFallbackTokens(
  creativityLevel: StyleCreativityLevel,
  industry?: string
): CVDesignTokens {
  // Experimental mode gets bold fallback with abundant decorations
  // Rotate colors based on industry to add variety
  if (creativityLevel === 'experimental') {
    // Pick colors based on industry for variety
    const industryColors: Record<string, { primary: string; secondary: string; accent: string }> = {
      technology: { primary: '#0891b2', secondary: '#ecfeff', accent: '#f59e0b' },  // Teal
      finance: { primary: '#1e3a5f', secondary: '#f0f9ff', accent: '#10b981' },      // Deep blue
      creative: { primary: '#be185d', secondary: '#fdf2f8', accent: '#06b6d4' },     // Magenta
      healthcare: { primary: '#059669', secondary: '#ecfdf5', accent: '#8b5cf6' },   // Emerald
      consulting: { primary: '#4338ca', secondary: '#eef2ff', accent: '#f59e0b' },   // Indigo
      default: { primary: '#dc2626', secondary: '#fef2f2', accent: '#0891b2' },      // Red
    };
    const colors = industryColors[industry || ''] || industryColors.default;

    // Map industry to decoration theme
    const industryToTheme: Record<string, 'geometric' | 'organic' | 'minimal' | 'tech' | 'creative' | 'abstract'> = {
      technology: 'tech',
      finance: 'minimal',
      creative: 'creative',
      healthcare: 'organic',
      consulting: 'minimal',
    };
    const decorationTheme = industryToTheme[industry || ''] || 'abstract';

    return {
      styleName: 'Bold Experimental',
      styleRationale: 'A bold, colorful design that stands out.',
      industryFit: industry || 'technology',
      themeBase: 'bold',
      colors: {
        ...colors,
        text: '#1f2937',
        muted: '#6b7280',
      },
      // All values below match the tightened experimental constraints.
      fontPairing: 'oswald-source-sans',
      scale: 'medium',
      spacing: 'comfortable',
      headerVariant: 'asymmetric',
      sectionStyle: 'magazine',
      skillsDisplay: 'tags',
      experienceDescriptionFormat: 'bullets',
      contactLayout: 'double-column',
      headerGradient: 'radial',
      showPhoto: true,
      useIcons: true,
      roundedCorners: true,
      headerFullBleed: false,
      decorations: 'none',
      decorationTheme,
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'],
      layout: 'sidebar-left',
      sidebarSections: ['skills', 'languages', 'certifications'],
      borderRadius: 'pill',
      accentStyle: 'border-left',
      nameStyle: 'uppercase',
      skillTagStyle: 'pill',
      pageBackground: '#ffffff',
      bold: {
        headerLayout: 'hero-band',
        sidebarStyle: 'gradient',
        skillStyle: 'bars-gradient',
        photoTreatment: 'circle-halo',
        accentShape: 'colored-badge',
        iconTreatment: 'solid-filled',
        headingStyle: 'oversized-numbered',
        gradientDirection: 'linear-diagonal',
      },
    };
  }

  // Creative mode gets modern fallback with moderate decorations
  if (creativityLevel === 'creative') {
    const defaults = themeDefaults['creative'];
    // Map industry to decoration theme
    const industryToTheme: Record<string, 'geometric' | 'organic' | 'minimal' | 'tech' | 'creative' | 'abstract'> = {
      technology: 'tech',
      finance: 'minimal',
      creative: 'creative',
      healthcare: 'organic',
      consulting: 'minimal',
    };
    const decorationTheme = industryToTheme[industry || ''] || 'creative';

    // Editorial-palette fallback (matches the new creative system prompt)
    const editorialColors = {
      primary: '#1f2233',
      secondary: '#faf8f4',
      accent: '#c77757',
      text: '#1a1a1a',
      muted: '#6b6459',
    };

    return {
      styleName: 'Editorial',
      styleRationale: 'Magazine-style editorial layout with refined typography.',
      industryFit: industry || 'creative',
      themeBase: 'creative',
      colors: editorialColors,
      // These are ignored by the editorial renderer but still required by
      // the base schema.
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
      // Decorations are not rendered in editorial mode; keeping 'none' avoids
      // the legacy decoration generator from running.
      decorations: 'none',
      decorationTheme,
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'],
      // The editorial renderer uses its own grid; these legacy fields are ignored.
      layout: 'single-column',
      // The actual editorial layout choices
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
      pageBackground: '#faf8f4',
    };
  }

  // Balanced mode gets minimal decorations
  if (creativityLevel === 'balanced') {
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

  // Default fallback for conservative - no decorations
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
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'],
  };
}

// ============ LinkedIn Summary Helper ============

/**
 * Create a concise summary of LinkedIn data for the LLM prompt.
 * Reused from the original style-generator for compatibility.
 */
export function createLinkedInSummaryV2(linkedIn: {
  fullName: string;
  headline: string | null;
  location: string | null;
  about: string | null;
  experience: Array<{ title: string; company: string; isCurrentRole: boolean }>;
  education: Array<{ school: string; degree: string | null; fieldOfStudy: string | null }>;
  skills: Array<{ name: string }>;
}): string {
  const lines: string[] = [];

  lines.push(`Name: ${linkedIn.fullName}`);

  if (linkedIn.headline) {
    lines.push(`Headline: ${linkedIn.headline}`);
  }

  if (linkedIn.location) {
    lines.push(`Location: ${linkedIn.location}`);
  }

  if (linkedIn.about) {
    // Truncate long about sections
    const about = linkedIn.about.length > 300
      ? linkedIn.about.slice(0, 300) + '...'
      : linkedIn.about;
    lines.push(`About: ${about}`);
  }

  // Current/recent roles
  const recentRoles = linkedIn.experience.slice(0, 3);
  if (recentRoles.length > 0) {
    lines.push('Recent Experience:');
    recentRoles.forEach(exp => {
      const current = exp.isCurrentRole ? ' (current)' : '';
      lines.push(`  - ${exp.title} at ${exp.company}${current}`);
    });
  }

  // Education
  const education = linkedIn.education.slice(0, 2);
  if (education.length > 0) {
    lines.push('Education:');
    education.forEach(edu => {
      const degree = edu.degree ? `${edu.degree}` : '';
      const field = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : '';
      lines.push(`  - ${edu.school}${degree ? `: ${degree}` : ''}${field}`);
    });
  }

  // Top skills
  const topSkills = linkedIn.skills.slice(0, 10).map(s => s.name);
  if (topSkills.length > 0) {
    lines.push(`Key Skills: ${topSkills.join(', ')}`);
  }

  return lines.join('\n');
}
