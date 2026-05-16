import type { RolePage } from '../types';

export const slug = 'grafisch-ontwerper';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'grafisch ontwerper';
export const title = 'CV-voorbeeld voor grafisch ontwerper — portfolio + CV in één visueel verhaal';
export const description =
  'Voor grafisch ontwerpers is het CV zelf onderdeel van de portfolio. Hier hoe je het balanceert tussen designstatement en leesbaarheid.';
export const keywords = [
  'CV grafisch ontwerper',
  'CV graphic designer',
  'CV vormgever',
  'voorbeeld CV design',
  'CV brand designer',
];
export const hero =
  'Een grafisch-ontwerper-CV is meer dan informatie — het is een werkstuk. Een Word-default CV bij een design-vacature roept direct twijfels op. Maar te visueel overdaad werkt ook averechts. De smaak zit ertussenin.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: discipline en sector',
    body: 'Welk type ontwerp (brand identity, editorial, packaging, motion, illustration, UI/web). Welke sector (cultuur, retail, FMCG, B2B, non-profit). Portfolio-link prominent — de plek waar je beste werk leeft.',
  },
  {
    heading: 'Werkervaring met cliëntcontext',
    body: 'Per werkgever (studio of in-house): welke klanten heb je bediend of welke merken heb je beheerd. "Designer bij Studio X" is leeg; "Designer bij Studio X — werkzaam aan brand-identity voor Rabobank, KLM, Stedelijk Museum, en NS" is sterk. Bij in-house: jouw rol in brand-systeem, campagne-leiderschap, redactie-werk.',
  },
  {
    heading: 'Tooling — Adobe is standaard, daarna onderscheidend',
    body: 'Adobe-suite veronderstellen. Daarnaast: Figma (steeds vaker verwacht), After Effects voor motion, ProCreate voor digital illustration, eventueel webflow/wordpress als je ook online levert. Drie tot vijf gespecialiseerde tools die je goed beheerst.',
  },
];
export const exampleBullets = [
  'Brand designer bij [studio] voor klanten Rabobank, KLM, Stedelijk Museum; 2 toonaangevende rebranding-trajecten gemeld in Design Awards 2025.',
  'Lead designer voor in-house team van retailer Albert Heijn; eigenaar brand-systeem en seizoenscampagnes.',
  'Side-project: zelfgemaakte typeface gepubliceerd (downloads 4.8k op Velvetyne, 2024).',
  'Tools: Adobe CC (InDesign, Illustrator, Photoshop), Figma, After Effects, Glyphs. Webflow voor portfolio-werk.',
  'BA Grafisch Ontwerp (Willem de Kooning Academie, 2019). Portfolio: [link].',
];
export const pitfalls = [
  'Een ontwerper-CV in Word-default. Direct signaal van mismatch met het vak.',
  'Te visueel overdaad. Het CV moet nog lezen als een CV, niet als een collage.',
  'Geen portfolio-link of een link naar een lege Behance. Voor design is portfolio het bewijs.',
  'Te brede claim. Brand identity, motion, en UI in één CV zonder onderscheiden — kies een primair genre.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Editorial',
  reason: 'Voor pure design-rollen mag je naar Editorial of Experimental. Het signaalt "ik beheers compositie en typografie".',
};
export const context = 'Salarisindicatie 2026 (NL): junior designer €30–42k, medior €42–58k, senior €58–80k, art director / design lead €80–115k.';
export const relatedBlogSlugs = ['welke-stijl-kies-je', 'cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['werkzoekenden'];
