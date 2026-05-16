import type { RolePage } from '../types';

export const slug = 'no-experience';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'en';
export const label = 'CV with no work experience';
export const title = 'CV template with no work experience — what belongs when you have nothing yet';
export const description =
  'For school leavers, students in their first application, and returners without recent work history. How to build a credible CV without overstating anything.';
export const keywords = ['CV no experience', 'first CV template', 'student CV no experience', 'school leaver CV'];
export const hero =
  'No work experience doesn\'t mean nothing to offer. It means your CV must put other proof at the top: study projects, volunteer work, part-time jobs, personal initiatives. That\'s where your story lives.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Substitutes for work experience',
    body: 'Study projects with concrete outcomes. Part-time jobs — supermarket work counts; it proves you\'re hireable. Volunteer work with responsibility (board member, coach, events). Personal projects (digital: GitHub, blog, portfolio; physical: a small business, a school magazine).',
  },
  {
    heading: 'Profile summary with direction',
    body: 'No "enthusiastic starter". Instead: "Recent graduate HBO Business Administration specialising in supply chain. Seeking a traineeship or starter role at a production or e-commerce company with operations focus." Specific and directional.',
  },
  {
    heading: 'What you don\'t do',
    body: 'No inflated language for what you\'ve done ("led the team" for a school project). No empty phrases ("team player with passion"). No "references available upon request" — drop the line.',
  },
];
export const exampleBullets = [
  'Final project "Optimising last-mile delivery at regional e-commerce startup"; grade 8.2; recommendations adopted by client.',
  'Board member student association (treasurer, 2024); €38k budget for annual programme of 12 events.',
  'Supermarket job at Albert Heijn (2 years, part-time); supervisor in last 6 months; responsible for 4 weekend staff.',
  'Personal project: blog on career orientation for students; 2,100 unique visitors/month since 2024.',
  'Skills: Excel (advanced), Power BI (basic), English C1, German B1.',
];
export const pitfalls = [
  'Padding the CV to two pages when one is enough.',
  'Framing school phases as "work experience" — recruiters see through it.',
  'Generic hobbies. One specific interest beats five generic ones.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'With little experience, a calm, modern layout convinces more than something visually loud.',
};
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes'];
export const relatedPersonas = ['studenten', 'werkzoekenden'];
