/**
 * CVDesignTokens - Token-Based CV Styling System
 *
 * This is the new, simplified styling interface that replaces the complex 150+ property
 * CVStyleConfig. It generates ~20 properties via a single LLM call instead of 12+.
 *
 * Core Philosophy:
 * - Print-First: All generated styles are 100% PDF-safe
 * - Template-Based: Pre-defined CSS templates ensure reliability
 * - LLM-Light: Single API call generates design tokens that map to templates
 */

import type { StyleCreativityLevel } from './index';

// ============ Theme Base Options ============

export type ThemeBase = 'professional' | 'modern' | 'creative' | 'minimal' | 'bold';

// ============ Font Pairing Options ============

export type FontPairing =
  | 'inter-inter'           // Clean, modern, tech-friendly
  | 'playfair-inter'        // Elegant headings, readable body
  | 'montserrat-open-sans'  // Strong headings, friendly body
  | 'raleway-lato'          // Stylish headings, professional body
  | 'poppins-nunito'        // Modern geometric, soft rounded
  | 'roboto-roboto'         // Google's workhorse, versatile
  | 'lato-lato'             // Humanist, warm and professional
  | 'merriweather-source-sans' // Traditional serif with modern sans
  | 'oswald-source-sans'    // Condensed impact headings, clean body
  | 'dm-serif-dm-sans'      // Warm serif headings, geometric sans body
  | 'space-grotesk-work-sans' // Techy monospaced feel, friendly body
  | 'libre-baskerville-source-sans'; // Classic book serif, modern sans body

// ============ Scale & Spacing Options ============

export type TypeScale = 'small' | 'medium' | 'large';
export type SpacingScale = 'compact' | 'comfortable' | 'spacious';

// ============ Component Variants ============

export type HeaderVariant = 'simple' | 'accented' | 'banner' | 'split' | 'asymmetric';
export type SectionStyle = 'clean' | 'underlined' | 'boxed' | 'timeline' | 'accent-left' | 'card' | 'alternating' | 'magazine';
export type SkillsDisplay = 'tags' | 'list' | 'compact' | 'bars';

// ============ Layout Options ============

export type CVLayout = 'single-column' | 'sidebar-left' | 'sidebar-right';

// ============ Accent & Detail Styles ============

export type AccentStyle = 'none' | 'border-left' | 'background' | 'quote';
export type BorderRadiusScale = 'none' | 'small' | 'medium' | 'large' | 'pill';
export type NameStyle = 'normal' | 'uppercase' | 'extra-bold';
export type SkillTagStyle = 'filled' | 'outlined' | 'pill';

// ============ Contact Layout Options ============

export type ContactLayout = 'single-row' | 'double-row' | 'single-column' | 'double-column';

// ============ Header Gradient Options ============

export type HeaderGradient = 'none' | 'subtle' | 'radial';

// ============ Decoration Options ============

export type DecorationIntensity = 'none' | 'minimal' | 'moderate' | 'abundant';

// ============ Experience Description Format ============

export type ExperienceDescriptionFormat = 'bullets' | 'paragraph';

// Industry-based decoration themes (for creative mode)
export type DecorationTheme =
  | 'geometric'   // IT/Tech - circuits, nodes, hexagons
  | 'organic'     // Healthcare/Nature - curves, leaves, waves
  | 'minimal'     // Finance/Consulting - subtle lines, corners
  | 'tech'        // Software/Engineering - code-like, digital
  | 'creative'    // Design/Marketing - abstract, bold shapes
  | 'abstract';   // General - versatile geometric patterns

// ============ Editorial Mode Primitives (creative level) ============
//
// Compositional primitives for the editorial renderer. These are intentionally
// orthogonal so the AI can combine them freely — the renderer handles every
// combination. This replaces the old "pick one of 5 header variants" approach
// for creative mode with a much richer design space.
//
// Creative is the "AI decides more" level: it picks a layoutArchetype (high-
// level composition), an editorial color palette (2-3 colors instead of just
// one accent), and a bag of decorative elements (drop caps, pull quotes,
// decorative numerals, marginalia). Bolder than balanced, but still readable
// and print-safe.

export type EditorialHeaderLayout = 'stacked' | 'split' | 'band' | 'overlap';
export type EditorialNameTreatment =
  | 'oversized-serif'      // Hero serif display, tight leading
  | 'oversized-sans'       // Hero grotesk, tight tracking
  | 'uppercase-tracked'    // All caps, wide letter-spacing
  | 'mixed-italic'         // Mixed serif italic for first name
  | 'condensed-impact';    // Tall condensed weight
