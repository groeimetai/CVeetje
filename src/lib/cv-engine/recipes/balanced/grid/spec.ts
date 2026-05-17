/** balanced/grid — original recipe, sidebar shape, DM Serif + DM Sans. */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'balanced/grid',
  route: 'balanced',
  displayName: 'Grid',
  description:
    'Sidebar resume with DM Serif headings + DM Sans body. Structured 35/65 split, light accent-tinted sidebar, kicker labels.',
  source: {
    type: 'original',
    modifications: 'Palette baseline derived from open-design Tech Utility visual direction.',
  },
  industryAffinity: ['tech', 'software', 'data', 'product', 'design-engineering', 'fintech', 'saas', 'consulting'],
  layoutShape: 'sidebar',
  palette: {
    ink:     { anchor: { l: 18, c: 0.015, h: 250 }, range: { l: [12, 25], c: [0.005, 0.03], h: [230, 270] } },
    paper:   { anchor: { l: 99, c: 0.002, h: 80  }, range: { l: [97, 100], c: [0, 0.01], h: [60, 100] } },
    accent:  { anchor: { l: 50, c: 0.13,  h: 250 }, range: { l: [40, 58], c: [0.08, 0.18], h: [220, 270] } },
    muted:   { anchor: { l: 50, c: 0.01,  h: 250 }, range: { l: [42, 56], c: [0, 0.02], h: [230, 270] } },
    surface: { anchor: { l: 95, c: 0.01,  h: 250 }, range: { l: [92, 98], c: [0.005, 0.025], h: [220, 270] } },
  },
  allowedFontPairings: ['dm-serif-dm-sans', 'inter-inter'],
  primitives: {
    header: 'stacked',
    section: 'kicker-rule',
    skillList: 'tags',
    experienceItem: 'bullets',
    sidebar: 'solid',
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
