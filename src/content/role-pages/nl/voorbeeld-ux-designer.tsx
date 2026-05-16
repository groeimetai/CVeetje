import type { RolePage } from '../types';

export const slug = 'ux-designer';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'UX designer';
export const title = 'CV-voorbeeld voor UX designer — portfolio-first, CV als ondersteuning';
export const description =
  'Voor UX designers is je portfolio belangrijker dan je CV. Maar het CV moet die portfolio wel correct framen. Hier is hoe.';
export const keywords = [
  'CV UX designer',
  'CV product designer',
  'CV UI designer',
  'voorbeeld CV design',
  'CV portfolio UX',
];
export const hero =
  'Een UX-CV staat in dienst van je portfolio. De portfolio doet 80% van het overtuigen, het CV vult de context in. Wat je portfolio niet kan tonen: team-context, sector-ervaring, design-systeem-eigenaarschap, methodologische voorkeuren.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Portfolio bovenaan, prominent',
    body: 'Link naar je portfolio is het eerste klikbare element na je naam. Een portfolio-tour-uitnodiging in je profielsamenvatting werkt ook. Daarna twee zinnen over je design-genre (product / interaction / service / research) en je sector-focus.',
  },
  {
    heading: 'Werkervaring met team-context',
    body: 'Per rol: bedrijf, product, team-omvang en samenstelling, en jouw rol in design-besluiten. "UX designer bij Bedrijf X" is leeg; "Sole designer voor twee engineering-teams bij Series-A scale-up — eigenaar van design system en weekly research-sessies" is sterk.\n\nResearch- en designsystem-werk apart benoemen. Dat zijn zware bijdragen die niet altijd in een portfolio-case landen.',
  },
  {
    heading: 'Tooling subtiel houden',
    body: 'Figma is standaard (vermeld nog steeds). Daarnaast: design-systeem tools (Figma libraries, Storybook), research tools (Maze, Dovetail, Lookback), prototype tools (Framer, Principle, ProtoPie). Specifieke handvaardigheden zoals motion design of front-end vaardigheid (HTML/CSS, geen "ik kan ook coden"-overdrijving) als ze écht goed zijn.',
  },
];
export const exampleBullets = [
  'Sole product designer voor scale-up checkout-team; ontwikkelde design system v1 en v2 (Figma library, gebruikt door 4 product-teams).',
  'Led research-sprints (5 dagen Discovery → 5 dagen Define) voor 6 features in 2024; iedere feature voorzien van validation voor build-start.',
  'Co-built het design-handbook van het bedrijf met 2 design-leads; gepubliceerd intern Q3 2024.',
  'Mentorde één junior designer door zijn eerste jaar; doorgegroeid naar medior begin 2025.',
  'Tools: Figma, FigJam, Maze, Dovetail, Notion. Methodologie: jobs-to-be-done, continuous discovery.',
  'Portfolio: [link]. Bachelor Communication & Multimedia Design (HAN, 2017).',
];
export const pitfalls = [
  'CV zonder portfolio-link. Direct skip — UX-recruiters klikken eerst portfolio.',
  '"UI/UX/Product" samengeklopt zonder onderscheid. Dat zijn drie disciplines met overlap, geen synoniem.',
  'Tools-lijst van twintig items. Dat is een vermoeden van geen specialist te zijn in iets.',
  'Geen research- of designsystem-werk benoemd. Voor senior-rollen weegt dit zwaarder dan visuele cases.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Creative',
  reason: 'Voor design-rollen mag je laten zien dat je oog voor typografie en grid hebt. Creative is gepast; Experimental als je naar een studio gaat.',
};
export const context = 'Salarisindicatie 2026 (NL): junior UX €40–55k, medior €55–75k, senior €75–95k, lead/staff €95–125k.';
export const relatedBlogSlugs = ['welke-stijl-kies-je', 'cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['werkzoekenden'];
