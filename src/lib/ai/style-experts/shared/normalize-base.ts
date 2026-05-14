/**
 * Common post-processing steps applied across all style experts.
 *
 * An expert's normalize() runs:
 *   1. Merge AI output on top of level-specific fallback (expert-specific)
 *   2. Level-specific validators (expert-specific)
 *   3. applyBaseValidations()  ← common: colors, section order, contrast, bg
 *   4. applyRendererTokens()   ← common: set/clear editorial / bold
 *   5. Variation rotation      ← expert-specific
 */

import type { CVDesignTokens } from '@/types/design-tokens';
import type { StyleCreativityLevel } from '@/types';
import { validateAndFixColorContrast } from '@/lib/cv/templates/color-utils';

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Relative luminance (WCAG). 0 = black, 1 = white. Used to gate page
 * background colors so they stay near-white.
 */
export function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Clamp every color field to a valid hex code, falling back to safe defaults.
 */
export function validateColors(colors: CVDesignTokens['colors']): CVDesignTokens['colors'] {
  const defaults = {
    primary: '#1a365d',
    secondary: '#f7fafc',
    accent: '#2b6cb0',
    text: '#2d3748',
    muted: '#718096',
  };
  return {
    primary: HEX_REGEX.test(colors.primary) ? colors.primary : defaults.primary,
    secondary: HEX_REGEX.test(colors.secondary) ? colors.secondary : defaults.secondary,
    accent: HEX_REGEX.test(colors.accent) ? colors.accent : defaults.accent,
    text: HEX_REGEX.test(colors.text) ? colors.text : defaults.text,
    muted: HEX_REGEX.test(colors.muted) ? colors.muted : defaults.muted,
  };
}

/**
 * Make sure sectionOrder contains every standard section exactly once,
 * preserving user-specified order at the front.
 */
export function validateSectionOrder(order: string[] | undefined): string[] {
  const allSections = ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications', 'interests'];
  const safeOrder = (order || []).filter(s => allSections.includes(s));
  for (const section of allSections) {
    if (!safeOrder.includes(section)) safeOrder.push(section);
  }
  return safeOrder;
}

/**
 * Reject too-dark page-background colors (would clash with black text).
 * Returns undefined for invalid/too-dark values so the renderer falls back.
 */
export function validatePageBackground(bg: string | undefined, logTag: string): string | undefined {
  if (!bg) return undefined;
  if (!HEX_REGEX.test(bg)) return undefined;
  const luminance = getRelativeLuminance(bg);
  if (luminance < 0.85) {
    console.log(`[${logTag}] pageBackground ${bg} too dark (luminance ${luminance.toFixed(2)}), dropping`);
    return undefined;
  }
  return bg;
}

/**
 * Apply the validators every expert needs: color hex, contrast, section order,
 * sidebar-section safety, page background luminance.
 */
export function applyBaseValidations(tokens: CVDesignTokens, logTag: string): void {
  // Colors must be valid hex; contrast must be legible against the header
  tokens.colors = validateColors(tokens.colors);
  const contrastResult = validateAndFixColorContrast(tokens.colors, tokens.headerVariant);
  tokens.colors = contrastResult.colors;
  if (contrastResult.fixes.length > 0) {
    console.log(`[${logTag}] Color contrast fixes applied:`, contrastResult.fixes);
  }

  // Section order must always be a complete list
  tokens.sectionOrder = validateSectionOrder(tokens.sectionOrder);

  // Page background: stay near-white or drop
  tokens.pageBackground = validatePageBackground(tokens.pageBackground, logTag);

  // Heavy sections should never live in a narrow sidebar
  if (tokens.sidebarSections && tokens.sidebarSections.length > 0) {
    const heavy = ['experience', 'summary', 'education'];
    const filtered = tokens.sidebarSections.filter(s => !heavy.includes(s));
    if (filtered.length !== tokens.sidebarSections.length) {
      console.log(`[${logTag}] Removed heavy sections from sidebar`);
      tokens.sidebarSections = filtered.length > 0 ? filtered : ['skills', 'languages', 'certifications'];
    }
  }

  // Sidebar layout + spacious/large type = too cramped in main column
  const hasSidebar = tokens.layout === 'sidebar-left' || tokens.layout === 'sidebar-right';
  if (hasSidebar) {
    if (tokens.spacing === 'spacious') tokens.spacing = 'comfortable';
    if (tokens.scale === 'large') tokens.scale = 'medium';
  }

  // Full-bleed header + sidebar = margin conflicts
  if (tokens.headerFullBleed && hasSidebar) {
    tokens.headerFullBleed = false;
  }
}

/**
 * Clear renderer-specific tokens belonging to OTHER levels so they don't
 * leak across modes (editorial on an experimental CV, or bold on a creative).
 */
export function clearOtherRendererTokens(
  tokens: CVDesignTokens,
  keep: 'editorial' | 'bold' | 'none',
): void {
  if (keep !== 'editorial') tokens.editorial = undefined;
  if (keep !== 'bold') tokens.bold = undefined;
}

/**
 * Map industry name to a decoration theme for creative/experimental fallbacks.
 */
export type DecorationTheme = 'geometric' | 'organic' | 'minimal' | 'tech' | 'creative' | 'abstract';

export function industryToDecorationTheme(industry: string | undefined, creativeDefault: DecorationTheme): DecorationTheme {
  const map: Record<string, DecorationTheme> = {
    technology: 'tech',
    finance: 'minimal',
    creative: 'creative',
    healthcare: 'organic',
    consulting: 'minimal',
  };
  return map[industry || ''] || creativeDefault;
}

/**
 * Re-export so experts can reference the same enum.
 */
export type { StyleCreativityLevel };
