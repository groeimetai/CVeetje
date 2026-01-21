import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { ParsedLinkedIn, JobVacancy } from '@/types';
import type { LLMProvider } from '@/lib/ai/providers';
import { analyzeAndGenerateReplacements } from '@/lib/ai/docx-content-replacer';

/**
 * Options for filling a template
 */
export interface FillOptions {
  useAI?: boolean;
  aiProvider?: LLMProvider;
  aiApiKey?: string;
  aiModel?: string;
  jobVacancy?: JobVacancy;
}

/**
 * Result of filling a template
 */
export interface FillResult {
  filledBuffer: ArrayBuffer;
  filledFields: string[];
  warnings: string[];
  mode: 'placeholder' | 'ai' | 'hybrid' | 'none';
}

/**
 * Detected placeholder in the document
 */
export interface DetectedPlaceholder {
  type: 'curly' | 'bracket' | 'underscore' | 'label' | 'slot';
  pattern: string;
  fieldKey: string;
  originalText: string;
}

/**
 * Template analysis result
 */
export interface TemplateAnalysis {
  text: string;
  personalFields: string[];
  educationSlots: number;
  experienceSlots: number;
  extraFields: string[];
  detectedPlaceholders: DetectedPlaceholder[];
  detectedPatterns: {
    type: 'personal' | 'education' | 'experience' | 'extra';
    label: string;
    pattern: string;
  }[];
}

// ==================== Helper Functions ====================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(1).join(' ') || '';
}

function formatDateDutch(dateStr: string | null): string {
  if (!dateStr) return '';
  // If it's already in a good format, return as-is
  if (dateStr.match(/^\d{4}$/)) return dateStr;
  if (dateStr.match(/^(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\s+\d{4}$/i)) return dateStr;

  // Try to parse and format
  const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const match = dateStr.match(/(\d{1,2})?[/\-]?(\d{1,2})?[/\-]?(\d{4})/);
  if (match) {
    const month = match[2] ? months[parseInt(match[2], 10) - 1] : '';
    const year = match[3];
    return month ? `${month} ${year}` : year;
  }
  return dateStr;
}

// ==================== Multi-Pattern Placeholder Detection ====================

/**
 * Detect all placeholder patterns in the document XML
 * Supports: {{placeholder}}, [PLACEHOLDER], Label: _____, Label:
 */
function detectAllPlaceholders(docXml: string): DetectedPlaceholder[] {
  const placeholders: DetectedPlaceholder[] = [];

  // Pattern 1: Mustache/Handlebars style {{placeholder}}
  // Need to handle XML tags that might split the placeholder
  const curlyPattern = /\{\{([^}]+)\}\}/gi;
  let match;
  while ((match = curlyPattern.exec(docXml)) !== null) {
    const fieldKey = match[1].trim().toLowerCase();
    placeholders.push({
      type: 'curly',
      pattern: match[0],
      fieldKey,
      originalText: match[0],
    });
  }

  // Pattern 2: Bracket style [PLACEHOLDER] - common in templates
  const bracketPattern = /\[([A-Z_][A-Z0-9_]*)\]/g;
  while ((match = bracketPattern.exec(docXml)) !== null) {
    const fieldKey = match[1].trim().toLowerCase().replace(/_/g, ' ');
    placeholders.push({
      type: 'bracket',
      pattern: match[0],
      fieldKey,
      originalText: match[0],
    });
  }

  // Pattern 3: Underscore placeholders (Label: _____ or _______)
  // At least 3 underscores in a row
  const underscorePattern = /([a-zA-Z\u00C0-\u024F]+)\s*:\s*(_{3,})/gi;
  while ((match = underscorePattern.exec(docXml)) !== null) {
    const fieldKey = match[1].trim().toLowerCase();
    placeholders.push({
      type: 'underscore',
      pattern: match[0],
      fieldKey,
      originalText: match[0],
    });
  }

  // Pattern 4: Standalone underscores (common for fill-in-blank sections)
  const standaloneUnderscorePattern = />_{5,}</g;
  while ((match = standaloneUnderscorePattern.exec(docXml)) !== null) {
    placeholders.push({
      type: 'underscore',
      pattern: match[0],
      fieldKey: 'unknown',
      originalText: match[0],
    });
  }

  return placeholders;
}

