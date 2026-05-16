import type { RolePage } from '../types';

export const slug = 'ux-designer';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'en';
export const label = 'UX designer';
export const title = 'CV example for UX designer — portfolio first, CV as support';
export const description =
  'For UX designers, your portfolio matters more than your CV. But the CV must frame it correctly. Here\'s how.';
export const keywords = ['UX designer CV', 'product designer CV', 'UI designer resume', 'design portfolio CV'];
export const hero =
  'A UX CV serves your portfolio. The portfolio does 80% of the convincing; the CV fills in the context. What a portfolio can\'t show: team context, sector experience, design system ownership, methodological preferences.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Portfolio link prominent',
    body: 'Portfolio link is the first clickable element after your name. Or a portfolio tour invitation in your profile summary. Then two sentences on your design genre (product / interaction / service / research) and sector focus.',
  },
  {
    heading: 'Experience with team context',
    body: 'Per role: company, product, team size and composition, your role in design decisions. "UX designer at Company X" is empty; "Sole designer for two engineering teams at Series A scale-up — owner of design system and weekly research sessions" is strong.\n\nResearch and design system work mentioned separately. Those are weighty contributions that don\'t always land in a portfolio case.',
  },
  {
    heading: 'Tooling kept subtle',
    body: 'Figma is standard (still mention it). Plus: design system tools (Figma libraries, Storybook), research tools (Maze, Dovetail, Lookback), prototyping (Framer, ProtoPie). Specific skills like motion or front-end (HTML/CSS) if genuinely strong.',
  },
];
export const exampleBullets = [
  'Sole product designer for scale-up checkout team; developed design system v1 and v2 (Figma library used by 4 product teams).',
  'Led research sprints (5-day Discovery → 5-day Define) for 6 features in 2024; each shipped with validation before build.',
  'Co-built company design handbook with 2 design leads; published internally Q3 2024.',
  'Tools: Figma, FigJam, Maze, Dovetail, Notion. Methodology: jobs-to-be-done, continuous discovery.',
  'Portfolio: [link]. Bachelor Communication & Multimedia Design (HAN, 2017).',
];
export const pitfalls = [
  'CV without portfolio link. Direct skip — UX recruiters click portfolio first.',
  '"UI/UX/Product" merged without distinction. Three disciplines with overlap, not synonyms.',
  'Tools list of twenty items. Suggests no specialism.',
  'No research or design system work mentioned. For senior roles this weighs more than visual cases.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Creative',
  reason: 'Design roles let you show typographic sense. Creative fits; Experimental for studios.',
};
export const context = 'Salary indication 2026 (NL): junior UX €40–55k, mid €55–75k, senior €75–95k, lead/staff €95–125k.';
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes'];
export const relatedPersonas = ['werkzoekenden'];
