/**
 * experimental/manifesto — adapted from nexu-io/open-design/skills/poster-hero (Apache 2.0).
 * See SKILL.md and /NOTICE.
 */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'experimental/manifesto',
  route: 'experimental',
  displayName: 'Manifesto',
  description:
    'Poster-shape CV. Name fills the upper half, poster-line italic statement below, dense 2-column dark credits below the fold. MSCHF / activist-poster energy.',
  source: {
    type: 'adapted',
    upstream: 'nexu-io/open-design/skills/poster-hero',
    modifications:
      'Adapted marketing-poster format into a CV poster: name at hero scale on bone, italic poster-line beneath, dark body block with 2-col credits. Strict typography, no photos.',
  },
  industryAffinity: ['design', 'art', 'activism', 'music', 'writing', 'photography', 'creative', 'communications'],
  layoutShape: 'poster',
  palette: {
    ink:     { anchor: { l: 10, c: 0.01,  h: 30 }, range: { l: [5, 18],   c: [0, 0.03],     h: [10, 60]  } },
    paper:   { anchor: { l: 96, c: 0.018, h: 85 }, range: { l: [93, 99],  c: [0.005, 0.03], h: [70, 100] } },
    accent:  { anchor: { l: 55, c: 0.22,  h: 25 }, range: { l: [45, 65],  c: [0.16, 0.28],  h: [15, 50]  } },
    muted:   { anchor: { l: 50, c: 0.02,  h: 30 }, range: { l: [42, 58],  c: [0.01, 0.04],  h: [15, 60]  } },
    surface: { anchor: { l: 93, c: 0.022, h: 85 }, range: { l: [89, 96],  c: [0.012, 0.035], h: [70, 100] } },
  },
  allowedFontPairings: ['oswald-source-sans', 'space-grotesk-work-sans'],
  primitives: {
    header: 'hero',
    section: 'clean',
    skillList: 'comma-prose',
    experienceItem: 'bullets',
  },
  decorators: {
    pullQuote: false,
    dropCap: false,
    marginalia: false,
    heroNumeral: false,
    posterLine: true,
  },
  density: 'compact',
};

export const spec: DesignSpec = DesignSpecSchema.parse(raw);