export type EditorialAccentTreatment =
  | 'thin-rule'            // 1-2px horizontal rule above/below headline
  | 'vertical-bar'         // Vertical accent bar next to name
  | 'marker-highlight'     // Colored highlight under one word
  | 'ornament'             // Small decorative glyph (•, —, *)
  | 'number-prefix';       // "01 —" / "No. 01" numbering
export type EditorialSectionTreatment =
  | 'numbered'             // "01. Experience" big numerals
  | 'kicker'               // Small uppercase kicker above big title
  | 'sidenote'             // Section title floated to the left margin
  | 'drop-cap'             // First paragraph uses drop-cap
  | 'pull-quote';          // One item highlighted as pull quote
export type EditorialGrid =
  | 'asymmetric-60-40'     // Main content 60%, sidenotes 40%
  | 'asymmetric-70-30'     // Main 70%, narrow sidenotes 30%
  | 'full-bleed'           // Single column, large margins
  | 'manuscript'           // Classic manuscript proportions
  | 'three-column-intro';  // First section uses 3-col summary/meta
export type EditorialDivider =
  | 'none'
  | 'hairline'             // 1px rule
  | 'double-rule'          // 2 stacked rules
  | 'ornament'             // Centered ✦ or —
  | 'whitespace-large';    // 2x vertical space
export type EditorialTypographyScale =
  | 'modest'               // Restrained sizes, dense magazine
  | 'editorial'            // Clear hero/body contrast
  | 'hero';                // Oversized display moments

// ============ New: layout archetypes (high-level composition picks) ============
//
// The archetype is a single decision that biases many lower-level choices.
// The renderer treats this as the primary layout switch — header position,
// section flow, marginalia visibility and grid all key off it. The AI can
// still tune the lower-level editorial.* primitives within an archetype.

export type EditorialLayoutArchetype =
  | 'magazine-column'        // Classic single-column with strong masthead + decorative dividers
  | 'editorial-spread'       // Asymmetric 2-col with margin-notes column (sidenotes / dates)
  | 'asymmetric-feature'     // Big hero band + offset main column, body content flows under
  | 'feature-sidebar'        // Magazine feature article: dense main + skill/cert sidebar
  | 'manuscript-mono'        // Centered manuscript with optical proportions, no sidebar
  | 'cover-feature'          // Magazine cover with hero portrait, oversized title, lede on cover
  | 'index-card';            // Library catalog / archive aesthetic — boxed sections, small caps tabs

// Decorative element toggles. The AI picks which ones to layer on.
export type EditorialDecorElement =
  | 'drop-cap'               // First letter of summary as decorative drop-cap
  | 'pull-quote'             // Pull a quote from experience
  | 'decorative-numerals'    // Big chapter-style numerals next to section titles
  | 'marginalia'             // Margin notes (dates / company names) in the gutter
  | 'rule-ornaments'         // Ornamental ✦ / ◆ on dividers
  | 'kicker-labels'          // Small caps kicker above section titles
  | 'colored-section-titles' // Section titles take secondary/accent color
  | 'first-line-emphasis';   // First sentence of summary in display font + larger

// Color-role policy — controls how many palette colors the renderer actually
// uses on the page. Creative supports multi-color palettes (primary +
// secondary-color + accent), not just one accent on a neutral base. This
// turns the secondaryColor into a real second design color (used for section
// titles, marginalia, decorative numerals) instead of a paper tint.
export type EditorialColorPolicy =
  | 'mono-accent'            // Classic editorial: one accent on neutral
  | 'duotone'                // Primary + accent are both used as design colors
  | 'tritone';               // Primary + secondaryColor + accent — true magazine palette

// ============ v4: Editorial concept-first art direction ============
//
// Mirror of the experimental v4 redesign, adapted for editorial restraint.
// The AI writes a one-sentence concept BEFORE picking other tokens. The
// motif vocabulary is editorial-flavored (Kinfolk / Wallpaper / Frieze)
// rather than experimental's avant-garde (MSCHF / Carson / Kruger).
export type EditorialConceptMotif =
  | 'kinfolk'        // Calm, generous whitespace, warm restraint
  | 'wallpaper'      // Modernist, asymmetric, considered
  | 'gentlewoman'    // Literary, italic, generous, slightly nostalgic
  | 'frieze'         // Gallery-academic, dense, footnoted
  | 'apartamento'    // Warm, slightly off-key, hand-set feel
  | 'monocle'        // Corporate-luxury, italic kickers, dense pages
  | 'cabinet'        // Antiquarian, sepia, marginalia-rich
  | 'tech-review';   // Clean, infographic-adjacent, accent-driven

