/** experimental/broadcast — original recipe, Tech Utility direction + dispatch-red accent. */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'experimental/broadcast',
  route: 'experimental',
  displayName: 'Broadcast',
  description:
    'Sidebar CV with condensed Oswald headings + Source Sans body. News-broadcast / dispatch energy — accent stripes, all-caps section titles, dense main column.',
  source: {
    type: 'original',
    modifications: 'Palette baseline derived from open-design Tech Utility visual direction; hot-red accent for kicker rules and period markers.',
  },
  industryAffinity: ['media', 'journalism', 'broadcasting', 'marketing', 'sports', 'communications', 'music', 'podcasting'],
  layoutShape: 'sidebar',
  palette: {
    ink:     { anchor: { l: 14, c: 0.01,  h: 240 }, range: { l: [8, 22],   c: [0, 0.025],  h: [220, 270] } },
    paper:   { anchor: { l: 98, c: 0.003, h: 80  }, range: { l: [96, 100], c: [0, 0.012],  h: [60, 100]  } },
    accent:  { anchor: { l: 50, c: 0.2,   h: 25  }, range: { l: [40, 60],  c: [0.15, 0.25], h: [15, 45]   } },
    muted:   { anchor: { l: 48, c: 0.012, h: 240 }, range: { l: [42, 55],  c: [0, 0.025],  h: [220, 270] } },
    surface: { anchor: { l: 18, c: 0.01,  h: 240 }, range: { l: [12, 28],  c: [0, 0.03],   h: [220, 270] } },
  },
  allowedFontPairings: ['oswald-source-sans', 'space-grotesk-work-sans'],
  primitives: {
    header: 'stacked',
    section: 'kicker-rule',
    skillList: 'tags',
    experienceItem: 'bullets',
    sidebar: 'inverted',
  },
  decorators: {
    pullQuote: false,
    dropCap: false,
    marginalia: false,
    heroNumeral: false,
    posterLine: false,
  },
  density: 'compact',
};

export const spec: DesignSpec = DesignSpecSchema.parse(raw);
