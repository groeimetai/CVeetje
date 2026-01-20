/**
 * DOCX to Image Conversion
 *
 * Converts DOCX templates to PNG images for AI Vision analysis.
 * Uses mammoth for DOCX→HTML conversion and Puppeteer for HTML→PNG rendering.
 */

import mammoth from 'mammoth';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

async function getBrowser() {
  if (isServerless) {
    // Serverless environment (Vercel/AWS Lambda)
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123 }, // A4 at 96 DPI
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local development
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 794, height: 1123 }, // A4 at 96 DPI
  });
}

/**
 * Wraps HTML content in a styled document for rendering
 */
function wrapInStyledHtml(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #333;
          padding: 40px;
          max-width: 794px;
          min-height: 1123px;
          margin: 0 auto;
          background: white;
        }
        h1, h2, h3, h4, h5, h6 {
          margin-top: 1em;
          margin-bottom: 0.5em;
          font-weight: 600;
        }
        h1 { font-size: 24pt; }
        h2 { font-size: 18pt; }
        h3 { font-size: 14pt; }
        p {
          margin-bottom: 0.75em;
        }
        ul, ol {
          margin-bottom: 0.75em;
          padding-left: 1.5em;
        }
        li {
          margin-bottom: 0.25em;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1em;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        /* Preserve formatting from DOCX */
        .MsoNormal {
          margin-bottom: 0.5em;
        }
        /* Handle text alignment */
        [align="center"] {
          text-align: center;
        }
        [align="right"] {
          text-align: right;
        }
        /* Highlight sections for visibility */
        hr {
          border: none;
          border-top: 1px solid #eee;
          margin: 1em 0;
        }
      </style>
    </head>
    <body>${content}</body>
    </html>
  `;
}

export interface DocxToImageResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
  htmlContent?: string; // For debugging
}

/**
 * Converts a DOCX file to a PNG image for AI Vision analysis
 *
 * @param buffer - The DOCX file as an ArrayBuffer
 * @returns Base64-encoded PNG image
 */
export async function docxToImage(buffer: ArrayBuffer): Promise<DocxToImageResult> {
  let browser;

  try {
    // 1. Convert DOCX to HTML using mammoth
    const { value: html, messages } = await mammoth.convertToHtml(
      { arrayBuffer: buffer },
      {
        // Preserve styles as much as possible
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "p[style-name='Subtitle'] => p.subtitle:fresh",
          "b => strong",
          "i => em",
          "u => span.underline",
        ],
      }
    );

    // Log any conversion warnings
    if (messages.length > 0) {
      console.log('[DOCX→Image] Mammoth conversion messages:', messages);
    }

    // Check if we got any content
    if (!html || html.trim().length === 0) {
      return {
        success: false,
        error: 'DOCX file appears to be empty or could not be parsed',
      };
    }

    // 2. Render HTML to PNG using Puppeteer
    browser = await getBrowser();
    const page = await browser.newPage();

    // Set viewport to A4 size at 96 DPI
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2, // Higher quality screenshot
    });

    // Set the HTML content
    const styledHtml = wrapInStyledHtml(html);
    await page.setContent(styledHtml, { waitUntil: 'networkidle0' });

    // Wait a bit for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Take screenshot as base64 PNG
    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      fullPage: false, // Only capture viewport (first page)
    });

    await browser.close();

    return {
      success: true,
      imageBase64: screenshot as string,
      htmlContent: html, // Include for debugging if needed
    };
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }

    console.error('[DOCX→Image] Conversion failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during DOCX conversion',
    };
  }
}

/**
 * Validates that a file is a valid DOCX file
 *
 * @param buffer - The file buffer to validate
 * @returns true if the file appears to be a valid DOCX
 */
export function isValidDocx(buffer: ArrayBuffer): boolean {
  // DOCX files are ZIP archives starting with PK
  const view = new Uint8Array(buffer);

  // Check for ZIP magic number (PK\x03\x04)
  return view[0] === 0x50 && view[1] === 0x4b && view[2] === 0x03 && view[3] === 0x04;
}
