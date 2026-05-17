/**
 * balanced/studio — typed DesignSpec, statically imported by the registry.
 *
 * Mirror of SKILL.md frontmatter in the same folder. SKILL.md is the
 * canonical source (used by the AI orchestrator server-side for the prompt
 * body); spec.ts is the browser-safe runtime export. Keep them in sync.
 *
 * Origin: adapted from nexu-io/open-design/skills/resume-modern (Apache 2.0).
 * See /NOTICE and ../../_vendor/resume-modern/SKILL.md.
 */

import { DesignSpecSchema, type DesignSpec } from '../../../spec';

const raw: DesignSpec = {
  id: 'balanced/studio',
  route: 'balanced',
  displayName: 'Studio',
  description:
    'Magazine-clean single-column resume. Restrained accent typography, small-caps section kickers, classic A4 proportions.',
  source: {
    type: 'adapted',
    upstream: 'nexu-io/open-design/skills/resume-modern',
    modifications: [
      'Simplified to single-column-only (upstream allowed optional 2-column).',
      'Translated visual brief from Chinese to English for our prompt stack.',
      'Mapped to OKLch palette with balanced-level override ranges.',
      'Restricted to three safe Google Font pairings.',
    ].join(' '),
  },
  industryAffinity: ['tech', 'software', 'engineering', 'finance', 'consulting', 'general'],
  layoutShape: 'single-column',
  palette: {
    ink: {
      anchor: { l: 15, c: 0.01, h: 250 },
      range: { l: [10, 25], c: [0, 0.03], h: [200, 300] },
    },
    paper: {
      anchor: { l: 98, c: 0.005, h: 80 },
      range: { l: [95, 100], c: [0, 0.02], h: [60, 100] },
    },
    accent: {
      anchor: { l: 45, c: 0.12, h: 250 },
      range: { l: [30, 55], c: [0.05, 0.18], h: [150, 280] },
    },
    muted: {
      anchor: { l: 50, c: 0.01, h: 250 },
      range: { l: [40, 60], c: [0, 0.03], h: [200, 300] },
    },
    surface: {
      anchor: { l: 96, c: 0.005, h: 80 },
      range: { l: [92, 100], c: [0, 0.02], h: [60, 100] },
    },
  },
  allowedFontPairings: ['inter-inter', 'playfair-inter', 'lato-lato'],
  primitives: {
    header: 'stacked',
    section: 'kicker-rule',
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

// Parse-time validation: if the literal above drifts from the schema, the
// import fails at module-load with a Zod error — caught by tsc + test runs.
export const spec: DesignSpec = DesignSpecSchema.parse(raw);
