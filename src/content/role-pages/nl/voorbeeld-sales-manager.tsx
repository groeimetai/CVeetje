import type { RolePage } from '../types';

export const slug = 'sales-manager';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'sales manager';
export const title = 'CV-voorbeeld voor sales manager — team-leiding, omzetverantwoordelijkheid, sales-strategie';
export const description =
  'Voor sales managers met team-leiding: hoe verschil je van een ervaren accountmanager. Coaching, hiring, sales-proces-ontwikkeling, en team-omzet.';
export const keywords = [
  'CV sales manager',
  'CV commercieel manager',
  'CV head of sales',
  'voorbeeld CV sales leadership',
  'CV team lead sales',
];
export const hero =
  'Een sales manager wordt afgerekend op team-prestatie, niet alleen op eigen deals. Het CV moet die verschuiving uitstralen: van individuele omzet naar team-omzet, van eigen pipeline naar pipeline-ownership, van eigen closing-skills naar hiring + coaching van anderen.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: team-grootte en omzet-verantwoordelijkheid',
    body: 'Direct zichtbaar: hoe groot is je team, welke omzet beheer je, welk sales-genre. "Sales manager B2B SaaS, team van 8 AEs, jaaromzet €4.5M target" zegt direct waar je staat.',
  },
  {
    heading: 'Werkervaring met team-cijfers',
    body: 'Per rol: team-grootte (en groei tijdens je periode), quota-realisatie van het team, hiring-prestaties (hoeveel mensen aangenomen, welke retentie), proces-verbeteringen die je hebt doorgevoerd. Coaching-werk: hoeveel team-leden heb je doorgegroeid laten promoveren.',
  },
  {
    heading: 'Sales-leadership-onderdelen',
    body: 'Hiring (interview-frameworks, scorecards), enablement (training, playbooks), forecasting (accurracy, MEDDIC-discipline), tooling (CRM-architectuur, lead-routing, attribution). Voor commercial leaders die ook strategie raken: pricing-werk, packaging-decisions, sales-marketing-alignment.',
  },
];
export const exampleBullets = [
  'Sales manager voor team van 8 AEs (groei van 4 → 8 in 18 maanden); jaaromzet team €5.2M, 108% quota-realisatie 2024.',
  'Hiring 6 AEs in 12 maanden; first-year-retentie 100%; gemiddelde time-to-productivity 4 maanden.',
  'Bouwde sales-playbook voor outbound naar enterprise; documentatie van ICP, persona\'s, objection handling.',
  'Forecast accuracy team verbeterd van ±25% naar ±9% door MEDDIC-discipline en wekelijkse pipeline-reviews.',
  'Co-led pricing-rework voor mid-market segment met CFO en CPO; resulteerde in 18% ARR-uplift per nieuwe klant.',
];
export const pitfalls = [
  'Eigen-deal-cijfers in plaats van team-cijfers. Voor managers telt team-prestatie zwaarder.',
  'Geen hiring of coaching-resultaten. Voor sales-leadership is dat de kern van het werk.',
  'Vage forecast-claims. Sales-leiders worden gemeten op forecast accuracy — wees specifiek.',
  'Geen vermelding van sales-tech-stack-keuzes. Dat onderscheidt strategisch managers van operationele.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Sterk maar niet schreeuwerig. Sales-leaders willen overkomen als gestructureerd zonder corporate-saai.',
};
export const context = 'Salarisindicatie 2026 (NL): sales manager €70–100k OTE, head of sales €100–150k OTE, VP Sales €150–250k+ OTE. Variabele component vrijwel altijd 25–50%.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'product-owner-team-cvs'];
export const relatedPersonas = ['werkzoekenden', 'hiring-managers'];
