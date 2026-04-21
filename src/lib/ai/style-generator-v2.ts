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

const designTokensSchema = z.object({
  // Metadata
  styleName: z.string().describe('A descriptive name for this style, e.g., "Executive Professional" or "Creative Tech"'),
  styleRationale: z.string().describe('Brief explanation of why this style fits the profile and job (2-3 sentences)'),
  industryFit: z.string().describe('The industry this style is optimized for, e.g., "technology", "finance", "healthcare", "creative"'),

  // Theme
  themeBase: z.enum(['professional', 'modern', 'creative', 'minimal', 'bold'])
    .describe('Base theme that determines overall aesthetic direction'),

  // Colors - ALL are required and will be used
  colors: z.object({
    primary: z.string().describe('Primary color for name and headings (hex code like #1a365d). Should have good contrast on white.'),
    secondary: z.string().describe('Secondary color for subtle backgrounds (hex code). Should be very light, almost white.'),
    accent: z.string().describe('Accent color for highlights, links, and decorative elements (hex code). Should complement primary.'),
    text: z.string().describe('Main body text color (hex code like #333333). Should be readable.'),
    muted: z.string().describe('Muted text for dates, labels (hex code like #666666). Should be lighter than text.'),
  }),

  // Typography
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
  ]).describe('Font combination: heading font + body font'),

  scale: z.enum(['small', 'medium', 'large'])
    .describe('Typography scale: small for dense content, large for impact'),

  // Layout
  spacing: z.enum(['compact', 'comfortable', 'spacious'])
    .describe('Overall spacing density'),

  // Component variants
  headerVariant: z.enum(['simple', 'accented', 'banner', 'split', 'asymmetric'])
    .describe('Header layout: simple (clean), accented (left border), banner (full-width color), split (name left, contact right), asymmetric (oversized name with right-aligned headline and vertical accent)'),

  sectionStyle: z.enum(['clean', 'underlined', 'boxed', 'timeline', 'accent-left', 'card', 'alternating', 'magazine'])
    .describe('Section styling: clean (minimal), underlined (accent under title), boxed (background), timeline (vertical line), accent-left (colored left border), card (subtle shadow cards), alternating (even/odd colored bands), magazine (title as colored block label, editorial feel)'),

  skillsDisplay: z.enum(['tags', 'list', 'compact', 'bars'])
    .describe('How skills are displayed: tags (pills), list (bulleted columns), compact (inline with separators), bars (infographic-style progress bars)'),

  experienceDescriptionFormat: z.enum(['bullets', 'paragraph'])
    .describe('Experience format: bullets (opsommingstekens) or paragraph (doorlopende tekst)'),

  contactLayout: z.enum(['single-row', 'double-row', 'single-column', 'double-column'])
    .describe('Contact info layout: single-row (all inline with separators), double-row (split across 2 lines), single-column (vertical stack), double-column (2-column grid)'),

  headerGradient: z.enum(['none', 'subtle', 'radial'])
    .describe('Header background effect: none (solid color), subtle (elegant linear gradient), radial (luxurious radial glow)'),

  // Feature flags
  showPhoto: z.boolean().describe('Whether to show a profile photo if available'),
  useIcons: z.boolean().describe('Whether to show icons in contact info and sections'),
  roundedCorners: z.boolean().describe('Whether to use rounded corners on cards and tags'),
  headerFullBleed: z.boolean().describe('Whether the header extends to page edges (full-bleed) - true for bold/impactful designs, false for classic margins'),

  // Decorations - subtle background shapes
  decorations: z.enum(['none', 'minimal', 'moderate', 'abundant'])
    .describe('Background decorative shapes: none for professional/conservative, minimal-moderate for creative, abundant for experimental'),

  // Section order
  sectionOrder: z.array(z.string())
    .describe('Order of CV sections. Use: summary, experience, projects, education, skills, languages, certifications'),

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

const editorialSchema = z.object({
  headerLayout: z.enum(['stacked', 'split', 'band', 'overlap']).describe(
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
  ]).describe(
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
  ]).describe(
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
  ]).describe(
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
  ]).describe(
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
  ]).describe(
    `How sections are separated:
    - none: only whitespace
    - hairline: 1px rule between sections
    - double-rule: 2 stacked hairlines (classic)
    - ornament: centered ✦ glyph between sections
    - whitespace-large: 2x vertical space (airy, hero feel)`,
  ),
  typographyScale: z.enum(['modest', 'editorial', 'hero']).describe(
    `Overall type scale:
    - modest: restrained sizes, dense information (think resume)
    - editorial: clear hero/body contrast (default magazine feel)
    - hero: oversized display moments (name ~68pt, for impact CVs)`,
  ),
  sectionNumbering: z.boolean().describe(
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
  editorial: editorialSchema.describe(
    'Editorial layout tokens. REQUIRED for creative mode — these drive the magazine-style renderer.',
  ),
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract']).optional().describe(
    'Industry decoration theme (optional in creative mode — the editorial renderer uses typography and grid, not background shapes).',
  ),
  layout: z.enum(['single-column', 'sidebar-left', 'sidebar-right']).optional()
    .describe('Legacy layout field — IGNORE in creative mode. The editorial renderer uses its own `grid` token.'),
  sidebarSections: z.array(z.string()).optional()
    .describe('Legacy sidebar field — IGNORE in creative mode.'),
});

