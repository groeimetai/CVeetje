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
  | 'manuscript-mono';       // Centered manuscript with optical proportions, no sidebar

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
  | 'mosaic';              // Asymmetric mosaic of colored blocks — no rigid columns

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
