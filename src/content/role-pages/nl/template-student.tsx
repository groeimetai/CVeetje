import type { RolePage } from '../types';

export const slug = 'student';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV voor student';
export const title = 'CV-template voor student — bijbaan, stage, eerste echte baan';
export const description =
  'Een student-CV dat klopt zonder vol te zijn van opvulwerk. Voor MBO, HBO en WO-studenten.';
export const keywords = ['CV student', 'CV mbo hbo wo', 'CV bijbaan student', 'CV stage student'];
export const hero =
  'Een goed student-CV is kort, eerlijk en richting-gevend. Je hoeft niet jaren ervaring te claimen die je niet hebt — je hoeft te tonen dat je weet wat je wilt en dat je in staat bent verantwoordelijkheid te dragen.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: opleiding en richting',
    body: 'Naam, contact, en daarna: huidige opleiding, jaar van studie, specialisatie. Profielsamenvatting in twee zinnen: wie ben je, wat zoek je. Voor stage-sollicitaties: vermeld het kalenderkwartaal waarin je stage wilt lopen.',
  },
  {
    heading: 'Drie ankerpunten: opleiding, ervaring, bijdragen',
    body: 'Opleiding (huidige + relevante eerder afgeronde, kort). Relevante ervaring (stage, bijbaan, vrijwilligerswerk, commissies). Persoonlijke bijdragen (projecten, eigen initiatieven, conferentie-deelname, gegeven workshops).',
  },
  {
    heading: 'Wat je weglaat',
    body: 'Vakkenlijst van twintig items. Hobby\'s zonder concrete inhoud. Een uitgebreide skills-sectie met dingen die je nog niet kunt. Voor MBO en HBO-studenten: maximum één pagina. WO-master-studenten met onderzoekservaring mogen anderhalve pagina.',
  },
];
export const exampleBullets = [
  'HBO Bedrijfseconomie 3e jaar (Hogeschool Utrecht), specialisatie Finance & Control; cijfergemiddelde 7.6.',
  'Stage 2024–2025 bij Rabobank Apeldoorn (3 dagen/week, 6 maanden); ondersteuning team financieel advies particulieren.',
  'Bestuurslid studievereniging FSV (2023–2024) — penningmeester; budget €28k voor activiteitenprogramma.',
  'Bijbaan supermarkt (Jumbo Apeldoorn, 2022–heden, 12 uur/week) — sinds 2024 ook coach nieuwe collega\'s.',
  'Excel (gevorderd), Power BI (basis), Engels C1, Duits B1.',
];
export const pitfalls = [
  '"Enthousiaste student met passie voor uitdagingen". Iedereen schrijft dit.',
  'Vakkenlijst opvullen. Vier vakken die echt relevant zijn voor de rol — niet meer.',
  'CV langer dan een pagina maken zonder dat er meer content is.',
  'Generieke hobby\'s. Eén specifiek iets is sterker dan vijf algemene.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Voor studenten wint warmte zonder design-overdaad. Balanced doet beide.',
};
export const relatedBlogSlugs = ['student-eerste-cv', 'cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['studenten'];
