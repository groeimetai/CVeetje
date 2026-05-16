import type { RolePage } from '../types';

export const slug = 'projectmanager';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'projectmanager';
export const title = 'CV-voorbeeld voor projectmanager — scope, budget, team, uitkomst';
export const description =
  'Een PM-CV dat in concrete projectkaders spreekt: scope, budget, teamomvang, doorlooptijd, opgeleverd resultaat. Plus hoe je kiest tussen waterval-, agile- of hybride methodieken op je CV.';
export const keywords = [
  'CV projectmanager',
  'CV project manager',
  'voorbeeld CV PM',
  'CV Prince2',
  'CV PMP',
  'CV scrum master vs PM',
];
export const hero =
  'Een goed projectmanager-CV leest als een portfolio. Per project: scope, budget, team, doorlooptijd, opgeleverd. Niet alle vier — minimaal drie. Een PM-CV zonder concrete projectkaders is een functietitel zonder bewijs.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: domein en methodiek',
    body: 'Welk domein (IT-implementatie, bouw, infrastructuur, marketing, M&A), welke methodiek-voorkeur, en welke certificaten (Prince2, PMP, IPMA, AgilePM, SAFe). Twee zinnen profielsamenvatting met "type projecten dat ik leid" + "voor welk publiek".',
  },
  {
    heading: 'Werkervaring als portfolio',
    body: 'Per werkgever één hoofdregel, daaronder drie tot vijf projecten als sub-items met scope-budget-team-uitkomst-formule. Voor consultants: per klant — de klantnaam telt vaak meer dan het bureau.\n\nGebruik concrete getallen: "€800k budget, team van twaalf, twaalf maanden looptijd, opgeleverd zes weken voor planning met €60k onderbesteding". Dat is een PM-bullet die een hiring manager raakt.',
  },
  {
    heading: 'Toolset en stakeholder-context',
    body: 'Welke tools: Jira, Asana, MS Project, Smartsheet, Monday. Welke stakeholder-context: stuurgroep met C-level, internationaal team, multi-vendor. Senior PMs scheiden zich onderscheiden hier — methodiek is leerbaar, stakeholder-ervaring vaak niet zonder schade.',
  },
];
export const exampleBullets = [
  'Migratie ERP (SAP → Workday HR) — €1.2M budget, team van 18 (intern + Deloitte), 14 maanden, opgeleverd binnen 3% van budget.',
  'Implementatie nieuw klantportaal voor 40.000 eindgebruikers — €450k, hybride team (waterval + agile sprints), 9 maanden.',
  'Reorganisatie callcenter-routing — €180k, team van 6, 4 maanden; first-call-resolution van 67% naar 79%.',
  'Prince2 Practitioner (2021), AgilePM Foundation (2023); IPMA-C in 2024–25.',
  'Stuurgroep-voorzitter ervaring met C-level (CFO, COO); werkt comfortabel in multi-vendor settings.',
  'Tools dagelijks: Jira, Confluence, MS Project, Power BI voor rapportage.',
];
export const pitfalls = [
  'Generieke "leidde projecten" zonder scope/budget/team/uitkomst. PM is een rol die om bewijsmateriaal vraagt.',
  'Methodiek-naam noemen zonder bewijs ("agile" als trefwoord). Welke specifieke methodiek, welk type project, welke aantoonbare ceremonies?',
  'Stuurgroep-niveau en complexiteit niet expliciet. Een €50k-project leiden is fundamenteel anders dan een €5M-project.',
  'Alle projecten succesverhalen. Een vermelding van een geleerd project met heldere reflectie is sterker dan tien glanzende cases.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'PM-rollen leven in stuurgroep-context. Een rustige, gestructureerde lay-out spiegelt de werkmodus.',
};
export const context =
  'Salarisindicatie 2026 (NL): junior PM €45–60k, medior €60–85k, senior €85–120k, programma-/portfolio-manager €120k+. Interim-tarieven €85–€175/uur afhankelijk van domein.';
export const relatedBlogSlugs = [
  'cv-op-maat-in-2-minuten',
  'welke-stijl-kies-je',
  'product-owner-team-cvs',
];
export const relatedPersonas = ['werkzoekenden', 'zzp'];
