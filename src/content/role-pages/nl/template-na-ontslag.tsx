import type { RolePage } from '../types';

export const slug = 'na-ontslag';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV na ontslag';
export const title = 'CV-template na ontslag — eerlijk benoemd, focus naar voren';
export const description =
  'Een CV-template voor wie na ontslag (boventalligheid, reorganisatie, persoonlijke gronden) terug op de arbeidsmarkt komt. Hoe je vooruit kijkt zonder defensief te klinken.';
export const keywords = ['CV na ontslag', 'CV reorganisatie', 'CV outplacement', 'CV transitievergoeding'];
export const hero =
  'Een CV maken na een ontslag is een specifieke fase. Niet defensief, niet uitleggerig — een feit op zijn plek, en focus op wat je nu zoekt. De motivatiebrief draagt de uitleg, niet het CV.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Profielsamenvatting met richting',
    body: 'Niet "ontslagen wegens reorganisatie en zoek nu nieuwe uitdaging". Wel: "Senior projectmanager met focus op transformatie-projecten in financiële sector. Beschikbaar per [datum]. Zoek vaste of interim-rol in midden-Nederland." Toekomst-gericht.',
  },
  {
    heading: 'Werkervaring zonder over-uitleg',
    body: 'De laatste rol vermelden met begin- en einddatum. Geen uitleg over reden van vertrek op het CV. Een recruiter ziet de einddatum, vraagt eventueel ernaar in een gesprek; dan kun je een eerlijke uitleg geven. In een motivatiebrief mag een korte context.',
  },
  {
    heading: 'Praktische aspecten zichtbaar',
    body: 'Beschikbaarheid expliciet: "Beschikbaar per [datum]" of "Direct beschikbaar". Als je een outplacement-traject volgt: vermelden mag, hoeft niet — afhankelijk van hoe waardevol je het signaal vindt. Voor seniors zonder transitievergoedings-zorgen niet relevant; voor mid-career niveau geeft het rust.',
  },
];
export const exampleBullets = [
  'Profielsamenvatting: "Senior business analyst met focus op proces-optimalisatie in zorgsector. Beschikbaar per 1 september. Zoek vaste of interim-rol; voorkeur midden-Nederland."',
  'Werkervaring: meest recente rol vermelden tot en met daadwerkelijke einddatum; geen uitleg op CV over redenen.',
  'In outplacement bij [bureau]; cv- en networking-coach loopt tot oktober.',
  'Beschikbaar voor sollicitatiegesprekken doordeweeks; remote-eerste gesprek ook mogelijk.',
];
export const pitfalls = [
  'Reden voor ontslag op het CV vermelden. Hoort niet thuis, leest defensief.',
  'Gap-periode niet benoemen. Als je drie maanden niet hebt gewerkt sinds einddatum: één regel "Heroriëntatie en sollicitatieperiode, [periode]" is sterker dan verzwijgen.',
  'Defensieve toon in profielsamenvatting. Toekomstgericht werkt beter.',
  'CV in negatief licht aanpassen. Je werkervaring is wat het is — toon dat zonder excuses.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Een rustige, professionele uitstraling die niets uit te leggen heeft.',
};
export const relatedBlogSlugs = ['herintreden-na-pauze', 'cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['werkzoekenden', 'herintreders'];