// ============ v4: Editorial palette rules ============
//
// The AI picks a rule and then invents hex values that satisfy it. Replaces
// the old "pick from a mood pool" approach. Editorial-flavored — none of
// the loud avant-garde palettes from experimental.
export type EditorialPaletteRule =
  | 'ink-and-paper'        // Near-black + cream + one warm accent (Vignelli-quiet)
  | 'kinfolk-calm'         // Bone + dusty greens/blues + warm accent
  | 'literary-tritone'     // Primary + burgundy/oxblood + warm accent
  | 'gallery-restraint'    // Muted, dusty, gallery-poster colors
  | 'ochre-paper'          // Cream paper + ochre + deep ink
  | 'modernist-clash'      // Primary + complementary accent (one tension point)
  | 'tri-warmth'           // Three warm hues (ochre / terracotta / clay)
  | 'tri-cool'             // Three cool hues (forest / teal / slate)
  | 'riso-zine';           // Two saturated hues with print-zine energy (creative-leaning only)

// ============ v4: Body density (editorial-flavored) ============
//
// Unlike experimental's shout/whisper, creative trades on restraint vs
// generosity rather than loudness vs quietness.
export type EditorialBodyDensity =
  | 'whisper'              // Tight tracking + small leading — specimen/archive feel
  | 'normal'               // Standard editorial body
  | 'airy';                // Generous tracking + leading — Kinfolk-spacious

// ============ v4: Asymmetry strength ============
//
// Editorial asymmetry is much more restrained than experimental's. Maxes
// at 'considered' — not 'extreme'.
export type EditorialAsymmetryStrength =
  | 'none'                 // Symmetric, centered
  | 'subtle'               // Slight offsets
  | 'considered';          // Visible asymmetric tension — Wallpaper-modernist

export interface EditorialTokens {
  // Existing primitives
  headerLayout: EditorialHeaderLayout;
  nameTreatment: EditorialNameTreatment;
  accentTreatment: EditorialAccentTreatment;
  sectionTreatment: EditorialSectionTreatment;
  grid: EditorialGrid;
  divider: EditorialDivider;
  typographyScale: EditorialTypographyScale;
  sectionNumbering: boolean;      // Prefix sections with 01, 02, 03
  pullQuoteSource?: string;       // Section name to pull quote from (e.g. 'experience')
  dropCapSection?: string;        // Section name to apply drop-cap (e.g. 'summary')

  // === New (Creative overhaul) ===
  /** High-level composition pick. Drives renderer branching. */
  layoutArchetype?: EditorialLayoutArchetype;
  /** Mono / duotone / tritone — controls how many palette colors are visible. */
  colorPolicy?: EditorialColorPolicy;
  /** Optional second design color (a real hex). When set with colorPolicy =
   *  'tritone' the renderer uses it for marginalia / decorative numerals. */
  secondaryColor?: string;
  /** A small bag of decorative elements the renderer should layer on. Order
   *  doesn't matter — each entry toggles its own treatment. */
  decorElements?: EditorialDecorElement[];

  // === v4: concept-first art direction ===
  /** One-sentence art-direction statement. AI writes this BEFORE picking
   *  other tokens. Everything downstream flows from this concept. */
  conceptStatement?: string;
  /** Controlled-vocab shorthand for the editorial visual world. */
  conceptMotif?: EditorialConceptMotif;

