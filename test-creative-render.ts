/**
 * test-creative-render.ts
 *
 * Ad-hoc render harness for the Creative-level editorial CV. Generates a
 * handful of HTML previews — one per layout archetype — using mock content
 * and tokens, writes them to disk and prints a short summary.
 *
 * Run: npx tsx test-creative-render.ts
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateCVHTML } from './src/lib/cv/html-generator';
import type {
  GeneratedCVContent,
  CVContactInfo,
} from './src/types';
import type { CVDesignTokens } from './src/types/design-tokens';

// ============ Mock content ============

const mockContent: GeneratedCVContent = {
  headline: 'Strategy & Brand Director — multi-format storytelling, editorial systems, cultural relevance',
  summary:
    'A strategist who treats brand as a long-running editorial project. Twelve years across publishing, fashion and software, leading teams of designers, writers and producers. Comfortable making the case to a board and to a junior copywriter on the same day.\n' +
    'Currently leading a team of nine at a B-corp design studio. Previously head of brand at two indie tech companies and a luxury publisher.',
  experience: [
    {
      title: 'Director of Brand & Story',
      company: 'Cohort Studio',
      location: 'Amsterdam',
      period: '2022 — present',
      highlights: [
        'Redrew the editorial system for the studio — five sub-brands, one voice, zero template lock-in.',
        'Won three new clients in food, finance and fashion through narrative-first proposals.',
        'Mentored four mid-level designers into senior roles.',
      ],
      description: 'Leads brand strategy and editorial output across the studio. Owns voice, art direction and the relationship with five long-running clients.',
    },
    {
      title: 'Head of Brand',
      company: 'Anker & Lade',
      location: 'Amsterdam',
      period: '2019 — 2022',
      highlights: [
        'Rebuilt brand identity for a 90-year-old publisher around contemporary visual culture references.',
        'Doubled subscriptions in 18 months while shrinking ad inventory.',
      ],
    },
    {
      title: 'Brand Strategist',
      company: 'Fold',
      location: 'Berlin',
      period: '2016 — 2019',
      highlights: [
        'Positioned a 12-person SaaS startup against four better-funded competitors — exit at €40M.',
      ],
    },
  ],
  education: [
    {
      degree: 'MA Cultural Analysis',
      institution: 'University of Amsterdam',
      year: '2014',
      details: 'Thesis on luxury magazine voice in the post-print era.',
    },
    {
      degree: 'BA English Literature',
      institution: 'University of Edinburgh',
      year: '2012',
      details: null,
    },
  ],
  skills: {
    technical: ['Brand strategy', 'Editorial design', 'Voice & tone systems', 'Naming', 'Content strategy', 'Figma', 'Notion ops'],
    soft: ['Mentoring', 'Pitching', 'Client strategy', 'Crisis comms'],
  },
  languages: [
    { language: 'Dutch', level: 'Native' },
    { language: 'English', level: 'Fluent' },
    { language: 'German', level: 'Conversational' },
  ],
  certifications: [
    'IDEO Brand Studio (2021)',
    'School of Visual Arts — Editorial Design Intensive (2017)',
  ],
  projects: [
    {
      title: 'The Annual',
      description: 'Studio annual — a 240-page print object documenting twelve client projects through long-form essays and commissioned photography.',
      technologies: ['InDesign', 'Letterpress', 'Risograph'],
      url: 'https://cohort.studio/annual',
      period: '2023',
      highlights: ['Featured in Wallpaper* and Eye Magazine', 'Sold-out first print run of 1,200'],
    },
  ],
  interests: [
    'Endurance running — strategy under fatigue',
    'Italian wine — tasted blind, judged loudly',
    'Letterpress',
  ],
};

const mockContact: CVContactInfo = {
  email: 'mira.veldkamp@example.com',
  phone: '+31 6 1234 5678',
  location: 'Amsterdam',
  linkedinUrl: 'https://www.linkedin.com/in/miraveldkamp',
  website: 'miraveldkamp.com',
};

// ============ Base tokens ============

function baseTokens(): CVDesignTokens {
  return {
    styleName: 'Editorial Test',
    styleRationale: 'Test render — magazine-column archetype with duotone palette.',
    industryFit: 'creative',
    themeBase: 'creative',
    colors: {
      primary: '#1f2233',
      secondary: '#faf8f4',
      accent: '#c77757',
      text: '#1a1a1a',
      muted: '#6b6459',
    },
    fontPairing: 'playfair-inter',
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'asymmetric',
    sectionStyle: 'magazine',
    skillsDisplay: 'compact',
    experienceDescriptionFormat: 'paragraph',
    contactLayout: 'single-row',
    headerGradient: 'none',
    showPhoto: false,
    useIcons: false,
    roundedCorners: false,
    headerFullBleed: false,
    decorations: 'none',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications', 'interests'],
    layout: 'single-column',
    pageBackground: '#faf8f4',
    sidebarSections: ['skills', 'languages', 'certifications'],
    editorial: undefined, // set per variant
  };
}

// ============ Variants ============

interface Variant {
  filename: string;
  tokens: CVDesignTokens;
  label: string;
}

const variants: Variant[] = [
  {
    filename: 'creative-01-magazine-column.html',
    label: 'Magazine column — Playfair + duotone + drop-cap + kickers',
    tokens: {
      ...baseTokens(),
      styleName: 'Magazine Column',
      colors: {
        primary: '#1f2233',
        secondary: '#faf8f4',
        accent: '#c77757',
        text: '#1a1a1a',
        muted: '#6b6459',
      },
      fontPairing: 'playfair-inter',
      editorial: {
        layoutArchetype: 'magazine-column',
        colorPolicy: 'duotone',
        decorElements: ['drop-cap', 'kicker-labels', 'rule-ornaments'],
        headerLayout: 'stacked',
        nameTreatment: 'oversized-serif',
        accentTreatment: 'thin-rule',
        sectionTreatment: 'numbered',
        grid: 'full-bleed',
        divider: 'ornament',
        typographyScale: 'editorial',
        sectionNumbering: true,
        dropCapSection: 'summary',
      },
    },
  },
  {
    filename: 'creative-02-editorial-spread.html',
    label: 'Editorial spread — tritone + marginalia + pull-quote + first-line emphasis',
    tokens: {
      ...baseTokens(),
      styleName: 'Editorial Spread',
      colors: {
        primary: '#1f2233',
        secondary: '#f6f1e8',
        accent: '#d97042',
        text: '#171717',
        muted: '#6c655b',
      },
      fontPairing: 'libre-baskerville-source-sans',
      editorial: {
        layoutArchetype: 'editorial-spread',
        colorPolicy: 'tritone',
        secondaryColor: '#5e2a2a',
        decorElements: ['marginalia', 'pull-quote', 'first-line-emphasis', 'colored-section-titles'],
        headerLayout: 'split',
        nameTreatment: 'mixed-italic',
        accentTreatment: 'thin-rule',
        sectionTreatment: 'numbered',
        grid: 'asymmetric-70-30',
        divider: 'hairline',
        typographyScale: 'modest',
        sectionNumbering: true,
        pullQuoteSource: 'experience',
      },
    },
  },
  {
    filename: 'creative-03-asymmetric-feature.html',
    label: 'Asymmetric feature — Oswald condensed + duotone + decorative numerals + hero band',
    tokens: {
      ...baseTokens(),
      styleName: 'Asymmetric Feature',
      colors: {
        primary: '#26213a',
        secondary: '#faf5ee',
        accent: '#d86d43',
        text: '#171717',
        muted: '#6d655e',
      },
      fontPairing: 'oswald-source-sans',
      editorial: {
        layoutArchetype: 'asymmetric-feature',
        colorPolicy: 'duotone',
        decorElements: ['decorative-numerals', 'first-line-emphasis', 'kicker-labels', 'pull-quote'],
        headerLayout: 'band',
        nameTreatment: 'condensed-impact',
        accentTreatment: 'marker-highlight',
        sectionTreatment: 'kicker',
        grid: 'full-bleed',
        divider: 'whitespace-large',
        typographyScale: 'hero',
        sectionNumbering: true,
        pullQuoteSource: 'experience',
      },
    },
  },
  {
    filename: 'creative-04-feature-sidebar.html',
    label: 'Feature sidebar — DM Serif + tritone + decorative numerals + colored titles',
    tokens: {
      ...baseTokens(),
      styleName: 'Feature Sidebar',
      colors: {
        primary: '#1f2937',
        secondary: '#f0ece4',
        accent: '#c2683f',
        text: '#1a1a1a',
        muted: '#6b6459',
      },
      fontPairing: 'dm-serif-dm-sans',
      layout: 'sidebar-right',
      editorial: {
        layoutArchetype: 'feature-sidebar',
        colorPolicy: 'tritone',
        secondaryColor: '#5a2a3a',
        decorElements: ['decorative-numerals', 'kicker-labels', 'colored-section-titles'],
        headerLayout: 'split',
        nameTreatment: 'uppercase-tracked',
        accentTreatment: 'thin-rule',
        sectionTreatment: 'numbered',
        grid: 'asymmetric-60-40',
        divider: 'hairline',
        typographyScale: 'editorial',
        sectionNumbering: true,
      },
    },
  },
  {
    filename: 'creative-05-manuscript-mono.html',
    label: 'Manuscript mono — Libre Baskerville + mono-accent + drop-cap + ornaments',
    tokens: {
      ...baseTokens(),
      styleName: 'Manuscript Mono',
      colors: {
        primary: '#2a2624',
        secondary: '#f7f4ec',
        accent: '#a4794a',
        text: '#1a1a1a',
        muted: '#776f64',
      },
      fontPairing: 'libre-baskerville-source-sans',
      editorial: {
        layoutArchetype: 'manuscript-mono',
        colorPolicy: 'mono-accent',
        decorElements: ['drop-cap', 'rule-ornaments', 'kicker-labels'],
        headerLayout: 'stacked',
        nameTreatment: 'oversized-serif',
        accentTreatment: 'thin-rule',
        sectionTreatment: 'numbered',
        grid: 'manuscript',
        divider: 'ornament',
        typographyScale: 'modest',
        sectionNumbering: true,
        dropCapSection: 'summary',
      },
    },
  },
];

// ============ Run ============

async function main() {
  const outDir = resolve(process.cwd(), 'test-output');
  await mkdir(outDir, { recursive: true });

  // Index page
  const indexLinks: string[] = [];

  let failures = 0;

  for (const v of variants) {
    try {
      const html = generateCVHTML(
        mockContent,
        v.tokens,
        'Mira Veldkamp',
        null,
        mockContent.headline,
        null,
        mockContact,
      );
      const target = resolve(outDir, v.filename);
      await writeFile(target, html, 'utf8');

      // Sanity checks
      const checks = [
        { name: 'has DOCTYPE', pass: html.startsWith('<!DOCTYPE html>') },
        { name: 'has editorial-cv root', pass: html.includes('class="editorial-cv') },
        { name: 'has archetype class', pass: html.includes(`editorial-archetype-${v.tokens.editorial!.layoutArchetype}`) },
        { name: 'has policy class', pass: html.includes(`editorial-policy-${v.tokens.editorial!.colorPolicy}`) },
        { name: 'name rendered', pass: html.includes('Mira Veldkamp') },
        { name: 'experience rendered', pass: html.includes('Director of Brand &amp; Story') },
        { name: 'no broken comment placeholders', pass: !html.includes('<!--SECTION_NUMBER-->') && !html.includes('<!--DECOR_NUMERAL-->') },
        // Strip CSS comments before checking — we have an explanatory note
        // mentioning the print-safe replacement of `transform: translate`.
        { name: 'no transform CSS', pass: !html.replace(/\/\*[\s\S]*?\*\//g, '').match(/transform\s*:\s*translate/i) },
        { name: 'no clip-path CSS', pass: !html.includes('clip-path:') },
        { name: 'no hover CSS', pass: !html.match(/:hover\s*{/i) },
      ];

      const failed = checks.filter(c => !c.pass);
      const status = failed.length === 0 ? 'OK' : `FAIL (${failed.map(f => f.name).join(', ')})`;
      console.log(`${status}  ${v.filename}  (${html.length} bytes)`);
      if (failed.length > 0) failures += 1;

      indexLinks.push(
        `<li><a href="${v.filename}">${v.filename}</a> — ${v.label}</li>`,
      );
    } catch (err) {
      console.error(`FAIL  ${v.filename}  ${err instanceof Error ? err.message : err}`);
      failures += 1;
    }
  }

  await writeFile(
    resolve(outDir, 'index.html'),
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Creative renders</title>
<style>body{font-family:sans-serif;max-width:60ch;margin:40px auto;padding:0 20px;line-height:1.6}</style>
</head><body><h1>Creative renders</h1><ol>${indexLinks.join('')}</ol></body></html>`,
    'utf8',
  );

  console.log(`\n${variants.length - failures}/${variants.length} variants OK. Output: ${outDir}`);
  if (failures > 0) process.exit(1);
}

void main();
