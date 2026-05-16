import type { RolePage } from '../types';

export const slug = 'consultant';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'consultant';
export const title = 'CV-voorbeeld voor consultant — strategy, management, IT of niche';
export const description =
  'Een consultant-CV dat per opdracht klant, scope, jouw rol, en concrete uitkomst toont. Plus hoe je het verschil tussen junior (3-pages-thin) en partner (one-pager-strong) handelt.';
export const keywords = [
  'CV consultant',
  'CV management consultant',
  'CV strategy consultant',
  'CV IT consultant',
  'voorbeeld CV consultancy',
  'CV McKinsey BCG Bain',
];
export const hero =
  'Een consultant-CV is een portfolio: per opdracht een mini-case. Klant, sector, probleem, jouw rol, uitkomst. Eén opmerkelijke quirk van consultancy: de hi&euml;rarchie is steil maar je werkt op dezelfde projecten als de partner. Wees expliciet over jouw rol binnen het team — anders krijg je het verwijt van "over-claiming".';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: type consultancy, sector-focus, niveau',
    body: 'Welk type: strategy, management, operations, IT, finance, M&A. Welke sector(en) — generalist of vertical specialist. Welk niveau (Associate, Consultant, Senior Consultant, Manager, Senior Manager, Principal, Partner). Twee zinnen profielsamenvatting met "wat ik daar oplos" + "welk type klant".',
  },
  {
    heading: 'Opdrachten als case-portfolio',
    body: 'Per opdracht (of cluster van vergelijkbare opdrachten): klant of sectorbeschrijving (bij NDA: "leading European bank"), looptijd, team-omvang, jouw rol, probleem, oplossingsrichting, kwantificeerbaar resultaat. Voor seniors: ook commerciële kant (verkocht, geëxpandeerd, klant-relatie opgebouwd).\n\nVuistregel: per opdracht twee tot vier regels. Een Associate met 12 opdrachten kan twee CV-pagina\'s vullen; een Partner met 30 opdrachten consolideert tot één pagina met thematische clustering.',
  },
  {
    heading: 'Methodieken en tools subtiel houden',
    body: 'De fancy frameworks (Porter, McKinsey 7S, Lean Six Sigma) noem je alleen als je ze concreet hebt toegepast in een traceerbare context. Een lijst van twaalf frameworks zonder bewijs is een rode vlag in consultancy-recruiting.',
  },
];
export const exampleBullets = [
  'Operations transformation voor toonaangevende Europese verzekeraar (4 maanden, team van 6); ge&iuml;dentificeerde €18M run-rate savings, implementatie-roadmap met klant.',
  'M&A due diligence voor PE-fonds (acquisitie target: SaaS scale-up, €120M revenue); commerciële analyse, leidde 2 van 5 work streams.',
  'Digital strategy review voor Nederlandse retail-keten; voorstel cloud-migratie roadmap, akkoord boardroom Q2 2025.',
  'Verkocht expansion-opdracht bij bestaande klant — bouwde 6-maanden-vervolg voor team van 4 (€620k mandate).',
  'Methodologie: hypothesis-driven problem solving, MECE structuring, executive communication. Tools: Excel modeling, PowerPoint, Tableau, Alteryx.',
  'MSc Economics (Tilburg, 2016); CFA Level I (2020).',
];
export const pitfalls = [
  '"Werkzaam bij McKinsey" zonder concrete opdrachten. Recruiters in andere bureaus willen weten wat je daar deed.',
  'Over-claimen. "Led" voor opdrachten waar je in een team van zes zat als Associate — wordt direct geprikt.',
  'Generieke frameworks-lijst. Welk framework, voor welke klant, met welke uitkomst.',
  'Geen commerciële kant zichtbaar als senior. Vanaf Manager-niveau weegt verkochte/ge&euml;xpandeerde omzet zwaar.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'Consultancy waardeert ingetogen professionaliteit. Een nuchter typeerd CV is een statement op zichzelf.',
};
export const context =
  'Salarisindicatie 2026 (NL): Associate €60–80k all-in, Consultant €80–110k, Senior Consultant €110–145k, Manager €145–200k, Senior Manager/Principal €200k+. Tier 1-bureaus zitten boven het gemiddelde.';
export const relatedBlogSlugs = [
  'product-owner-team-cvs',
  'cv-op-maat-in-2-minuten',
  'welke-stijl-kies-je',
];
export const relatedPersonas = ['werkzoekenden', 'product-owners', 'zzp'];
