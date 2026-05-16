import type { RolePage } from '../types';

export const slug = 'financieel-adviseur';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'financieel adviseur';
export const title = 'CV-voorbeeld voor financieel adviseur — vakdiploma\'s, beleggingsexpertise, klantsegment';
export const description =
  'Een CV voor financieel adviseurs, hypotheekadviseurs en pensioenadviseurs. Wft-modules zichtbaar, klantsegment expliciet, en wat je echt voor klanten hebt bereikt.';
export const keywords = [
  'CV financieel adviseur',
  'CV hypotheekadviseur',
  'CV pensioenadviseur',
  'CV Wft',
  'CV vermogensbeheer',
  'voorbeeld CV bank',
];
export const hero =
  'Een financieel-adviseur-CV staat of valt met certificering. Welke Wft-modules heb je, welk niveau, welk klantsegment bedien je, en wat heb je voor concrete klanten of portefeuilles opgebouwd. Diploma\'s zonder klant-kant zijn een lege rugzak.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Wft-modules direct zichtbaar',
    body: 'Naam, contact, en daaronder direct: welke Wft-modules ben je vakbekwaam voor (Basis, Consumptief Krediet, Hypotheek, Vermogen, Pensioen, Inkomen, Zorgverzekering). Een werkgever in de financiële dienstverlening checkt dit als eerste filter. Direct daaronder of in profielsamenvatting: welk klantsegment (particulier, MKB, vermogend particulier, expat, ondernemer).',
  },
  {
    heading: 'Werkervaring met portefeuille-context',
    body: 'Per werkgever: bank/verzekeraar/intermediair, klantsegment, beheerd vermogen of klanten in beheer. "Adviseerde particulieren" is zwak; "Beheerde portefeuille van 350 particuliere klanten met gemiddeld vermogen €450k, jaarlijkse review-cyclus en geïnitieerde herallocatie bij rentewendingen 2023" is sterk.\n\nIn de financiële sector is het normaal te benoemen welk type adviesproduct je bediende. Wees specifiek over hypotheek-volume, pensioen-aantallen, verzekeringspolissen.',
  },
  {
    heading: 'Permanente educatie (PE)',
    body: 'PE-status moet expliciet vermeld. "PE-eisen 2025 voldaan", inclusief eventuele extra cursussen. Werkgevers in deze sector zijn doordrongen van compliance — het zien dat jij dat ook bent, scheelt drempel.',
  },
];
export const exampleBullets = [
  'Wft Basis, Hypotheek, Consumptief Krediet, Vermogen, Pensioen — vakbekwaamheid 2024 vernieuwd.',
  'Beheerde portefeuille van 280 particuliere klanten bij Rabobank Apeldoorn; gemiddeld vermogen €380k.',
  'Adviseerde 95 hypotheek-aanvragen in 2024 (volume €38M); doorlooptijd gemiddeld 14 dagen offerte → akkoord.',
  'Eerste-aanspreekpunt voor 22 MKB-klanten bij ABN AMRO; combinatie van bedrijfskrediet en directie-pensioen.',
  'PE-uren 2025 voldaan; aanvullende cursus duurzaam beleggen en MiFID II-klantsegmentatie afgerond.',
  'WO Bedrijfseconomie (UvT, 2012); CFA Level II (2018).',
];
export const pitfalls = [
  'Wft-modules niet specifiek vermeld. "Vakbekwaam" is te vaag — welke modules?',
  'Geen klantsegment-aanduiding. Een adviseur voor particulieren is een andere rol dan voor vermogenden of voor MKB.',
  'Volume-claims zonder context. "€100M onder beheer" zonder team-grootte of periode is zacht.',
  'PE-status vergeten. Het is een binaire ja/nee — afwezigheid weegt extra zwaar.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'Financiële sector verwacht ingetogen, professionele uitstraling. Een nuchtere typografie spiegelt het vakgebied.',
};
export const context =
  'Salarisindicatie 2026 (NL): junior adviseur €38–48k, ervaren €48–70k, senior/vermogensbeheer €70–110k. Provisie/bonus afhankelijk van werkgever en advieslijn.';
export const relatedBlogSlugs = [
  'cv-op-maat-in-2-minuten',
  'welke-stijl-kies-je',
];
export const relatedPersonas = ['werkzoekenden'];
