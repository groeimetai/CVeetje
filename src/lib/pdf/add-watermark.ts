import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

/**
 * Add a diagonal watermark to all pages of a PDF
 * This is used for preview mode to prevent unauthorized use
 */
export async function addWatermarkToPdf(
  pdfBytes: Uint8Array | ArrayBuffer | Buffer,
  watermarkText: string = 'CVeetje PREVIEW'
): Promise<Uint8Array> {
  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Get all pages
  const pages = pdfDoc.getPages();

  // Embed a font
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Add watermark to each page
  for (const page of pages) {
    const { width, height } = page.getSize();

    // Calculate font size based on page dimensions
    const fontSize = Math.min(width, height) / 8;

    // Calculate text width
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);

    // Draw multiple watermarks diagonally across the page
    const positions = [
      { x: width / 2, y: height / 2 },
      { x: width / 4, y: height * 0.75 },
      { x: width * 0.75, y: height * 0.25 },
    ];

    for (const pos of positions) {
      page.drawText(watermarkText, {
        x: pos.x - textWidth / 2,
        y: pos.y,
        size: fontSize,
        font,
        color: rgb(0.85, 0.85, 0.85), // Light gray
        rotate: degrees(-45),
        opacity: 0.5,
      });
    }
  }

  // Save the modified PDF
  const modifiedPdfBytes = await pdfDoc.save();

  return modifiedPdfBytes;
}