  // === v4: content-driven primitives ===
  /** The actual pull quote text. When set, the renderer uses this instead
   *  of falling back to experience[0].highlights[0]. AI picks the most
   *  meaningful phrase from the candidate's content. */
  pullQuoteText?: string;
  /** Attribution line for the pull quote (e.g. "— Senior Strategist,
   *  Stedelijk"). When unset, the renderer derives from experience[0]. */
  pullQuoteAttribution?: string;
  /** The actual letter to use for drop-cap. Defaults to first letter of
   *  the dropCapSection target. Letting AI pick allows for typographic
   *  moves like using initials or a deliberate consonant. */
  dropCapLetter?: string;
  /** The opening sentence rendered in display font when first-line-emphasis
   *  is active. AI picks the most quotable opener from the candidate's
   *  actual summary. Falls back to the first sentence of summary. */
  ledeText?: string;
  /** A Monocle-style tagline below the candidate's name. 2-6 words
   *  describing the candidate's voice or angle, e.g. "Strategist, writer,
   *  gardener". Rendered as small caps with separators. */
  nameTagline?: string;
  /** 3-7 keywords from the vacancy or candidate's experience that get
   *  accent-color highlights in body text. Same semantics as experimental's
   *  accentKeywords but tuned to editorial color tokens. */
  accentKeywords?: string[];
  /** Custom marginalia text — short phrases (period / company / locale /
   *  pivot moment) that float into the editorial-spread gutter. When
   *  unset, the renderer derives from experience.period. AI can pick
   *  more meaningful labels ("Sabbatical", "Promotion", "Move to Berlin"). */
  marginNoteCopy?: string[];

  // === v4: palette generation ===
  /** Palette-generation rule. Used to bias the AI toward a coherent
   *  editorial palette; the renderer reads it for paletteSaturation defaults. */
  paletteRule?: EditorialPaletteRule;

  // === v4: typography rhythm ===
  /** Continuous heading-to-body ratio. 1.2=modest, 1.6=comfortable,
   *  2.0=poster, 2.5+=editorial-hero. Clamped to [1.0, 3.0]. */
  headingScaleRatio?: number;
  /** Body-text density. */
  bodyDensity?: EditorialBodyDensity;
  /** Strength of asymmetric composition (editorial-tame). */
  asymmetryStrength?: EditorialAsymmetryStrength;
}

// ============ Bold Mode Primitives (experimental level) ============
//
// Compositional primitives for the bold renderer. Canva/Linear/Notion-
// inspired: saturated colors, gradients, iconography, skill bars, colored
// blocks. Orthogonal so any combination renders cleanly. Presence of
// `tokens.bold` switches to the bold renderer pipeline.

export type BoldHeaderLayout =
  | 'hero-band'          // Full-width colored band with name/headline/contact
  | 'split-photo'        // Large photo block + colored block side-by-side
  | 'tiled'              // Header as a grid of colored tiles
  | 'asymmetric-burst';  // Diagonal colored block with content flowing off it

export type BoldSidebarStyle =
  | 'solid-color'        // Primary-color fill
  | 'gradient'           // Primary → accent gradient
  | 'photo-hero'         // Photo-dominant sidebar
  | 'transparent';       // Very light tinted bg

export type BoldSkillStyle =
  | 'bars-gradient'      // Progress bars with gradient fills
  | 'dots-rating'        // 5-dot rating (● ● ● ○ ○)
  | 'icon-tagged'        // Each skill with an icon
  | 'colored-pills';     // Solid colored pill tags

export type BoldPhotoTreatment =
  | 'circle-halo'        // Circle with colored ring around it
  | 'squircle'           // Rounded-square
  | 'color-overlay'      // Photo with color tint overlay
  | 'badge-framed';      // Photo in a colored badge frame

export type BoldAccentShape =
  | 'diagonal-stripe'    // Diagonal accent bands
  | 'angled-corner'      // Angled colored corners on sections
  | 'colored-badge'      // Small colored badges beside titles
  | 'hex-pattern';       // Subtle hexagon background pattern

export type BoldIconTreatment =
  | 'solid-filled'       // Solid icons in accent color
  | 'duotone'            // Two-color icons
  | 'line-with-accent';  // Line icons with accent strokes

export type BoldHeadingStyle =
  | 'oversized-numbered' // Big number + small title
  | 'kicker-bar'         // Kicker label on colored bar above title
  | 'gradient-text'      // Gradient text fill on titles
  | 'bracketed'          // [ SECTION ] brackets
  | 'stacked-caps'       // Title stacked vertically, ENORMOUS caps (Peter Saville)
  | 'overlap-block';     // Title set against a colored block that bleeds past it

export type BoldGradientDirection =
  | 'none'
  | 'linear-vertical'    // Top → bottom
  | 'linear-diagonal'    // 45° diagonal
  | 'radial-burst'       // Radial from one point
  | 'duotone-split'      // Hard split between two colors (riso-style)
  | 'offset-clash';      // Slightly offset contrasting color band

