/**
 * Normalize AI output into a valid CVStyleTokensV2. Clamp palette overrides
 * to recipe ranges, validate fontOverride against recipe.allowedFontPairings,
 * and ensure a sensible sectionOrder.
 *
 * Pure / browser-safe — used by the orchestrator after the LLM call.
 */

import type { DesignSpec, FontPairingId, OklchValue, PaletteRole } from '../spec';
import type { CVStyleTokensV2, Emphasis, PaletteOverride } from '../tokens';
import { clampOklch } from '../render/css/oklch';

const ROLES: PaletteRole[] = ['ink', 'paper', 'accent', 'muted', 'surface'];

const DEFAULT_SECTION_ORDER = [
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'certifications',
  'projects',
  'interests',
];

/** Permissive AI emphasis shape — strings without length limits. Same field
 *  names as the strict `Emphasis` but we don't reject overflow at the AI-SDK
 *  schema layer; we truncate to the canonical limits here instead. */
export interface PermissiveEmphasis {
  pullQuoteText?: string;
  pullQuoteAttribution?: string;
  accentKeywords?: string[];
  nameTagline?: string;
  dropCapLetter?: string;
  posterLine?: string;
  heroNumeralValue?: string;
}

export interface NormalizeInput {
  recipe: DesignSpec;
  rawRecipeId: string;
  paletteOverride?: PaletteOverride;
  fontOverride?: string;
  emphasis?: PermissiveEmphasis;
  sectionOrder?: string[];
  hiddenSections?: string[];
}

export function normalizeTokens(input: NormalizeInput): CVStyleTokensV2 {
  // Palette: clamp each present role to its recipe range.
  const paletteOverride = input.paletteOverride
    ? clampPaletteOverride(input.recipe, input.paletteOverride)
    : undefined;

  // Font: only honor if it's in the recipe's allow-list.
  const fontOverride: FontPairingId | undefined =
    input.fontOverride && input.recipe.allowedFontPairings.includes(input.fontOverride as FontPairingId)
      ? (input.fontOverride as FontPairingId)
      : undefined;

  return {
    engineVersion: 'v2',
    recipeId: input.recipe.id,
    paletteOverride: paletteOverride && Object.keys(paletteOverride).length > 0 ? paletteOverride : undefined,
    fontOverride,
    emphasis: truncateEmphasis(input.emphasis),
    sectionOrder: input.sectionOrder?.length ? input.sectionOrder : DEFAULT_SECTION_ORDER,
    hiddenSections: input.hiddenSections?.length ? input.hiddenSections : undefined,
  };
}

/** Truncate AI-supplied emphasis strings to the canonical max lengths from
 *  `EmphasisSchema` (in tokens.ts). The AI sometimes ignores the limits and
 *  dumps a manifesto-style prose-paragraph in `heroNumeralValue`; that would
 *  fail the strict Firestore-write schema, so we cut it down here. */
function truncateEmphasis(e?: PermissiveEmphasis): Emphasis {
  if (!e) return {};
  return {
    pullQuoteText: take(e.pullQuoteText, 240),
    pullQuoteAttribution: take(e.pullQuoteAttribution, 80),
    accentKeywords: e.accentKeywords
      ?.map(k => take(k, 40))
      .filter((k): k is string => !!k && k.length > 0)
      .slice(0, 7),
    nameTagline: take(e.nameTagline, 80),
    dropCapLetter: e.dropCapLetter ? e.dropCapLetter.slice(0, 1) : undefined,
    posterLine: take(e.posterLine, 160),
    heroNumeralValue: take(e.heroNumeralValue, 12),
  };
}

function take(s: string | undefined, max: number): string | undefined {
  if (!s) return undefined;
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

function clampPaletteOverride(recipe: DesignSpec, override: PaletteOverride): PaletteOverride {
  const out: PaletteOverride = {};
  for (const role of ROLES) {
    const v: OklchValue | undefined = override[role];
    if (!v) continue;
    out[role] = clampOklch(v, recipe.palette[role].range);
  }
  return out;
}
