import type { RolePage } from '../types';

export const slug = 'expat-in-netherlands';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'en';
export const label = 'CV as expat in the Netherlands';
export const title = 'CV template for expats in the Netherlands — local conventions, foreign credentials';
export const description =
  'For internationals working in the Netherlands. Which conventions matter, and how to frame your foreign education correctly.';
export const keywords = ['expat CV Netherlands', 'CV for international Netherlands', 'kennismigrant CV', 'Dutch CV expat'];
export const hero =
  'A CV from Spain, India, or the US follows different conventions than a Dutch one. Which differences matter, and which adjustments actually improve your response rate.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'What\'s different in the Netherlands',
    body: 'Length: one to two pages, not five (Indian style) or strictly one (American). No marital status, no religion. Birth date optional. No "Career Objective" — a short two-sentence profile summary. Numbers with moderation; Dutch readers are sceptical of heavy marketing claims.',
  },
  {
    heading: 'Framing foreign employers',
    body: '"Tata Consultancy Services" is recognisable to a Dutch recruiter; "Reddy Labs" isn\'t. A short parenthesis helps: "Senior Engineer — Reddy Labs (Bangalore, DSL verification, 2018–2022)".',
  },
  {
    heading: 'Language of the CV',
    body: 'English if the workplace is English-speaking, Dutch if not. Half-Dutch versions work against you. An English version alongside a Dutch version for different employers is an acceptable pattern.',
  },
];
export const exampleBullets = [
  'Profile: Senior data engineer with 8 years in fintech (Bangalore + Amsterdam). EU Blue Card holder since 2023. Looking for principal-level role in Dutch scale-ups.',
  'Bharti AXA — Senior Data Engineer (Bangalore, 2018–2022): owned ETL pipelines processing 40M events/day; led migration from on-prem Hadoop to Snowflake.',
  'Bachelor of Engineering (Bangalore Institute of Technology, 2014) — equivalent HBO-level ICT per Nuffic.',
  'Languages: English (native), Dutch (B1 — working on B2 via Nuffic course), Hindi (native).',
];
export const pitfalls = [
  'Career Objective instead of profile summary. Out of fashion in the Netherlands.',
  'Foreign employers without context. Recruiters don\'t know them all.',
  'Education without Dutch equivalency. Nuffic guidelines help with framing.',
  'Half translation. A half-Dutch CV with English bullets is irritating to recruiters.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'For foreign profiles in the Netherlands, a calm, recognisable structure helps. No design statements.',
};
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes'];
export const relatedPersonas = ['internationals'];
