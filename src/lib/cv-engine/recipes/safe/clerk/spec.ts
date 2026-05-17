/**
 * safe/clerk — adapted from nexu-io/open-design/skills/digits-fintech-swiss-template (Apache 2.0).
 * See SKILL.md and /NOTICE.
 */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'safe/clerk',
  route: 'safe',
  displayName: 'Clerk',
  description:
    'Serif-led conservative single-column resume. Libre Baskerville headings, Source Sans body, navy ink on bone paper, Swiss-poster restraint.',
  source: {
    type: 'adapted',
    upstream: 'nexu-io/open-design/skills/digits-fintech-swiss-template',
    modifications:
      'Re-purposed Swiss-poster digits-fintech aesthetic for CV: kept the serif heading + sans body pair and muted navy palette. Dropped grid texture + large numerals. Clean section variant with hairline rule.',
  },
  industryAffinity: ['finance', 'banking', 'legal', 'audit', 'government', 'academia', 'healthcare', 'consulting'],
  layoutShape: 'single-column',
  palette: {
    ink:     { anchor: { l: 18, c: 0.04,  h: 255 }, range: { l: [12, 25], c: [0.02, 0.06], h: [245, 265] } },
    paper:   { anchor: { l: 97, c: 0.015, h: 85  }, range: { l: [95, 99], c: [0.005, 0.025], h: [75, 95]  } },
    accent:  { anchor: { l: 35, c: 0.08,  h: 250 }, range: { l: [25, 45], c: [0.04, 0.12],  h: [230, 270] } },
    muted:   { anchor: { l: 50, c: 0.03,  h: 255 }, range: { l: [42, 58], c: [0.015, 0.04], h: [245, 270] } },
    surface: { anchor: { l: 95, c: 0.018, h: 85  }, range: { l: [92, 98], c: [0.005, 0.03],  h: [75, 100]  } },
  },
  allowedFontPairings: ['libre-baskerville-source-sans', 'inter-inter'],
  primitives: {
    header: 'stacked',
    section: 'clean',
    skillList: 'comma-prose',
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
