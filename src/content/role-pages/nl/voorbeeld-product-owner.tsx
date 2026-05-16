import type { RolePage } from '../types';

export const slug = 'product-owner';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'product owner';
export const title = 'CV-voorbeeld voor product owner — backlog, business value, stakeholders';
export const description =
  'Een PO-CV dat product-impact toont in plaats van proces-jargon. Welke producten, welk team, welke beslissingen, welke uitkomst.';
export const keywords = [
  'CV product owner',
  'CV PO',
  'voorbeeld CV product management',
  'CV scrum product owner',
  'CV product manager',
];
export const hero =
  'Een PO-CV vol jargon ("ceremoniemeester", "value stream optimization") zegt minder dan een PO-CV met één concreet product-besluit en zijn uitkomst. De rol leeft in dilemma\'s, niet in frameworks.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: producten en team-context',
    body: 'Aan welke producten werkte je, welke team-grootte, welk type product (consumer-facing, internal tooling, B2B SaaS, marketplace). Twee zinnen profielsamenvatting die je domein en je beslissingsniveau positioneert.',
  },
  {
    heading: 'Werkervaring met beslissingen',
    body: 'Per rol: bedrijf, product, team-grootte, key besluiten die je hebt genomen, en hun uitkomst. "Verfijnde backlog" is niet sterk. "Besloot in Q2 2024 om het bestaande check-out-pad door te ontwikkelen ipv een nieuwe lite-versie te bouwen; resulteerde in cart-abandonment van 71% naar 58%" is sterk.',
  },
  {
    heading: 'Stakeholders en metrics',
    body: 'Wie waren je stakeholders (C-level, engineering, sales, support), welke product-metrics stuurde je op (activatie, retentie, conversie, revenue per user). Tooling: Jira, Linear, Productboard, Amplitude, Mixpanel.',
  },
];
export const exampleBullets = [
  'PO voor check-out + payments team (8 engineers, 1 designer) van leading Dutch e-commerce; pakte cart-abandonment van 71% naar 58%.',
  'Roadmap-ownership voor onboarding-product; activatie-rate van 34% naar 51% in 12 maanden door drie experimenten.',
  'Co-defined product-strategie 2025 met CPO en engineering-leads; bouwde quartaal-OKR-framework dat sinds Q1 2025 standaard is.',
  'Tools dagelijks: Jira, Productboard, Amplitude, Figma (review), Notion. Methodologie: continuous discovery (Teresa Torres-aanpak).',
  'PSPO I + II (Scrum.org); bezig met PSPO III.',
];
export const pitfalls = [
  'Ceremoniemeester-jargon zonder concrete beslissingen. "Faciliteerde stand-ups" is geen PO-werk, dat is scrum-master-werk.',
  'Te veel proces ("hanteerde SAFe"), te weinig product. Welke beslissingen, welke uitkomsten?',
  'Engineer-aantal vermelden zonder design en data. Een PO werkt met een team, niet alleen met engineers.',
  'Geen metrics-eigenaarschap. Welke metrics had jij verantwoordelijkheid over, en wat deed je ermee?',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Product owners zitten tussen tech en business in. Een nuchtere maar moderne layout past bij die positie.',
};
export const context = 'Salarisindicatie 2026 (NL): junior PO €55–70k, medior €70–90k, senior €90–115k, Lead/Group PO €115k+.';
export const relatedBlogSlugs = ['product-owner-team-cvs', 'cv-op-maat-in-2-minuten', 'welke-stijl-kies-je'];
export const relatedPersonas = ['product-owners', 'werkzoekenden'];
