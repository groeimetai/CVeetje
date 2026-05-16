import type { RolePage } from '../types';

export const slug = 'product-manager';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'en';
export const label = 'product manager';
export const title = 'CV example for product manager — outcomes, decisions, stakeholders';
export const description =
  'A PM CV showing product impact instead of process jargon. Which products, which team, which decisions, which outcome.';
export const keywords = ['product manager CV', 'PM resume', 'product manager resume', 'PM CV outcomes'];
export const hero =
  'A PM CV full of jargon ("value stream optimization", "ceremony facilitation") says less than one with a single concrete product decision and its outcome. The role lives in dilemmas, not frameworks.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Top: products and team context',
    body: 'Which products did you work on, what team size, what product type (consumer-facing, internal tooling, B2B SaaS, marketplace). Two-sentence profile summary positioning your domain and decision level.',
  },
  {
    heading: 'Experience with decisions',
    body: 'Per role: company, product, team size, key decisions, and outcomes. "Refined backlog" is weak. "Decided in Q2 2024 to evolve the existing checkout path instead of building a lite version; cart abandonment from 71% to 58%" is strong.',
  },
  {
    heading: 'Stakeholders and metrics',
    body: 'Who were your stakeholders (C-level, engineering, sales, support), which product metrics did you own (activation, retention, conversion, revenue per user). Tools: Jira, Linear, Productboard, Amplitude, Mixpanel.',
  },
];
export const exampleBullets = [
  'PM for checkout + payments team (8 engineers, 1 designer) at leading European e-commerce; cart abandonment from 71% to 58%.',
  'Owned onboarding roadmap; activation from 34% to 51% in 12 months via three experiments.',
  'Co-defined 2025 product strategy with CPO and engineering leads; built quarterly OKR framework adopted across teams since Q1 2025.',
  'Daily tools: Jira, Productboard, Amplitude, Figma (review), Notion. Methodology: continuous discovery (Teresa Torres-style).',
  'PSPO I + II (Scrum.org); working on PSPO III.',
];
export const pitfalls = [
  'Ceremony jargon without concrete decisions. "Facilitated stand-ups" is scrum-master work, not PM work.',
  'Too much process ("ran SAFe"), too little product. Which decisions, which outcomes?',
  'No metrics ownership. Which metrics were you responsible for, and what did you do with them?',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'PMs sit between tech and business. A modern but calm layout matches that position.',
};
export const context = 'Salary indication 2026 (NL): junior PM €55–70k, mid €70–90k, senior €90–115k, Lead/Group PM €115k+.';
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes', 'recruiter-perspective'];
export const relatedPersonas = ['product-owners'];
