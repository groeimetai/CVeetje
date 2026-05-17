import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import type { GeneratedCVContent, CVElementOverrides, CVContactInfo } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { generateCVHTML, getDefaultTokens } from '@/lib/cv/html-generator';

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

async function getBrowser() {
  if (isServerless) {
    // Serverless environment (Vercel/AWS Lambda)
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 1600 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local development — match serverless viewport for consistent rendering
  return puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1200, height: 1600 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

function pxToMm(px: number): number {
  return px * 0.264583;
}

export type PDFPageMode = 'multi-page' | 'single-page';

/**
 * Generate PDF from CV content and design tokens
 */
export async function generatePDF(
  content: GeneratedCVContent,
  fullName: string,
  tokens?: CVDesignTokens | null,
  avatarUrl?: string | null,
  headline?: string | null,
  overrides?: CVElementOverrides | null,
  contactInfo?: CVContactInfo | null,
  pageMode: PDFPageMode = 'multi-page'
): Promise<Buffer> {
  // Use provided tokens or default
  const effectiveTokens = tokens || getDefaultTokens();

  // Generate HTML with forPdf=true so the click-to-edit bridge (contenteditable
  // + hover outlines) is NOT injected into the rendered PDF. The preview iframe
  // uses the same generator without this flag to enable inline editing.
  const html = generateCVHTML(
    content,
    effectiveTokens,
    fullName,
    avatarUrl,
    headline,
    overrides,
    contactInfo,
    { forPdf: true },
  );

  const browser = await getBrowser();
  const page = await browser.newPage();

  // Set content
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const isFullBleed = effectiveTokens.headerFullBleed === true;

  let pdf: Uint8Array;

  // Always use zero Puppeteer margins — the CV container handles its own
  // internal padding so backgrounds/headers extend edge-to-edge on the page.
  const zeroMargin = { top: '0', right: '0', bottom: '0', left: '0' };

  if (pageMode === 'single-page') {
    // Single-page export should behave like a tall screenshot of the preview,
    // not like a print stylesheet. The creative/editorial renderer has
    // print-specific A4 rules that introduce pagination and whitespace.
    await page.emulateMediaType('screen');

    // SUPPRESS all break-* CSS in single-page mode. Even with explicit
    // width/height, Puppeteer/Chrome PDF generation still honours
    // `break-inside: avoid` on sections and items — when an element
    // doesn't fit within a notional page-height boundary, it splits the
    // PDF into multiple pages. Adding `break-* / page-break-*: auto`
    // overrides as the LAST stylesheet kills this behaviour so the
    // entire CV renders as one continuous tall page.
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          break-before: auto !important;
          break-after: auto !important;
          break-inside: auto !important;
          page-break-before: auto !important;
          page-break-after: auto !important;
          page-break-inside: auto !important;
        }
        /* Remove any @page-derived size — explicit width/height in pdf()
           options is the source of truth. */
        @page { size: auto; margin: 0; }
      `,
    });

    // Single-page mode: size the PDF to the actual CV root instead of the
    // whole document. Measuring body/html caused pathological page heights,
    // which PDF viewers then rendered as a tiny CV floating in a massive page.
    const contentSize = await page.evaluate(() => {
      const root =
        document.querySelector('.bold-cv, .editorial-cv, .cv-container') as HTMLElement | null;
      const target = root || document.body;
      const rect = target.getBoundingClientRect();

      return {
        width: Math.max(
          rect.width,
          target.scrollWidth,
          target.offsetWidth,
        ),
        height: Math.max(
          rect.height,
          target.scrollHeight,
          target.offsetHeight,
        ),
      };
    });

    const contentWidthMm = Math.ceil(pxToMm(contentSize.width));
    const contentHeightMm = Math.ceil(pxToMm(contentSize.height));
    const widthMm = Math.max(160, Math.min(210, contentWidthMm));
    const heightMm = Math.max(80, contentHeightMm + 4);

    pdf = await page.pdf({
      width: `${widthMm}mm`,
      height: `${heightMm}mm`,
      printBackground: true,
      margin: zeroMargin,
      preferCSSPageSize: false,
    });
  } else {
    await page.emulateMediaType('print');

    // Multi-page mode: standard A4 pages
    pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      ...(isFullBleed ? { preferCSSPageSize: true } : {}),
      margin: zeroMargin,
    });
  }

  await browser.close();

  return Buffer.from(pdf);
}