// Art-directed surface texture — layered on top of headers / sidebars /
// main to lift the design out of "clean SaaS" land and into "printed /
// designed / made by someone" territory. All variants are print-safe:
// implemented with SVG data-URLs and repeating gradients, no CSS filter.
export type BoldSurfaceTexture =
  | 'none'
  | 'halftone'           // Screen-printed dot pattern overlay
  | 'riso-grain'         // Subtle noise dots — riso-print feel
  | 'screen-print'       // Slight mis-registered color offset
  | 'stripe-texture';    // Fine repeating diagonal lines

// ============ Top-level Layout Archetype ============
//
// This is the BIG knob for experimental. The archetype radically
// restructures the whole page — sidebar vs no sidebar, where the name
// lives, whether there's a "lead paragraph" block at the top, whether
// content is on a strict grid or a mosaic. Each archetype maps to a
// completely different DOM skeleton in bold.ts. Layered primitives
// (color, texture, headingStyle, etc.) still apply on top.
export type BoldLayoutArchetype =
  | 'sidebar-canva'        // Classic Canva: sidebar + main column (legacy default)
  | 'manifesto'            // Huge typographic opening statement, compressed grid below
  | 'magazine-cover'       // Name as a cover headline, "story" content below
  | 'editorial-inversion'  // Lead paragraph up top, contact pushed to bottom, photo on the right
  | 'brutalist-grid'       // Hard rectilinear N-column grid, blocky bordered cells, no sidebar
  | 'vertical-rail'        // Name as a vertical strip running the full left edge
  | 'mosaic'               // Asymmetric mosaic of colored blocks — no rigid columns
  | 'typographic-poster'   // Type-only protest poster: name fills the upper half, everything else collapses to dense small print
  | 'photo-montage';       // Photo-dominant magazine cover: portrait bleeds across 60% of the page with info overlaid in stacked cards

// How many text columns the main content area uses. The renderer
// clamps this based on archetype (e.g. mosaic ignores it; sidebar-canva
// forces 1). Only fully consumed by manifesto / brutalist-grid.
export type BoldColumnCount = 1 | 2 | 3 | 4;

// Big background numeral / word treatment — a single oversized faded
// element that anchors the page visually. Common in editorial design.
export type BoldBackgroundNumeral =
  | 'none'
  | 'initials'             // Candidate's initials, ghost-sized
  | 'year'                 // Current year or first year of experience
  | 'section-number'       // Per-section big numerals in the bg
  | 'role';                // First word of target role, oversized + faded

// Marginalia / sidenote treatment — small text living in the margins.
// Magazine-y. Adds depth to the layout without stealing focus.
export type BoldMarginaliaStyle =
  | 'none'
  | 'vertical-strip'       // Vertical text on one edge of the page (vertical-rl writing-mode)
  | 'numbered'             // Numbered annotations next to sections
  | 'kicker-callouts';     // Short kicker labels in the side margin

// Palette saturation strategy. Used by the renderer to decide whether
// to deploy 1, 2, or 3+ colors across the page. Lets the AI pick "loud
// monochrome with a single screaming accent" vs "full multi-palette".
export type BoldPaletteSaturation =
  | 'monochrome-plus-one'  // Greyscale page + single accent (Kruger)
  | 'duotone'              // 2 strong colors only, no neutrals
  | 'tri-tone'             // 3 strong colors used in equal weight
  | 'full-palette';        // Use all 5 palette colors freely

// ============ NEW v4: Concept-first art direction ============
//
// The AI writes a single-sentence art-direction statement BEFORE picking
// any tokens. The statement is a short brief — what visual world this CV
// lives in. It primes downstream picks and is logged for debugging. The
// motif is a controlled-vocab shorthand that further biases the renderer.
export type BoldConceptMotif =
  | 'archive'              // Library catalog / index card / specimen sheet
  | 'broadcast'            // News broadcast / breaking-news ticker / dispatch
  | 'manifesto'            // Activist poster / wheat-paste / pamphlet
  | 'gallery'              // Museum poster / exhibition catalog / wall text
  | 'specimen'             // Type specimen / foundry catalogue / wood type
  | 'manuscript'           // Hand-set book / private press / colophon
  | 'protest'              // Photocopy / zine / DIY anti-aesthetic
  | 'editorial';           // Magazine spread / long-form journalism

