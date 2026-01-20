import JSZip from 'jszip';
import mammoth from 'mammoth';
import type {
  DocxPlaceholder,
  ProfileFieldMapping,
  ParsedLinkedIn,
} from '@/types';

// Placeholder patterns to detect
const PLACEHOLDER_PATTERNS = {
  // {{name}}, {{voornaam}}, etc.
  doubleBrace: /\{\{([^}]+)\}\}/g,
  // [NAME], [VOORNAAM], etc.
  squareBracket: /\[([A-Z][A-Z0-9_\s]*)\]/g,
  // {name}, {voornaam}, etc.
  singleBrace: /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,
  // Label: _____ or Label: ................
  labelWithUnderscores: /([A-Za-z\s]+):\s*[_\.]{3,}/g,
  // Label followed by lots of spaces (at least 10)
  labelWithSpaces: /([A-Za-z\s]+):\s{10,}/g,
};

// Common field name mappings (Dutch and English)
const FIELD_NAME_MAPPINGS: Record<string, ProfileFieldMapping> = {
  // Personal - Full name
  'naam': { type: 'personal', field: 'fullName' },
  'name': { type: 'personal', field: 'fullName' },
  'fullname': { type: 'personal', field: 'fullName' },
  'full_name': { type: 'personal', field: 'fullName' },
  'volledige naam': { type: 'personal', field: 'fullName' },
  'volledige_naam': { type: 'personal', field: 'fullName' },

  // Personal - First name
  'voornaam': { type: 'personal', field: 'firstName' },
  'firstname': { type: 'personal', field: 'firstName' },
  'first_name': { type: 'personal', field: 'firstName' },
  'first name': { type: 'personal', field: 'firstName' },

  // Personal - Last name
  'achternaam': { type: 'personal', field: 'lastName' },
  'lastname': { type: 'personal', field: 'lastName' },
  'last_name': { type: 'personal', field: 'lastName' },
  'last name': { type: 'personal', field: 'lastName' },
  'surname': { type: 'personal', field: 'lastName' },

  // Personal - Email
  'email': { type: 'personal', field: 'email' },
  'e-mail': { type: 'personal', field: 'email' },
  'emailadres': { type: 'personal', field: 'email' },
  'email_adres': { type: 'personal', field: 'email' },
  'email address': { type: 'personal', field: 'email' },

  // Personal - Phone
  'telefoon': { type: 'personal', field: 'phone' },
  'telefoonnummer': { type: 'personal', field: 'phone' },
  'phone': { type: 'personal', field: 'phone' },
  'tel': { type: 'personal', field: 'phone' },
  'mobile': { type: 'personal', field: 'phone' },
  'mobiel': { type: 'personal', field: 'phone' },

  // Personal - City/Location
  'woonplaats': { type: 'personal', field: 'city' },
  'city': { type: 'personal', field: 'city' },
  'stad': { type: 'personal', field: 'city' },
  'plaats': { type: 'personal', field: 'city' },
  'location': { type: 'personal', field: 'city' },
  'locatie': { type: 'personal', field: 'city' },

  // Personal - Birth date
  'geboortedatum': { type: 'personal', field: 'birthDate' },
  'birthdate': { type: 'personal', field: 'birthDate' },
  'birth_date': { type: 'personal', field: 'birthDate' },
  'date of birth': { type: 'personal', field: 'birthDate' },
  'dob': { type: 'personal', field: 'birthDate' },

  // Personal - Nationality
  'nationaliteit': { type: 'personal', field: 'nationality' },
  'nationality': { type: 'personal', field: 'nationality' },
};

// Experience field mappings (with index patterns)
const EXPERIENCE_FIELD_PATTERNS: Record<string, 'company' | 'title' | 'period' | 'description' | 'location'> = {
  'werkgever': 'company',
  'bedrijf': 'company',
  'company': 'company',
  'employer': 'company',
  'organisatie': 'company',
  'organization': 'company',

  'functie': 'title',
  'function': 'title',
  'jobtitle': 'title',
  'job_title': 'title',
  'job title': 'title',
  'positie': 'title',
  'position': 'title',
  'rol': 'title',
  'role': 'title',

  'periode': 'period',
  'period': 'period',
  'datum': 'period',
  'date': 'period',
  'dates': 'period',

  'taken': 'description',
  'tasks': 'description',
  'werkzaamheden': 'description',
  'description': 'description',
  'omschrijving': 'description',
  'responsibilities': 'description',

  'locatie': 'location',
  'location': 'location',
  'plaats': 'location',
};

