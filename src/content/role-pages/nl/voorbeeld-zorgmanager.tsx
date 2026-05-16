import type { RolePage } from '../types';

export const slug = 'zorgmanager';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'zorgmanager';
export const title = 'CV-voorbeeld voor zorgmanager — team, budget, kwaliteit, compliance';
export const description =
  'Een zorgmanager-CV voor team-leider, afdelingshoofd, of bestuursrolen in de zorg. Met team-omvang, budget, IGJ-context, en concrete kwaliteits-impact.';
export const keywords = [
  'CV zorgmanager',
  'CV afdelingshoofd zorg',
  'CV teamleider verpleging',
  'voorbeeld CV zorgmanagement',
  'CV zorgcoordinator',
];
export const hero =
  'Een zorgmanager-CV moet drie werelden in balans tonen: team-leiding (FTE, vakgroepen, verzuim), budget (omvang, sturing op tarief en bezetting), en kwaliteit (incidenten, IGJ-context, certificeringen). Een puur op leidinggevende skills gericht CV mist twee van de drie.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: scope',
    body: 'Welk type zorg (ziekenhuis-afdeling, VVT, GGZ, gehandicaptenzorg, thuiszorg), team-grootte in FTE, budget-omvang, en eventueel patiënten- of cliëntenaantal in scope. Twee zinnen profielsamenvatting.',
  },
  {
    heading: 'Werkervaring met meetbare impact',
    body: 'Per rol: team-grootte (FTE), budget, kerncijfers (productie, bezetting, verzuim, klanttevredenheid, incidenten). Concrete projecten: implementatie nieuw EPD, herinrichting team-roosters, overgang naar ander zorgconcept, IGJ-audit-traject. Wees specifiek over wat van jou kwam en wat van het team.',
  },
  {
    heading: 'Compliance en kwaliteit',
    body: 'IGJ-context, HKZ-certificering, NEN-7510, Wet zorg en dwang (Wzd) kennis (GGZ), Wkkgz-rapportage. Voor BIG-registratie houdende managers: BIG-nummer vermelden. Bijscholing relevant: leiderschap-cursus, financieel-management-zorg.',
  },
];
export const exampleBullets = [
  'Afdelingshoofd IC + Medium Care van 4 ziekenhuis-locaties (totaal 78 FTE + 14 stagiairs); budget €8.4M; verzuim van 7.8% naar 5.2% in 18 maanden.',
  'Verantwoordelijk voor EPD-migratie (HiX → ChipSoft) op afdelingen; opgeleverd binnen tijd, geen productie-uitval.',
  'IGJ-audit 2024 doorgekomen met 0 majors; co-author actie-plan voor 4 minors.',
  'Co-led herinrichting roosters tijdens piek-verzuim Q4 2023; behoud van bezetting met inzet flex-pool.',
  'BIG-registratie (verpleegkundig); MSc Management van de Zorg (Erasmus, 2020); Master Zorgleiderschap (TIAS, 2023).',
];
export const pitfalls = [
  '"Leidinggevende ervaring in de zorg" zonder cijfers. Welke schaal, welk budget?',
  'Geen kwaliteits-context. Voor zorg-werkgevers is dat een sleutel-aspect.',
  'Te veel HR-jargon ("transformationeel leider"). De zorg waardeert concreet werk boven leiderschap-buzzwords.',
  'IGJ- of Wkkgz-ervaring weglaten. Voor moderne zorgmanagers is dat erkende bekwaamheid.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'Zorg-vakgebied; rustige professionele uitstraling. Geen design-keuzes die afleiden van inhoud.',
};
export const context = 'Salarisindicatie 2026 (NL): teamleider zorg €55–75k, afdelingshoofd €75–105k, manager zorg €105–145k, RvB-zorg aparte categorie.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'welke-stijl-kies-je'];
export const relatedPersonas = ['werkzoekenden', 'hiring-managers'];
