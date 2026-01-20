import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage, PDFTextField, PDFForm } from 'pdf-lib';
import type {
  PDFTemplate,
  PDFTemplateField,
  ProfileFieldMapping,
  ParsedLinkedIn,
} from '@/types';

// Detected form field from PDF
export interface DetectedFormField {
  name: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'other';
  value?: string;
  page?: number;
}

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

/**
 * Detect AcroForm fields in a PDF
 *
 * @param pdfBytes - The PDF as a Uint8Array
 * @returns Array of detected form fields with their names and types
 */
export async function detectFormFields(pdfBytes: Uint8Array): Promise<DetectedFormField[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const detectedFields: DetectedFormField[] = [];

  for (const field of fields) {
    const name = field.getName();
    let type: DetectedFormField['type'] = 'other';
    let value: string | undefined;

    try {
      if (field instanceof PDFTextField) {
        type = 'text';
        value = field.getText() || undefined;
      } else if (field.constructor.name === 'PDFCheckBox') {
        type = 'checkbox';
      } else if (field.constructor.name === 'PDFDropdown') {
        type = 'dropdown';
      }
    } catch {
      // Field type detection failed, keep as 'other'
    }

    detectedFields.push({
      name,
      type,
      value,
    });
  }

  return detectedFields;
}

/**
 * Check if a PDF has fillable form fields
 *
 * @param pdfBytes - The PDF as a Uint8Array
 * @returns True if the PDF has AcroForm fields
 */
export async function hasFormFields(pdfBytes: Uint8Array): Promise<boolean> {
  try {
    const fields = await detectFormFields(pdfBytes);
    return fields.length > 0;
  } catch {
    return false;
  }
}

/**
 * Auto-fill form fields based on field names using AI-suggested mappings
 * This tries to intelligently match field names to profile data
 *
 * @param pdfBytes - The PDF template
 * @param profileData - The profile data to fill
 * @param customValues - Custom values for birthDate, nationality, etc.
 * @returns The filled PDF, or null if no form fields were found/filled
 */
