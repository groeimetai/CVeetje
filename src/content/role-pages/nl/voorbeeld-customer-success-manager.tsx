import type { RolePage } from '../types';

export const slug = 'customer-success-manager';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'customer success manager';
export const title = 'CV-voorbeeld voor customer success manager — retentie, expansion, klantgezondheid';
export const description =
  'Een CSM-CV dat in retention-rates, expansion-omzet en klant-portfolio-omvang spreekt. Plus het verschil tussen lichte CS en strategisch CSM-werk.';
export const keywords = [
  'CV customer success manager',
  'CV CSM',
  'CV account manager SaaS',
  'voorbeeld CV customer success',
  'CV retentie SaaS',
];
export const hero =
  'CSM is geen account-management. Een CSM wordt afgerekend op klantgezondheid en logo-retentie, niet op nieuwe deals. Het CV moet die focus uitstralen — retention-rates, expansion-omzet per account, en het gehanteerde gezondheidsmodel.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: portfolio en segment',
    body: 'Hoe groot je klant-portfolio (aantal accounts, totale ARR onder beheer), welk segment (SMB / mid-market / enterprise), welke productcategorie (B2B SaaS, B2B services, fintech). Twee zinnen profielsamenvatting.',
  },
  {
    heading: 'Werkervaring met retentie-cijfers',
    body: 'Per rol: portfolio-grootte, gross retention rate (GRR), net retention rate (NRR), expansion-omzet, eventueel logo-churn. "Beheerde klanten" is leeg; "Eigenaar 35 mid-market-accounts (€2.8M ARR); GRR 94%, NRR 116% in 2024" is sterk.',
  },
  {
    heading: 'Gezondheidsmodel en tooling',
    body: 'Welk customer-health-scoring-model gebruikte je (usage-based, NPS-based, milestone-based, samengesteld), welke tooling (Gainsight, ChurnZero, Catalyst, Totango, Pendo, Mixpanel). QBR-cadens (kwartaal vs. half-jaarlijks), playbook-werk, escalation-protocols.',
  },
];
export const exampleBullets = [
  'CSM voor 35 mid-market-accounts (€2.8M ARR); GRR 94%, NRR 116% in 2024.',
  'Bouwde customer-health-scoring v2 met data-team; 18% accurater bij voorspellen van renewal-risico\'s.',
  'Geleid 4 enterprise QBR\'s per kwartaal met C-level klant-stakeholders.',
  'Co-led expansion-pilot met sales; €450k upsell-omzet uit playbook-aanpak in 2024.',
  'Tools: Gainsight, Pendo, Salesforce, Slack, Loom. Health-model: samengesteld (usage + sentiment + milestone).',
  'BBA International Business (Hogeschool Rotterdam, 2017); Pavilion CS Foundations (2023).',
];
export const pitfalls = [
  '"Beheerde klanten" zonder cijfers. CSM is een metric-vakgebied.',
  'Sales-cijfers in plaats van retentie-cijfers. Dat is de fout die CSM\'s een AM-vibe geeft.',
  'Geen gezondheidsmodel-vermelding. Voor seniorere CSM-rollen is dat verwachte methodologie.',
  'Net retention rate vergeten. NRR > 100% is het belangrijkste bewijs van strong CS.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'CSM-werk leeft in relatie-context. Een nuchter maar moderne CV past bij die positie.',
};
export const context = 'Salarisindicatie 2026 (NL): junior CSM €45–60k, medior €60–80k, senior/enterprise €80–110k OTE. Variabele component meestal 15–25%.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['werkzoekenden'];
