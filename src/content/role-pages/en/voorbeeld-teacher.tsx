import type { RolePage } from '../types';

export const slug = 'teacher';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'en';
export const label = 'teacher';
export const title = 'CV example for teacher — primary, secondary, or higher education';
export const description =
  'A CV that makes teaching experience concrete. Qualifications, subjects, levels, and what you built beyond classroom hours within a school organisation.';
export const keywords = ['teacher CV', 'teacher resume', 'primary school teacher CV', 'secondary teacher CV'];
export const hero =
  'A strong teacher CV instantly answers three questions: what qualification, which levels and subjects, and what you contributed in your school organisation beyond classroom hours. Education hiring reads differently from corporate recruiting — they want pedagogical approach and your place in a school community visible.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Top: qualification, levels, subjects',
    body: 'Name, contact, then directly: which teaching qualification, what level (primary, secondary, tertiary), which subjects, which classes. A school leader scans this first and wants it findable in five seconds. After that comes a profile summary — two sentences on your teaching philosophy or recent focus.',
  },
  {
    heading: 'Experience — more than classroom hours',
    body: 'Per school: name, location, type of education, period, concrete content. Not just "taught class X" but what you did beyond: exam committee, mentoring, year-coordinator, subject head, developing new curriculum, school-wide ICT projects.\n\nThose "beyond classroom" contributions distinguish experienced teachers from starters. They\'re also the source material for any later career switch.',
  },
  {
    heading: 'Professional development and network',
    body: 'A section with recent training (workshop hours, certificates, your own learning paths) signals current pedagogy. Optionally short mentions of publications, conference talks, or your own teaching blog.',
  },
];
export const exampleBullets = [
  'Qualified history teacher (Master, Utrecht University, 2014); working in upper secondary havo/vwo.',
  'Coordinator profile projects havo 5 (2022–present): 80 students/year, supervised by six-teacher team.',
  'Designed new lesson series "Citizenship in the digital space" — part of school-wide curriculum since 2024.',
  'Section chair history (2020–2023); led PTA revision after new exam programme.',
  'School-wide coordinator assessment platform — setup and maintenance since 2021.',
  'Recent training 2025: formative assessment course (40h), peer-coaching classroom management.',
];
export const pitfalls = [
  '"Teaches" without context. Which levels, which subjects, which pedagogical approach?',
  'Qualification not explicit or not at the top. For teaching roles this is the first filter.',
  'Many years of experience but no development beyond lessons visible. School leaders often look for that breadth.',
  'Lengthy descriptions of class-by-class choices. That belongs in a conversation, not a CV.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'Education values calm, readable layouts. Visual experiments land poorly with conservative school boards.',
};
export const context = 'Salary indication 2026 (NL education CAO): primary teacher L10 €2,900–€4,700, secondary LB/LC €3,100–€5,700 depending on grade and function mix.';
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes'];
export const relatedPersonas = ['werkzoekenden'];
