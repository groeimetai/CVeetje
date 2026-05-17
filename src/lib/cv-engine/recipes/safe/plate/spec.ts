/** safe/plate — original recipe, warm-neutral with forest-green accent. */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'safe/plate',
  route: 'safe',
  displayName: 'Plate',
  description:
    'Warm-neutral single-column resume in Lato throughout. Subtle rule dividers, forest-green accent. Restraint via space, not via stripping detail.',
  source: {
    type: 'original',
    modifications: 'Palette baseline derived from open-design Soft Warm visual direction.',
  },
  industryAffinity: ['hospitality', 'education', 'ngo', 'healthcare', 'retail', 'real-estate', 'general'],
  layoutShape: 'single-column',
  palette: {
    ink:     { anchor: { l: 22, c: 0.015, h: 100 }, range: { l: [16, 30], c: [0.005, 0.025], h: [80, 120]  } },
    paper:   { anchor: { l: 96, c: 0.02,  h: 90  }, range: { l: [93, 98], c: [0.01, 0.03],   h: [75, 100]  } },
    accent:  { anchor: { l: 38, c: 0.1,   h: 150 }, range: { l: [28, 48], c: [0.06, 0.14],   h: [130, 170] } },
    muted:   { anchor: { l: 50, c: 0.015, h: 95  }, range: { l: [42, 58], c: [0.005, 0.025], h: [80, 110]  } },
    surface: { anchor: { l: 93, c: 0.025, h: 90  }, range: { l: [90, 96], c: [0.015, 0.035], h: [75, 105]  } },
  },
  allowedFontPairings: ['lato-lato', 'inter-inter'],
  primitives: {
    header: 'stacked',
    section: 'clean',
    skillList: 'tags',
    experienceItem: 'bullets',
  },
  decorators: {
    pullQuote: false,
    dropCap: false,
    marginalia: false,
    heroNumeral: false,
    posterLine: false,
  },
  density: 'comfortable',
};

export const spec: DesignSpec = DesignSpecSchema.parse(raw);
