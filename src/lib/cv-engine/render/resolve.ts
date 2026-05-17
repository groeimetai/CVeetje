/**
 * Resolve — merge tokens into a recipe spec to produce a ResolvedSpec
 * that's ready to render. Clamps palette overrides to recipe-declared
 * ranges and picks the active font pairing.
 */

import type { DesignSpec, FontPairingId, OklchValue, PaletteRole } from '../spec';
import type { CVStyleTokensV2 } from '../tokens';
import { clampOklch } from './css/oklch';

export interface ResolvedSpec {
  spec: DesignSpec;
  palette: Record<PaletteRole, OklchValue>;
  fontPairing: FontPairingId;
  emphasis: CVStyleTokensV2['emphasis'];
  sectionOrder: string[];
  hiddenSections: Set<string>;
}

const ROLES: PaletteRole[] = ['ink', 'paper', 'accent', 'muted', 'surface'];

export function resolve(spec: DesignSpec, tokens: CVStyleTokensV2): ResolvedSpec {
  // Palette: anchor for each role, clamped override if present.
  const palette = ROLES.reduce(
    (acc, role) => {
      const recipeToken = spec.palette[role];
      const override = tokens.paletteOverride?.[role];
      acc[role] = override
        ? clampOklch(override, recipeToken.range)
        : recipeToken.anchor;
      return acc;
    },
    {} as Record<PaletteRole, OklchValue>,
  );

  // Font: override must be one of the recipe's allowed pairings; otherwise
  // fall back to the first allowed pairing (which is the recipe default).
  const fontPairing: FontPairingId =
    tokens.fontOverride && spec.allowedFontPairings.includes(tokens.fontOverride)
      ? tokens.fontOverride
      : spec.allowedFontPairings[0];

  return {
    spec,
    palette,
    fontPairing,
    emphasis: tokens.emphasis,
    sectionOrder: tokens.sectionOrder,
    hiddenSections: new Set(tokens.hiddenSections ?? []),
  };
}