// ============ NEW v4: Content-driven primitives ============
//
// Where the previous version asked the AI to pick decorative *shapes*, this
// version asks the AI to pick *which content* gets the loud treatment.
// The renderer reads these and elevates the chosen content to art-directed
// scale. The result: two CVs for the same archetype look genuinely
// different because they emphasize different lines / words / numbers.

export type BoldPosterLineSource =
  | 'summary-first-sentence'  // The opening sentence of the summary
  | 'summary-extract'         // A pulled phrase from anywhere in the summary
  | 'role-title'              // The candidate's current or target role
  | 'invented-tagline';       // A short tagline the AI writes for this CV

// How to typeset the candidate's name. The AI picks based on which part of
// the name carries the most cultural weight or rhythm.
export type BoldNameTreatment =
  | 'unified'                 // Treat the whole name as one block
  | 'first-name-dominant'     // First name oversized, surname small caps below
  | 'last-name-dominant'      // Surname oversized, first name small caps above
  | 'stacked'                 // Each name part on its own line, equal scale
  | 'separated-by-rule'       // Names with a horizontal rule between them
  | 'first-letter-massive'    // First letter at display scale, rest at body scale
  | 'inline-with-role';       // Name + role on one line, separated by a divider

// ============ NEW v4: Typography rhythm ============
//
// Replaces the binary `scale` enum with a continuous control over the
// heading-to-body ratio. Combined with bodyDensity + asymmetryStrength
// these three knobs give the AI control over the *rhythm* of the page,
// not just the colors.

export type BoldBodyDensity =
  | 'whisper'                 // Tight tracking + small leading — type specimen feel
  | 'normal'                  // Standard editorial body
  | 'shout';                  // Loose tracking + extra leading — protest poster feel

export type BoldAsymmetryStrength =
  | 'none'                    // Symmetric, centered
  | 'subtle'                  // Slight offsets
  | 'strong'                  // Visible asymmetry — clear left/right tension
  | 'extreme';                // Off-balance to the point of discomfort (Carson)

// ============ NEW v4: Palette generation ============
//
// Instead of picking from a fixed pool of 10 palettes, the AI picks a
// palette *rule* and then fills in the actual hex values. The rule gives
// the renderer enough info to apply paletteSaturation correctly and lets
// the AI invent palettes that the curated pool never thought of.

export type BoldPaletteRule =
  | 'split-complement-clash'  // Primary + two split-complementaries — Toilet Paper energy
  | 'mono-with-scream'        // Near-black + single screaming accent — Kruger / Vignelli
  | 'analog-warm'             // 3 adjacent warm hues (terracotta / mustard / coral)
  | 'analog-cool'             // 3 adjacent cool hues (teal / navy / sage)
  | 'tri-clash'               // 3 mutually-clashing hues spread across the wheel
  | 'duo-riso'                // 2 saturated hues that mis-register beautifully (pink + blue, red + teal)
  | 'paper-and-ink'           // Bone/cream paper + carbon ink + one accent (Vignelli)
  | 'fluorescent-pop'         // Neutral page + one neon hit (Kunsthalle)
  | 'museum-restraint';       // Muted, dusty, gallery-poster colors

export interface BoldTokens {
  headerLayout: BoldHeaderLayout;
  sidebarStyle: BoldSidebarStyle;
  skillStyle: BoldSkillStyle;
  photoTreatment: BoldPhotoTreatment;
  accentShape: BoldAccentShape;
  iconTreatment: BoldIconTreatment;
  headingStyle: BoldHeadingStyle;
  gradientDirection: BoldGradientDirection;
  // Optional so existing documents without it still render cleanly; the
  // renderer treats absence as 'none'. New experimental CVs always fill it.
  surfaceTexture?: BoldSurfaceTexture;

  // ===== New v3 experimental primitives =====
  // All optional so legacy documents render without changes. The renderer
  // treats absence as 'sidebar-canva' / sensible defaults.

  /** The big knob — completely re-organises the page skeleton. */
  layoutArchetype?: BoldLayoutArchetype;

  /** Number of columns in the main content grid (consumed by manifesto /
   *  brutalist-grid). Ignored by sidebar-canva. */
  columnCount?: BoldColumnCount;

  /** Optional huge background numeral or word for visual anchoring. */
  backgroundNumeral?: BoldBackgroundNumeral;

