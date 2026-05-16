import type { RolePage } from '../types';

export const slug = 'scrum-master';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'scrum master';
export const title = 'CV-voorbeeld voor scrum master — team-coach, impediment-remover, agile-adviseur';
export const description =
  'Een scrum-master-CV dat verder gaat dan "facilteerde ceremonies". Welke teams gecoacht, welke maturity-stijging bereikt, welke knipsels uit het werk.';
export const keywords = [
  'CV scrum master',
  'CV agile coach',
  'voorbeeld CV scrum',
  'CV team coach',
  'CV PSM Scrum.org',
];
export const hero =
  '"Facilteerde stand-ups en retrospectives" is geen scrum-master-werk — dat is dat van een meeting-host. Een echte scrum master coacht teams van een lager naar een hoger agile-maturity-niveau, ruimt impediments op, en helpt PO\'s scherper te kiezen. Het CV moet die diepte tonen.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: team-type en maturity',
    body: 'Welk type teams gecoacht: greenfield-engineering, legacy-modernisering, business-team (sales/marketing), of regulatory (finance/healthcare). Welk maturity-niveau bij start, waar gebracht. Welk framework (Scrum, Kanban, Scrumban, SAFe).',
  },
  {
    heading: 'Werkervaring met concrete uitkomsten',
    body: 'Per opdracht: team-grootte, situatie bij aankomst, wat je hebt veranderd, welke meetbare uitkomst. "Hielp team van 9 engineers van 3-weken-naar-2-weken sprints; predictability index van 64% naar 87%" is sterk. "Werkte als scrum master" is leeg.\n\nVoor consultants/freelancers: per klant een korte case.',
  },
  {
    heading: 'Certificeringen en gemeenschap',
    body: 'PSM I/II/III (Scrum.org), CSM (Scrum Alliance), PSPO als je ook PO-werk hebt gedaan, SAFe Scrum Master (SSM), eventueel Agile Coach-certificaten. Conferentie-rollen, meetup-organizing, blog of artikelen — voor seniors weegt dit mee.',
  },
];
export const exampleBullets = [
  'Scrum master voor 2 product-teams bij scale-up (totaal 14 engineers + 2 PO\'s); team predictability index van 64% naar 87% in 6 maanden.',
  'Coachte PO door eerste maand in rol — focus op story-splitting, prioritisering, en stakeholder-management.',
  'Faciliteerde scrum-overgang van waterfall-team bij verzekeraar; 9 maanden traject; ge&iuml;ntegreerd team in normale sprintritme.',
  'Spreker AgileTour Amsterdam 2024 over "Scrum in compliance-zware omgevingen".',
  'PSM II (2022), PSPO I (2023); bezig met PSM III. Lid Scrum.org community.',
];
export const pitfalls = [
  '"Facilteerde ceremonies" zonder uitkomst. Dat is meeting-werk, niet scrum-master-werk.',
  'Te veel jargon ("removed impediments by leveraging psychological safety frameworks"). Wat heb je concreet veranderd?',
  'Geen team-context. Een scrum master voor een greenfield engineering-team werkt anders dan voor een banken-team in een 200-FTE waterfall-cultuur.',
  'Certificeringen zonder ervaring. PSM I haal je in een dag; bewijs in werk weegt zwaarder.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Scrum masters zitten tussen tech en business. Een nuchter, niet-bombastisch CV past bij coaching-rol.',
};
export const context = 'Salarisindicatie 2026 (NL): junior scrum master €45–60k, medior €60–80k, senior €80–105k, agile coach (vaak interim) €600–€1.000/dag.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'product-owner-team-cvs'];
export const relatedPersonas = ['werkzoekenden', 'product-owners'];
