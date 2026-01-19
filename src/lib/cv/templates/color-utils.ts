/**
 * Color Utility Functions
 *
 * Provides color manipulation and contrast checking utilities
 * to ensure CV colors are readable and accessible.
 */

/**
 * Parse hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculate relative luminance per WCAG 2.0
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const { r, g, b } = rgb;

  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * WCAG 2.0 contrast ratio: https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 *
 * Returns a value between 1:1 (no contrast) and 21:1 (max contrast)
 * - 4.5:1 is minimum for normal text (AA)
 * - 3:1 is minimum for large text (AA) and headings
 * - 7:1 is recommended for enhanced readability (AAA)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color is "light" (luminance > 0.5)
 */
export function isLightColor(hex: string): boolean {
  return getRelativeLuminance(hex) > 0.5;
}

/**
 * Check if a color is "dark" (luminance < 0.3)
 */
export function isDarkColor(hex: string): boolean {
  return getRelativeLuminance(hex) < 0.3;
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 - percent / 100;
  return rgbToHex(
    Math.round(rgb.r * factor),
    Math.round(rgb.g * factor),
    Math.round(rgb.b * factor)
  );
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  return rgbToHex(
    Math.round(rgb.r + (255 - rgb.r) * factor),
    Math.round(rgb.g + (255 - rgb.g) * factor),
    Math.round(rgb.b + (255 - rgb.b) * factor)
  );
}

/**
 * Get a readable text color (black or white) for a given background
 */
export function getReadableTextColor(bgHex: string): string {
  return isLightColor(bgHex) ? '#1a202c' : '#ffffff';
}

/**
 * Ensure text has sufficient contrast against background
 * Returns the original text color if contrast is sufficient,
 * otherwise returns an adjusted color
 */
export function ensureContrast(
  textColor: string,
  bgColor: string,
  minRatio: number = 4.5
): string {
  const ratio = getContrastRatio(textColor, bgColor);

  if (ratio >= minRatio) {
    return textColor;
  }

  // If contrast is insufficient, darken or lighten based on background
  const bgIsLight = isLightColor(bgColor);

  if (bgIsLight) {
    // Need darker text on light background
    let adjusted = textColor;
    for (let i = 10; i <= 90; i += 10) {
      adjusted = darkenColor(textColor, i);
      if (getContrastRatio(adjusted, bgColor) >= minRatio) {
        return adjusted;
      }
    }
    // Fallback to very dark gray
    return '#1a202c';
  } else {
    // Need lighter text on dark background
    let adjusted = textColor;
    for (let i = 10; i <= 90; i += 10) {
      adjusted = lightenColor(textColor, i);
      if (getContrastRatio(adjusted, bgColor) >= minRatio) {
        return adjusted;
      }
    }
    // Fallback to white
    return '#ffffff';
  }
}

/**
 * Validate and fix color contrast issues in CV design tokens
 */
export interface ColorValidationResult {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    muted: string;
  };
  fixes: string[];
}

export function validateAndFixColorContrast(
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    muted: string;
  },
  headerVariant: string
): ColorValidationResult {
  const fixes: string[] = [];
  const result = { ...colors };

  // For banner headers, primary is the background and needs white text
  if (headerVariant === 'banner') {
    // Primary should be dark enough for white text
    const primaryContrast = getContrastRatio(result.primary, '#ffffff');
    if (primaryContrast < 4.5) {
      const darkened = darkenColor(result.primary, 40);
      if (getContrastRatio(darkened, '#ffffff') >= 4.5) {
        fixes.push(`Darkened banner background from ${result.primary} to ${darkened} for contrast`);
        result.primary = darkened;
      } else {
        // Fallback to a known good dark color
        fixes.push(`Banner background ${result.primary} too light, using fallback #1a365d`);
        result.primary = '#1a365d';
      }
    }
  } else {
    // For non-banner headers, primary text needs contrast on white
    const primaryOnWhite = getContrastRatio(result.primary, '#ffffff');
    if (primaryOnWhite < 4.5) {
      result.primary = ensureContrast(result.primary, '#ffffff', 4.5);
      fixes.push(`Adjusted primary color for readability on white`);
    }
  }

  // Text color must have good contrast on white/secondary
  const textOnWhite = getContrastRatio(result.text, '#ffffff');
  if (textOnWhite < 4.5) {
    result.text = ensureContrast(result.text, '#ffffff', 4.5);
    fixes.push(`Adjusted text color from ${colors.text} to ${result.text}`);
  }

  // Muted color needs to be readable (allow slightly lower contrast 3:1)
  const mutedOnWhite = getContrastRatio(result.muted, '#ffffff');
  if (mutedOnWhite < 3) {
    result.muted = ensureContrast(result.muted, '#ffffff', 3);
    fixes.push(`Adjusted muted color for minimum readability`);
  }

  // Accent on white should have decent contrast (at least 3:1 for links)
  const accentOnWhite = getContrastRatio(result.accent, '#ffffff');
  if (accentOnWhite < 3) {
    result.accent = ensureContrast(result.accent, '#ffffff', 3);
    fixes.push(`Adjusted accent color for link visibility`);
  }

  // Secondary (background) should be light
  if (!isLightColor(result.secondary)) {
    result.secondary = lightenColor(result.secondary, 80);
    fixes.push(`Lightened secondary background color`);
  }

  return { colors: result, fixes };
}
