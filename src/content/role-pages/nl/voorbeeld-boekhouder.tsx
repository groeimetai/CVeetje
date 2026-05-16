import type { RolePage } from '../types';

export const slug = 'boekhouder';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'boekhouder';
export const title = 'CV-voorbeeld voor boekhouder — administratie, software, NEN-certificering';
export const description =
  'Een boekhouder-CV dat softwarekennis, ervaring met aangiftes en eventueel sector-specialismen toont. Plus hoe je het onderscheid maakt tussen administratief medewerker, boekhouder en accountant.';
export const keywords = [
  'CV boekhouder',
  'CV administratief medewerker',
  'CV financieel administrateur',
  'voorbeeld CV boekhouding',
  'CV Exact Online',
  'CV Twinfield',
];
export const hero =
  'Een boekhouder-CV werkt op drie assen: welke software, welk type bedrijf (MKB, retail, productie, holdings), en hoe ver in de keten ga je (van factuur boeken tot complete jaarwerk inclusief BTW-aangifte en samenstellingsverklaring).';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Software bovenaan',
    body: 'Welke pakketten kun je: Exact Online, Twinfield, AFAS, Visma, SnelStart, Yuki, e-Boekhouden. Drie tot vijf die je actief gebruikt. Specialistisch: Unit4, Microsoft Dynamics, SAP Business One voor grotere bedrijven.',
  },
  {
    heading: 'Werkervaring met scope-aanduiding',
    body: 'Per werkgever: type onderneming, aantal mutaties per maand of omzet-orde-grootte, welk deel van het werk jij deed. "Volledige boekhouding voor MKB-bedrijf €4M omzet (van facturatie tot BTW-aangifte en deelname samenstellingsverklaring)" is sterk. "Voerde administratie" is leeg.',
  },
  {
    heading: 'Specialisaties als plus',
    body: 'BTW-aangiftes, intracommunautaire transacties, internationale verloning, controle- of audit-ervaring. Sector-specialisaties (horeca, bouw, zorg, e-commerce, real-estate) maken verschil bij specifieke werkgevers.',
  },
];
export const exampleBullets = [
  'Hoofd administratie voor MKB-groep van 3 bv\'s (totaal €12M omzet, 80 FTE); volledige financi&euml;le cyclus inclusief consolidatie.',
  'Boekhouder bij accountantskantoor (2020–2024); portefeuille van 22 MKB-klanten in horeca en retail; voorbereiding samenstellingsverklaringen.',
  'Implementatie Exact Online voor klant met €6M omzet — migratie vanaf SnelStart, geactiveerd Q3 2024.',
  'Tools: Exact Online, Twinfield, AFAS Profit, Yuki. Excel-modellering op gevorderd niveau.',
  'NEMACC (Nemas Boekhouder) 2018; bezig met MKB-accountant (NBA) — verwacht 2027.',
];
export const pitfalls = [
  'Geen software-specifieke kennis vermeld. Software-overstap is de duurste training voor een werkgever.',
  'Functietitel "boekhouder" zonder scope-onderscheid. Junior administrateur-werk is anders dan zelfstandig assistant-accountant-werk.',
  'Sector-specialisatie verzwegen. Een horeca-boekhouder kent kassakoppelingen, een bouw-boekhouder kent OB-verleggingsregelingen — beide weegt.',
  'Geen volume-indicatie. Een MKB-onderneming van €1M omzet is een andere wereld dan een MKB-groep van €20M.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'Boekhouding-werkgevers waarderen rust en precisie in een CV. Geen visuele experimenten.',
};
export const context = 'Salarisindicatie 2026 (NL): junior boekhouder €30–40k, ervaren €40–55k, hoofd administratie €55–75k, assistent-accountant €45–65k.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'welke-stijl-kies-je'];
export const relatedPersonas = ['werkzoekenden'];
