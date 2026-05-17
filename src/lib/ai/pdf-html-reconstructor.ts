/**
 * PDF HTML reconstruction fallback.
 *
 * When the overlay path would overflow too many fields, we ask the AI to
 * reconstruct the template as semantic HTML + Tailwind that visually mimics
 * the original. The HTML is rendered to PDF via Puppeteer (same engine used
 * for the standard CV PDF flow), so we keep WYSIWYG fidelity.
 *
 * Tradeoff: the output will not be pixel-identical to the original PDF — but
 * for templates where content does not fit the boxes, the alternative is a
 * broken overlay. The HTML approach handles overflow gracefully (multi-page,
 * wrapping, font-sizing) at the cost of some visual drift.
 */

import { generateText } from 'ai';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { createAIProvider, type LLMProvider } from './providers';
import { withRetry } from './retry';
import type { RenderedPage } from '@/lib/pdf/pdf-to-image';
import type { PDFBlueprint } from './pdf-template-analyzer';
import type { ParsedLinkedIn, JobVacancy, OutputLanguage } from '@/types';

const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

export interface ReconstructPDFOptions {
  pages: RenderedPage[];
  blueprint: PDFBlueprint;
  values: Map<string, string>;
  profileData: ParsedLinkedIn;
  provider: LLMProvider;
  apiKey: string;
  model: string;
  jobVacancy?: JobVacancy;
  language?: OutputLanguage;
  avatarUrl?: string | null;
}

export interface ReconstructPDFResult {
  pdfBytes: Uint8Array;
  warnings?: string[];
  usage?: { inputTokens: number; outputTokens: number };
}

/**
 * Reconstruct the template as HTML+Tailwind and render to PDF.
 */
export async function reconstructPDFFromBlueprint(
  opts: ReconstructPDFOptions,
): Promise<ReconstructPDFResult> {
  const { pages, blueprint, values, language = 'nl', avatarUrl } = opts;
  const warnings: string[] = [];

  const html = await generateHTML(opts);
  const fullHtml = wrapInDocument(html, avatarUrl ?? null, language);

  // First page determines target page size; we use A4 by default since most CVs are A4.
  const firstPage = pages[0];
  const isA4 = firstPage
    ? Math.abs(firstPage.pdfWidth - 595) < 5 && Math.abs(firstPage.pdfHeight - 842) < 5
    : true;

  const pdfBytes = await renderHTMLToPDF(fullHtml, { isA4, firstPage });
  if (!values.size) warnings.push('HTML reconstruction produced output but no AI-filled values were applied.');
  void blueprint; // blueprint is captured by generateHTML through the prompt; reference here to satisfy lint when unused.

  return { pdfBytes, warnings };
}

// ==================== AI: generate HTML ====================

