/**
 * creative/gentlewoman — adapted from nexu-io/open-design/skills/after-hours-editorial-template (Apache 2.0).
 * See SKILL.md and /NOTICE.
 */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'creative/gentlewoman',
  route: 'creative',
  displayName: 'Gentlewoman',
  description:
    'Literary single-column CV. Libre Baskerville hero serif, italic accents, drop-cap on summary, narrow gutter, pull-quote enabled. Sloan-publishing feel.',
  source: {
    type: 'adapted',
    upstream: 'nexu-io/open-design/skills/after-hours-editorial-template',
    modifications:
      'Translated the after-hours editorial deck into a single-page CV. Kept italic-led hierarchy, warm-paper palette, literary serif pair. Added drop-cap + pull-quote decorators + Monocle-style name-tagline.',
  },
  industryAffinity: ['writing', 'publishing', 'editorial', 'communications', 'design', 'photography', 'academia'],
  layoutShape: 'single-column',
  palette: {
    ink:     { anchor: { l: 16, c: 0.025, h: 30 }, range: { l: [10, 22], c: [0.01, 0.04],   h: [10, 50]  } },
    paper:   { anchor: { l: 94, c: 0.03,  h: 70 }, range: { l: [90, 97], c: [0.02, 0.045],  h: [55, 90]  } },
    accent:  { anchor: { l: 32, c: 0.1,   h: 15 }, range: { l: [22, 42], c: [0.06, 0.14],   h: [0, 30]   } },
    muted:   { anchor: { l: 48, c: 0.03,  h: 30 }, range: { l: [40, 56], c: [0.015, 0.045], h: [10, 50]  } },
    surface: { anchor: { l: 91, c: 0.035, h: 70 }, range: { l: [87, 95], c: [0.02, 0.05],   h: [55, 95]  } },
  },
  allowedFontPairings: ['libre-baskerville-source-sans', 'playfair-inter'],
  primitives: {
    header: 'stacked',
    section: 'kicker-rule',
    skillList: 'comma-prose',
    experienceItem: 'paragraph',
  },
  decorators: {
    pullQuote: true,
    dropCap: true,
    marginalia: false,
    heroNumeral: false,
    posterLine: false,
  },
  density: 'airy',
};

export const spec: DesignSpec = DesignSpecSchema.parse(raw);
