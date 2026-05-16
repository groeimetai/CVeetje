import type { RolePage } from '../types';

export const slug = 'docent';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'docent';
export const title = 'CV-voorbeeld voor docent — basis-, voortgezet of MBO/HBO';
export const description =
  'Een CV dat onderwijservaring concreet maakt. Welke onderwijsbevoegdheid, welk niveau, welke vakgebieden, en wat je naast lesgeven hebt opgebouwd binnen een schoolorganisatie.';
export const keywords = [
  'CV docent',
  'CV leraar',
  'voorbeeld CV onderwijs',
  'CV basisschool',
  'CV voortgezet onderwijs',
  'CV MBO docent',
  'lesbevoegdheid CV',
];
export const hero =
  'Een sterk docent-CV vertelt drie dingen direct: welke bevoegdheid, welke niveaus en vakken, en wat je in je schoolorganisatie hebt bijgedragen buiten je lesuren. Onderwijsfunctionarissen lezen anders dan corporate recruiters — ze willen je inhoudelijke aanpak en je positie in een schoolgemeenschap kunnen plaatsen.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: bevoegdheid, niveaus, vakken',
    body: 'Naam, contact, en daaronder direct: welke onderwijsbevoegdheid heb je, welke graad (eerste-, tweedegraads), voor welke vakken en niveaus. Een schoolleider scant dit eerst en wil het binnen vijf seconden gevonden hebben. Pas daarna komt een profielsamenvatting — twee zinnen over je onderwijsvisie of recente focus.',
  },
  {
    heading: 'Werkervaring — meer dan lesuren',
    body: 'Per school: naam, plaats, type onderwijs, periode, en concrete inhoud. Niet alleen "lesgeven aan klas X" maar wat je daarbuiten deed: examencommissie, leerlingenbegeleiding, cohortcoördinator, vakgroep-voorzitter, een nieuw curriculum-onderdeel ontwikkeld, schoolbrede ICT- of toetsprojecten getrokken.\n\nDie "buiten lesuren"-bijdragen onderscheiden ervaren docenten van starters. Daar zit ook het materiaal voor een eventuele career switch later.',
  },
  {
    heading: 'Bijscholing en netwerk',
    body: 'Een sectie met recente nascholing (sva-uren, certificaten, eigen leerlijnen) toont dat je vakdidactiek blijft onderhouden. Eventueel een korte regel over publicaties, conferenties of een eigen blog/onderwijsproject als je die hebt.',
  },
];
export const exampleBullets = [
  'Eerstegraads bevoegd geschiedenis (Universiteit Utrecht, 2014); werkzaam in havo/vwo bovenbouw.',
  'Coördinator profielwerkstukken havo 5 (2022–heden): 80 leerlingen per jaar, begeleiding door docententeam van zes.',
  'Ontwierp nieuwe lesreeks "Burgerschap in de digitale ruimte" — sinds 2024 onderdeel van schoolbreed curriculum.',
  'Voorzitter sectie geschiedenis (2020–2023); leidde herziening PTA na invoering nieuwe examenprogramma.',
  'Schoolbrede coördinator toetsplatform — opzet en onderhoud sinds 2021.',
  'Nascholing 2025: training formatieve evaluatie (40 uur) en intervisie-traject klassenmanagement.',
];
export const pitfalls = [
  '"Geeft les" zonder context. Welke niveaus, welke vakken, welke pedagogische aanpak?',
  'Bevoegdheid niet expliciet vermeld of niet bovenaan. Voor docent-vacatures is dit het eerste filter.',
  'Veel jaren ervaring maar geen ontwikkeling buiten lessen zichtbaar. Schoolleiders zoeken vaak juist die brede inzet.',
  'Te lange omschrijvingen van leskeuzes per klas. Dat hoort in een gesprek, niet op het CV.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'In het onderwijs wint een rustige, leesbare layout. Visuele experimenten vallen verkeerd uit bij conservatieve schoolbesturen.',
};
export const context =
  'Salarisindicatie 2026 (NL onderwijs-CAO): basisschoolleraar L10 €2.900–€4.700, voortgezet onderwijs LB/LC €3.100–€5.700 afhankelijk van graad en functiemix.';
export const relatedBlogSlugs = [
  'docent-naar-developer-cv',
  'zij-instromer-cv-vertelt-verhaal',
  'cv-op-maat-in-2-minuten',
];
export const relatedPersonas = ['werkzoekenden', 'zij-instromers'];
