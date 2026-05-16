import type { RolePage } from '../types';

export const slug = 'software-engineer';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'en';
export const label = 'software engineer';
export const title = 'CV example for software engineer — what belongs on it in 2026';
export const description =
  'A sober, recruiter-proof CV for backend, frontend, or fullstack engineers. With concrete bullet examples, role-specific pitfalls, and which style fits which employer.';
export const keywords = ['software engineer CV', 'developer CV', 'backend CV', 'frontend CV', 'fullstack CV'];
export const hero =
  'A strong developer CV is technically precise yet readable. Tech recruiters scan for stack overlap with the role, concrete project outcomes, and something suggesting you\'re someone they could survive a sprint with. A list of forty technologies without context works against you.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'What belongs on a developer CV',
    body: 'A two-sentence profile summary anchoring your specialisation and direction. Below: chronological experience with one line on the product per role and two-to-three bullets with measurable impact. A focused skills block of five to eight technologies you really use daily — no alphabet soup.\n\nShow your GitHub or portfolio link if you\'re proud of it. One or two active open source contributions often outweigh a certification.',
  },
  {
    heading: 'Stack keywords verbatim (where it fits)',
    body: 'ATS systems still often match on exact strings. If the ad says "TypeScript", write "TypeScript" — not "TS" or "JavaScript/TypeScript". But don\'t overdo it: three technologies you don\'t use daily are weaker than five you actively work in.',
  },
  {
    heading: 'What separates a strong bullet from a weak one',
    body: 'Weak: "Responsible for backend of the product." Strong: "Built the new orders service on Go + Postgres; p95 response time from 800ms to 120ms." Concrete, measurable, stack woven in. Not every bullet needs a number — but two or three per role should.',
  },
];
export const exampleBullets = [
  'Built new orders service on Go + Postgres; p95 from 800ms to 120ms.',
  'Cut release cycle from weekly to daily via CI/CD overhaul (GitHub Actions + Argo CD).',
  'Mentored two juniors through their first year; both promoted to mid-level within 18 months.',
  'Migrated 30+ microservices from manual deploys to Terraform + ArgoCD; deploy time from 40 to 3 minutes.',
  'Open source maintainer: [package] (200+ stars); core PR reviews for [framework].',
];
export const pitfalls = [
  '"Responsible for X" without outcome. What did that responsibility actually achieve?',
  'Skill soup of twenty technologies without context. Recruiters scroll past, hiring engineers frown.',
  'No GitHub or portfolio link when you have one. For dev roles, concrete work is the strongest signal.',
  'Side projects framed as main course when you have five years paid experience. Keep the balance.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'For most tech employers: calm, modern typography without excess. Creative for design-oriented studios; Conservative for banks and government.',
};
export const context = 'Salary indication 2026 (NL): junior €40–55k, mid €55–75k, senior €75–100k+. Tech scale-ups and consultancies usually above corporate IT.';
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes', 'ats-cv-2026', 'recruiter-perspective'];
export const relatedPersonas = ['werkzoekenden'];
