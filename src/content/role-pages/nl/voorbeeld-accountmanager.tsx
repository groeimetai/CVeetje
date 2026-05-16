import type { RolePage } from '../types';

export const slug = 'accountmanager';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'accountmanager';
export const title = 'CV-voorbeeld voor accountmanager — sales-CV dat in cijfers spreekt';
export const description =
  'Een accountmanager-CV staat of valt met cijfers. Quota, retentie, deal size, pipeline-momentum. Hier is wat erin moet zonder dat het pocheerderig wordt.';
export const keywords = [
  'CV accountmanager',
  'CV sales',
  'voorbeeld CV verkoop',
  'CV key account manager',
  'CV business development',
  'sales CV cijfers',
];
export const hero =
  'Een sales-CV zonder cijfers leest als verkoop zonder closing. Een sales-CV met overdreven cijfers leest als oneerlijke verkoop. De kunst zit ertussenin: concrete getallen, met context, en eerlijk over wat van jou was en wat van het team.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: focus en hoe je verkoopt',
    body: 'Profielsamenvatting in twee zinnen: welke sector, welk type klant (SMB / midmarket / enterprise), welk type sale (transactional / consultative / land-and-expand) en welke fase van het funnel je sterk in bent. "Senior accountmanager SaaS-midmarket DACH-regio, sterk in consultative sales met deal size €50k–€250k" is honderd keer sterker dan "ervaren accountmanager".',
  },
  {
    heading: 'Werkervaring met cijfers',
    body: 'Per rol: bedrijf, periode, regio of segment, quota (in EUR/jaar), en je realisatie als percentage of bedrag. Plus één à twee bullets met opvallende deals of nieuwe accounts. Voor seniors: ook retentiecijfers, gross retention rate, of expansion-omzet.\n\nWees eerlijk over teamcontext. "Bracht klant X binnen samen met SE-collega" verzwakt niet — het maakt je verhaal geloofwaardig.',
  },
  {
    heading: 'Sales-toolset zichtbaar',
    body: 'Welke CRM (Salesforce, HubSpot, Pipedrive), welke sales-tools (Gong, Outreach, Apollo, LinkedIn Sales Navigator), welke methodologieën (MEDDIC, Challenger, SPIN, Sandler). Drie tot vijf is genoeg.',
  },
];
export const exampleBullets = [
  '120% quota-realisatie 2024 (€1.6M tegen €1.35M target); ranked #2 in EMEA-team van 24.',
  'Closed 8 nieuwe enterprise-accounts in 2025 met gemiddelde deal size €180k; pipeline grew 3.2x YoY.',
  'Gross retention rate 94% in beheerd account-portfolio (35 klanten); upsell-omzet €620k.',
  'Co-led ABM-pilot met marketing; resulteerde in 14 SQLs uit target-accountlijst in Q4 2024.',
  'Onboarded en mentorde twee junior AEs; beide gehaald op quota in eerste volle jaar.',
  'Tools: Salesforce, Gong, Outreach, Apollo, LinkedIn Sales Navigator. Methodologie: MEDDIC + Challenger.',
];
export const pitfalls = [
  '"Verantwoordelijk voor verkoop" — dat is een functietitel, geen werkbullet. Cijfers en context.',
  'Cijfers zonder denominator. "Bracht €2M omzet" zonder team-size of quota-target zegt niets.',
  'Alle deals opklauwen als individu. Een SE of CSM had erbij geholpen — erkennen versterkt.',
  'Geen sales-methodologie of CRM-tooling vermeld. Voor commercial leaders is dat een fit-signaal.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Sterk CV zonder grafische ruis. Cijfers moeten zelf het werk doen, niet door kleurgebruik benadrukt worden.',
};
export const context =
  'Salarisindicatie 2026 (NL): junior AM €40–55k OTE, medior €55–80k OTE, senior/enterprise €80–140k+ OTE. On-target earnings vrijwel altijd met variabele component.';
export const relatedBlogSlugs = [
  'cv-op-maat-in-2-minuten',
  'recruiter-aan-het-woord',
  'welke-stijl-kies-je',
];
export const relatedPersonas = ['werkzoekenden'];
