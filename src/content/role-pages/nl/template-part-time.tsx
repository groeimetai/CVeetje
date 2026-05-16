import type { RolePage } from '../types';

export const slug = 'part-time';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV voor parttime werk';
export const title = 'CV-template voor parttime functie — 16, 24 of 32 uur';
export const description =
  'Een CV voor parttime werk dat je beschikbaarheid duidelijk maakt zonder defensief te klinken over waarom je niet fulltime werkt.';
export const keywords = ['CV parttime', 'CV 24 uur', 'CV part-time werk', 'CV ouders parttime'];
export const hero =
  'Parttime werken is in Nederland gangbaar — bij meer dan de helft van de banen in zorg, onderwijs en overheid. Een CV dat je beschikbaarheid bovenaan vermeld voorkomt onnodige gesprekken-via-omwegen en verlost je van het defensieve voorgesprek.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Beschikbaarheid bovenaan',
    body: 'Bij contactgegevens: "Beschikbaar 24 uur per week, voorkeur dinsdag t/m donderdag". Of: "Beschikbaar 32 uur, flexibel inzetbaar". Direct duidelijk — recruiters kunnen je matchen aan de vacature-eisen zonder gesprek.',
  },
  {
    heading: 'Niet defensief in profielsamenvatting',
    body: 'Niet "ondanks parttime werk volledig inzetbaar". Wel: "Senior projectmanager, 24 uur per week beschikbaar voor opdrachten in financiële sector." Feit op zijn plek, geen verontschuldiging.',
  },
  {
    heading: 'Wat je weglaat',
    body: 'De reden voor parttime werken (gezin, mantelzorg, neventaken). Werkgevers vragen er soms naar in een gesprek, maar dat hoeft niet op het CV. Geboortedatum is daarbij optioneel; combinatie met kinder-statuses kan vooroordelen triggeren.',
  },
];
export const exampleBullets = [
  'Contactblok: "Beschikbaar 24 uur per week; voorkeur ma–wo. Standplaats: Apeldoorn; reisbereidheid 25 km."',
  'Werkervaring volgens normale chronologie; in eerdere periodes mogelijk fulltime, recente periode parttime — beide gewoon vermeld.',
  'Geen aparte uitleg voor parttime — het is een standaard werkpatroon in Nederland.',
];
export const pitfalls = [
  'Beschikbaarheid weglaten. Levert onnodige back-and-forth in eerste fase.',
  'Defensieve framing ("ondanks de uren..."). Werkt averechts.',
  'Reden voor parttime werk uitleggen op het CV. Niet nodig.',
  'Inconsistente jaar-cijfers terwijl je parttime werkt. "Bouwde X" kan parttime opgeleverd zijn — geen probleem, hoeft niet voorzien van uitleg.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Eigen aan het werkpatroon — nuchter en zonder design-statements.',
};
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['werkzoekenden', 'herintreders'];
