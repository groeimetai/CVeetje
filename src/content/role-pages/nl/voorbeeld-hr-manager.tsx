import type { RolePage } from '../types';

export const slug = 'hr-manager';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'HR manager';
export const title = 'CV-voorbeeld voor HR manager — beleid, operatie, of business partner';
export const description =
  'Een HR-CV dat de drie verschillende HR-werelden niet door elkaar haalt: HR-beleid, HR-operatie, en HR-business-partner. Plus wat per type werkgever telt.';
export const keywords = [
  'CV HR manager',
  'CV HR business partner',
  'CV personeelszaken',
  'voorbeeld CV HR',
  'CV HR adviseur',
];
export const hero =
  'HR is geen één-vak. Een HR-CV dat "ik doe HR" zegt, valt onder de radar. Een HR-CV dat plaatst wat je doet — beleid voor een groot bedrijf, operationele organisatie voor een MKB-eigenaar, of business-partner-rol voor een scale-up — laat direct zien dat je weet waar je past.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: je HR-niche',
    body: 'Welk type HR — strategisch beleid, operationele organisatie, business-partner, comp&ben, talent acquisition, learning & development, employee relations. Welke organisatie-omvang. Welk type sector. Twee zinnen.',
  },
  {
    heading: 'Werkervaring per niche',
    body: 'Voor beleid: welke regelingen heb je ontworpen of herzien. Voor operatie: welke processen heb je opgezet, met welke loonadministratie-partij gewerkt. Voor business-partner: welke teams ondersteund, welke restructure of expansion-traject begeleid. Concrete cijfers waar mogelijk: hoeveel FTE in scope, welke FTE-groei begeleid, welke turn-over verbeterd.',
  },
  {
    heading: 'Compliance en wetgeving',
    body: 'Werkgever in Nederland verwacht kennis van: cao\'s, WAB, transitievergoedingen, AVG voor HR-data, EU-richtlijn loontransparantie (2026). Internationaal: ervaring met expat-trajecten, 30%-regeling, kennismigranten.',
  },
];
export const exampleBullets = [
  'HR business partner voor engineering-organisatie van 80 → 220 FTE bij scale-up (3 jaar); ondersteunde 4 hiring-managers + 1 CTO.',
  'Designed en uitgerold nieuw performance-management framework (kwartaal-OKRs + ge&iuml;ntegreerde reviews); 92% adoptie binnen 6 maanden.',
  'Co-led restructure 2024 (12% reductie organisatie); coordineerde sociaal plan, transitievergoedingen, herplaatsing.',
  'Ervaring met loon (Visma, AFAS), recruitment (Greenhouse), engagement (Officevibe), learning (Workday Learning).',
  'WO HRM (Tilburg, 2014); CIPD Level 5; CEDR mediation training (2023).',
];
export const pitfalls = [
  '"Verzorgde HR" zonder niche. HR-werk is drie verschillende vakken; kies welk je doet.',
  'Generieke skills ("communicatief sterk, empathisch"). Iedereen schrijft dat — bewijs het in werkervaring.',
  'Geen FTE-orde-grootte. HR voor 30 FTE is een andere wereld dan voor 3.000.',
  'Cao\'s en wetgeving niet vermeld. Voor Nederlandse HR is dat verwachte basiskennis.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'HR-werkgevers waarderen rustige professionaliteit. Geen visuele uitspattingen.',
};
export const context = 'Salarisindicatie 2026 (NL): HR-adviseur €45–60k, HR business partner €60–85k, HR manager €75–105k, Head of People €105–140k.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'welke-stijl-kies-je'];
export const relatedPersonas = ['werkzoekenden'];