  /** Marginalia / sidenote treatment in the page margins. */
  marginalia?: BoldMarginaliaStyle;

  /** Palette saturation strategy — controls how many palette colors
   *  the renderer deploys across the page. */
  paletteSaturation?: BoldPaletteSaturation;

  /** When true, the summary/about section is rendered as a manifesto-
   *  style oversized opening statement (huge type, single block). */
  manifestoOpener?: boolean;

  // ===== New v4 experimental primitives — concept-first + content-driven =====
  //
  // All optional. Legacy CVs without these render identically to v3. The
  // expert always fills them for new generations.

  /** Single-sentence art-direction statement the AI writes BEFORE picking
   *  tokens. Example: "Riso-printed dispatch from a designer whose career
   *  reads like a wheat-paste poster — loud, hand-set, urgent." Logged
   *  for debugging, optionally rendered as a hidden comment in the HTML. */
  conceptStatement?: string;

  /** Controlled-vocab shorthand for the concept. Biases the renderer
   *  toward a specific visual world independent of the archetype. */
  conceptMotif?: BoldConceptMotif;

  /** The single line of copy that becomes oversized poster-scale type
   *  (in manifesto / magazine-cover / editorial-inversion / typographic-
   *  poster archetypes). The AI picks this from the candidate's actual
   *  content — it should read meaningfully, not be generic. */
  posterLine?: string;

  /** Tag for where posterLine came from. Helps the renderer decide where
   *  to render it (top of page vs replacing the summary block). */
  posterLineSource?: BoldPosterLineSource;

  /** 3-7 keywords from the job vacancy or candidate's experience that
   *  should get accent-color highlights wherever they appear in body text.
   *  Case-insensitive substring match. The AI picks meaningful keywords,
   *  not stop-words. */
  accentKeywords?: string[];

  /** When backgroundNumeral != 'none', this is the actual content the
   *  renderer should use. If unset, the renderer derives from the field
   *  (e.g. backgroundNumeral='year' → "2026"). Letting the AI supply the
   *  literal value lets it pick the most meaningful anchor — "8" for "8
   *  years of experience", a specific year, a name fragment, etc. */
  heroNumeralValue?: string;

  /** How the candidate's name is typeset. */
  nameTreatment?: BoldNameTreatment;

  /** Continuous heading-to-body ratio. 1.2 = modest, 1.6 = comfortable,
   *  2.0 = poster, 3.0 = brutalist. Clamped to [1.0, 4.0] by normalize. */
  headingScaleRatio?: number;

  /** Body-text density. Affects line-height + letter-spacing. */
  bodyDensity?: BoldBodyDensity;

  /** Strength of asymmetric composition. */
  asymmetryStrength?: BoldAsymmetryStrength;

  /** Palette-generation rule. Used in the prompt to bias the AI toward a
   *  coherent palette; also stored on the token so the renderer can apply
   *  the rule-specific paletteSaturation defaults. */
  paletteRule?: BoldPaletteRule;
}

// Custom decoration element (for experimental mode)
export interface CustomDecoration {
  name: string;           // e.g., "code-bracket", "chart-bar", "lightbulb"
  description: string;    // What this shape represents visually
  placement: 'corner' | 'edge' | 'scattered';  // Where to place
  size: 'small' | 'medium' | 'large';
  quantity: number;       // How many of this shape (1-5)
}

// ============ Design Token Colors ============

export interface DesignTokenColors {
  primary: string;    // Name, headings - MUST be used
  secondary: string;  // Subtle backgrounds - MUST be used
  accent: string;     // Links, highlights, CTAs - MUST be used
  text: string;       // Body text color - MUST be used
  muted: string;      // Secondary text (dates, labels) - MUST be used
}

// ============ Main Design Tokens Interface ============

/**
 * CVDesignTokens - The complete styling specification generated by AI
 *
 * ~20 properties vs 150+ in the old system. Every single property
 * is actually used in the HTML output.
 */
export interface CVDesignTokens {
  // === Metadata ===
  styleName: string;        // e.g., "Executive Professional" or "Creative Tech"
  styleRationale: string;   // Why this style fits the profile/job
  industryFit: string;      // e.g., "technology", "finance", "creative"

  // === Theme Selection ===
  themeBase: ThemeBase;     // Base theme to build upon

  // === Color System (5 colors - ALL used) ===
  colors: DesignTokenColors;

