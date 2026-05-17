/**
 * safe/monolith — adapted from nexu-io/open-design/skills/apple-hig (Apache 2.0).
 * See SKILL.md in this folder and /NOTICE for attribution.
 */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'safe/monolith',
  route: 'safe',
  displayName: 'Monolith',
  description:
    'Quiet, screen-first single-column resume — heavyweight Inter, near-black on bone, one cool accent. ATS-bulletproof.',
  source: {
    type: 'adapted',
    upstream: 'nexu-io/open-design/skills/apple-hig',
    modifications:
      'Mapped the Apple HIG meta-catalog into a deterministic single-recipe CV layout. Inter-only typography, near-black ink, very tight accent range (cool blues only). No icons, no banners.',
  },
  industryAffinity: ['finance', 'banking', 'consulting', 'legal', 'government', 'healthcare', 'academia', 'general'],
  layoutShape: 'single-column',
  palette: {
    ink:     { anchor: { l: 12, c: 0.005, h: 250 }, range: { l: [8, 18],   c: [0, 0.02],  h: [220, 280] } },
    paper:   { anchor: { l: 99, c: 0.002, h: 80  }, range: { l: [97, 100], c: [0, 0.01],  h: [60, 100]  } },
    accent:  { anchor: { l: 35, c: 0.08,  h: 240 }, range: { l: [25, 45],  c: [0.04, 0.12], h: [220, 260] } },
    muted:   { anchor: { l: 48, c: 0.005, h: 250 }, range: { l: [42, 55],  c: [0, 0.015], h: [220, 280] } },
    surface: { anchor: { l: 97, c: 0.003, h: 80  }, range: { l: [95, 100], c: [0, 0.01],  h: [60, 100]  } },
  },
  allowedFontPairings: ['inter-inter', 'lato-lato'],
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
  density: 'compact',
};

export const spec: DesignSpec = DesignSpecSchema.parse(raw);
