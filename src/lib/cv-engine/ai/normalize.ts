/**
 * Normalize AI output into a valid CVStyleTokensV2. Clamp palette overrides
 * to recipe ranges, validate fontOverride against recipe.allowedFontPairings,
 * and ensure a sensible sectionOrder.
 *
 * Pure / browser-safe — used by the orchestrator after the LLM call.
 */

import type { DesignSpec, FontPairingId, OklchValue, PaletteRole } from '../spec';
import type { CVStyleTokensV2, PaletteOverride } from '../tokens';
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

export interface NormalizeInput {
  recipe: DesignSpec;
  rawRecipeId: string;
  paletteOverride?: PaletteOverride;
  fontOverride?: string;
  emphasis?: CVStyleTokensV2['emphasis'];
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
    emphasis: input.emphasis ?? {},
    sectionOrder: input.sectionOrder?.length ? input.sectionOrder : DEFAULT_SECTION_ORDER,
    hiddenSections: input.hiddenSections?.length ? input.hiddenSections : undefined,
  };
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
