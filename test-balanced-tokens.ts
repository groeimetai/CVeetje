/**
 * Ad-hoc validation script for the Balanced style expert.
 *
 * Tests:
 *   1. Industry-aware fallback: same expert, three different vacancies →
 *      three different accent + section + decoration combinations.
 *   2. Anti-conservative escalation: normalize() with the "all safest"
 *      raw AI output should upgrade decorations/sectionStyle/accentStyle.
 *   3. History rotation: feeding history with repeated values should
 *      rotate the next pick away from those.
 *   4. HTML rendering: tokens through generateCVHTML should produce
 *      valid HTML without throwing.
 *
 * Run with: npx tsx test-balanced-tokens.ts
 */

import { balancedExpert } from './src/lib/ai/style-experts/balanced';
import type { JobVacancy } from './src/types';
import type { CVDesignTokens } from './src/types/design-tokens';
import type { PromptContext } from './src/lib/ai/style-experts/types';
import { generateCVHTML } from './src/lib/cv/html-generator';
import * as fs from 'fs';

const FINTECH: JobVacancy = {
  title: 'Senior Backend Engineer',
  company: 'Adyen',
  // Use "Finance" so it doesn't accidentally match the "tech" keyword in the
  // industry profile lookup (which is a pre-existing quirk in
  // getIndustryStyleProfile, not something this expert can fix).
  industry: 'Finance / Banking',
  description: 'Build payment processing infrastructure in Java...',
  requirements: ['Java', 'Distributed Systems'],
  keywords: ['Java', 'Kafka', 'Postgres', 'AWS', 'TLS', 'Payments'],
};

const CREATIVE_AGENCY: JobVacancy = {
  title: 'Brand Strategist',
  company: 'Wieden+Kennedy',
  industry: 'Creative / Design / Advertising',
  description: 'Lead brand strategy work for premium clients...',
  requirements: ['Strategy', 'Workshops', 'Client management'],
  keywords: ['Brand', 'Strategy', 'Workshops', 'Storytelling', 'Research'],
};

const HEALTHCARE: JobVacancy = {
  title: 'Clinical Nurse Specialist',
  company: 'Erasmus MC',
  industry: 'Healthcare / Medical',
  description: 'Provide specialized cardiology nursing care...',
  requirements: ['BIG registration', 'Cardiology'],
  keywords: ['Patient care', 'Cardiology', 'BIG', 'EPD', 'Team lead'],
};

const SUSTAINABILITY: JobVacancy = {
  title: 'Sustainability Programme Lead',
  company: 'Triodos Foundation',
  // Note: getIndustryStyleProfile uses .includes() with short keywords
  // ('it', 'ai') that swallow strings like "non-profit / sustainability".
  // Using the bare keyword "NGO" matches the non-profit profile cleanly.
  industry: 'NGO',
  description: 'Run climate impact programmes for grant recipients...',
  requirements: ['Programme management', 'Climate science background'],
  keywords: ['Climate', 'ESG', 'Impact', 'Grants', 'Programme management'],
};

function makeCtx(jobVacancy: JobVacancy | null, history: CVDesignTokens[] = []): PromptContext {
  return {
    linkedInSummary: 'Name: Test Candidate\nHeadline: Senior professional',
    jobVacancy,
    userPreferences: undefined,
    hasPhoto: true,
    styleHistory: history,
  };
}

function summarize(label: string, tokens: CVDesignTokens) {
  return {
    label,
    themeBase: tokens.themeBase,
    fontPairing: tokens.fontPairing,
    headerVariant: tokens.headerVariant,
    sectionStyle: tokens.sectionStyle,
    accentStyle: tokens.accentStyle,
    nameStyle: tokens.nameStyle,
    skillTagStyle: tokens.skillTagStyle,
    decorations: tokens.decorations,
    colors: tokens.colors,
    pageBackground: tokens.pageBackground,
  };
}

console.log('=== TEST 1: Industry-aware fallback (no LLM call) ===\n');
for (const vac of [FINTECH, CREATIVE_AGENCY, HEALTHCARE, SUSTAINABILITY]) {
  const tokens = balancedExpert.getFallback(vac.industry);
  console.log(`Fallback for ${vac.industry}:`);
  console.log(JSON.stringify(summarize(vac.industry || 'unknown', tokens), null, 2));
  console.log('');
}

console.log('\n=== TEST 2: Anti-conservative escalation ===\n');

// Simulate AI returning the safest possible balanced output (all boring).
const safeRaw: Partial<CVDesignTokens> = {
  styleName: 'Safe Choice',
  styleRationale: 'Safe and conservative.',
  industryFit: 'general',
  themeBase: 'professional',
  colors: { primary: '#1a365d', secondary: '#f7fafc', accent: '#2b6cb0', text: '#2d3748', muted: '#718096' },
  fontPairing: 'inter-inter',
  scale: 'medium',
  spacing: 'comfortable',
  headerVariant: 'simple',
  sectionStyle: 'clean',
  skillsDisplay: 'tags',
  experienceDescriptionFormat: 'bullets',
  contactLayout: 'single-row',
  headerGradient: 'none',
  showPhoto: true,
  useIcons: false,
  roundedCorners: true,
  headerFullBleed: false,
  decorations: 'none',
  sectionOrder: ['summary', 'experience', 'education', 'skills'],
};