// Extended schema for experimental mode - includes layout and custom decorations
// Note: Anthropic API only supports minItems of 0 or 1, so we validate min count in code
const experimentalTokensSchema = creativeTokensSchema.extend({
  layout: z.enum(['single-column', 'sidebar-left', 'sidebar-right']).optional()
    .describe('Page layout: single-column (classic), sidebar-left (sidebar on left with skills/languages/certs), sidebar-right (sidebar on right)'),
  sidebarSections: z.array(z.string()).optional()
    .describe('Which sections go in the sidebar (default: skills, languages, certifications). Only used with sidebar layouts.'),
  customDecorations: z.array(z.object({
    name: z.string().describe('Unique name for this decoration, e.g., "code-bracket", "data-node", "growth-arrow"'),
    description: z.string().describe('Visual description: what shape/symbol this represents (e.g., "curly brace like { }", "connected dots forming a network node", "upward arrow with bar chart")'),
    placement: z.enum(['corner', 'edge', 'scattered']).describe('Where to place: corner (corners of page), edge (along margins), scattered (random positions)'),
    size: z.enum(['small', 'medium', 'large']).describe('Size of decoration elements'),
    quantity: z.number().describe('How many of this decoration to place (1-5, will be clamped)'),
  })).describe(`Custom decorations that reflect the job/industry. Create 2-5 unique decorations.
Examples:
- Software Developer: code brackets, terminal prompts, git branches
- Data Scientist: scatter plot dots, neural network nodes, bar charts
- Marketing: speech bubbles, trend arrows, target circles
- Finance: growth arrows, pie chart segments, currency symbols
- Healthcare: heartbeat lines, molecule shapes, plus signs
Make them SUBTLE and PROFESSIONAL, not literal clipart!`),
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

function buildRandomSeed(creativityLevel: StyleCreativityLevel, constraints: { allowedHeaderVariants: readonly string[]; allowedSectionStyles: readonly string[]; allowedLayouts: readonly string[] }): string {
  if (creativityLevel === 'conservative' || creativityLevel === 'balanced') return '';

  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const mood = pick(colorMoods);
  const fontDir = pick(fontDirections);
  const headerVariant = pick(constraints.allowedHeaderVariants);
  const sectionStyle = pick(constraints.allowedSectionStyles);
  const layout = pick(constraints.allowedLayouts);

  if (creativityLevel === 'creative') {
    return `
RANDOM VISUAL DIRECTION (combine with the company/industry context):
- Color mood: "${mood.mood}" — ${mood.description}
- Typography direction: ${fontDir.hint}
- Consider header variant: "${headerVariant}"
Use the company/industry as THEMATIC basis, but vary the VISUAL approach using these directions. Two CVs for the same company should look different!`;
  }

  // experimental
  return `
MANDATORY RANDOM VISUAL DIRECTION (you MUST follow these as starting points, then adapt to the industry):
- Color mood: "${mood.mood}" — ${mood.description}. DO NOT use generic blue/gray!
- Typography: ${fontDir.hint}
- Header variant: "${headerVariant}" — use this exact header variant
- Section style: "${sectionStyle}" — use this exact section style
- Layout: "${layout}" — use this layout
Combine these with the industry/company context. The visual direction takes priority — adapt the company theme to fit these choices, not the other way around!`;
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
*** EXPERIMENTAL MODE — ART-DIRECTED VISUAL STATEMENT ***

This is the most distinctive level. The CV should be RADICALLY different
from anything a creative-mode CV would produce. Same headers, sections,
and layouts as creative = wrong level. Experimental owns the boldest
options exclusively.

CONSTRAINED OPTIONS (these are the ONLY allowed values for this level):

- **Themes**: ${constraints.allowedThemes.join(' | ')}
  → Only 'creative' and 'bold'. Professional/modern/minimal are NOT allowed.
- **Fonts**: ${constraints.allowedFontPairings.join(' | ')}
  → 6 expressive fonts only. NO sans-serif workhorses (inter/roboto/lato).
  → Always editorial / display / serif character.
- **Headers**: ${constraints.allowedHeaderVariants.join(' | ')}
  → ONLY 'asymmetric'. The single most distinctive option. Banner is creative
    territory, all the plainer headers are balanced/conservative territory.
- **Section styles**: ${constraints.allowedSectionStyles.join(' | ')}
  → ONLY 'alternating' (colored bands per section) and 'magazine' (section
    titles as colored block labels with editorial layout). These two
    visually transform the page in a way no other style does.
  → Card/timeline/accent-left are creative territory. Clean/underlined
    are balanced/conservative.
- **Layout**: ${constraints.allowedLayouts.join(' | ')}
  → Sidebar required. Single-column is forbidden.
- **Decorations**: ${constraints.allowedDecorations.join(' | ')} (default: ${constraints.defaultDecorations})
  → Abundant background shapes. The page should feel alive.
- **Border radius**: ${constraints.allowedBorderRadius.join(' | ')}
  → Only 'large' or 'pill'. No subtle rounding.
- **Accent style**: ${constraints.allowedAccentStyles.join(' | ')} — REQUIRED
- **Name style**: ${constraints.allowedNameStyles.join(' | ')} — REQUIRED
- **Skill tag style**: ${constraints.allowedSkillTagStyles.join(' | ')} — REQUIRED
- **headerGradient**: 'subtle' or 'radial' — REQUIRED, never 'none'
- **pageBackground**: tinted (very light, e.g. #faf8f5 / #f0f4f8 / #f5f0f5) — REQUIRED
- **customDecorations**: 2-5 unique job-specific abstract shapes — REQUIRED
- **showPhoto**: ${hasPhoto ? 'true' : 'false'}
- **useIcons**: true

COLORS — never default to navy+gray. The whole point of experimental is
unexpected color choices. Pick from terracotta, emerald, burgundy, indigo,
plum, sage, deep teal, electric violet — driven by the industry style
profile if one is provided. Even a finance CV in experimental mode should
NOT be navy: try rich burgundy or deep emerald.

EXAMPLE EXPERIMENTAL COMBINATIONS:
- Sidebar-right + asymmetric header + magazine sections + dm-serif-dm-sans
  + berry-rich colors + tinted pink-tinged background + abundant decorations
- Sidebar-left + asymmetric header + alternating sections + oswald-source-sans
  + forest-natural colors + warm tinted background + abundant decorations
- Sidebar-right + asymmetric header + magazine sections + space-grotesk-work-sans
  + industrial-slate + cool tinted background + geometric abundant decorations
- Sidebar-left + asymmetric header + alternating sections + playfair-inter
  + luxe-dark colors + warm tinted background + abstract abundant decorations

This is art direction, not templating. The result should be BOLD, WILD,
unmistakably distinct from a creative-mode CV.
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
DESIGN CONTEXT (for inspiration only — your creative choices take priority):
Industry: "${jobVacancy.industry || 'Unknown'}", Company: "${jobVacancy.company || 'Unknown'}".
Use the industry/company only as loose inspiration for color direction and decoration themes.
Your primary goal is to create something VISUALLY STRIKING and UNIQUE.
Don't play it safe — make bold choices with layout, typography, and color.
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
  const randomSeed = buildRandomSeed(creativityLevel, creativityConstraints[creativityLevel]);
  if (randomSeed) {
    prompt += `\n${randomSeed}\n`;
  }

  // Closing instructions vary by creativity level
  if (creativityLevel === 'experimental') {
    prompt += `
Generate design tokens that:
1. Look VISUALLY UNIQUE — this CV should stand out from every other CV
2. Make BOLD choices: try sidebar layouts, unusual font pairings, striking colors
3. Use the extended styling tokens (accentStyle, borderRadius, nameStyle, skillTagStyle, pageBackground) — don't leave them at defaults
4. Will render well in both screen preview and PDF print
5. Use colors that are VIBRANT and unexpected — avoid generic blue/gray

IMPORTANT: Prioritize visual impact and uniqueness over convention.
This is experimental mode — the user WANTS something that looks different!`;
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

    // Validate and fix the generated tokens
    const tokens = validateAndFixTokens(result.object as CVDesignTokens, creativityLevel, styleHistory);

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
  tokens: CVDesignTokens,
  creativityLevel: StyleCreativityLevel,
  styleHistory?: CVDesignTokens[],
): CVDesignTokens {
  const constraints = creativityConstraints[creativityLevel];

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

  // === 2D: Editorial tokens for creative mode ===
  // Creative mode routes through the editorial renderer, which needs a
  // populated `editorial` object. If the AI forgot to fill it (or an
  // individual field), we inject sensible defaults so the renderer never
  // crashes. We also cross-check pullQuoteSource/dropCapSection against the
  // chosen sectionTreatment.
  if (creativityLevel === 'creative') {
    tokens.editorial = validateAndFixEditorialTokens(tokens.editorial, tokens.fontPairing);
  } else {
    // Never let editorial leak into non-creative levels — they have their
    // own renderer paths.
    tokens.editorial = undefined;
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
      decorations: 'abundant',
      decorationTheme,
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'],
      layout: 'sidebar-right',
      sidebarSections: ['skills', 'languages', 'certifications'],
      borderRadius: 'pill',
      accentStyle: 'border-left',
      nameStyle: 'uppercase',
      skillTagStyle: 'pill',
      pageBackground: '#faf8f5',
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
