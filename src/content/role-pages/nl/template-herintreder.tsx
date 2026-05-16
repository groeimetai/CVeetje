import type { RolePage } from '../types';

export const slug = 'herintreder';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV voor herintreder';
export const title = 'CV-template voor herintreder — gat eerlijk benoemd, focus naar voren';
export const description =
  'Voor wie terugkeert na mantelzorg, ziekte, sabbatical of gezinszorg. Hoe je het gat in je CV eerlijk benoemt zonder defensief te klinken.';
export const keywords = [
  'CV herintreder',
  'CV gat in CV',
  'CV na mantelzorg',
  'CV na zwangerschap',
  'CV na burn-out',
  'CV na sabbatical',
];
export const hero =
  'Een onverklaard gat in je CV is een grotere afwijzingsrisico dan een eerlijk benoemd gat. Eén regel lost het meeste op. De aannames die mensen anders zelf invullen zijn vaak erger dan de werkelijkheid.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'De formule',
    body: '"[Categorie], [periode]." — optioneel met één extra zin context. Voorbeelden: "Mantelzorg ouders, januari 2022 – september 2023." "Sabbatical / heroriëntatie, maart 2024 – heden." "Ouderschapsverlof + part-time afbouw, 2021 – 2023." "Herstel na burn-out, mei 2023 – februari 2024."',
  },
  {
    heading: 'Wat je in de pauze deed kan meetellen',
    body: 'Een cursus gevolgd, vrijwilligerswerk gedaan, taal geleerd, gezin gemanaged. Voor zorg- en mensgerichte rollen kan een mantelzorg-passage juist sterk werken. Een korte bullet eronder: "Combineerde met X dagen per week vrijwilligerswerk bij Y."',
  },
  {
    heading: 'Motivatiebrief draagt extra gewicht',
    body: 'Voor een herintreder is de motivatiebrief vaak belangrijker dan voor een doorlopend-werkende kandidaat. Daar leg je je verhaal uit zoals een CV niet kan. Niet defensief, niet uit excuus, maar zelfverzekerd.',
  },
];
export const exampleBullets = [
  'Profielsamenvatting: Senior verpleegkundige met 12 jaar ervaring. Tussen 2022–2024 mantelzorg voor ouder. Sinds februari 2024 terug op de arbeidsmarkt, zoek IC- of MC-functie in Apeldoorn en omgeving.',
  'Mantelzorg ouder (jan 2022 – sept 2023). Tweede helft combinatie met vrijwilligerswerk bij Stichting De Schans (40 uur/maand).',
  'Bijscholing tijdens en na pauze: ABCDE-cursus (2023, online), reanimatie-update (2024), medicatieveiligheid (2025).',
  'Werkervaring vóór pauze: 12 jaar in volgorde van recent → oud, met laatste rol uitgebreid beschreven.',
];
export const pitfalls = [
  'Onverklaard gat laten. Vragen die in de hoofd van de recruiter blijven hangen wegen zwaar.',
  '"Helaas" of andere defensieve woorden. Feit op zijn plek, geen meta-emotie.',
  'Vrijwilligerswerk opkloppen tot "adviseur bij stichting" als je elke woensdag een uurtje meedacht.',
  'Te lange uitleg over de pauze. Eén regel volstaat — uitgebreidere uitleg in de motivatiebrief.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Rustige professionaliteit zonder design-statements. Maakt het gemakkelijker om het verhaal te lezen.',
};
export const relatedBlogSlugs = ['herintreden-na-pauze', '55-plus-arbeidsmarkt-cv', 'cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['herintreders'];
