import type { RolePage } from '../types';

export const slug = 'juridisch-medewerker';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'juridisch medewerker';
export const title = 'CV-voorbeeld voor juridisch medewerker — paralegal, advocaat-stagiair, bedrijfsjurist';
export const description =
  'Een CV voor de verschillende juridische rollen: paralegal, advocaat-stagiair, bedrijfsjurist, jurist arbeidsrecht of ondernemingsrecht. Met aandacht voor wat advocatuur en bedrijfsleven verschillend waarderen.';
export const keywords = [
  'CV juridisch medewerker',
  'CV paralegal',
  'CV advocaat',
  'CV bedrijfsjurist',
  'voorbeeld CV juridisch',
  'CV rechtsgeleerde',
];
export const hero =
  'Een juridisch CV werkt op twee verschillende wijzes afhankelijk van de doelmarkt. Advocatuur waardeert specialisatie, mooie klantnamen, en publicaties. Bedrijfsleven waardeert pragmatisme, sector-kennis, en wat je voor business-stakeholders hebt gedaan. Kies bewust per sollicitatie.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: rol en specialisatie',
    body: 'Welk type rol: paralegal (geen togabevoegdheid), advocaat-stagiair, advocaat-medewerker, advocaat-partner, bedrijfsjurist, in-house counsel. Welk rechtsgebied: ondernemingsrecht, arbeidsrecht, fiscaal, IE, IT-recht, vastgoed, financieel toezicht. Bevoegdheid: ingeschreven bij welke balie, beëdigd sinds welk jaar.',
  },
  {
    heading: 'Werkervaring per sector',
    body: 'Advocatuur: welke kantoren, welke afdelingen, welke type zaken, eventueel notabele cases (binnen NDA-grenzen). Bedrijfsleven: welke organisaties, welke afdelingen ondersteund, type contracten/transacties begeleid. Concrete cijfers waar mogelijk — aantal contracten per jaar, aantal aanbestedingen begeleid, omzet/transactiewaarde.',
  },
  {
    heading: 'Publicaties, sprekersrollen en netwerk',
    body: 'Voor advocatuur weegt dit zwaar. Annotaties in juridische tijdschriften, gastsprekersrollen op conferenties, lidmaatschap van VNW, JAV of NJV. Voor bedrijfsleven minder relevant, maar professional development (extra cursussen, secundaire opleiding bedrijfskunde) telt mee.',
  },
];
export const exampleBullets = [
  'Advocaat-stagiair Ondernemingsrecht bij De Brauw (2021–2024); M&A team; portefeuille van 30+ transacties, voornamelijk mid-cap.',
  'Bedrijfsjurist bij scale-up (60 → 220 FTE); eigenaar template-contractenpark, GDPR-werk, en arbeidsrechtelijke ondersteuning van HR.',
  '8 contractmodellen gestandaardiseerd voor sales-team; doorlooptijd van contract-aanvraag → ondertekening van 11 dagen naar 3.',
  'Co-auteur artikel "Toepassing Wet Bestuur en Toezicht Rechtspersonen" in Ondernemingsrecht (2023).',
  'Master Privaatrecht (Leiden, 2021); Beroepsopleiding Advocatuur (Stichting Beroepsopleiding 2023).',
];
export const pitfalls = [
  '"Juridisch werkzaam" zonder specialisatie. Het vak is gefragmenteerd; specifiek wint.',
  'Cliëntnamen claimen die onder NDA vallen. Zorg dat je dit kunt rechtvaardigen.',
  'Advocatuur-CV met bedrijfsjurist-toon (te pragmatisch, te weinig vakinhoudelijk). Of vice versa. Kies je register per doelgroep.',
  'Geen publicaties of conferentie-rollen voor advocatuur-CV op ervaren niveau. Voor partner-track tellen die zwaar.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'Juridische sector — ingetogen, professionele uitstraling is de norm. Klassieke typografie.',
};
export const context = 'Salarisindicatie 2026 (NL): advocaat-stagiair €70–95k bij top-kantoren, medior advocaat €95–145k, partner-track aparte categorie. Bedrijfsjuristen €60–110k afhankelijk van seniority en sector.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'welke-stijl-kies-je'];
export const relatedPersonas = ['werkzoekenden'];