// Education field mappings
const EDUCATION_FIELD_PATTERNS: Record<string, 'school' | 'degree' | 'fieldOfStudy' | 'period'> = {
  'school': 'school',
  'instelling': 'school',
  'institution': 'school',
  'universiteit': 'school',
  'university': 'school',
  'hogeschool': 'school',
  'college': 'school',

  'opleiding': 'degree',
  'education': 'degree',
  'degree': 'degree',
  'diploma': 'degree',

  'studierichting': 'fieldOfStudy',
  'richting': 'fieldOfStudy',
  'field': 'fieldOfStudy',
  'specialisatie': 'fieldOfStudy',
  'major': 'fieldOfStudy',

  'jaar': 'period',
  'year': 'period',
  'periode': 'period',
  'period': 'period',
};

/**
 * Extract first name from full name
 */
function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

/**
 * Extract last name from full name
 */
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(1).join(' ') || '';
}

/**
 * Format a date period
 */
function formatPeriod(startDate: string | null, endDate: string | null, isCurrentRole?: boolean): string {
  const start = startDate || '';
  const end = isCurrentRole ? 'Heden' : (endDate || '');
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - Heden`;
  if (end) return end;
  return '';
}

/**
 * Get value for a profile field mapping
 */
export function getFieldValue(
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
          const location = profileData.location || '';
          return location.split(',')[0]?.trim() || location;
        case 'email':
          return profileData.email || '';
        case 'phone':
          return profileData.phone || '';
        case 'birthDate':
          return customValues?.birthDate || '';
        case 'nationality':
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

/**
 * Parse a placeholder name into a ProfileFieldMapping
 */
function parseFieldName(fieldName: string): { mapping: ProfileFieldMapping; confidence: 'low' | 'medium' | 'high' } | null {
  const normalized = fieldName.toLowerCase().trim().replace(/[_\s]+/g, ' ').replace(/\s+/g, ' ');

  // Check for indexed patterns (e.g., "werkgever 1", "functie_2", "company[0]")
  const indexMatch = normalized.match(/^(.+?)[\s_]*(\d+)$|^(.+?)\[(\d+)\]$/);
  if (indexMatch) {
    const baseName = (indexMatch[1] || indexMatch[3])?.trim();
    const index = parseInt(indexMatch[2] || indexMatch[4], 10) - 1; // Convert to 0-indexed

    // Check experience fields
    for (const [pattern, field] of Object.entries(EXPERIENCE_FIELD_PATTERNS)) {
      if (baseName === pattern || baseName.includes(pattern)) {
        return {
          mapping: { type: 'experience', index: Math.max(0, index), field },
          confidence: baseName === pattern ? 'high' : 'medium',
        };
      }
    }

    // Check education fields
    for (const [pattern, field] of Object.entries(EDUCATION_FIELD_PATTERNS)) {
      if (baseName === pattern || baseName.includes(pattern)) {
        return {
          mapping: { type: 'education', index: Math.max(0, index), field },
          confidence: baseName === pattern ? 'high' : 'medium',
        };
      }
    }

    // Check for skill index
    if (baseName === 'skill' || baseName === 'vaardigheid') {
      return {
        mapping: { type: 'skill', index: Math.max(0, index) },
        confidence: 'high',
      };
    }

    // Check for language index
    if (baseName === 'taal' || baseName === 'language') {
      return {
        mapping: { type: 'language', index: Math.max(0, index), field: 'language' },
        confidence: 'high',
      };
    }
  }

  // Check direct field mappings
  if (FIELD_NAME_MAPPINGS[normalized]) {
    return {
      mapping: FIELD_NAME_MAPPINGS[normalized],
      confidence: 'high',
    };
  }

  // Fuzzy matching for partial matches
  for (const [key, mapping] of Object.entries(FIELD_NAME_MAPPINGS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { mapping, confidence: 'medium' };
    }
  }

  // Check experience fields without index (default to first)
  for (const [pattern, field] of Object.entries(EXPERIENCE_FIELD_PATTERNS)) {
    if (normalized === pattern || normalized.includes(pattern)) {
      return {
        mapping: { type: 'experience', index: 0, field },
        confidence: normalized === pattern ? 'medium' : 'low',
      };
    }
  }

  // Check education fields without index (default to first)
  for (const [pattern, field] of Object.entries(EDUCATION_FIELD_PATTERNS)) {
    if (normalized === pattern || normalized.includes(pattern)) {
      return {
        mapping: { type: 'education', index: 0, field },
        confidence: normalized === pattern ? 'medium' : 'low',
      };
    }
  }

  return null;
}

/**
 * Detect placeholders in DOCX text content
 */
export function detectPlaceholders(text: string): DocxPlaceholder[] {
  const placeholders: DocxPlaceholder[] = [];
  const foundTexts = new Set<string>();

  // Helper to add placeholder if not already found
  const addPlaceholder = (
    originalText: string,
    fieldName: string,
    placeholderType: 'explicit' | 'label-with-space'
  ) => {
    if (foundTexts.has(originalText)) return;
    foundTexts.add(originalText);

    const parsed = parseFieldName(fieldName);
    if (parsed) {
      placeholders.push({
        id: `placeholder_${placeholders.length}`,
        originalText,
        placeholderType,
        mapping: parsed.mapping,
        confidence: parsed.confidence,
      });
    } else {
      // Unknown field - store as custom with the original text
      placeholders.push({
        id: `placeholder_${placeholders.length}`,
        originalText,
        placeholderType,
        mapping: { type: 'custom', value: '' },
        confidence: 'low',
      });
    }
  };

  // Match double brace placeholders: {{name}}
  let match;
  while ((match = PLACEHOLDER_PATTERNS.doubleBrace.exec(text)) !== null) {
    addPlaceholder(match[0], match[1], 'explicit');
  }

  // Reset regex
  PLACEHOLDER_PATTERNS.doubleBrace.lastIndex = 0;

  // Match square bracket placeholders: [NAME]
  while ((match = PLACEHOLDER_PATTERNS.squareBracket.exec(text)) !== null) {
    addPlaceholder(match[0], match[1], 'explicit');
  }
  PLACEHOLDER_PATTERNS.squareBracket.lastIndex = 0;

  // Match single brace placeholders: {name}
  while ((match = PLACEHOLDER_PATTERNS.singleBrace.exec(text)) !== null) {
    addPlaceholder(match[0], match[1], 'explicit');
  }
  PLACEHOLDER_PATTERNS.singleBrace.lastIndex = 0;

  // Match label with underscores: Naam: _____
  while ((match = PLACEHOLDER_PATTERNS.labelWithUnderscores.exec(text)) !== null) {
    addPlaceholder(match[0], match[1], 'label-with-space');
  }
  PLACEHOLDER_PATTERNS.labelWithUnderscores.lastIndex = 0;

  // Match label with spaces: Naam:          (10+ spaces)
  while ((match = PLACEHOLDER_PATTERNS.labelWithSpaces.exec(text)) !== null) {
    addPlaceholder(match[0], match[1], 'label-with-space');
  }
  PLACEHOLDER_PATTERNS.labelWithSpaces.lastIndex = 0;

  return placeholders;
}

/**
 * Extract raw text from a DOCX file for analysis
 */
export async function extractDocxText(docxBytes: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: docxBytes });
  return result.value;
}

/**
 * Analyze a DOCX template and detect all placeholders
 */
export async function analyzeDocxTemplate(docxBytes: ArrayBuffer): Promise<{
  text: string;
  placeholders: DocxPlaceholder[];
}> {
  const text = await extractDocxText(docxBytes);
  const placeholders = detectPlaceholders(text);
  return { text, placeholders };
}

/**
 * Replace placeholders in DOCX XML content
 */
function replacePlaceholdersInXml(
  xml: string,
  placeholders: DocxPlaceholder[],
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>
): string {
  let result = xml;

  for (const placeholder of placeholders) {
    const value = getFieldValue(profileData, placeholder.mapping, customValues);

    if (placeholder.placeholderType === 'explicit') {
      // Direct replacement for explicit placeholders
      // Handle case where placeholder might be split across XML tags
      const escapedPlaceholder = placeholder.originalText
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Try direct replacement first
      result = result.replace(new RegExp(escapedPlaceholder, 'g'), escapeXml(value));

      // Also try to handle split placeholders (e.g., {{</w:t></w:r><w:r><w:t>name}})
      const innerText = placeholder.originalText.replace(/^\{\{|\}\}$|^\[|\]$|^\{|\}$/g, '');
      const splitPattern = createSplitPlaceholderPattern(placeholder.originalText, innerText);
      if (splitPattern) {
        result = result.replace(splitPattern, escapeXml(value));
      }
    } else {
      // For label-with-space patterns, replace the empty part with the value
      // e.g., "Naam: _____" -> "Naam: John Doe"
      const labelMatch = placeholder.originalText.match(/^(.+?):\s*([_\.]+|\s{10,})$/);
      if (labelMatch) {
        const label = labelMatch[1];
        const replacement = `${label}: ${escapeXml(value)}`;

        // Try to replace in XML, handling potential splits
        const escapedOriginal = placeholder.originalText
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escapedOriginal, 'g'), replacement);
      }
    }
  }

  return result;
}

/**
 * Create a pattern to match placeholders that might be split across XML tags
 */
function createSplitPlaceholderPattern(original: string, innerText: string): RegExp | null {
  if (original.startsWith('{{') && original.endsWith('}}')) {
    // Create pattern that allows XML tags between characters
    const chars = innerText.split('');
    const pattern = '\\{\\{' +
      chars.map(c => `(?:<[^>]*>)*${escapeRegex(c)}`).join('') +
      '(?:<[^>]*>)*\\}\\}';
    return new RegExp(pattern, 'g');
  }
  if (original.startsWith('[') && original.endsWith(']')) {
    const chars = innerText.split('');
    const pattern = '\\[' +
      chars.map(c => `(?:<[^>]*>)*${escapeRegex(c)}`).join('') +
      '(?:<[^>]*>)*\\]';
    return new RegExp(pattern, 'g');
  }
  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Fill a DOCX template with profile data
 *
 * @param docxBytes - The DOCX template as ArrayBuffer
 * @param placeholders - Detected or configured placeholders
 * @param profileData - Profile data to fill
 * @param customValues - Custom values for birthDate, nationality, etc.
 * @returns Filled DOCX as ArrayBuffer
 */
export async function fillDocxTemplate(
  docxBytes: ArrayBuffer,
  placeholders: DocxPlaceholder[],
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>
): Promise<ArrayBuffer> {
  // Load the DOCX as a ZIP file
  const zip = await JSZip.loadAsync(docxBytes);

  // Get the main document XML
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Invalid DOCX file: missing word/document.xml');
  }

  let documentXml = await documentXmlFile.async('string');

  // Replace placeholders
  documentXml = replacePlaceholdersInXml(documentXml, placeholders, profileData, customValues);

  // Update the document in the ZIP
  zip.file('word/document.xml', documentXml);

  // Also check and update header/footer files
  const headerFooterFiles = Object.keys(zip.files).filter(
    name => name.match(/word\/(header|footer)\d*\.xml/)
  );

  for (const fileName of headerFooterFiles) {
    const file = zip.file(fileName);
    if (file) {
      let content = await file.async('string');
      content = replacePlaceholdersInXml(content, placeholders, profileData, customValues);
      zip.file(fileName, content);
    }
  }

  // Generate the filled DOCX
  return zip.generateAsync({ type: 'arraybuffer' });
}

/**
 * Fill a DOCX template automatically by detecting placeholders
 *
 * @param docxBytes - The DOCX template as ArrayBuffer
 * @param profileData - Profile data to fill
 * @param customValues - Custom values for birthDate, nationality, etc.
 * @returns Filled DOCX and list of detected/filled placeholders
 */
export async function fillDocxTemplateAuto(
  docxBytes: ArrayBuffer,
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>
): Promise<{
  docxBytes: ArrayBuffer;
  placeholders: DocxPlaceholder[];
  filledCount: number;
}> {
  // Analyze the template
  const { placeholders } = await analyzeDocxTemplate(docxBytes);

  // Filter to only placeholders with known mappings
  const validPlaceholders = placeholders.filter(
    p => p.mapping.type !== 'custom' || (p.mapping as { value: string }).value !== ''
  );

  // Fill the template
  const filledBytes = await fillDocxTemplate(docxBytes, validPlaceholders, profileData, customValues);

  // Count how many were actually filled (have non-empty values)
  let filledCount = 0;
  for (const p of validPlaceholders) {
    const value = getFieldValue(profileData, p.mapping, customValues);
    if (value) filledCount++;
  }

  return {
    docxBytes: filledBytes,
    placeholders,
    filledCount,
  };
}

/**
 * Get DOCX page count estimate (DOCX doesn't have fixed pages)
 * This is an approximation based on content length
 */
export async function estimateDocxPageCount(docxBytes: ArrayBuffer): Promise<number> {
  const text = await extractDocxText(docxBytes);
  // Rough estimate: ~3000 characters per page (with formatting overhead)
  const charsPerPage = 3000;
  return Math.max(1, Math.ceil(text.length / charsPerPage));
}
