import type { RolePage } from '../types';

export const slug = 'logistiek-medewerker';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'logistiek medewerker';
export const title = 'CV-voorbeeld voor logistiek medewerker — magazijn, distributie, warehouse';
export const description =
  'Een logistiek-CV dat heftruckcertificaat, magazijnsystemen, en concrete operationele bijdrage toont. Inclusief de juiste bewijsstukken voor uitzendbureaus.';
export const keywords = [
  'CV logistiek medewerker',
  'CV magazijnmedewerker',
  'CV heftruckchauffeur',
  'voorbeeld CV logistiek',
  'CV warehouse',
  'CV distributie',
];
export const hero =
  'Een logistiek-CV bewijst zich met certificaten en ervaring met concrete systemen. Recruiters in de logistiek (vaak uitzendbureaus) hebben weinig tijd — een helder, kort CV met de juiste keuringen voorop scoort beter dan een uitgebreid CV waar de essentialia in zit verstopt.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Certificaten direct zichtbaar',
    body: 'Heftruck-certificaat (geldig tot datum), VCA, ADR voor gevaarlijke stoffen, eventueel reachtruck of EPT. Onder of naast je contactgegevens — niet onderaan het CV. Voor logistiek-uitzendbureaus is dit een binair filter.',
  },
  {
    heading: 'Werkervaring met systemen en volumes',
    body: 'Per werkgever: bedrijf, locatie, periode, welke functie, welk WMS-systeem (SAP EWM, JDA, Manhattan, eigen ERP), welke productcategorie, en eventueel volume (regels/uur, orderpicks per dag). "Picker bij DC" is zwak; "Order picker bij DC Bol.com Waalwijk; WMS Manhattan; gemiddeld 180 regels/uur op piek" is sterk.',
  },
  {
    heading: 'Beschikbaarheid en flexibiliteit',
    body: 'Avond-/nacht-/weekend-beschikbaarheid expliciet vermelden. Eigen vervoer ja/nee — bij DC-locaties buiten stadcentra weegt dat. Werktijden waar je voor open staat.',
  },
];
export const exampleBullets = [
  'Heftruck-certificaat geldig tot maart 2027; reachtruck-certificaat; VCA Basis (2023, verloopt 2033).',
  'Order picker bij DC Bol.com Waalwijk (2022–2024); WMS Manhattan; gemiddeld 180 regels/uur op piek.',
  'Senior magazijnmedewerker bij Heineken Zoeterwoude; SAP EWM; verantwoordelijk voor inkomende paletten en kwaliteitscontrole.',
  'Avond- en weekend-flexibiliteit; eigen vervoer; bereid tot ploegendienst.',
  'MBO Logistiek Medewerker niveau 2 (ROC, 2019). NLT-cursus magazijntechniek 2024.',
];
export const pitfalls = [
  'Certificaten onderaan in plaats van bovenaan. Recruiters scrollen vaak niet.',
  'Geen WMS- of ERP-naam. Magazijnsystemen verschillen behoorlijk; gewenning aan het juiste systeem scheelt drempel.',
  'Vage werkervaring zonder volume of productcategorie. Een DC voor cosmetica is een andere wereld dan industrieel.',
  'Beschikbaarheid niet vermeld. Het is vaak het tweede filter na certificaten.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'Voor logistiek wint een functioneel, hapklaar CV. Geen design-statements nodig.',
};
export const context = 'Salarisindicatie 2026 (NL): magazijnmedewerker €2.300–€2.800 bruto/maand, gespecialiseerd (forklift, ADR) €2.700–€3.300. Onregelmatigheidstoeslagen, prestatie-bonussen.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'recruiter-aan-het-woord'];
export const relatedPersonas = ['werkzoekenden'];