/**
 * Fill a single curly brace placeholder {{naam}} -> value
 */
function fillCurlyPlaceholder(docXml: string, placeholder: string, value: string): string {
  // Handle cases where XML tags split the placeholder
  // E.g., {{<w:r>naam</w:r>}} or {<w:t>{naam}</w:t>}
  const cleanPlaceholder = placeholder.replace(/\{\{|\}\}/g, '');

  // Try direct replacement first
  let result = docXml.replace(placeholder, escapeXml(value));

  // If not found, try with flexible XML tag handling
  if (result === docXml) {
    const flexPattern = createFlexibleCurlyPattern(cleanPlaceholder);
    result = result.replace(flexPattern, escapeXml(value));
  }

  return result;
}

/**
 * Create a pattern that matches {{placeholder}} even with XML tags in between
 */
function createFlexibleCurlyPattern(fieldName: string): RegExp {
  // Match {{ with optional XML, then the field name with optional XML, then }}
  const escapedField = escapeRegexPattern(fieldName);
  return new RegExp(
    `\\{(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?\\{(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?` +
    escapedField +
    `(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?\\}(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>)?\\}`,
    'gi'
  );
}

/**
 * Fill a bracket placeholder [NAAM] -> value
 */
function fillBracketPlaceholder(docXml: string, placeholder: string, value: string): string {
  return docXml.split(placeholder).join(escapeXml(value));
}

/**
 * Fill an underscore placeholder (Label: _____) -> (Label: value)
 */
function fillUnderscorePlaceholder(docXml: string, placeholder: string, label: string, value: string): string {
  // Replace the underscore portion with the value
  const pattern = new RegExp(
    `(${escapeRegexPattern(label)}\\s*:\\s*)_{3,}`,
    'gi'
  );
  return docXml.replace(pattern, `$1${escapeXml(value)}`);
}

// ==================== Personal Field Mappings ====================

type FieldMapper = (data: ParsedLinkedIn, custom?: Record<string, string>) => string;

const PERSONAL_FIELD_MAPPINGS: Record<string, FieldMapper> = {
  // Dutch labels
  'naam': (d) => d.fullName || '',
  'voornaam': (d) => getFirstName(d.fullName || ''),
  'achternaam': (d) => getLastName(d.fullName || ''),
  'volledige naam': (d) => d.fullName || '',
  'geboortedatum': (_, c) => c?.birthDate || c?.geboortedatum || '',
  'nationaliteit': (_, c) => c?.nationality || c?.nationaliteit || '',
  'woonplaats': (d) => d.location?.split(',')[0]?.trim() || d.location || '',
  'stad': (d) => d.location?.split(',')[0]?.trim() || '',
  'plaats': (d) => d.location?.split(',')[0]?.trim() || '',
  'adres': (d) => d.location || '',
  'email': (d) => d.email || '',
  'e-mail': (d) => d.email || '',
  'telefoon': (d) => d.phone || '',
  'telefoonnummer': (d) => d.phone || '',
  'mobiel': (d) => d.phone || '',

  // English labels
  'name': (d) => d.fullName || '',
  'first name': (d) => getFirstName(d.fullName || ''),
  'firstname': (d) => getFirstName(d.fullName || ''),
  'last name': (d) => getLastName(d.fullName || ''),
  'lastname': (d) => getLastName(d.fullName || ''),
  'surname': (d) => getLastName(d.fullName || ''),
  'full name': (d) => d.fullName || '',
  'fullname': (d) => d.fullName || '',
  'date of birth': (_, c) => c?.birthDate || '',
  'birth date': (_, c) => c?.birthDate || '',
  'nationality': (_, c) => c?.nationality || '',
  'city': (d) => d.location?.split(',')[0]?.trim() || '',
  'location': (d) => d.location || '',
  'phone': (d) => d.phone || '',
  'mobile': (d) => d.phone || '',
};

