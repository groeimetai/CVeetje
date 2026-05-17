/**
 * creative/kinfolk — adapted from nexu-io/open-design/skills/field-notes-editorial-template (Apache 2.0).
 * See SKILL.md and /NOTICE.
 */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'creative/kinfolk',
  route: 'creative',
  displayName: 'Kinfolk',
  description:
    'Calm, generous single-page CV. Oversized serif name, airy density, warm bone background, drop-cap on summary, optional pull-quote.',
  source: {
    type: 'adapted',
    upstream: 'nexu-io/open-design/skills/field-notes-editorial-template',
    modifications:
      'Translated the field-notes business-report aesthetic into a single-page CV: kept the soft paper + serif hero + pastel palette; removed the charts/cards. Added drop-cap on summary, optional pull-quote, small-caps tagline.',
  },
  industryAffinity: ['design', 'creative', 'writing', 'publishing', 'photography', 'architecture', 'ngo', 'education'],
  layoutShape: 'single-column',
  palette: {
    ink:     { anchor: { l: 20, c: 0.02,  h: 60 }, range: { l: [14, 28], c: [0.01, 0.035], h: [40, 80]  } },
    paper:   { anchor: { l: 95, c: 0.022, h: 80 }, range: { l: [92, 98], c: [0.015, 0.035], h: [70, 95]  } },
    accent:  { anchor: { l: 55, c: 0.12,  h: 30 }, range: { l: [45, 62], c: [0.08, 0.18],  h: [15, 50]  } },
    muted:   { anchor: { l: 48, c: 0.025, h: 60 }, range: { l: [42, 55], c: [0.015, 0.04],  h: [40, 80]  } },
    surface: { anchor: { l: 92, c: 0.03,  h: 80 }, range: { l: [88, 95], c: [0.02, 0.045],  h: [70, 100] } },
  },
  allowedFontPairings: ['playfair-inter', 'libre-baskerville-source-sans', 'dm-serif-dm-sans'],
  primitives: {
    header: 'stacked',
    section: 'kicker-rule',
    skillList: 'tags',
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