const escalated = balancedExpert.normalize(safeRaw, makeCtx(FINTECH));
console.log('After escalation:');
console.log(JSON.stringify(summarize('escalated-from-safe', escalated), null, 2));

console.log('\nExpected:');
console.log('  - decorations: minimal  (was none)');
console.log('  - accentStyle: border-left  (was undefined)');
console.log('  - sectionStyle: underlined  (was clean)');

console.log('\n=== TEST 3: History rotation ===\n');

const history: CVDesignTokens[] = Array.from({ length: 4 }, () => ({
  ...balancedExpert.getFallback('Healthcare / Medical'),
  fontPairing: 'inter-inter',
  sectionStyle: 'underlined',
  accentStyle: 'border-left',
  nameStyle: 'normal',
  skillTagStyle: 'filled',
}));

const repeatedRaw: Partial<CVDesignTokens> = {
  themeBase: 'modern',
  fontPairing: 'inter-inter',
  sectionStyle: 'underlined',
  accentStyle: 'border-left',
  nameStyle: 'normal',
  skillTagStyle: 'filled',
  decorations: 'minimal',
  headerVariant: 'accented',
  colors: { primary: '#1a365d', secondary: '#f7fafc', accent: '#2b6cb0', text: '#2d3748', muted: '#718096' },
};

const rotated = balancedExpert.normalize(repeatedRaw, makeCtx(HEALTHCARE, history));
console.log('After history rotation (raw was all "least-used" values):');
console.log(JSON.stringify(summarize('rotated', rotated), null, 2));
console.log('Expected: at least one of sectionStyle/accentStyle/font has changed from the history.');

console.log('\n=== TEST 4: HTML rendering ===\n');

const mockContent = {
  summary: 'Senior backend engineer with 8 years of experience in distributed systems and payments infrastructure.',
  experience: [
    {
      title: 'Senior Backend Engineer',
      company: 'Mock Corp',
      location: 'Amsterdam',
      period: '2022 — Present',
      description: 'Built and operated a payments platform.',
      bullets: [
        'Led a team of 4 engineers across 3 services.',
        'Reduced p99 latency by 35% through caching changes.',
      ],
    },
  ],
  education: [
    {
      degree: 'MSc Computer Science',
      institution: 'TU Delft',
      year: '2014 — 2016',
      details: 'Specialised in distributed systems.',
    },
  ],
  skills: { technical: ['Java', 'Kafka', 'Postgres'], soft: ['Leadership'], languages: ['Dutch', 'English'] },
  languages: [
    { language: 'Dutch', level: 'Native' },
    { language: 'English', level: 'Professional' },
  ],
  projects: [],
  certifications: [],
  interests: ['Cooking', 'Cycling'],
};

const contact = {
  email: 'test@example.com',
  phone: '+31 6 12345678',
  location: 'Amsterdam, NL',
  linkedinUrl: 'https://linkedin.com/in/test',
};

for (const vac of [FINTECH, SUSTAINABILITY, HEALTHCARE]) {
  const tokens = balancedExpert.getFallback(vac.industry);
  const html = generateCVHTML(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockContent as any,
    tokens,
    'Test Candidate',
    null,
    'Senior Professional',
    null,
    contact,
    {},
  );
  const safeName = (vac.industry || 'unknown').replace(/\W+/g, '-').toLowerCase();
  const outPath = `/tmp/balanced-${safeName}.html`;
  fs.writeFileSync(outPath, html);
  console.log(`Wrote ${outPath}  (length: ${html.length})`);
  // Quick sanity checks
  const hasName = html.includes('Test Candidate');
  const hasPrimary = html.includes(tokens.colors.primary);
  const hasAccent = html.includes(tokens.colors.accent);
  console.log(`  hasName=${hasName}, hasPrimaryColor=${hasPrimary}, hasAccentColor=${hasAccent}`);
}

console.log('\n=== TEST 5: Comparison vs Conservative ===\n');

// Import conservative for direct comparison
import { conservativeExpert } from './src/lib/ai/style-experts/conservative';

for (const vac of [FINTECH, SUSTAINABILITY]) {
  const c = conservativeExpert.getFallback(vac.industry);
  const b = balancedExpert.getFallback(vac.industry);
  console.log(`Industry: ${vac.industry}`);
  console.log(`  Conservative: hdr=${c.headerVariant}, sect=${c.sectionStyle}, accent=${c.accentStyle ?? 'none'}, decor=${c.decorations}, primary=${c.colors.primary}, accentColor=${c.colors.accent}`);
  console.log(`  Balanced   : hdr=${b.headerVariant}, sect=${b.sectionStyle}, accent=${b.accentStyle ?? 'none'}, decor=${b.decorations}, primary=${b.colors.primary}, accentColor=${b.colors.accent}`);
  console.log('');
}

console.log('\nDone.');
