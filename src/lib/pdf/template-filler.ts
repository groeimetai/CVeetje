import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import type {
  PDFTemplate,
  PDFTemplateField,
  ProfileFieldMapping,
  ParsedLinkedIn,
} from '@/types';

// Convert hex color to RGB values (0-1 range)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 0, g: 0, b: 0 }; // Default to black
}

// Extract first name from full name
function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

// Extract last name from full name
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(1).join(' ') || '';
}

// Format a date period from experience/education
function formatPeriod(startDate: string | null, endDate: string | null, isCurrentRole?: boolean): string {
  const start = startDate || '';
  const end = isCurrentRole ? 'Heden' : (endDate || '');
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - Heden`;
  if (end) return end;
  return '';
}

// Extract the value for a field based on its mapping
export function extractFieldValue(
  profileData: ParsedLinkedIn,
  mapping: ProfileFieldMapping,
  customValues?: Record<string, string>
): string {
  switch (mapping.type) {
    case 'personal':
      switch (mapping.field) {
        case 'fullName':
          return profileData.fullName || '';
        case 'firstName':
          return getFirstName(profileData.fullName || '');
        case 'lastName':
          return getLastName(profileData.fullName || '');
        case 'city':
          // Extract city from location (often "City, Country" format)
          const location = profileData.location || '';
          return location.split(',')[0]?.trim() || location;
        case 'email':
          return profileData.email || '';
        case 'phone':
          return profileData.phone || '';
        case 'birthDate':
          // Not typically in LinkedIn data, use custom value if provided
          return customValues?.birthDate || '';
        case 'nationality':
          // Not typically in LinkedIn data, use custom value if provided
          return customValues?.nationality || '';
        default:
          return '';
      }

    case 'experience':
      const exp = profileData.experience[mapping.index];
      if (!exp) return '';
      switch (mapping.field) {
        case 'company':
          return exp.company || '';
        case 'title':
          return exp.title || '';
        case 'period':
          return formatPeriod(exp.startDate, exp.endDate, exp.isCurrentRole);
        case 'description':
          return exp.description || '';
        case 'location':
          return exp.location || '';
        default:
          return '';
      }

    case 'education':
      const edu = profileData.education[mapping.index];
      if (!edu) return '';
      switch (mapping.field) {
        case 'school':
          return edu.school || '';
        case 'degree':
          return edu.degree || '';
        case 'fieldOfStudy':
          return edu.fieldOfStudy || '';
        case 'period':
          return formatPeriod(edu.startYear, edu.endYear);
        default:
          return '';
      }

    case 'skill':
      const skill = profileData.skills[mapping.index];
      return skill?.name || '';

    case 'language':
      const lang = profileData.languages[mapping.index];
      if (!lang) return '';
      switch (mapping.field) {
        case 'language':
          return lang.language || '';
        case 'proficiency':
          return lang.proficiency || '';
        default:
          return '';
      }

    case 'certification':
      const cert = profileData.certifications[mapping.index];
      return cert?.name || '';

    case 'custom':
      return mapping.value || '';

    default:
      return '';
  }
}

// Split text into lines that fit within a given width
function splitTextIntoLines(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Draw text on a PDF page with optional multi-line support
function drawTextField(
  page: PDFPage,
  field: PDFTemplateField,
  value: string,
  font: PDFFont
): void {
  if (!value) return;

  const fontSize = field.fontSize || 11;
  const color = field.fontColor ? hexToRgb(field.fontColor) : { r: 0, g: 0, b: 0 };

  if (field.isMultiLine && field.width) {
    // Multi-line text
    const lines = splitTextIntoLines(value, font, fontSize, field.width);
    const lineHeight = fontSize * 1.2;
    const maxLines = field.maxLines || lines.length;

    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      page.drawText(lines[i], {
        x: field.x,
        y: field.y - (i * lineHeight), // PDF coordinates go up, so we subtract for each line
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
      });
    }
  } else {
    // Single line text
    page.drawText(value, {
      x: field.x,
      y: field.y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  }
}

/**
 * Fill a PDF template with profile data
 *
 * @param templateBytes - The original PDF template as a Uint8Array
 * @param template - The template configuration with field positions
 * @param profileData - The LinkedIn/profile data to fill in
 * @param customValues - Optional custom values for fields like birthDate, nationality
 * @returns The filled PDF as a Uint8Array
 */
export async function fillPDFTemplate(
  templateBytes: Uint8Array,
  template: PDFTemplate,
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>
): Promise<Uint8Array> {
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(templateBytes, {
    ignoreEncryption: true, // Some templates might have light encryption
  });

  // Embed the Helvetica font (standard, always available)
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Get all pages
  const pages = pdfDoc.getPages();

  // Fill in each field
  for (const field of template.fields) {
    // Validate page index
    if (field.page < 0 || field.page >= pages.length) {
      console.warn(`Field "${field.name}" references invalid page ${field.page}`);
      continue;
    }

    const page = pages[field.page];
    const value = extractFieldValue(profileData, field.mapping, customValues);

    if (value) {
      drawTextField(page, field, value, helveticaFont);
    }
  }

  // Save and return the modified PDF
  return pdfDoc.save();
}

/**
 * Get the page count of a PDF
 *
 * @param pdfBytes - The PDF as a Uint8Array
 * @returns The number of pages
 */
export async function getPDFPageCount(pdfBytes: Uint8Array): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });
  return pdfDoc.getPageCount();
}

/**
 * Get page dimensions of a PDF
 *
 * @param pdfBytes - The PDF as a Uint8Array
 * @returns Array of page dimensions
 */
export async function getPDFPageDimensions(
  pdfBytes: Uint8Array
): Promise<{ width: number; height: number }[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });

  return pdfDoc.getPages().map((page) => ({
    width: page.getWidth(),
    height: page.getHeight(),
  }));
}
