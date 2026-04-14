import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { CVDesignTokens } from '@/types/design-tokens';
import { fontPairings, typeScales, spacingScales } from '@/lib/cv/templates/themes';

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

/**
 * Filter out sign-off paragraphs from the split fullText.
 *
 * fullText already contains the sign-off ("Met vriendelijke groet," +
 * candidate name) because formatFullLetter appends it for the text-
 * based preview. But the PDF and DOCX generators add their OWN styled
 * sign-off block separately. If we don't strip the sign-off paragraphs
 * from the content, the output has a double ending.
 *
 * This helper detects and removes the trailing sign-off paragraphs by
 * scanning from the end for common greeting phrases and standalone
 * name-like paragraphs (short, no period at the end).
 */
function stripSignOffParagraphs(paragraphs: string[], senderName: string): string[] {
  if (paragraphs.length === 0) return paragraphs;

  const signOffPhrases = [
    'met vriendelijke groet',
    'met hartelijke groet',
    'vriendelijke groet',
    'hartelijke groet',
    'hoogachtend',
    'kind regards',
    'best regards',
    'warm regards',
    'yours sincerely',
    'yours faithfully',
    'sincerely',
    'regards',
  ];

  // Walk backwards from the end and strip sign-off paragraphs.
  // A paragraph is a sign-off paragraph if:
  //   a) it matches one of the sign-off phrases (case-insensitive), or
  //   b) it looks like a standalone name (short, similar to senderName)
  // Stop as soon as we hit a "real" content paragraph.
  const result = [...paragraphs];

  while (result.length > 0) {
    const last = result[result.length - 1].trim().toLowerCase().replace(/[,.\s]+$/, '');

    // Check if it's a sign-off phrase
    const isSignOff = signOffPhrases.some((phrase) => last.includes(phrase));

    // Check if it's a standalone name (≤ 60 chars, similar to senderName)
    const isName =
      last.length <= 60 &&
      !last.includes('.') &&
      (last === senderName.toLowerCase() ||
        senderName.toLowerCase().includes(last) ||
        last.includes(senderName.toLowerCase()));

    if (isSignOff || isName) {
      result.pop();
    } else {
      break;
    }
  }

  return result;
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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

interface MotivationLetterData {
  fullText: string;
  recipientName?: string;
  recipientCompany?: string;
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  senderLocation?: string;
  date?: string;
}

/**
 * Extract clean font name from CSS font-family string
 * e.g., "'Inter', sans-serif" -> "Inter"
 */
function extractFontName(fontFamily: string): string {
  // Remove quotes and get the first font name
  const match = fontFamily.match(/['"]?([^'",]+)['"]?/);
  return match ? match[1].trim() : 'Arial';
}

/**
 * Generate styled HTML for motivation letter
 */
function generateMotivationLetterHTML(
  data: MotivationLetterData,
  tokens: CVDesignTokens
): string {
  const fontConfig = fontPairings[tokens.fontPairing];
  const typeScale = typeScales[tokens.scale];
  const spacingScale = spacingScales[tokens.spacing];

  const today = data.date || new Date().toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Split text into paragraphs and strip the sign-off paragraphs.
  // formatFullLetter already includes a "Met vriendelijke groet, /
  // {name}" block in fullText (for the text preview), but THIS renderer
  // adds its own styled sign-off below, so we filter the text-based one
  // out to avoid a double ending.
  const rawParagraphs = data.fullText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => p.trim());
  const paragraphs = stripSignOffParagraphs(rawParagraphs, data.senderName);

  // Build Google Fonts links
  const fontLinks = [fontConfig.heading.googleUrl, fontConfig.body.googleUrl]
    .filter(url => url && url.length > 0)
    .map(url => `<link href="${url}" rel="stylesheet">`)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Motivatiebrief - ${data.senderName}</title>
  ${fontLinks}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${fontConfig.body.family};
      font-size: ${typeScale.body}pt;
      line-height: 1.6;
      color: ${tokens.colors.text};
      background: white;
      padding: 40mm 25mm;
      max-width: 210mm;
      margin: 0 auto;
    }

    .header {
      margin-bottom: ${spacingScale.section};
    }

    .sender-info {
      text-align: right;
      margin-bottom: ${spacingScale.item};
    }

    .sender-name {
      font-family: ${fontConfig.heading.family}, sans-serif;
      font-size: ${typeScale.heading}pt;
      font-weight: 600;
      color: ${tokens.colors.primary};
    }

    .sender-contact {
      font-size: ${typeScale.small}pt;
      color: ${tokens.colors.muted};
      margin-top: 4px;
    }

    .date {
      text-align: right;
      color: ${tokens.colors.muted};
      font-size: ${typeScale.small}pt;
      margin-bottom: ${spacingScale.section};
    }

    .recipient {
      margin-bottom: ${spacingScale.section};
    }

    .recipient-company {
      font-weight: 500;
    }

    .subject {
      font-family: ${fontConfig.heading.family}, sans-serif;
      font-size: ${typeScale.heading}pt;
      font-weight: 600;
      color: ${tokens.colors.primary};
      margin-bottom: ${spacingScale.section};
      padding-bottom: 8px;
      border-bottom: 2px solid ${tokens.colors.accent};
    }

    .content {
      margin-bottom: ${spacingScale.section};
    }

    .paragraph {
      margin-bottom: ${spacingScale.item};
      text-align: justify;
    }

    .closing {
      margin-top: ${spacingScale.section};
    }

    .signature {
      margin-top: 24px;
    }

    .signature-name {
      font-family: ${fontConfig.heading.family}, sans-serif;
      font-weight: 600;
      color: ${tokens.colors.primary};
    }

    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="sender-info">
      <div class="sender-name">${data.senderName}</div>
      <div class="sender-contact">
        ${[data.senderEmail, data.senderPhone, data.senderLocation].filter(Boolean).join(' | ')}
      </div>
    </div>
    <div class="date">${today}</div>
  </div>

  ${data.recipientCompany ? `
  <div class="recipient">
    ${data.recipientName ? `<div>${data.recipientName}</div>` : ''}
    <div class="recipient-company">${data.recipientCompany}</div>
  </div>
  ` : ''}

  <div class="subject">Motivatiebrief</div>

  <div class="content">
    ${paragraphs.map(p => `<p class="paragraph">${p}</p>`).join('\n    ')}
  </div>

  <div class="closing">
    <p>Met vriendelijke groet,</p>
    <div class="signature">
      <div class="signature-name">${data.senderName}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate PDF from motivation letter
 */
