import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Cache the docx-preview script in module scope (read once)
let docxPreviewScript: string | null = null;

function getDocxPreviewScript(): string {
  if (!docxPreviewScript) {
    const scriptPath = path.join(
      process.cwd(),
      'node_modules/docx-preview/dist/docx-preview.min.js'
    );
    docxPreviewScript = fs.readFileSync(scriptPath, 'utf-8');
  }
  return docxPreviewScript;
}

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
 * Convert DOCX to PDF using docx-preview inside Puppeteer
 *
 * This renders the DOCX with full formatting fidelity (tab stops, fonts,
 * backgrounds, column layouts) by using the same docx-preview library
 * that powers the client-side preview.
 *
 * @param docxBytes - The DOCX file as ArrayBuffer
 * @returns PDF as Buffer
 */
export async function convertDocxToPdf(docxBytes: ArrayBuffer): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set up minimal HTML with a container
    await page.setContent(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body { background: white; }
    #container { background: white; }
  </style>
</head>
<body>
  <div id="container"></div>
</body>
</html>`,
      { waitUntil: 'domcontentloaded' }
    );

    // Inject docx-preview library
    await page.addScriptTag({ content: getDocxPreviewScript() });

    // Convert DOCX bytes to base64 for transfer into browser context
    const base64 = Buffer.from(docxBytes).toString('base64');

    // Render the DOCX inside the browser
    await page.evaluate(async (docxBase64: string) => {
      // Convert base64 back to ArrayBuffer
      const binaryString = atob(docxBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const container = document.getElementById('container')!;

      // Use the same options as the client-side preview
      await (window as unknown as { docx: { renderAsync: Function } }).docx.renderAsync(
        blob,
        container,
        undefined,
        {
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        }
      );

      // Wait for all fonts to load
      await document.fonts.ready;
    }, base64);

    // Add print CSS to style for PDF output
    await page.addStyleTag({
      content: `
        @page {
          size: A4;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
        }
        /* Each .docx-wrapper is a page rendered by docx-preview */
        .docx-wrapper {
          padding: 0 !important;
          background: white !important;
        }
        .docx-wrapper > section.docx {
          box-shadow: none !important;
          margin: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        /* Page breaks between pages */
        .docx-wrapper > section.docx {
          page-break-after: always;
        }
        .docx-wrapper > section.docx:last-child {
          page-break-after: avoid;
        }
      `,
    });

    // Small delay to ensure styles are applied and fonts rendered
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
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
