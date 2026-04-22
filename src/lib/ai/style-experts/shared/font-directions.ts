/**
 * Font-flavour suggestions used by the variation nudge.
 * Moved verbatim from the old style-generator-v2.ts.
 */

export interface FontDirection {
  direction: string;
  hint: string;
}

export const fontDirections: FontDirection[] = [
  { direction: 'serif-elegant', hint: 'Use a serif heading font for editorial elegance (playfair, dm-serif, libre-baskerville, merriweather)' },
  { direction: 'display-impact', hint: 'Use a bold display/condensed heading font for impact (oswald, space-grotesk, montserrat)' },
  { direction: 'geometric-clean', hint: 'Use a geometric sans-serif for modern cleanliness (poppins, raleway, inter)' },
  { direction: 'humanist-warm', hint: 'Use a humanist typeface for warmth and approachability (lato, nunito, open-sans)' },
];
