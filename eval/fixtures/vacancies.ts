/** Fictieve vacatureteksten voor de evaluatie. */

export interface VacancyFixture {
  id: string;
  language: 'nl' | 'en';
  text: string;
}

export const VACANCIES: VacancyFixture[] = [
  {
    id: 'tech-frontend-nl',
    language: 'nl',
    text: `Senior Frontend Developer — FinTech Nova, Amsterdam (hybride)

Over de rol
Je bouwt mee aan ons beleggingsplatform voor 200.000 klanten. Je werkt in een team van 8 met React, TypeScript en GraphQL, en je bewaakt de toegankelijkheid (WCAG 2.1 AA).

Wat vragen wij
- 5+ jaar ervaring met React en TypeScript
- Ervaring met design systems
- Je coacht graag andere developers
- Pré: ervaring in de financiële sector

Wat bieden wij
- €5.000 – €6.800 bruto per maand
- 28 vakantiedagen, thuiswerkbudget`,
  },
  {
    id: 'zorg-verpleegkundige-nl',
    language: 'nl',
    text: `Verpleegkundige Interne Geneeskunde — Ziekenhuis Rijnmond, Rotterdam

Je verleent zorg aan patiënten op de afdeling interne geneeskunde. Je werkt nauw samen met artsen en paramedici.

Gevraagd
- Afgeronde HBO-V en BIG-registratie
- Ervaring in een ziekenhuis is een pré
- Bereidheid tot onregelmatige diensten

Wij bieden
- Salaris conform CAO Ziekenhuizen (FWG 50)
- Opleidingsbudget`,
  },
  {
    id: 'data-analyst-en',
    language: 'en',
    text: `Junior Data Analyst — Bloom Retail Group, Amsterdam

You will turn sales and operations data into dashboards for store managers.

Requirements
- Solid SQL; Python is a plus
- Experience with Power BI or Tableau
- Strong communication skills; you can explain data to non-technical colleagues
- Retail or hospitality background is a plus

We offer
- €3,400 – €4,200 gross per month
- Training budget and mentoring`,
  },
  {
    id: 'sales-accountmanager-nl',
    language: 'nl',
    text: `Accountmanager Industrie — Precision Components NL, Eindhoven

Je beheert en laat een portefeuille van zakelijke klanten in de maakindustrie groeien.

Gevraagd
- HBO werk- en denkniveau, commerciële opleiding
- 3+ jaar B2B-verkoopervaring
- Kennis van Salesforce
- Goede beheersing van Duits is een pré

Aanbod
- Vast salaris + bonus, leaseauto`,
  },
];

/** Welke profiel × vacature-combinaties de eval draait (plus elk profiel zonder vacature). */
export const CASES: Array<{ profile: string; vacancy: string | null; creativity: 'conservative' | 'balanced' | 'creative' | 'experimental' }> = [
  { profile: 'senior-dev-nl', vacancy: 'tech-frontend-nl', creativity: 'balanced' },
  { profile: 'junior-zorg-sparse', vacancy: 'zorg-verpleegkundige-nl', creativity: 'conservative' },
  { profile: 'career-switcher-en', vacancy: 'data-analyst-en', creativity: 'creative' },
  { profile: 'sales-gap', vacancy: 'sales-accountmanager-nl', creativity: 'balanced' },
  { profile: 'senior-dev-nl', vacancy: null, creativity: 'experimental' },
];
