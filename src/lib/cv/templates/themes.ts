/**
 * Theme Definitions and Configuration Maps
 *
 * Provides mappings from design tokens to actual CSS values,
 * including font configurations, spacing scales, and theme defaults.
 */

import type {
  FontPairing,
  TypeScale,
  SpacingScale,
  ThemeBase,
  FontPairingConfig,
  TypeScaleConfig,
  SpacingScaleConfig,
  BorderRadiusScale,
} from '@/types/design-tokens';

// ============ Font Pairing Configurations ============

export const fontPairings: Record<FontPairing, FontPairingConfig> = {
  'inter-inter': {
    heading: {
      family: "'Inter', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      weights: [400, 500, 600, 700],
    },
    body: {
      family: "'Inter', sans-serif",
      googleUrl: '', // Same as heading
      weights: [400, 500],
    },
  },
  'playfair-inter': {
    heading: {
      family: "'Playfair Display', serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
      weights: [400, 600, 700],
    },
    body: {
      family: "'Inter', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap',
      weights: [400, 500],
    },
  },
  'montserrat-open-sans': {
    heading: {
      family: "'Montserrat', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap',
      weights: [500, 600, 700],
    },
    body: {
      family: "'Open Sans', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap',
      weights: [400, 600],
    },
  },
  'raleway-lato': {
    heading: {
      family: "'Raleway', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Raleway:wght@500;600;700&display=swap',
      weights: [500, 600, 700],
    },
    body: {
      family: "'Lato', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
      weights: [400, 700],
    },
  },
  'poppins-nunito': {
    heading: {
      family: "'Poppins', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap',
      weights: [500, 600, 700],
    },
    body: {
      family: "'Nunito', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600&display=swap',
      weights: [400, 600],
    },
  },
  'roboto-roboto': {
    heading: {
      family: "'Roboto', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
      weights: [400, 500, 700],
    },
    body: {
      family: "'Roboto', sans-serif",
      googleUrl: '', // Same as heading
      weights: [400, 500],
    },
  },
  'lato-lato': {
    heading: {
      family: "'Lato', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap',
      weights: [400, 700, 900],
    },
    body: {
      family: "'Lato', sans-serif",
      googleUrl: '', // Same as heading
      weights: [400, 700],
    },
  },
  'merriweather-source-sans': {
    heading: {
      family: "'Merriweather', serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
      weights: [400, 700],
    },
    body: {
      family: "'Source Sans 3', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap',
      weights: [400, 600],
    },
  },
  'oswald-source-sans': {
    heading: {
      family: "'Oswald', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap',
      weights: [400, 500, 600, 700],
    },
    body: {
      family: "'Source Sans 3', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap',
      weights: [400, 600],
    },
  },
  'dm-serif-dm-sans': {
    heading: {
      family: "'DM Serif Display', serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
      weights: [400],
    },
    body: {
      family: "'DM Sans', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
      weights: [400, 500, 700],
    },
  },
  'space-grotesk-work-sans': {
    heading: {
      family: "'Space Grotesk', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
      weights: [400, 500, 600, 700],
    },
    body: {
      family: "'Work Sans', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600&display=swap',
      weights: [400, 500, 600],
    },
  },
  'libre-baskerville-source-sans': {
    heading: {
      family: "'Libre Baskerville', serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap',
      weights: [400, 700],
    },
    body: {
      family: "'Source Sans 3', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap',
      weights: [400, 600],
    },
  },
};

// ============ Type Scale Configurations ============

export const typeScales: Record<TypeScale, TypeScaleConfig> = {
  small: {
    name: 24,        // Smaller name for dense layouts
    heading: 11,
    subheading: 10,
    body: 9,
    small: 8,
    lineHeight: 1.4,
  },
  medium: {
    name: 28,        // Standard name size
    heading: 13,
    subheading: 11,
    body: 10,
    small: 9,
    lineHeight: 1.5,
  },
  large: {
    name: 32,        // Larger name for impact
    heading: 14,
    subheading: 12,
    body: 11,
    small: 10,
    lineHeight: 1.6,
  },
};

// ============ Spacing Scale Configurations ============

export const spacingScales: Record<SpacingScale, SpacingScaleConfig> = {
  compact: {
    section: '16px',
    item: '10px',
    element: '4px',
    pageMargin: '15mm',
  },
  comfortable: {
    section: '20px',
    item: '12px',
    element: '6px',
    pageMargin: '20mm',
  },
  spacious: {
    section: '28px',
    item: '16px',
    element: '8px',
    pageMargin: '25mm',
  },
};

// ============ Theme Base Defaults ============

/**
 * Default configurations for each theme base.
 * These provide sensible starting points that the LLM can customize.
 */
export interface ThemeDefaults {
  fontPairing: FontPairing;
  headerVariant: 'simple' | 'accented' | 'banner' | 'split';
  sectionStyle: 'clean' | 'underlined' | 'boxed' | 'timeline';
  skillsDisplay: 'tags' | 'list' | 'compact';
  useIcons: boolean;
  roundedCorners: boolean;
  suggestedColors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    muted: string;
  };
}

