import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import mammoth from 'mammoth';

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

/**
 * Custom style map for mammoth to preserve common formatting
 * Includes Dutch and English style names
 */
const STYLE_MAP = [
  // Preserve headings (English)
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  // Preserve headings (Dutch)
  "p[style-name='Kop 1'] => h1:fresh",
  "p[style-name='Kop 2'] => h2:fresh",
  "p[style-name='Kop 3'] => h3:fresh",
  "p[style-name='Kop 4'] => h4:fresh",
  // Preserve body text (Dutch)
  "p[style-name='Hoofdtekst'] => p:fresh",
  "p[style-name='Body Text'] => p:fresh",
  "p[style-name='Standaard'] => p:fresh",
  "p[style-name='Normal'] => p:fresh",
  // Preserve list styles
  "p[style-name='List Paragraph'] => li:fresh",
  "p[style-name='Lijstalinea'] => li:fresh",
  // Preserve some common styles
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  "r[style-name='Vet'] => strong",
  "r[style-name='Cursief'] => em",
];

/**
 * Generate CSS styles for the PDF output
 * This attempts to create a professional-looking document
 */
function generatePDFStyles(): string {
  return `
    <style>
      @page {
        size: A4;
        margin: 2cm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #333;
        margin: 0;
        padding: 0;
        background: white;
      }

      h1, h2, h3, h4, h5, h6 {
        margin-top: 1.2em;
        margin-bottom: 0.5em;
        font-weight: 600;
        line-height: 1.3;
        color: #1a1a1a;
      }

      h1 {
        font-size: 18pt;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 0.3em;
      }

      h2 {
        font-size: 14pt;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.2em;
      }

      h3 {
        font-size: 12pt;
      }

      p {
        margin: 0 0 0.8em 0;
      }

      ul, ol {
        margin: 0 0 1em 0;
        padding-left: 2em;
      }

      li {
        margin-bottom: 0.3em;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1em 0;
      }

      th, td {
        padding: 0.5em;
        text-align: left;
        border: 1px solid #e5e7eb;
      }

      th {
        background-color: #f9fafb;
        font-weight: 600;
      }

      strong, b {
        font-weight: 600;
      }

      em, i {
        font-style: italic;
      }

      a {
        color: #2563eb;
        text-decoration: none;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      /* Handle page breaks */
      h1, h2, h3 {
        page-break-after: avoid;
      }

      p, li {
        orphans: 3;
        widows: 3;
      }

      /* Tables shouldn't break across pages if possible */
      table {
        page-break-inside: avoid;
      }
    </style>
  `;
}

/**
 * Convert DOCX to HTML using mammoth
 *
 * @param docxBytes - The DOCX file as ArrayBuffer
 * @returns HTML string
 */
export async function convertDocxToHtml(docxBytes: ArrayBuffer): Promise<string> {
  // mammoth expects a Buffer, not an ArrayBuffer
  const buffer = Buffer.from(docxBytes);
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: STYLE_MAP,
      ignoreEmptyParagraphs: false,
    }
  );

  // Log any conversion messages (warnings, etc.)
  if (result.messages.length > 0) {
    console.log('DOCX to HTML conversion messages:', result.messages);
  }

  // Log HTML content length for debugging
  console.log('DOCX to HTML conversion result:', {
    htmlLength: result.value.length,
    messageCount: result.messages.length,
    firstChars: result.value.substring(0, 500),
  });

  return result.value;
}

/**
 * Convert DOCX to PDF
 *
 * @param docxBytes - The DOCX file as ArrayBuffer
 * @returns PDF as Buffer
 */
export async function convertDocxToPdf(docxBytes: ArrayBuffer): Promise<Buffer> {
  // Convert DOCX to HTML
  const htmlContent = await convertDocxToHtml(docxBytes);

  // Wrap in full HTML document with styles
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${generatePDFStyles()}
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  // Use Puppeteer to generate PDF
  const browser = await getBrowser();
  const page = await browser.newPage();

  // Set content
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  // Generate PDF with A4 format
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '2cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm',
    },
  });

  await browser.close();

  return Buffer.from(pdf);
}

/**
 * Convert filled DOCX template to PDF
 * This is a convenience function that handles the full workflow
 *
 * @param filledDocxBytes - The filled DOCX template as ArrayBuffer
 * @returns PDF as Buffer
 */
export async function convertFilledTemplateToPdf(
  filledDocxBytes: ArrayBuffer
): Promise<Buffer> {
  return convertDocxToPdf(filledDocxBytes);
}
