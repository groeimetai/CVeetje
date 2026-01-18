import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import type {
  GeneratedCVContent,
  CVTemplate,
  CVColorScheme,
  CVStyleConfig,
} from '@/types';
import { generateCVHTML, getDefaultStyleConfig } from '@/lib/cv/html-generator';

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

export async function generatePDF(
  content: GeneratedCVContent,
  template: CVTemplate,
  colorScheme: CVColorScheme,
  fullName: string,
  styleConfig?: CVStyleConfig | null,
  avatarUrl?: string | null,
  headline?: string | null
): Promise<Buffer> {
  // Always use dynamic HTML with either provided styleConfig or a generated default
  // This ensures consistent, well-styled PDFs even when AI styling fails
  const effectiveStyleConfig = styleConfig || getDefaultStyleConfig(colorScheme);
  const html = generateCVHTML(content, effectiveStyleConfig, fullName, avatarUrl, headline);

  const browser = await getBrowser();
  const page = await browser.newPage();

  // Set content
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Generate PDF
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      right: '15mm',
      bottom: '15mm',
      left: '15mm',
    },
  });

  await browser.close();

  return Buffer.from(pdf);
}