export async function generateMotivationLetterPDF(
  data: MotivationLetterData,
  tokens: CVDesignTokens
): Promise<Buffer> {
  const html = generateMotivationLetterHTML(data, tokens);

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm',
    },
  });

  await browser.close();

  return Buffer.from(pdf);
}

/**
 * Generate DOCX from motivation letter
 */
export async function generateMotivationLetterDOCX(
  data: MotivationLetterData,
  tokens: CVDesignTokens
): Promise<Buffer> {
  const fontConfig = fontPairings[tokens.fontPairing];

  const today = data.date || new Date().toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Split text into paragraphs and strip the sign-off (same reason as
  // the PDF generator — fullText includes one, we add our own styled one).
  const rawParagraphs = data.fullText
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => p.trim());
  const paragraphs = stripSignOffParagraphs(rawParagraphs, data.senderName);

  // Build document sections
  const children: Paragraph[] = [];

  // Sender info (right aligned)
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: data.senderName,
          bold: true,
          size: 28, // 14pt
          font: extractFontName(fontConfig.heading.family),
        }),
      ],
    })
  );

  if (data.senderEmail || data.senderPhone || data.senderLocation) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: [data.senderEmail, data.senderPhone, data.senderLocation].filter(Boolean).join(' | '),
            size: 20, // 10pt
            color: '666666',
            font: extractFontName(fontConfig.body.family),
          }),
        ],
      })
    );
  }

  // Date
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 400, after: 400 },
      children: [
        new TextRun({
          text: today,
          size: 20,
          color: '666666',
          font: extractFontName(fontConfig.body.family),
        }),
      ],
    })
  );

  // Recipient
  if (data.recipientCompany) {
    if (data.recipientName) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: data.recipientName,
              font: extractFontName(fontConfig.body.family),
            }),
          ],
        })
      );
    }
    children.push(
      new Paragraph({
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: data.recipientCompany,
            bold: true,
            font: extractFontName(fontConfig.body.family),
          }),
        ],
      })
    );
  }

  // Subject
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 400 },
      children: [
        new TextRun({
          text: 'Motivatiebrief',
          bold: true,
          size: 28,
          font: extractFontName(fontConfig.heading.family),
        }),
      ],
    })
  );

  // Content paragraphs
  paragraphs.forEach(paragraph => {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: paragraph,
            font: extractFontName(fontConfig.body.family),
          }),
        ],
      })
    );
  });

  // Closing
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: 'Met vriendelijke groet,',
          font: extractFontName(fontConfig.body.family),
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: data.senderName,
          bold: true,
          font: extractFontName(fontConfig.heading.family),
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
