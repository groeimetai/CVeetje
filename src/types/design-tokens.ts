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

export interface EditorialTokens {
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
