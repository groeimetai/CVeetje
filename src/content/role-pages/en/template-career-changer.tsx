import type { RolePage } from '../types';

export const slug = 'career-changer';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'en';
export const label = 'CV for career changer';
export const title = 'CV template for career changer — a story that holds';
export const description =
  'For those changing sector or profession. How to build a CV where the switch reads as logical instead of impulsive.';
export const keywords = ['career change CV', 'career switch resume', 'career changer template', 'pivot CV'];
export const hero =
  'A career switch isn\'t a problem to hide — it\'s a story to tell. A good switcher CV acknowledges the change in the first two sentences and then puts proof of the new direction at the top.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Profile summary acknowledging the switch',
    body: 'Not "experienced professional seeking new challenge". Rather: "Former history teacher (10 years) who switched to data analysis in 2023. After bootcamp and self-study now seeking junior role combining domain knowledge with analytical work." Direct, clear about both where you came from and where you\'re heading.',
  },
  {
    heading: 'Proof of new direction up top',
    body: 'Bootcamp or training, certifications, personal projects, freelance work. This section appears before your work experience. For switchers it\'s the strongest evidence layer.',
  },
  {
    heading: 'Old role with transferable framing',
    body: 'At each old role, name what transfers explicitly. A care manager who built patient-flow dashboards, a teacher who set up the school-wide digital assessment platform — those bullets are your second-life material.',
  },
];
export const exampleBullets = [
  'Profile: Former care manager (12 years) transitioned to data analysis. Bootcamp + self-study 2024; seeking junior role where care domain knowledge and analytical work meet.',
  'Datacamp Data Analyst Track + Codaisseur Backend Bootcamp (2024); 3 portfolio projects on GitHub.',
  'Care manager at Het Akkerveld (2012–2024): built Power BI dashboards for capacity planning; worked with data team on patient flows.',
  'Volunteer work 2024–present: data analyst at youth foundation; built donation dashboard.',
];
export const pitfalls = [
  'Hiding the switch. Recruiters see through it anyway; honesty strengthens.',
  'Removing old role from chronology to look younger. Reads as manipulation.',
  'No concrete proof of new direction. "Interested in data" isn\'t the same as "completed Datacamp track + built 3 projects".',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'For switchers, calm beats flair. A sober structured CV lets the switch read logically.',
};
export const relatedBlogSlugs = ['cover-letter-without-ai-tells', 'cv-tailored-in-two-minutes'];
export const relatedPersonas = ['zij-instromers'];