async function generateHTML(opts: ReconstructPDFOptions): Promise<string> {
  const { pages, blueprint, values, provider, apiKey, model, profileData, jobVacancy, language = 'nl' } = opts;
  const aiProvider = createAIProvider(provider, apiKey);

  const filledFieldList = blueprint.fields
    .map((f) => {
      const v = values.get(f.id) ?? '';
      if (!v.trim()) return null;
      return `  ${f.id} (${f.kind}/${f.profileField}${typeof f.index === 'number' ? `[${f.index}]` : ''}): ${JSON.stringify(v.slice(0, 240))}`;
    })
    .filter(Boolean)
    .join('\n');

  const isEn = language === 'en';
  const systemPrompt = `You are a CV/resume HTML reconstructor. You see the rendered page images of the
original template AND a list of filled values per detected field. Recreate the template as a single
self-contained HTML document with Tailwind utility classes that visually approximates the original.

REQUIREMENTS:
- Output a SINGLE HTML fragment starting with <main class="..."> and ending with </main>.
  Do NOT include <html>, <head>, <body>, <!DOCTYPE>, <style>, or <script> tags — those are added by the caller.
- Use Tailwind utility classes only. Tailwind CDN is included by the caller. No custom CSS.
- Preserve sections, ordering, colors, and column layout from the template.
- Repeating blocks: render one DOM block per actual filled instance from the values list.
  If profile has more entries than the template originally showed, render them all.
- Keep fonts neutral (system-ui / sans-serif). Use color classes that match the template (bg-slate-900 for dark accents, etc.).
- For dates / sidebars / two-column layouts, use Tailwind grid/flex.
- The output MUST be in the target job language (${isEn ? 'English' : 'Dutch'}). Translate any visible labels that come from the template (e.g. "Werkervaring" → "Work experience" when target is English).
- Photo: if avatar is provided by caller, leave a <div data-photo-slot></div> placeholder where the photo should go and size it appropriately. The caller will insert the <img>.
- Honesty: only render values present in the fill list — never invent.

LAYOUT FIT: target A4 (210×297mm). Aim for a single page; let content overflow naturally to a second page if it must.`;

  const userContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [
    {
      type: 'text',
      text: `TEMPLATE PREVIEW (${pages.length} page${pages.length > 1 ? 's' : ''}):`,
    },
  ];
  for (const p of pages) {
    userContent.push({ type: 'text', text: `Page ${p.page} (${Math.round(p.pdfWidth)} × ${Math.round(p.pdfHeight)} pts):` });
    userContent.push({ type: 'image', image: p.dataUrl });
  }

  userContent.push({
    type: 'text',
    text: `\nFILLED VALUES (by field id):\n${filledFieldList || '(none)'}\n\nCANDIDATE NAME: ${profileData.fullName || ''}\n${jobVacancy?.title ? `TARGET JOB: ${jobVacancy.title}\n` : ''}\nReturn ONLY the <main>…</main> fragment — no explanation, no markdown fence.`,
  });

  const result = await withRetry(() =>
    generateText({
      model: aiProvider(model),
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      temperature: 0.3,
    })
  );

  let html = result.text.trim();
  // Strip accidental markdown fences if model added them
  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  // Ensure it starts with <main
  if (!/^<main\b/i.test(html)) {
    html = `<main class="p-8">${html}</main>`;
  }
  return html;
}

// ==================== HTML wrapping + Puppeteer ====================

function wrapInDocument(mainHtml: string, avatarUrl: string | null, language: OutputLanguage): string {
  const photoTag = avatarUrl
    ? `<script>
        document.querySelectorAll('[data-photo-slot]').forEach((el) => {
          const img = document.createElement('img');
          img.src = ${JSON.stringify(avatarUrl)};
          img.alt = 'Profielfoto';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          el.appendChild(img);
        });
      </script>`
    : '';

  return `<!DOCTYPE html>
<html lang="${language === 'en' ? 'en' : 'nl'}">
<head>
<meta charset="utf-8" />
<title>CV</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  html, body { margin: 0; padding: 0; background: white; color: #111; }
  @page { size: A4; margin: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  [data-photo-slot] { background: #e5e7eb; overflow: hidden; }
</style>
</head>
<body>
${mainHtml}
${photoTag}
</body>
</html>`;
}

async function getBrowser() {
  if (isServerless) {
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 1600 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1200, height: 1600 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

async function renderHTMLToPDF(
  html: string,
  opts: { isA4: boolean; firstPage?: RenderedPage },
): Promise<Uint8Array> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');

    const pdfOpts: Parameters<typeof page.pdf>[0] = opts.isA4
      ? {
          format: 'A4',
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        }
      : {
          // Try to match the original page size in mm if non-A4
          width: `${ptToMm(opts.firstPage?.pdfWidth ?? 595)}mm`,
          height: `${ptToMm(opts.firstPage?.pdfHeight ?? 842)}mm`,
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        };

    const pdf = await page.pdf(pdfOpts);
    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}

function ptToMm(pt: number): number {
  return Math.round((pt / 72) * 25.4 * 10) / 10;
}