export async function fillFormFieldsAuto(
  pdfBytes: Uint8Array,
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>
): Promise<{ pdfBytes: Uint8Array; filledFields: string[] } | null> {
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  if (fields.length === 0) {
    return null;
  }

  const filledFields: string[] = [];

  // Common field name patterns and their mappings
  const fieldMappings: Record<string, () => string> = {
    // Name fields
    'naam': () => profileData.fullName || '',
    'name': () => profileData.fullName || '',
    'fullname': () => profileData.fullName || '',
    'full_name': () => profileData.fullName || '',
    'volledige naam': () => profileData.fullName || '',
    'voornaam': () => getFirstName(profileData.fullName || ''),
    'firstname': () => getFirstName(profileData.fullName || ''),
    'first_name': () => getFirstName(profileData.fullName || ''),
    'first name': () => getFirstName(profileData.fullName || ''),
    'achternaam': () => getLastName(profileData.fullName || ''),
    'lastname': () => getLastName(profileData.fullName || ''),
    'last_name': () => getLastName(profileData.fullName || ''),
    'last name': () => getLastName(profileData.fullName || ''),
    'surname': () => getLastName(profileData.fullName || ''),

    // Contact fields
    'email': () => profileData.email || '',
    'e-mail': () => profileData.email || '',
    'emailadres': () => profileData.email || '',
    'telefoon': () => profileData.phone || '',
    'phone': () => profileData.phone || '',
    'telefoonnummer': () => profileData.phone || '',
    'tel': () => profileData.phone || '',
    'mobile': () => profileData.phone || '',
    'mobiel': () => profileData.phone || '',

    // Location fields
    'woonplaats': () => (profileData.location || '').split(',')[0]?.trim() || '',
    'city': () => (profileData.location || '').split(',')[0]?.trim() || '',
    'stad': () => (profileData.location || '').split(',')[0]?.trim() || '',
    'plaats': () => (profileData.location || '').split(',')[0]?.trim() || '',
    'location': () => profileData.location || '',
    'locatie': () => profileData.location || '',

    // Personal fields (from customValues)
    'geboortedatum': () => customValues?.birthDate || '',
    'birthdate': () => customValues?.birthDate || '',
    'birth_date': () => customValues?.birthDate || '',
    'date of birth': () => customValues?.birthDate || '',
    'dob': () => customValues?.birthDate || '',
    'nationaliteit': () => customValues?.nationality || '',
    'nationality': () => customValues?.nationality || '',

    // Professional fields
    'functie': () => profileData.headline || profileData.experience[0]?.title || '',
    'function': () => profileData.headline || profileData.experience[0]?.title || '',
    'jobtitle': () => profileData.experience[0]?.title || '',
    'job_title': () => profileData.experience[0]?.title || '',
    'title': () => profileData.headline || '',
    'headline': () => profileData.headline || '',

    // LinkedIn
    'linkedin': () => profileData.linkedinUrl || '',
    'linkedin url': () => profileData.linkedinUrl || '',
    'linkedinurl': () => profileData.linkedinUrl || '',
  };

  // Experience fields (indexed)
  for (let i = 0; i < Math.min(profileData.experience.length, 10); i++) {
    const exp = profileData.experience[i];
    const num = i + 1;
    const suffixes = [String(num), `_${num}`, ` ${num}`, `${num}`, `[${i}]`];

    for (const suffix of suffixes) {
      fieldMappings[`werkgever${suffix}`] = () => exp.company || '';
      fieldMappings[`bedrijf${suffix}`] = () => exp.company || '';
      fieldMappings[`company${suffix}`] = () => exp.company || '';
      fieldMappings[`employer${suffix}`] = () => exp.company || '';
      fieldMappings[`functie${suffix}`] = () => exp.title || '';
      fieldMappings[`function${suffix}`] = () => exp.title || '';
      fieldMappings[`jobtitle${suffix}`] = () => exp.title || '';
      fieldMappings[`job_title${suffix}`] = () => exp.title || '';
      fieldMappings[`periode${suffix}`] = () => formatPeriod(exp.startDate, exp.endDate, exp.isCurrentRole);
      fieldMappings[`period${suffix}`] = () => formatPeriod(exp.startDate, exp.endDate, exp.isCurrentRole);
      fieldMappings[`werkzaamheden${suffix}`] = () => exp.description || '';
      fieldMappings[`description${suffix}`] = () => exp.description || '';
      fieldMappings[`taken${suffix}`] = () => exp.description || '';
      fieldMappings[`tasks${suffix}`] = () => exp.description || '';
    }
  }

  // Education fields (indexed)
  for (let i = 0; i < Math.min(profileData.education.length, 10); i++) {
    const edu = profileData.education[i];
    const num = i + 1;
    const suffixes = [String(num), `_${num}`, ` ${num}`, `${num}`, `[${i}]`];

    for (const suffix of suffixes) {
      fieldMappings[`opleiding${suffix}`] = () => edu.degree || '';
      fieldMappings[`education${suffix}`] = () => edu.degree || '';
      fieldMappings[`degree${suffix}`] = () => edu.degree || '';
      fieldMappings[`school${suffix}`] = () => edu.school || '';
      fieldMappings[`institution${suffix}`] = () => edu.school || '';
      fieldMappings[`instelling${suffix}`] = () => edu.school || '';
      fieldMappings[`studierichting${suffix}`] = () => edu.fieldOfStudy || '';
      fieldMappings[`field${suffix}`] = () => edu.fieldOfStudy || '';
      fieldMappings[`jaar${suffix}`] = () => formatPeriod(edu.startYear, edu.endYear);
      fieldMappings[`year${suffix}`] = () => formatPeriod(edu.startYear, edu.endYear);
    }
  }

  // Try to fill each field
  for (const field of fields) {
    const fieldName = field.getName().toLowerCase().trim();

    // Try exact match first
    let value: string | undefined;
    if (fieldMappings[fieldName]) {
      value = fieldMappings[fieldName]();
    } else {
      // Try partial match
      for (const [pattern, getValue] of Object.entries(fieldMappings)) {
        if (fieldName.includes(pattern) || pattern.includes(fieldName)) {
          value = getValue();
          break;
        }
      }
    }

    // Fill the field if we found a value
    if (value && field instanceof PDFTextField) {
      try {
        field.setText(value);
        filledFields.push(field.getName());
      } catch (e) {
        console.warn(`Failed to fill field "${field.getName()}":`, e);
      }
    }
  }

  if (filledFields.length === 0) {
    return null;
  }

  // Flatten form to make fields non-editable (optional, keeps appearance)
  // form.flatten();

  const resultBytes = await pdfDoc.save();
  return {
    pdfBytes: new Uint8Array(resultBytes),
    filledFields,
  };
}

/**
 * Fill a PDF template - tries form fields first, then falls back to coordinate-based
 *
 * @param templateBytes - The original PDF template as a Uint8Array
 * @param template - The template configuration with field positions (optional for form-based)
 * @param profileData - The LinkedIn/profile data to fill in
 * @param customValues - Optional custom values for fields like birthDate, nationality
 * @returns The filled PDF as a Uint8Array and info about what was filled
 */
export async function fillPDFTemplateAuto(
  templateBytes: Uint8Array,
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>
): Promise<{ pdfBytes: Uint8Array; method: 'form' | 'coordinates' | 'none'; filledFields?: string[] }> {
  // First try to fill form fields automatically
  const formResult = await fillFormFieldsAuto(templateBytes, profileData, customValues);

  if (formResult && formResult.filledFields.length > 0) {
    return {
      pdfBytes: formResult.pdfBytes,
      method: 'form',
      filledFields: formResult.filledFields,
    };
  }

  // No form fields filled - return original
  return {
    pdfBytes: templateBytes,
    method: 'none',
  };
}
