/** experimental/gallery — original recipe, Brutalist visual direction baseline. */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'experimental/gallery',
  route: 'experimental',
  displayName: 'Gallery',
  description:
    'Editorial-grid CV with museum-poster restraint plus one fluorescent accent. Bone paper, near-black ink, electric-yellow accent only in the kicker rules + period labels.',
  source: {
    type: 'original',
    modifications: 'Palette baseline derived from open-design Brutalist visual direction.',
  },
  industryAffinity: ['art', 'museum', 'curation', 'photography', 'music', 'design', 'publishing'],
  layoutShape: 'editorial-grid',
  palette: {
    ink:     { anchor: { l: 8,  c: 0.005, h: 80  }, range: { l: [4, 16],  c: [0, 0.02],     h: [60, 100]  } },
    paper:   { anchor: { l: 97, c: 0.015, h: 85  }, range: { l: [94, 99], c: [0.005, 0.025], h: [70, 100] } },
    accent:  { anchor: { l: 88, c: 0.21,  h: 105 }, range: { l: [78, 92], c: [0.16, 0.25],  h: [90, 130]  } },
    muted:   { anchor: { l: 48, c: 0.008, h: 80  }, range: { l: [42, 55], c: [0, 0.02],     h: [60, 100]  } },
    surface: { anchor: { l: 95, c: 0.015, h: 85  }, range: { l: [92, 98], c: [0.008, 0.025], h: [70, 100] } },
  },
  allowedFontPairings: ['space-grotesk-work-sans', 'oswald-source-sans'],
  primitives: {
    header: 'stacked',
    section: 'kicker-rule',
    skillList: 'tags',
    experienceItem: 'bullets',
  },
  decorators: {
    pullQuote: false,
    dropCap: false,
    marginalia: true,
    heroNumeral: false,
    posterLine: false,
  },
  density: 'comfortable',
};

export const spec: DesignSpec = DesignSpecSchema.parse(raw);