  // === Typography ===
  fontPairing: FontPairing;
  scale: TypeScale;         // Overall type scale (affects all sizes)

  // === Layout ===
  spacing: SpacingScale;    // Overall spacing density

  // === Component Variants ===
  headerVariant: HeaderVariant;
  sectionStyle: SectionStyle;
  skillsDisplay: SkillsDisplay;
  experienceDescriptionFormat: ExperienceDescriptionFormat;  // Bullet points vs paragraph text for experience descriptions
  contactLayout: ContactLayout;  // How contact info is laid out in the header
  headerGradient: HeaderGradient;  // Subtle gradient effect on header background

  // === Feature Flags ===
  showPhoto: boolean;
  useIcons: boolean;        // Show icons in contact/sections
  roundedCorners: boolean;  // Use rounded corners on cards/tags
  headerFullBleed: boolean; // Header extends to page edges (true) or has margins (false)

  // === Decorations ===
  decorations: DecorationIntensity;  // Background SVG decorations (none for professional, abundant for creative)
  decorationTheme?: DecorationTheme; // Industry-based theme for decorations (creative mode)
  customDecorations?: CustomDecoration[]; // LLM-generated custom decorations (experimental mode only)

  // === Section Order ===
  sectionOrder: string[];   // e.g., ['summary', 'experience', 'education', 'skills', 'languages', 'certifications']

  // === Extended Styling (optional, new tokens for more variety) ===
  layout?: CVLayout;                // Page layout: single-column (default), sidebar-left, sidebar-right
  sidebarSections?: string[];       // Which sections go in sidebar (default: skills, languages, certifications)
  accentStyle?: AccentStyle;        // Summary styling: none, border-left, background, quote
  borderRadius?: BorderRadiusScale; // Overrides roundedCorners when present: none, small, medium, large, pill
  pageBackground?: string;          // Page background color (hex), must be very light
  nameStyle?: NameStyle;            // Name styling: normal, uppercase, extra-bold
  skillTagStyle?: SkillTagStyle;    // Skill tag variant: filled, outlined, pill

  // === Editorial Mode (creative creativity level only) ===
  // Presence of `editorial` switches the renderer to the editorial/magazine
  // layout pipeline. The AI fills this entire object for creative mode —
  // the fields are orthogonal so any combination renders cleanly.
  editorial?: EditorialTokens;

  // === Bold Mode (experimental creativity level only) ===
  // Presence of `bold` switches the renderer to the bold/Canva-style
  // pipeline. The AI fills this entire object for experimental mode.
  bold?: BoldTokens;
}

// ============ Style Generation Request ============

export interface GenerateDesignTokensRequest {
  linkedInSummary: string;
  jobVacancy: {
    title: string;
    company: string | null;
    industry?: string;
    keywords: string[];
  } | null;
  userPreferences?: string;
  creativityLevel: StyleCreativityLevel;
}

// ============ Style Generation Response ============

export interface GenerateDesignTokensResponse {
  success: boolean;
  tokens?: CVDesignTokens;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// ============ Template Mapping Types ============

/**
 * Maps font pairings to actual Google Fonts URLs and CSS font-family values
 */
export interface FontPairingConfig {
  heading: {
    family: string;     // CSS font-family
    googleUrl: string;  // Google Fonts URL
    weights: number[];  // Available weights
  };
  body: {
    family: string;
    googleUrl: string;
    weights: number[];
  };
}

/**
 * Maps type scales to actual pt sizes
 */
export interface TypeScaleConfig {
  name: number;        // Name font size in pt
  heading: number;     // Section heading size in pt
  subheading: number;  // Job title, degree size in pt
  body: number;        // Body text size in pt
  small: number;       // Dates, labels size in pt
  lineHeight: number;  // Line height multiplier
}

/**
 * Maps spacing scales to actual CSS values
 */
export interface SpacingScaleConfig {
  section: string;     // Space between sections
  item: string;        // Space between items within section
  element: string;     // Space between elements within item
  pageMargin: string;  // Page margin for PDF
}

// ============ Conversion Utility Types ============

/**
 * Convert new CVDesignTokens to legacy CVStyleConfig for backward compatibility
 * during the migration period
 */
export interface LegacyStyleConfigAdapter {
  toStyleConfig: (tokens: CVDesignTokens) => import('./index').CVStyleConfig;
  fromStyleConfig: (config: import('./index').CVStyleConfig) => CVDesignTokens;
}
