/**
 * Renders four experimental archetypes through generateCVHTML using mock
 * GeneratedCVContent + CVDesignTokens. Writes each output to /tmp and
 * does some sanity checks:
 *   - HTML structure parses (basic regex sanity)
 *   - the candidate's name, summary content, and at least one experience
 *     title appear in the output
 *   - no forbidden CSS properties slip in (transform/clip-path/:hover are
 *     OUT for new code; existing screen-print texture uses `transform`
 *     but that's a deliberate pre-existing exception, so we only check
 *     the page shell)
 *
 * Usage:
 *   npx tsx test-experimental-render.ts
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateCVHTML } from './src/lib/cv/html-generator';
import type { GeneratedCVContent, CVContactInfo } from './src/types';
import type { CVDesignTokens, BoldLayoutArchetype } from './src/types/design-tokens';

// ===== Mock content =====
const content: GeneratedCVContent = {
  headline: 'Senior Brand Designer & Art Director',
  summary:
    'Senior brand designer with twelve years\' experience taking cultural brands from "weird idea" to "industry standard". I work where strategy meets craft — equally comfortable in a steering committee and a Figma file at 1am.\nAt previous roles I led brand systems for museums, fashion houses and three of the most awarded creative agencies in Europe.',
  experience: [
    {
      title: 'Brand Director',
      company: 'STUDIO MOROSS',
      location: 'London',
      period: '2022 — Present',
      highlights: [
        'Led identity systems for ten cultural-sector brands including two national museums',
        'Doubled the studio\'s editorial revenue stream within 18 months',
        'Mentored a team of five junior + two mid designers',
      ],
    },
    {
      title: 'Senior Designer',
      company: 'PENTAGRAM (NY)',
      location: 'New York',
      period: '2019 — 2022',
      highlights: [
        'Designed flagship typographic systems for two major foundations',
        'Co-led the 2021 Cannes Lions D&AD-winning campaign for The Whitney',
      ],
    },
    {
      title: 'Designer',
      company: 'Wieden+Kennedy',
      location: 'Amsterdam',
      period: '2016 — 2019',
      highlights: [
        'Brand work for cultural and luxury clients including Mercedes & The Stedelijk',
      ],
    },
  ],
  education: [
    {
      degree: 'MFA — Graphic Design',
      institution: 'Yale School of Art',
      year: '2015 — 2016',
      details: 'Thesis: "Typography as Public Address"',
    },
    {
      degree: 'BA — Design History',
      institution: 'KABK Den Haag',
      year: '2011 — 2014',
      details: null,
    },
  ],
  skills: {
    technical: ['Brand systems', 'Editorial design', 'Typography', 'Art direction', 'Figma', 'Print production', 'Motion direction', 'Webflow'],
    soft: ['Workshop facilitation', 'Mentoring', 'Client strategy', 'Storytelling'],
  },
  languages: [
    { language: 'English', level: 'Native' },
    { language: 'Dutch', level: 'Fluent' },
    { language: 'French', level: 'Working' },
  ],
  certifications: ['D&AD Wood Pencil — 2021', 'Type Directors Club Certificate of Typographic Excellence — 2020'],
  projects: [
    {
      title: 'The Whitney Identity Refresh',
      description: 'Co-led the typographic system update for one of NYC\'s most-visited museums.',
      technologies: ['Brand', 'Print', 'Web'],
      url: 'https://example.com',
      period: '2021',
      highlights: ['1.4M museum visitors served by the new wayfinding system'],
    },
  ],
  interests: ['Risograph printing', 'Architecture — Rietveld + Schroder house tours', 'Vinyl record collecting'],
};

const contact: CVContactInfo = {
  email: 'oona@example.com',
  phone: '+31 6 1234 5678',
  location: 'Amsterdam',
  linkedinUrl: 'linkedin.com/in/oona-vermeer',
  website: 'oonavermeer.studio',
  github: undefined,
  birthDate: undefined,
};

const fullName = 'Oona Vermeer-Castelijn';
const headline = 'Senior Brand Designer & Art Director';
const avatarUrl = null; // No photo for tests

// ===== Make per-archetype tokens =====
function makeTokens(archetype: BoldLayoutArchetype, overrides: Partial<CVDesignTokens['bold']> = {}): CVDesignTokens {
  return {
    styleName: `Experimental — ${archetype}`,
    styleRationale: `Wild archetype: ${archetype}`,
    industryFit: 'creative',
    themeBase: 'bold',
    colors: {
      primary: '#1e2847',
      secondary: '#f7f2ea',
      accent: '#d6a42b',
      text: '#171717',
      muted: '#5d5d5d',
    },
    fontPairing: 'oswald-source-sans',
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'asymmetric',
    sectionStyle: 'magazine',
    skillsDisplay: 'tags',
    experienceDescriptionFormat: 'bullets',
    contactLayout: 'single-column',
    headerGradient: 'none',
    showPhoto: false,
    useIcons: true,
    roundedCorners: false,
    headerFullBleed: true,
    decorations: 'none',
    sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills', 'languages', 'certifications', 'interests'],
    layout: 'single-column',
    sidebarSections: [],
    borderRadius: 'none',
    accentStyle: 'border-left',
    nameStyle: 'uppercase',
    skillTagStyle: 'outlined',
    pageBackground: '#faf7f2',
    bold: {
      layoutArchetype: archetype,
      columnCount: 2,
      backgroundNumeral: 'initials',
      marginalia: 'numbered',
      paletteSaturation: 'tri-tone',
      manifestoOpener: true,
      headerLayout: 'asymmetric-burst',
      sidebarStyle: 'solid-color',
      skillStyle: 'colored-pills',
      photoTreatment: 'color-overlay',
      accentShape: 'diagonal-stripe',
      iconTreatment: 'solid-filled',
      headingStyle: 'stacked-caps',
      gradientDirection: 'duotone-split',
      surfaceTexture: 'halftone',
      ...overrides,
    },
  };
}

// ===== Run tests =====
const archetypes: BoldLayoutArchetype[] = [
  'manifesto',
  'magazine-cover',
  'editorial-inversion',
  'brutalist-grid',
  'vertical-rail',
  'mosaic',
  'sidebar-canva',
];

let allOk = true;
for (const arch of archetypes) {
  const tokens = makeTokens(arch);
  const html = generateCVHTML(content, tokens, fullName, avatarUrl, headline, null, contact);
  const out = resolve(`/tmp/cv-experimental-${arch}.html`);
  writeFileSync(out, html);
  const verify = readFileSync(out, 'utf8');

  const checks = {
    'has DOCTYPE': /^<!DOCTYPE html>/.test(verify),
    'has archetype class': verify.includes(`archetype-${arch}`),
    'has name': verify.includes('Oona Vermeer-Castelijn'),
    'has experience title': verify.includes('Brand Director'),
    'has summary fragment': verify.includes('twelve years'),
    'has skills': verify.includes('Brand systems'),
    'no :hover in CSS': !verify.includes(':hover'),
    // Disallow new transform/clip-path usage. screen-print texture in the
    // legacy surface-texture path uses `transform:` — but that's only
    // triggered by surfaceTexture=screen-print, and we don't use it here.
    'no bare transform': !/[\s;]transform:\s/.test(verify),
    'no clip-path': !verify.includes('clip-path:'),
    'print-color-adjust present': verify.includes('print-color-adjust'),
  };

  console.log(`\n=== ${arch} → ${out} ===`);
  let ok = true;
  for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? 'PASS' : 'FAIL'}  ${k}`);
    if (!v) ok = false;
  }
  if (!ok) allOk = false;
}

console.log('\n' + (allOk ? 'ALL OK' : 'SOME FAILED'));
process.exit(allOk ? 0 : 1);
