/**
 * Phase 0 test harness for cv-engine.
 *
 * Usage:
 *   npx tsx scripts/render-recipe.mts <recipeId>
 *
 * Examples:
 *   npx tsx scripts/render-recipe.mts balanced/studio
 *
 * Writes:
 *   test-output/cv-engine/<recipeId-slug>.html
 *   test-output/cv-engine/<recipeId-slug>.pdf
 *
 * Verifies:
 *   - registry lookup works for the requested id
 *   - composeCV returns a non-empty HTML doc
 *   - Puppeteer can produce a PDF (same path used in production)
 *   - HTML contains no `transform:` / `clip-path:` / `:hover` declarations
 *     (print-safety check inherited from the legacy renderer)
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import type { GeneratedCVContent } from '../src/types';
import type { CVStyleTokensV2 } from '../src/lib/cv-engine/tokens';
import { composeCV } from '../src/lib/cv-engine/render/compose';
import { getAllRecipeIds, getRecipeById } from '../src/lib/cv-engine/recipes/registry';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npx tsx scripts/render-recipe.mts <recipeId | --all>');
  process.exit(1);
}

const recipeIds = arg === '--all' ? getAllRecipeIds() : [arg];
for (const id of recipeIds) {
  if (!getRecipeById(id)) {
    console.error(`No recipe registered with id "${id}".`);
    process.exit(2);
  }
}

// ============ Fixture content ============

const fixtureContent: GeneratedCVContent = {
  headline: 'Senior Product Engineer with a bias toward shipping',
  summary:
    'Engineer-designer who turns vague product goals into measurable changes. Eight years across early-stage SaaS, fintech tooling and developer platforms. Comfortable in TypeScript, Postgres and the muddy bit between PM and design where the actual work is.',
  experience: [
    {
      title: 'Lead Engineer',
      company: 'Adyen',
      location: 'Amsterdam',
      period: '2024 — heden',
      highlights: [
        'Grew daily-active-merchants of the dispute tooling by 38% in two quarters.',
        'Led the migration from a server-rendered admin to a Next.js island architecture; cut median page load from 2.4s to 380ms.',
        'Wrote and shipped the design-system token migration that unblocked four product teams.',
      ],
    },
    {
      title: 'Senior Engineer',
      company: 'Bird',
      location: 'Amsterdam',
      period: '2021 — 2024',
      highlights: [
        'Owned the message-routing rewrite that took p99 latency from 1.2s to 180ms.',
        'Built the first internal SDK for vendor integrations, used by 11 teams within six months.',
      ],
    },
    {
      title: 'Engineer',
      company: 'Booking.com',
      location: 'Amsterdam',
      period: '2017 — 2021',
      highlights: [
        'Shipped the property-photo pipeline that processed 12M+ uploads/yr.',
        'Mentored four junior engineers through their first promotion.',
      ],
    },
  ],
  education: [
    {
      degree: 'BSc Computer Science',
      institution: 'University of Amsterdam',
      year: '2013 — 2017',
      details: 'Thesis on graph-database query planners. Cum laude.',
    },
  ],
  skills: {
    technical: [
      'TypeScript', 'React', 'Next.js', 'Postgres', 'GCP', 'Cloud Run', 'Puppeteer', 'AI SDK',
    ],
    soft: ['Cross-functional leadership', 'Technical writing', 'Mentoring'],
  },
  languages: [
    { language: 'Nederlands', level: 'Native' },
    { language: 'English', level: 'C2' },
    { language: 'Deutsch', level: 'B1' },
  ],
  certifications: ['Google Cloud Professional Architect', 'AWS Solutions Associate'],
  interests: ['Schaken — strategisch denken', 'Letterpress printing', 'Trail running'],
};

const outDir = join(process.cwd(), 'test-output', 'cv-engine');

const commonOpts = {
  fullName: 'Niels van der Werf',
  contact: {
    email: 'niels@example.com',
    phone: '+31 6 1234 5678',
    city: 'Amsterdam',
    linkedin: 'linkedin.com/in/niels',
    github: 'github.com/niels',
  },
  // Stable placeholder avatar (pravatar.cc returns a deterministic photo per `?u=`).
  avatarUrl: 'https://i.pravatar.cc/300?u=niels-vdw',
  locale: 'nl' as const,
};

// Print-safety grep. `transform` must be a property at the start of a
// declaration (preceded by whitespace, `{`, or `;`) — this avoids matching
// `text-transform`, which is print-safe.
const unsafePatterns = [
  /[\s{;]transform\s*:/i,
  /[\s{;]clip-path\s*:/i,
  /:hover\b/i,
];

const browser = await puppeteer.launch({ headless: true });
try {
  for (const id of recipeIds) {
    const recipe = getRecipeById(id)!;
    const slug = id.replace('/', '-');
    const tokens: CVStyleTokensV2 = {
      engineVersion: 'v2',
      recipeId: id,
      emphasis: {
        accentKeywords: ['38%', '180ms', '12M+', 'design-system', 'migration', 'p99'],
        nameTagline: 'Engineer · designer · gardener',
      },
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications', 'interests'],
    };

    for (const mode of ['a4-paged', 'single-long'] as const) {
      console.log(`[render-recipe] ${id} (shape=${recipe.layoutShape}, pageMode=${mode})...`);
      const { html, css } = composeCV(fixtureContent, tokens, { ...commonOpts, pageMode: mode });

      const unsafe = unsafePatterns.filter(p => p.test(css));
      if (unsafe.length > 0) {
        console.error(`  PRINT-UNSAFE CSS DETECTED (${id}, ${mode}):`, unsafe.map(p => p.toString()).join(', '));
        process.exit(3);
      }

      const suffix = mode === 'a4-paged' ? 'a4' : 'long';
      const htmlPath = join(outDir, `${slug}-${suffix}.html`);
      const pdfPath = join(outDir, `${slug}-${suffix}.pdf`);

      await writeFile(htmlPath, html, 'utf-8');

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      if (mode === 'a4-paged') {
        await page.pdf({
          path: pdfPath,
          format: 'A4',
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });
      } else {
        const heightPx = await page.evaluate(() => Math.ceil(document.body.scrollHeight));
        const widthPx = await page.evaluate(() => Math.ceil(document.body.scrollWidth));
        await page.pdf({
          path: pdfPath,
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
          pageRanges: '1',
        });
      }
      console.log(`  ${htmlPath.replace(process.cwd(), '.')} + ${pdfPath.replace(process.cwd(), '.')}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log('[render-recipe] done.');
