/**
 * Font pairing config for cv-engine. Browser-safe (no Node deps).
 *
 * IDs match `FontPairingIdSchema` in spec.ts. Each entry declares the
 * Google Fonts `<link>` URL plus the `font-family` strings for heading/body.
 * Phase 0 implements the three IDs used by `balanced/studio`; Phase 1
 * fills in the remaining nine.
 */

import type { FontPairingId } from '../../spec';

export interface FontPairingConfig {
  heading: { family: string; weights: string };
  body: { family: string; weights: string };
  googleUrls: string[]; // Multiple `<link>` URLs to inject
}

const C: Record<FontPairingId, FontPairingConfig | null> = {
  'inter-inter': {
    heading: { family: `'Inter', system-ui, sans-serif`, weights: '400;500;600;700' },
    body: { family: `'Inter', system-ui, sans-serif`, weights: '400;500;600;700' },
    googleUrls: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  'playfair-inter': {
    heading: { family: `'Playfair Display', Georgia, serif`, weights: '400;600;700' },
    body: { family: `'Inter', system-ui, sans-serif`, weights: '400;500' },
    googleUrls: [
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap',
    ],
  },
  'lato-lato': {
    heading: { family: `'Lato', system-ui, sans-serif`, weights: '700;900' },
    body: { family: `'Lato', system-ui, sans-serif`, weights: '400;700' },
    googleUrls: [
      'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap',
    ],
  },
  'libre-baskerville-source-sans': {
    heading: { family: `'Libre Baskerville', Georgia, serif`, weights: '400;700' },
    body: { family: `'Source Sans 3', system-ui, sans-serif`, weights: '400;600' },
    googleUrls: [
      'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap',
      'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap',
    ],
  },
  'dm-serif-dm-sans': {
    heading: { family: `'DM Serif Display', Georgia, serif`, weights: '400' },
    body: { family: `'DM Sans', system-ui, sans-serif`, weights: '400;500;700' },
    googleUrls: [
      'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
      'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
    ],
  },
  'oswald-source-sans': {
    heading: { family: `'Oswald', Impact, sans-serif`, weights: '500;600;700' },
    body: { family: `'Source Sans 3', system-ui, sans-serif`, weights: '400;600' },
    googleUrls: [
      'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap',
      'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap',
    ],
  },
  'space-grotesk-work-sans': {
    heading: { family: `'Space Grotesk', system-ui, sans-serif`, weights: '500;600;700' },
    body: { family: `'Work Sans', system-ui, sans-serif`, weights: '400;500' },
    googleUrls: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap',
      'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500&display=swap',
    ],
  },
  // Phase 2 fills these in:
  'montserrat-open-sans': null,
  'raleway-lato': null,
  'poppins-nunito': null,
  'roboto-roboto': null,
  'merriweather-source-sans': null,
};

export function getFontPairing(id: FontPairingId): FontPairingConfig {
  const cfg = C[id];
  if (!cfg) {
    // Phase 0: fall back to inter-inter for unimplemented pairings rather
    // than crash. Phase 1 fills the table and removes this fallback.
    const fallback = C['inter-inter'];
    if (!fallback) throw new Error('inter-inter must be defined');
    return fallback;
  }
  return cfg;
}

export function getFontLinkTags(id: FontPairingId): string {
  return getFontPairing(id)
    .googleUrls.map(url => `<link rel="stylesheet" href="${url}">`)
    .join('\n');
}
