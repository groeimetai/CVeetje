import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import type { GeneratedCVContent, CVElementOverrides, CVContactInfo } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { generateCVHTML, getDefaultTokens } from '@/lib/cv/html-generator';
import { spacingScales } from '@/lib/cv/templates/themes';

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

  // Local development
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
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

  // Generate HTML
  const html = generateCVHTML(
    content,
    effectiveTokens,
    fullName,
    avatarUrl,
    headline,
    overrides,
    contactInfo
  );

  const browser = await getBrowser();
  const page = await browser.newPage();

  // Set content
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Get page margin from tokens
  const pageMargin = spacingScales[effectiveTokens.spacing].pageMargin;

  // For full-bleed header, use CSS @page rules for per-page margin control
  const isFullBleed = effectiveTokens.headerFullBleed === true;

  let pdf: Uint8Array;

  if (pageMode === 'single-page') {
    // Single-page mode: measure content and create one tall page
    const contentHeight = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
    });

    // A4 width in pixels at 96 DPI is ~794px, we use mm for consistency
    const a4WidthMm = 210;
    // Convert content height to mm (assuming 96 DPI: 1px ≈ 0.264583mm)
    const contentHeightMm = Math.ceil(contentHeight * 0.264583) + 20; // Add some padding

    pdf = await page.pdf({
      width: `${a4WidthMm}mm`,
      height: `${contentHeightMm}mm`,
      printBackground: true,
      margin: isFullBleed
        ? { top: '0', right: '0', bottom: '0', left: '0' }
        : {
            top: pageMargin,
            right: pageMargin,
            bottom: pageMargin,
            left: pageMargin,
          },
    });
  } else {
    // Multi-page mode: standard A4 pages
    pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      // For full-bleed: let CSS @page rules handle margins (first page vs subsequent pages)
      // For normal: use consistent margins from tokens
      ...(isFullBleed
        ? {
            preferCSSPageSize: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
          }
        : {
            margin: {
              top: pageMargin,
              right: pageMargin,
              bottom: pageMargin,
              left: pageMargin,
            },
          }),
    });
  }

  await browser.close();

  return Buffer.from(pdf);
}