export const themeDefaults: Record<ThemeBase, ThemeDefaults> = {
  professional: {
    fontPairing: 'inter-inter',
    headerVariant: 'simple',
    sectionStyle: 'underlined',
    skillsDisplay: 'tags',
    useIcons: false,
    roundedCorners: true,
    suggestedColors: {
      primary: '#1a365d',    // Deep navy
      secondary: '#f7fafc',  // Light gray
      accent: '#2b6cb0',     // Professional blue
      text: '#2d3748',       // Dark gray
      muted: '#718096',      // Medium gray
    },
  },
  modern: {
    fontPairing: 'montserrat-open-sans',
    headerVariant: 'accented',
    sectionStyle: 'clean',
    skillsDisplay: 'tags',
    useIcons: true,
    roundedCorners: true,
    suggestedColors: {
      primary: '#111827',    // Near black
      secondary: '#f3f4f6',  // Light gray
      accent: '#6366f1',     // Indigo
      text: '#374151',       // Gray
      muted: '#6b7280',      // Medium gray
    },
  },
  creative: {
    fontPairing: 'poppins-nunito',
    headerVariant: 'banner',
    sectionStyle: 'boxed',
    skillsDisplay: 'tags',
    useIcons: true,
    roundedCorners: true,
    suggestedColors: {
      primary: '#7c3aed',    // Purple
      secondary: '#faf5ff',  // Light purple
      accent: '#ec4899',     // Pink
      text: '#1f2937',       // Dark gray
      muted: '#6b7280',      // Gray
    },
  },
  minimal: {
    fontPairing: 'lato-lato',
    headerVariant: 'simple',
    sectionStyle: 'clean',
    skillsDisplay: 'compact',
    useIcons: false,
    roundedCorners: false,
    suggestedColors: {
      primary: '#000000',    // Pure black
      secondary: '#ffffff',  // White
      accent: '#000000',     // Black accent
      text: '#333333',       // Dark text
      muted: '#888888',      // Gray
    },
  },
  bold: {
    fontPairing: 'raleway-lato',
    headerVariant: 'banner',
    sectionStyle: 'timeline',
    skillsDisplay: 'list',
    useIcons: true,
    roundedCorners: true,
    suggestedColors: {
      primary: '#dc2626',    // Red
      secondary: '#fef2f2',  // Light red
      accent: '#f97316',     // Orange
      text: '#1f2937',       // Dark
      muted: '#6b7280',      // Gray
    },
  },
};

// ============ Helper Functions ============

/**
 * Get Google Fonts URL(s) for a font pairing
 */
export function getFontUrls(pairing: FontPairing): string[] {
  const config = fontPairings[pairing];
  const urls: string[] = [];

  if (config.heading.googleUrl) {
    urls.push(config.heading.googleUrl);
  }
  if (config.body.googleUrl && config.body.googleUrl !== config.heading.googleUrl) {
    urls.push(config.body.googleUrl);
  }

  return urls;
}

/**
 * Generate CSS for a font pairing
 */
export function getFontPairingCSS(pairing: FontPairing): string {
  const config = fontPairings[pairing];
  return `
    --font-heading: ${config.heading.family};
    --font-body: ${config.body.family};
  `;
}

/**
 * Generate CSS for a type scale
 */
export function getTypeScaleCSS(scale: TypeScale): string {
  const config = typeScales[scale];
  return `
    --size-name: ${config.name}pt;
    --size-heading: ${config.heading}pt;
    --size-subheading: ${config.subheading}pt;
    --size-body: ${config.body}pt;
    --size-small: ${config.small}pt;
    --line-height: ${config.lineHeight};
  `;
}

/**
 * Generate CSS for a spacing scale
 */
export function getSpacingScaleCSS(scale: SpacingScale): string {
  const config = spacingScales[scale];
  return `
    --space-section: ${config.section};
    --space-item: ${config.item};
    --space-element: ${config.element};
    --space-page: ${config.pageMargin};
  `;
}

/**
 * Generate CSS variables for colors
 */
export function getColorsCSS(colors: {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
}): string {
  // Calculate border color from secondary
  const borderColor = adjustColorBrightness(colors.secondary, -10);

  return `
    --color-primary: ${colors.primary};
    --color-secondary: ${colors.secondary};
    --color-accent: ${colors.accent};
    --color-text: ${colors.text};
    --color-muted: ${colors.muted};
    --color-border: ${borderColor};
    --color-white: #ffffff;
  `;
}

/**
 * Adjust color brightness (simple implementation)
 */
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Adjust brightness
  const adjust = (value: number) => {
    const adjusted = Math.round(value + (255 * percent) / 100);
    return Math.max(0, Math.min(255, adjusted));
  };

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

// ============ Border Radius Scale Configurations ============

export const borderRadiusScales: Record<BorderRadiusScale, { radius: string; radiusLarge: string }> = {
  none: { radius: '0', radiusLarge: '0' },
  small: { radius: '4px', radiusLarge: '8px' },
  medium: { radius: '8px', radiusLarge: '12px' },
  large: { radius: '12px', radiusLarge: '16px' },
  pill: { radius: '999px', radiusLarge: '999px' },
};

