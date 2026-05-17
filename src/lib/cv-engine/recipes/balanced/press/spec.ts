/**
 * balanced/press — adapted from nexu-io/open-design/skills/editorial-burgundy-principles-template (Apache 2.0).
 * See SKILL.md and /NOTICE.
 */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'balanced/press',
  route: 'balanced',
  displayName: 'Press',
  description:
    'Editorial press-room single-column resume in deep navy + cream + clay terracotta. Bordeaux-magazine refinement adapted for a CV.',
  source: {
    type: 'adapted',
    upstream: 'nexu-io/open-design/skills/editorial-burgundy-principles-template',
    modifications:
      'Re-coloured burgundy/blush/gold into the editorial-paper brand (navy/cream/clay). Compressed deck format into a single-page CV. Accent-left summary, small-caps section titles, serif headings + sans body.',
  },
  industryAffinity: ['marketing', 'communications', 'publishing', 'education', 'ngo', 'design', 'hospitality', 'consulting'],
  layoutShape: 'single-column',
  palette: {
    ink:     { anchor: { l: 22, c: 0.04,  h: 255 }, range: { l: [15, 30], c: [0.02, 0.06], h: [245, 270] } },
    paper:   { anchor: { l: 96, c: 0.025, h: 85  }, range: { l: [93, 98], c: [0.015, 0.04], h: [75, 95]   } },
    accent:  { anchor: { l: 48, c: 0.16,  h: 40  }, range: { l: [40, 55], c: [0.12, 0.2],  h: [25, 55]   } },
    muted:   { anchor: { l: 46, c: 0.025, h: 255 }, range: { l: [40, 55], c: [0.015, 0.04], h: [240, 270] } },
    surface: { anchor: { l: 94, c: 0.03,  h: 85  }, range: { l: [90, 97], c: [0.02, 0.045], h: [70, 100]  } },
  },
  allowedFontPairings: ['playfair-inter', 'lato-lato'],
  primitives: {
    header: 'stacked',
    section: 'accent-left',
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
