import type { RolePage } from '../types';

export const slug = 'softwareontwikkelaar';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'softwareontwikkelaar';
export const title = 'CV-voorbeeld voor softwareontwikkelaar — wat erop hoort in 2026';
export const description =
  'Een nuchter, recruiter-proof CV voor backend, frontend of fullstack developer. Met concrete bullet-voorbeelden, valkuilen specifiek voor deze rol, en welke stijl past bij welk type werkgever.';
export const keywords = [
  'CV softwareontwikkelaar',
  'CV developer',
  'CV programmeur',
  'CV backend developer',
  'CV frontend developer',
  'CV fullstack',
  'software engineer CV Nederland',
];
export const hero =
  'Een sterk developer-CV is technisch precies maar leesbaar. Recruiters in tech scannen op stack-overlap met de vacature, op concrete projectresultaten, en op iets dat suggereert dat je iemand bent met wie je een sprint kunt doormaken. Een lijst van veertig technologieën zonder context werkt averechts.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Wat hoort er op je CV als developer',
    body: 'Een profielsamenvatting van twee zinnen die je specialisatie en richting vastlegt. Daaronder werkervaring chronologisch, met per rol één regel over het product en twee tot drie bullets met meetbare impact of concrete oplevering. Een focus-skill-blokje met vijf tot acht technologieën die je nu écht dagelijks gebruikt — geen alphabet soup. Opleiding en certificaten kunnen kort; bij junior- en medior-niveau staan ze hoger op de pagina, bij senior- en lead-rollen verder naar onder.\n\nLaat je GitHub of portfolio-link bovenaan zien als je daar trots op bent. Eén of twee actieve open source bijdragen tellen vaak zwaarder dan een certificering.',
  },
  {
    heading: 'Stack-keywords letterlijk overnemen (waar het klopt)',
    body: 'ATS-systemen in Nederland matchen vaak nog op exact-string. Als de vacature "TypeScript" zegt, schrijf "TypeScript" — niet "TS" of "JavaScript/TypeScript". Maar overdrijf niet: drie technologieën die niet in je dagelijkse werk zitten staan zwakker dan vijf waar je actief in werkt.',
  },
  {
    heading: 'Wat een goede bullet onderscheidt van een zwakke',
    body: 'Een zwakke bullet: "Verantwoordelijk voor de backend van het product." Een sterke: "Bouwde de nieuwe orders-service op Go + Postgres, met als gevolg dat p95-response-tijd van 800ms naar 120ms ging." Concreet, met meetbare uitkomst, met de stack erin verwerkt. Niet elke bullet hoeft cijfers — maar minstens twee à drie per rol wel.',
  },
];
export const exampleBullets = [
  'Bouwde de nieuwe orders-service op Go + Postgres; p95 van 800ms naar 120ms.',
  'Vervroegde release-cyclus van wekelijks naar dagelijks door CI/CD-overhaul (GitHub Actions + Argo CD).',
  'Mentorde twee juniors gedurende hun eerste jaar; beide door naar medior binnen achttien maanden.',
  'Schreef het engineering-handbook van het team — versie 1 in twee weken, daarna iteratief uitgebreid op basis van vragen.',
  'Migreerde 30+ microservices van handmatige deploys naar Terraform + ArgoCD; deploy-tijd van 40 naar 3 minuten.',
  'Bijgedragen aan open source: maintainer van [package] (200+ GitHub stars), reviews op core PRs van [framework].',
];
export const pitfalls = [
  '"Verantwoordelijk voor X" zonder uitkomst. Wat heeft die verantwoordelijkheid concreet opgeleverd?',
  'Een skill-soep van twintig technologieën zonder context. Recruiters scrollen door, hiring engineers fronsen.',
  'Geen GitHub-link of portfolio terwijl je er een hebt. Voor developer-rollen is concreet werk de sterkste signaalbron.',
  'Side-projects als hoofdgerecht presenteren als je vijf jaar betaalde ervaring hebt. Hou het in balans.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Voor de meeste tech-werkgevers: rustig getypeerd, eigentijds zonder overdaad. Creative voor design-georiënteerde studios; Conservative voor banken en overheid.',
};
export const context =
  'Salarisindicatie 2026 (NL): junior €40–55k, medior €55–75k, senior €75–100k+. Tech scale-ups en consultancy zitten meestal hoger dan corporate IT.';
export const relatedBlogSlugs = [
  'cv-op-maat-in-2-minuten',
  'ats-cv-2026',
  'recruiter-aan-het-woord',
  'welke-stijl-kies-je',
];
export const relatedPersonas = ['werkzoekenden', 'zij-instromers'];