/**
 * Generate border radius CSS based on roundedCorners flag or BorderRadiusScale
 */
export function getBorderRadiusCSS(rounded: boolean, scale?: BorderRadiusScale): string {
  if (scale) {
    const config = borderRadiusScales[scale];
    return `--radius: ${config.radius}; --radius-large: ${config.radiusLarge};`;
  }
  return rounded
    ? `--radius: 4px; --radius-large: 8px;`
    : `--radius: 0; --radius-large: 0;`;
}

// ============ Creativity Level Constraints ============

/**
 * Which options are available at each creativity level.
 * Conservative = limited, safe options
 * Experimental = all options available
 */
export const creativityConstraints = {
  conservative: {
    allowedThemes: ['professional', 'minimal'] as ThemeBase[],
    allowedFontPairings: ['inter-inter', 'roboto-roboto', 'lato-lato'] as FontPairing[],
    allowedHeaderVariants: ['simple', 'accented'] as const,
    allowedSectionStyles: ['clean', 'underlined'] as const,
    allowedDecorations: ['none'] as const,
    defaultDecorations: 'none' as const,
    allowBanner: false,
    allowTimeline: false,
    allowedLayouts: ['single-column'] as const,
    allowedBorderRadius: ['none', 'small'] as const,
    allowedAccentStyles: ['none'] as const,
    allowedNameStyles: ['normal'] as const,
    allowedSkillTagStyles: ['filled'] as const,
  },
  balanced: {
    allowedThemes: ['professional', 'modern', 'minimal'] as ThemeBase[],
    allowedFontPairings: ['inter-inter', 'montserrat-open-sans', 'roboto-roboto', 'lato-lato', 'raleway-lato'] as FontPairing[],
    allowedHeaderVariants: ['simple', 'accented', 'split'] as const,
    allowedSectionStyles: ['clean', 'underlined', 'boxed', 'accent-left'] as const,
    allowedDecorations: ['none', 'minimal'] as const,
    defaultDecorations: 'minimal' as const,
    allowBanner: false,
    allowTimeline: true,
    allowedLayouts: ['single-column'] as const,
    allowedBorderRadius: ['none', 'small', 'medium'] as const,
    allowedAccentStyles: ['none', 'border-left'] as const,
    allowedNameStyles: ['normal', 'uppercase'] as const,
    allowedSkillTagStyles: ['filled', 'outlined'] as const,
  },
  creative: {
    allowedThemes: ['professional', 'modern', 'creative', 'minimal'] as ThemeBase[],
    allowedFontPairings: [
      'inter-inter', 'playfair-inter', 'montserrat-open-sans',
      'raleway-lato', 'poppins-nunito', 'roboto-roboto', 'lato-lato',
      'oswald-source-sans', 'dm-serif-dm-sans', 'space-grotesk-work-sans', 'libre-baskerville-source-sans',
    ] as FontPairing[],
    allowedHeaderVariants: ['simple', 'accented', 'banner', 'split'] as const,
    allowedSectionStyles: ['clean', 'underlined', 'boxed', 'timeline', 'accent-left', 'card'] as const,
    allowedDecorations: ['none', 'minimal', 'moderate'] as const,
    defaultDecorations: 'moderate' as const,
    allowBanner: true,
    allowTimeline: true,
    allowedLayouts: ['single-column'] as const,
    allowedBorderRadius: ['none', 'small', 'medium', 'large', 'pill'] as const,
    allowedAccentStyles: ['none', 'border-left', 'background', 'quote'] as const,
    allowedNameStyles: ['normal', 'uppercase', 'extra-bold'] as const,
    allowedSkillTagStyles: ['filled', 'outlined', 'pill'] as const,
  },
  experimental: {
    allowedThemes: ['professional', 'modern', 'creative', 'minimal', 'bold'] as ThemeBase[],
    allowedFontPairings: [
      'inter-inter', 'playfair-inter', 'montserrat-open-sans',
      'raleway-lato', 'poppins-nunito', 'roboto-roboto', 'lato-lato',
      'merriweather-source-sans', 'oswald-source-sans', 'dm-serif-dm-sans',
      'space-grotesk-work-sans', 'libre-baskerville-source-sans',
    ] as FontPairing[],
    allowedHeaderVariants: ['simple', 'accented', 'banner', 'split'] as const,
    allowedSectionStyles: ['clean', 'underlined', 'boxed', 'timeline', 'accent-left', 'card'] as const,
    allowedDecorations: ['none', 'minimal', 'moderate', 'abundant'] as const,
    defaultDecorations: 'abundant' as const,
    allowBanner: true,
    allowTimeline: true,
    allowedLayouts: ['single-column', 'sidebar-left', 'sidebar-right'] as const,
    allowedBorderRadius: ['none', 'small', 'medium', 'large', 'pill'] as const,
    allowedAccentStyles: ['none', 'border-left', 'background', 'quote'] as const,
    allowedNameStyles: ['normal', 'uppercase', 'extra-bold'] as const,
    allowedSkillTagStyles: ['filled', 'outlined', 'pill'] as const,
  },
};

export type CreativityLevel = keyof typeof creativityConstraints;