// ==================== Template Analysis ====================

/**
 * Analyze a DOCX template to understand its structure
 * Now includes detection of all placeholder patterns
 */
export async function analyzeTemplate(docxBuffer: ArrayBuffer): Promise<TemplateAnalysis> {
  // mammoth expects a Buffer, not an ArrayBuffer
  const buffer = Buffer.from(docxBuffer);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  const textLower = text.toLowerCase();

  const detectedPatterns: TemplateAnalysis['detectedPatterns'] = [];
  const detectedPlaceholders: DetectedPlaceholder[] = [];

  // === Detect multi-pattern placeholders ===

  // Pattern 1: Curly braces {{placeholder}}
  const curlyMatches = text.match(/\{\{([^}]+)\}\}/gi);
  if (curlyMatches) {
    for (const match of curlyMatches) {
      const fieldKey = match.replace(/\{\{|\}\}/g, '').trim().toLowerCase();
      detectedPlaceholders.push({
        type: 'curly',
        pattern: match,
        fieldKey,
        originalText: match,
      });
    }
  }

  // Pattern 2: Bracket style [PLACEHOLDER]
  const bracketMatches = text.match(/\[([A-Z_][A-Z0-9_]*)\]/g);
  if (bracketMatches) {
    for (const match of bracketMatches) {
      const fieldKey = match.replace(/\[|\]/g, '').trim().toLowerCase().replace(/_/g, ' ');
      detectedPlaceholders.push({
        type: 'bracket',
        pattern: match,
        fieldKey,
        originalText: match,
      });
    }
  }

  // Pattern 3: Underscore placeholders (Label: _____)
  const underscoreMatches = text.match(/([a-zA-Z\u00C0-\u024F]+)\s*:\s*_{3,}/gi);
  if (underscoreMatches) {
    for (const match of underscoreMatches) {
      const parts = match.split(':');
      const fieldKey = parts[0].trim().toLowerCase();
      detectedPlaceholders.push({
        type: 'underscore',
        pattern: match,
        fieldKey,
        originalText: match,
      });
    }
  }

  // === Find personal fields (Label: style) ===
  const personalFields: string[] = [];
  for (const fieldName of Object.keys(PERSONAL_FIELD_MAPPINGS)) {
    if (textLower.includes(`${fieldName}:`) || textLower.includes(`${fieldName} :`)) {
      personalFields.push(fieldName);
      detectedPatterns.push({
        type: 'personal',
        label: fieldName,
        pattern: `${fieldName}:`,
      });
    }
  }

  // === Count education slots (YYYY - YYYY : pattern) ===
  const eduMatches = text.match(/\d{4}\s*-\s*\d{4}\s*:/g);
  const educationSlots = eduMatches ? eduMatches.length : 0;
  if (eduMatches) {
    eduMatches.forEach(match => {
      detectedPatterns.push({
        type: 'education',
        label: match.trim(),
        pattern: match,
      });
      detectedPlaceholders.push({
        type: 'slot',
        pattern: match,
        fieldKey: 'education',
        originalText: match,
      });
    });
  }

  // === Count experience slots (YYYY-Heden or YYYY-YYYY patterns) ===
  const expPeriodMatches = text.match(/\d{4}\s*-\s*(?:\d{4}|Heden|heden|Present|present|Now|now)\s*:/gi);
  const functieMatches = text.match(/(?:Functie|Function|Job Title|Position)\s*:/gi);
  const experienceSlots = Math.max(
    expPeriodMatches ? expPeriodMatches.length : 0,
    functieMatches ? functieMatches.length : 0
  );

  if (expPeriodMatches) {
    expPeriodMatches.forEach(match => {
      detectedPatterns.push({
        type: 'experience',
        label: match.trim(),
        pattern: match,
      });
      detectedPlaceholders.push({
        type: 'slot',
        pattern: match,
        fieldKey: 'experience',
        originalText: match,
      });
    });
  }

  // === Find extra fields ===
  const extraFieldPatterns = [
    'beschikbaarheid', 'availability',
    'vervoer', 'transport',
    'rijbewijs', 'driver', 'license',
    'hobby', 'hobbies', 'interests',
    'talen', 'languages',
  ];
  const extraFields: string[] = [];
  for (const field of extraFieldPatterns) {
    if (textLower.includes(`${field}:`) || textLower.includes(`${field} :`)) {
      extraFields.push(field);
      detectedPatterns.push({
        type: 'extra',
        label: field,
        pattern: `${field}:`,
      });
    }
  }

  return {
    text,
    personalFields,
    educationSlots,
    experienceSlots,
    extraFields,
    detectedPlaceholders,
    detectedPatterns,
  };
}

