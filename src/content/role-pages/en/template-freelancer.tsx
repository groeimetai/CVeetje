import type { RolePage } from '../types';

export const slug = 'freelancer';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'en';
export const label = 'CV for freelancers and consultants';
export const title = 'CV template for freelancer / consultant — sales tool per client';
export const description =
  'A freelancer CV is a sales tool, not an application document. How to tailor it per proposal without hours of work each time.';
export const keywords = ['freelancer CV', 'consultant CV template', 'contractor resume', 'proposal CV'];
export const hero =
  'For employees a CV is an application. For freelancers it\'s a sales tool — outcomes first, clients named, framing tuned to the proposal. Different goals, different choices.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Specific positioning at the top',
    body: 'Not "freelance software engineer". Rather "Freelance software engineer | backend + DevOps for scale-ups in fintech | Amsterdam / remote". Specific wins — it signals you know which clients you serve.',
  },
  {
    heading: 'Recent engagements in depth',
    body: 'Three to five engagements with depth. Per engagement: client (or sector under NDA), period + scope, problem, your role, measurable outcome. Client names matter — a €120/hour freelancer and a €180/hour one frame them differently.',
  },
  {
    heading: 'Toolset and honest limitation',
    body: 'The three to five tools you\'re genuinely good at right now. Plus, for seniors: what you no longer take on. "Don\'t work with PHP codebases older than 2015 anymore" makes you serious about your craft.',
  },
];
export const exampleBullets = [
  'Freelance backend engineer | scale-up fintech | Amsterdam/remote | available Q3 2026.',
  'Engagement 2024–2025: Bunq — re-architecture of payment engine; team of 5; 9 months; p99 latency 480ms → 110ms.',
  'Engagement 2023–2024: Cancom — multi-tenant SaaS platform; team of 3; 6 months; production-launched.',
  'Stack: Go, Postgres, Kafka, AWS (EKS/RDS/SQS), Terraform. Experience: distributed systems, event sourcing.',
  'Rate: €120/hour indicative; flexible around scope. Preference: scale-ups 50–200 FTE, technically strong teams.',
];
export const pitfalls = [
  'Generic "freelance engineer" without positioning. Specific attracts; generic drifts.',
  'No measurable outcomes per engagement. For freelance proposals it\'s the proof of value.',
  'Claiming NDA client names without justification. Get permission or generalise to sector.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'A freelance CV must read well for a C-level client. Balanced fits — no design statements, still professional.',
};
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes'];
export const relatedPersonas = ['zzp'];
