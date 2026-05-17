import type { OklchValue } from '../../spec';

/** Format an OklchValue as a `oklch(...)` CSS string. */
export function oklchToCSS(v: OklchValue): string {
  return `oklch(${v.l.toFixed(2)}% ${v.c.toFixed(4)} ${v.h.toFixed(2)})`;
}

/** Clamp a numeric channel to [min, max] inclusive. */
export function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max);
}

/** Clamp an OklchValue to a per-channel range. Used in resolve.ts to
 *  enforce that `tokens.paletteOverride` cannot escape the recipe's
 *  declared `palette.{role}.range`. */
export function clampOklch(
  v: OklchValue,
  range: { l: [number, number]; c: [number, number]; h: [number, number] },
): OklchValue {
  return {
    l: clamp(v.l, range.l[0], range.l[1]),
    c: clamp(v.c, range.c[0], range.c[1]),
    h: clamp(v.h, range.h[0], range.h[1]),
  };
}
