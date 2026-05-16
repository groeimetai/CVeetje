import type { RolePage } from '../types';

export const slug = 'expat';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV voor expat / international in Nederland';
export const title = 'CV-template voor expat — Nederlands of Engels CV voor Nederlandse arbeidsmarkt';
export const description =
  'Voor internationals die in Nederland willen werken. Welke conventies tellen, en hoe je je buitenlandse opleiding correct framet.';
export const keywords = [
  'CV expat Nederland',
  'Dutch CV for international',
  'CV kennismigrant',
  'CV buitenlandse opleiding',
  'CV vertalen Nederlands',
];
export const hero =
  'Een CV uit Spanje, India of de VS volgt andere conventies dan een Nederlands CV. Welke verschillen tellen, en welke aanpassingen daadwerkelijk je response-rate verhogen.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Wat anders is in Nederland',
    body: 'Lengte: een tot twee pagina&apos;s, geen vijf (Indiase stijl) of strikt &eacute;&eacute;n (Amerikaanse). Geen burgerlijke staat, geen religie. Geboortedatum optioneel. Geen "Career Objective" — een korte profielsamenvatting van twee zinnen. Cijfers met mate; Nederlandse argwaan over te veel marketing-claims.',
  },
  {
    heading: 'Buitenlandse werkgevers framen',
    body: '"Tata Consultancy Services" is voor een Nederlandse recruiter herkenbaar; "Reddy Labs" niet. Een korte parenthese helpt: "Senior Engineer — Reddy Labs (Bangalore, DSL verificatie, 2018–2022)".',
  },
  {
    heading: 'Taal van het CV',
    body: 'Engels als de werkomgeving Engels is, Nederlands als dat niet zo is. Halve Nederlandse versies werken averechts. Een Engelse versie naast een Nederlandse versie voor verschillende werkgevers is een acceptabel pattern.',
  },
];
export const exampleBullets = [
  'Profielsamenvatting (Engels): "Senior data engineer with 8 years in fintech (Bangalore + Amsterdam). EU Blue Card holder since 2023. Looking for principal-level role in Dutch scale-ups."',
  'Bharti AXA — Senior Data Engineer (Bangalore, 2018–2022): owned ETL pipelines processing 40M events/day; led migration from on-prem Hadoop to Snowflake.',
  'Bachelor of Engineering (Bangalore Institute of Technology, 2014) — equivalent HBO-niveau ICT volgens Nuffic.',
  'Talen: Engels (native), Nederlands (B1 — bezig met B2-cursus Nuffic), Hindi (native).',
];
export const pitfalls = [
  'Career Objective in plaats van profielsamenvatting. In Nederland uit de gratie.',
  'Buitenlandse werkgevers zonder context noemen. Recruiters kennen ze niet allemaal.',
  'Opleiding zonder Nederlandse equivalentie. Nuffic-richtlijnen helpen bij framing.',
  'Halve vertaling. Halve Nederlandse CV met Engelse bullets is voor recruiters irritant.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'Voor buitenlandse profielen in Nederland helpt een nuchtere, herkenbare structuur. Geen design-statements.',
};
export const relatedBlogSlugs = ['international-nederlands-cv', 'cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['internationals'];
