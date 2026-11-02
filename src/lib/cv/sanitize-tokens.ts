import type { CVElementOverrides } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { sanitizeCssColor } from '@/lib/security/html-escape';

/**
 * Defence-in-depth voor de legacy (v1) HTML-renderers.
 *
 * Design tokens en element-overrides kunnen uit de request-body
 * (`/api/cv/[id]/pdf`) of uit een door de gebruiker beschreven Firestore-doc
 * komen, en de legacy renderers interpoleren ze ongeëscaped in CSS en
 * `style="…"`-attributen. Een waarde als `red"><iframe src=…>` zou dan HTML
 * injecteren in de server-side Puppeteer-render of de preview-iframe.
 *
 * - Kleurvelden (`colors.*`, `colorOverride`, `backgroundOverride`) moeten een
 *   geldige CSS-kleur zijn, anders fallback.
 * - Alle overige strings in de tokens worden ontdaan van tekens waarmee je uit
 *   een CSS-waarde, attribuut of `<style>`-blok kunt breken.
 */

const UNSAFE_CHARS = /[<>{}"`;\\]/g;
const UNSAFE_CSS_FN = /(url|expression|image-set|@import)\s*\(/gi;

function cleanString(v: string): string {
  return v.replace(UNSAFE_CHARS, '').replace(UNSAFE_CSS_FN, '').slice(0, 200);
}

// Vrije-tekst velden (door AI geschreven quotes/statements) worden door de
// renderers als tekst getoond; daar strippen we alleen `<`/`>` zodat leestekens
// als `"` en `;` behouden blijven.
const FREE_TEXT_KEYS = new Set([
  'pullQuoteText',
  'pullQuoteAttribution',
  'conceptStatement',
  'posterLine',
  'accentKeywords',
  'heroNumeralValue',
]);

function cleanFreeText(v: unknown): unknown {
  if (typeof v === 'string') return v.replace(/[<>]/g, '').slice(0, 500);
  if (Array.isArray(v)) return v.map(cleanFreeText);
  return v;
}

function deepClean(value: unknown, depth = 0): unknown {
  if (depth > 6) return undefined;
  if (typeof value === 'string') return cleanString(value);
  if (Array.isArray(value)) return value.map((v) => deepClean(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = FREE_TEXT_KEYS.has(k) ? cleanFreeText(v) : deepClean(v, depth + 1);
    }
    return out;
  }
  return value;
}

function cleanColors(colors: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (colors && typeof colors === 'object') {
    for (const [k, v] of Object.entries(colors as Record<string, unknown>)) {
      out[k] = sanitizeCssColor(v, '#333333');
    }
  }
  return out;
}

export function sanitizeLegacyTokens<T extends CVDesignTokens>(tokens: T): T {
  if (!tokens || typeof tokens !== 'object') return tokens;
  const cleaned = deepClean(tokens) as T;
  if ((tokens as { colors?: unknown }).colors) {
    (cleaned as { colors: unknown }).colors = cleanColors((tokens as { colors?: unknown }).colors);
  }
  return cleaned;
}

export function sanitizeOverrides(
  overrides: CVElementOverrides | null | undefined,
): CVElementOverrides | null | undefined {
  if (!overrides || !Array.isArray(overrides.overrides)) return overrides;
  return {
    ...overrides,
    overrides: overrides.overrides.map((o) => ({
      ...o,
      elementId: typeof o.elementId === 'string' ? cleanString(o.elementId) : o.elementId,
      colorOverride: o.colorOverride ? sanitizeCssColor(o.colorOverride, '') || undefined : undefined,
      backgroundOverride: o.backgroundOverride
        ? sanitizeCssColor(o.backgroundOverride, '') || undefined
        : undefined,
    })),
  };
}
