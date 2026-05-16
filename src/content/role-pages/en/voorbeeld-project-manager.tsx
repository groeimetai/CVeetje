import type { RolePage } from '../types';

export const slug = 'project-manager';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'en';
export const label = 'project manager';
export const title = 'CV example for project manager — scope, budget, team, outcome';
export const description =
  'A PM CV speaking in concrete project frames: scope, budget, team size, duration, delivered outcome. Plus how to handle waterfall vs agile vs hybrid on your CV.';
export const keywords = ['project manager CV', 'PM CV', 'Prince2 CV', 'PMP CV', 'project management resume'];
export const hero =
  'A good project manager CV reads like a portfolio. Per project: scope, budget, team, duration, delivered. Not all four — minimum three. A PM CV without concrete project frames is a job title without proof.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Top: domain and methodology',
    body: 'Which domain (IT implementation, construction, infrastructure, marketing, M&A), preferred methodology, certifications (Prince2, PMP, IPMA, AgilePM, SAFe). Two-sentence profile summary with "type of projects I lead" + "for what audience".',
  },
  {
    heading: 'Experience as portfolio',
    body: 'Per employer one main line, with three to five projects as sub-items in scope-budget-team-outcome format. For consultants: per client — client name often weighs more than the agency.\n\nUse concrete numbers: "€800k budget, team of twelve, twelve-month duration, delivered six weeks ahead of schedule with €60k underspend". That\'s a PM bullet that lands.',
  },
  {
    heading: 'Tooling and stakeholder context',
    body: 'Which tools: Jira, Asana, MS Project, Smartsheet, Monday. Which stakeholder context: steering committee with C-level, international team, multi-vendor. Senior PMs distinguish themselves here — methodology is learnable, stakeholder experience often isn\'t without scars.',
  },
];
export const exampleBullets = [
  'ERP migration (SAP → Workday HR) — €1.2M budget, team of 18 (internal + Deloitte), 14 months, delivered within 3% of budget.',
  'Customer portal implementation for 40,000 end-users — €450k, hybrid team (waterfall + agile sprints), 9 months.',
  'Callcenter routing reorganisation — €180k, team of 6, 4 months; first-call resolution 67% to 79%.',
  'Prince2 Practitioner (2021), AgilePM Foundation (2023); IPMA-C in 2024–25.',
  'Steering committee experience with C-level (CFO, COO); comfortable in multi-vendor settings.',
  'Daily tools: Jira, Confluence, MS Project, Power BI for reporting.',
];
export const pitfalls = [
  'Generic "led projects" without scope/budget/team/outcome. PM is a role that asks for evidence.',
  'Methodology name without proof ("agile" as buzzword). Which specific methodology, which type of project, which ceremonies?',
  'Steering committee level not explicit. Leading a €50k project is fundamentally different from a €5M one.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'PM roles live in steering committee context. A calm, structured layout mirrors the work mode.',
};
export const context = 'Salary indication 2026 (NL): junior PM €45–60k, mid €60–85k, senior €85–120k, programme/portfolio manager €120k+.';
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes', 'recruiter-perspective'];
export const relatedPersonas = ['werkzoekenden'];