// ==================== Smart Template Filling ====================

/**
 * Fill a DOCX template intelligently by detecting ALL placeholder patterns
 *
 * Placeholder detection order:
 * 1. Curly braces: {{naam}}, {{voornaam}}, etc.
 * 2. Brackets: [NAAM], [VOORNAAM], etc.
 * 3. Underscores: Naam: _____, Voornaam: _____
 * 4. Labels: Naam:, Voornaam: (followed by empty space)
 * 5. Slots: YYYY - YYYY: for education, experience periods
 *
 * After placeholder filling, if AI mode is enabled:
 * - AI analyzes the document for remaining content to replace
 * - AI enhances/fills content that placeholders couldn't handle
 */
export async function fillSmartTemplate(
  docxBuffer: ArrayBuffer,
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>,
  options?: FillOptions
): Promise<FillResult> {
  const filledFields: string[] = [];
  const warnings: string[] = [];

  // Load the DOCX as a ZIP
  const zip = await JSZip.loadAsync(docxBuffer);

  // Get the main document XML
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Invalid DOCX file: missing word/document.xml. Note: Only .docx files are supported, not .doc (Word 97-2003) files.');
  }

  let docXml = await documentXmlFile.async('string');

  // Build a combined value lookup from profile data and custom values
  const valueLookup = buildValueLookup(profileData, customValues);

  // === STEP 1: Fill curly brace placeholders {{placeholder}} ===
  const curlyPattern = /\{\{([^}]+)\}\}/gi;
  docXml = docXml.replace(curlyPattern, (match, fieldName) => {
    const key = fieldName.trim().toLowerCase();
    const value = valueLookup[key];
    if (value) {
      filledFields.push(`curly_${key}`);
      return escapeXml(value);
    }
    return match; // Keep original if no value found
  });

  // === STEP 2: Fill bracket placeholders [PLACEHOLDER] ===
  const bracketPattern = /\[([A-Z_][A-Z0-9_]*)\]/g;
  docXml = docXml.replace(bracketPattern, (match, fieldName) => {
    const key = fieldName.toLowerCase().replace(/_/g, ' ');
    const value = valueLookup[key] || valueLookup[fieldName.toLowerCase()];
    if (value) {
      filledFields.push(`bracket_${key}`);
      return escapeXml(value);
    }
    return match;
  });

  // === STEP 3: Fill underscore placeholders (Label: _____) ===
  const underscorePattern = /([a-zA-Z\u00C0-\u024F]+)(\s*:\s*)(_{3,})/gi;
  docXml = docXml.replace(underscorePattern, (match, label, separator, underscores) => {
    const key = label.toLowerCase();
    const value = valueLookup[key];
    if (value) {
      filledFields.push(`underscore_${key}`);
      return `${label}${separator}${escapeXml(value)}`;
    }
    return match;
  });

  // === STEP 4: Fill label placeholders (Label: </w:t>) ===
  for (const [fieldKey, getValue] of Object.entries(PERSONAL_FIELD_MAPPINGS)) {
    const value = getValue(profileData, customValues);
    if (value) {
      // Pattern: 'Label: </w:t>' or 'Label : </w:t>' -> 'Label: VALUE</w:t>'
      const pattern = new RegExp(`(${escapeRegexPattern(fieldKey)}\\s*:\\s*)(<\\/w:t>)`, 'gi');
      if (docXml.match(pattern)) {
        docXml = docXml.replace(pattern, `$1${escapeXml(value)}$2`);
        if (!filledFields.includes(fieldKey)) {
          filledFields.push(fieldKey);
        }
      }
    }
  }

  // === STEP 5: Fill education slots (YYYY - YYYY :) ===
  const eduPattern = /(\d{4}\s*-\s*\d{4}\s*:\s*)(<\/w:t>)/gi;
  let eduIndex = 0;
  const eduMatches = docXml.match(eduPattern);
  const eduCount = eduMatches ? eduMatches.length : 0;

  // Fill education in reverse order (oldest first in template, newest in profile)
  const educationReversed = [...profileData.education].reverse();

  docXml = docXml.replace(eduPattern, (match, prefix, suffix) => {
    const edu = educationReversed[eduIndex];
    eduIndex++;
    if (edu) {
      const eduText = [edu.degree, edu.fieldOfStudy, edu.school].filter(Boolean).join(', ');
      if (eduText) {
        filledFields.push(`education_${eduIndex - 1}`);
        return `${prefix}${escapeXml(eduText)}${suffix}`;
      }
    }
    return match;
  });

  if (eduCount > profileData.education.length) {
    warnings.push(`Template heeft ${eduCount} opleiding slots, maar profiel heeft er ${profileData.education.length}`);
  }

  // === STEP 6: Fill experience slots ===
  const expPeriodPattern = /(\d{4}\s*-\s*(?:\d{4}|Heden|heden|Present|present|Now|now)\s*:\s*)(<\/w:t>)/gi;
  let expIndex = 0;
  const expMatches = docXml.match(expPeriodPattern);
  const expCount = expMatches ? expMatches.length : 0;

  docXml = docXml.replace(expPeriodPattern, (match, prefix, suffix) => {
    const exp = profileData.experience[expIndex];
    expIndex++;
    if (exp) {
      filledFields.push(`exp_${expIndex - 1}_company`);
      return `${prefix}${escapeXml(exp.company || '')}${suffix}`;
    }
    return match;
  });

  // Fill Functie/Function/Job Title fields
  const functiePattern = /((?:Functie|Function|Job Title|Position|Rol|Role)\s*:\s*)(<\/w:t>)/gi;
  let functieIndex = 0;
  docXml = docXml.replace(functiePattern, (match, prefix, suffix) => {
    const exp = profileData.experience[functieIndex];
    functieIndex++;
    if (exp && exp.title) {
      filledFields.push(`exp_${functieIndex - 1}_title`);
      return `${prefix}${escapeXml(exp.title)}${suffix}`;
    }
    return match;
  });

  // Fill Werkzaamheden/Description/Tasks fields
  const descPattern = /((?:Werkzaamheden|Description|Tasks|Responsibilities|Taken|Omschrijving)\s*:\s*)(<\/w:t>)/gi;
  let descIndex = 0;
  docXml = docXml.replace(descPattern, (match, prefix, suffix) => {
    const exp = profileData.experience[descIndex];
    descIndex++;
    if (exp && exp.description) {
      const desc = exp.description.length > 300
        ? exp.description.substring(0, 297) + '...'
        : exp.description;
      filledFields.push(`exp_${descIndex - 1}_desc`);
      return `${prefix}${escapeXml(desc)}${suffix}`;
    }
    return match;
  });

  if (expCount > profileData.experience.length) {
    warnings.push(`Template heeft ${expCount} werkervaring slots, maar profiel heeft er ${profileData.experience.length}`);
  }

  // === STEP 7: Fill custom/extra fields from customValues ===
  if (customValues) {
    for (const [key, value] of Object.entries(customValues)) {
      if (value) {
        const keyLower = key.toLowerCase();
        if (PERSONAL_FIELD_MAPPINGS[keyLower]) continue;

        const pattern = new RegExp(`(${escapeRegexPattern(key)}\\s*:\\s*)(<\\/w:t>)`, 'gi');
        if (docXml.match(pattern)) {
          docXml = docXml.replace(pattern, `$1${escapeXml(value)}$2`);
          filledFields.push(key);
        }
      }
    }
  }

  // Update the document in the ZIP
  zip.file('word/document.xml', docXml);

  // Also process headers and footers
  const headerFooterFiles = Object.keys(zip.files).filter(
    name => name.match(/word\/(header|footer)\d*\.xml/)
  );

  for (const fileName of headerFooterFiles) {
    const file = zip.file(fileName);
    if (file) {
      let content = await file.async('string');

      // Apply curly brace replacements
      content = content.replace(curlyPattern, (match, fieldName) => {
        const key = fieldName.trim().toLowerCase();
        const value = valueLookup[key];
        return value ? escapeXml(value) : match;
      });

      // Apply bracket replacements
      content = content.replace(bracketPattern, (match, fieldName) => {
        const key = fieldName.toLowerCase().replace(/_/g, ' ');
        const value = valueLookup[key] || valueLookup[fieldName.toLowerCase()];
        return value ? escapeXml(value) : match;
      });

      // Apply label replacements
      for (const [fieldKey, getValue] of Object.entries(PERSONAL_FIELD_MAPPINGS)) {
        const value = getValue(profileData, customValues);
        if (value) {
          const pattern = new RegExp(`(${escapeRegexPattern(fieldKey)}\\s*:\\s*)(<\\/w:t>)`, 'gi');
          content = content.replace(pattern, `$1${escapeXml(value)}$2`);
        }
      }

      zip.file(fileName, content);
    }
  }

  // Track if placeholder mode found anything
  const placeholderModeWorked = filledFields.length > 0;

  // === STEP 8: AI Enhancement (runs AFTER placeholders, not just as fallback) ===
  // If AI mode is enabled, let AI analyze and fill any remaining content
  if (options?.useAI && options.aiApiKey && options.aiProvider && options.aiModel) {
    try {
      // Extract text for AI analysis
      const documentText = await extractDocxText(docxBuffer);

      // Get AI-generated replacements
      const aiResult = await analyzeAndGenerateReplacements(
        documentText,
        profileData,
        options.aiProvider,
        options.aiApiKey,
        options.aiModel,
        options.jobVacancy
      );

      // Apply AI replacements to the document XML
      let aiReplacementsMade = 0;
      let currentDocXml = await zip.file('word/document.xml')!.async('string');

      for (const replacement of aiResult.replacements) {
        if (replacement.confidence !== 'low') {
          const searchPattern = escapeXml(replacement.searchText);
          const replaceValue = escapeXml(replacement.replaceWith);

          // Try to find and replace in the XML (handling XML tags between words)
          const flexiblePattern = createFlexibleXmlPattern(searchPattern);
          if (currentDocXml.match(flexiblePattern)) {
            currentDocXml = currentDocXml.replace(flexiblePattern, replaceValue);
            filledFields.push(`ai_${replacement.type}`);
            aiReplacementsMade++;
          }
        }
      }

      // Add AI warnings
      warnings.push(...(aiResult.warnings || []));

      // Update the document with AI replacements
      if (aiReplacementsMade > 0) {
        zip.file('word/document.xml', currentDocXml);
      }

      // Generate the filled DOCX
      const filledBuffer = await zip.generateAsync({ type: 'arraybuffer' });

      // Determine mode based on what was used
      let mode: 'placeholder' | 'ai' | 'hybrid' | 'none';
      if (placeholderModeWorked && aiReplacementsMade > 0) {
        mode = 'hybrid';
      } else if (aiReplacementsMade > 0) {
        mode = 'ai';
      } else if (placeholderModeWorked) {
        mode = 'placeholder';
      } else {
        mode = 'none';
      }

      return {
        filledBuffer,
        filledFields,
        warnings,
        mode,
      };
    } catch (aiError) {
      console.error('AI content replacement failed:', aiError);
      warnings.push('AI content replacement failed, using placeholder results only');
    }
  }

  // Generate the filled DOCX (placeholder mode only)
  const filledBuffer = await zip.generateAsync({ type: 'arraybuffer' });

  return {
    filledBuffer,
    filledFields,
    warnings,
    mode: placeholderModeWorked ? 'placeholder' as const : 'none' as const,
  };
}

