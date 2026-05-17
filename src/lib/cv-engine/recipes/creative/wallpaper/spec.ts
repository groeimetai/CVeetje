/**
 * creative/wallpaper — adapted from nexu-io/open-design/skills/article-magazine (Apache 2.0).
 * See SKILL.md and /NOTICE.
 */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'creative/wallpaper',
  route: 'creative',
  displayName: 'Wallpaper',
  description:
    'Editorial-grid CV inspired by modernist magazine spreads. Asymmetric 68/32 layout with a marginalia column carrying experience periods + companies.',
  source: {
    type: 'adapted',
    upstream: 'nexu-io/open-design/skills/article-magazine',
    modifications:
      'Adapted article-magazine spread aesthetic into a CV. Editorial-grid + marginalia column, modernist palette, Space Grotesk + Work Sans, pull-quote after experience.',
  },
  industryAffinity: ['design', 'creative', 'architecture', 'fashion', 'photography', 'marketing', 'tech-design'],
  layoutShape: 'editorial-grid',
  palette: {
    ink:     { anchor: { l: 14, c: 0.005, h: 240 }, range: { l: [8, 22],  c: [0, 0.02],  h: [220, 270] } },
    paper:   { anchor: { l: 98, c: 0.003, h: 80  }, range: { l: [96, 100], c: [0, 0.012], h: [60, 100]  } },
    accent:  { anchor: { l: 50, c: 0.18,  h: 25  }, range: { l: [40, 60], c: [0.12, 0.22], h: [15, 40]   } },
    muted:   { anchor: { l: 46, c: 0.008, h: 240 }, range: { l: [40, 55], c: [0, 0.02],  h: [220, 270]   } },
    surface: { anchor: { l: 96, c: 0.008, h: 240 }, range: { l: [93, 99], c: [0, 0.018], h: [220, 270]   } },
  },
  allowedFontPairings: ['space-grotesk-work-sans', 'dm-serif-dm-sans'],
  primitives: {
    header: 'stacked',
    section: 'kicker-rule',
    skillList: 'tags',
    experienceItem: 'paragraph',
  },
  decorators: {
    pullQuote: true,
    dropCap: false,
    marginalia: true,
    heroNumeral: false,
    posterLine: false,
  },
  density: 'comfortable',
};

export const spec: DesignSpec = DesignSpecSchema.parse(raw);
