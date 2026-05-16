import type { RolePage } from '../types';

export const slug = 'nurse';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'en';
export const label = 'nurse';
export const title = 'CV example for nurse — registration, specialisation, patient population';
export const description =
  'A strong CV for registered nurses. BIG registration, specialisations, recent training, and concrete patient-care experience — what separates "nice candidate" from "interview".';
export const keywords = ['nurse CV', 'registered nurse CV', 'BIG registration', 'ICU nurse CV', 'hospital nurse CV'];
export const hero =
  'A nurse CV must instantly clarify three things: your BIG registration and level, your specialisations, and your recent work setting. After that the content can broaden. In healthcare, an honest, structured CV with clear chronology beats any graphic experiment.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'At the top: registration and level',
    body: 'Name, contact, BIG number (publicly verifiable — employers appreciate this directly), your level (MBO-IV, HBO, nurse practitioner), and your specialisation if you have one (ICU, OR, paediatrics, psychiatry, oncology, etc.). Two-sentence profile summary: current setting and what you\'re looking for.',
  },
  {
    heading: 'Experience — specific, not summary',
    body: 'Per workplace: hospital or care institution, ward, period, concrete content. Which patient category, which procedures, which responsibilities. Healthcare recruiters want this because it tells them directly whether your experience transfers to their ward.',
  },
  {
    heading: 'Continuous learning visible',
    body: 'Healthcare changes fast. Recent courses — BLS, infection control, palliative care, ABCDE, medication safety — signal current competence. A separate "Continuous training 2024–2026" section with four or five items makes a difference.',
  },
];
export const exampleBullets = [
  'Working in ICU at Erasmus MC; typical caseload 2 patients, complex.',
  'Senior on OR ward of Antoni van Leeuwenhoek; specialised in oncological procedures.',
  'Mentor to four new colleagues in induction 2024–2025; all four progressed to independent practice.',
  'Contributed to revision of ward medication protocol — implementation September 2025.',
  'BIG registration since [year]; HBO-V completed at [school] in [year].',
  'Evening/night/weekend flexibility; experience with crisis and peak shifts.',
];
export const pitfalls = [
  'BIG number forgotten or only mentioned at the bottom. It\'s the first thing healthcare recruiters check.',
  'Generic work experience without ward type or patient category.',
  'Skills list without context. "Empathetic, stress-resistant, team player" — show it in experience, don\'t list it.',
  'No continuous training mentioned when you do it. Healthcare employers notice.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'In healthcare, calm and professional wins over design experiments.',
};
export const context = 'Salary indication 2026 (NL): MBO nurse €2,500–€3,400 gross/month, HBO €2,800–€3,900, nurse practitioner up to €5,000+. Shift allowances separate.';
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes'];
export const relatedPersonas = ['werkzoekenden'];