/**
 * Build a lookup table for placeholder values from profile data and custom values
 */
function buildValueLookup(
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>
): Record<string, string> {
  const lookup: Record<string, string> = {};

  // Add all personal field mappings
  for (const [key, getValue] of Object.entries(PERSONAL_FIELD_MAPPINGS)) {
    const value = getValue(profileData, customValues);
    if (value) {
      lookup[key] = value;
    }
  }

  // Add custom values
  if (customValues) {
    for (const [key, value] of Object.entries(customValues)) {
      if (value) {
        lookup[key.toLowerCase()] = value;
      }
    }
  }

  // Add some common aliases
  if (profileData.fullName) {
    lookup['full_name'] = profileData.fullName;
    lookup['fullname'] = profileData.fullName;
    lookup['name'] = profileData.fullName;
    lookup['naam'] = profileData.fullName;
  }

  if (profileData.email) {
    lookup['email'] = profileData.email;
    lookup['e-mail'] = profileData.email;
    lookup['mail'] = profileData.email;
  }

  if (profileData.phone) {
    lookup['phone'] = profileData.phone;
    lookup['telefoon'] = profileData.phone;
    lookup['tel'] = profileData.phone;
    lookup['mobile'] = profileData.phone;
    lookup['mobiel'] = profileData.phone;
  }

  if (profileData.location) {
    lookup['location'] = profileData.location;
    lookup['locatie'] = profileData.location;
    lookup['city'] = profileData.location.split(',')[0]?.trim() || profileData.location;
    lookup['stad'] = profileData.location.split(',')[0]?.trim() || profileData.location;
    lookup['woonplaats'] = profileData.location.split(',')[0]?.trim() || profileData.location;
    lookup['adres'] = profileData.location;
    lookup['address'] = profileData.location;
  }

  if (profileData.headline) {
    lookup['headline'] = profileData.headline;
    lookup['title'] = profileData.headline;
    lookup['functie'] = profileData.headline;
    lookup['function'] = profileData.headline;
  }

  return lookup;
}

/**
 * Create a flexible regex pattern that can match text even when XML tags are between words
 */
function createFlexibleXmlPattern(text: string): RegExp {
  // Split text into words and join with pattern that allows XML tags between words
  const words = text.split(/\s+/);
  const flexiblePattern = words
    .map(word => escapeRegexPattern(word))
    .join('(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>|\\s+)');
  return new RegExp(flexiblePattern, 'gi');
}

function escapeRegexPattern(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract raw text from a DOCX for preview/analysis
 */
export async function extractDocxText(docxBuffer: ArrayBuffer): Promise<string> {
  // mammoth expects a Buffer, not an ArrayBuffer
  const buffer = Buffer.from(docxBuffer);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
