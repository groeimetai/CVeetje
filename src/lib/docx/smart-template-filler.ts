import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { ParsedLinkedIn, JobVacancy } from '@/types';
import type { LLMProvider } from '@/lib/ai/providers';
import { analyzeAndGenerateReplacements, type ContentReplacement } from '@/lib/ai/docx-content-replacer';

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
  mode: 'placeholder' | 'ai' | 'none';
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
 */
export async function analyzeTemplate(docxBuffer: ArrayBuffer): Promise<TemplateAnalysis> {
  const result = await mammoth.extractRawText({ arrayBuffer: docxBuffer });
  const text = result.value;
  const textLower = text.toLowerCase();

  const detectedPatterns: TemplateAnalysis['detectedPatterns'] = [];

  // Find personal fields
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

  // Count education slots (YYYY - YYYY : pattern)
  const eduMatches = text.match(/\d{4}\s*-\s*\d{4}\s*:/g);
  const educationSlots = eduMatches ? eduMatches.length : 0;
  if (eduMatches) {
    eduMatches.forEach(match => {
      detectedPatterns.push({
        type: 'education',
        label: match.trim(),
        pattern: match,
      });
    });
  }

  // Count experience slots (YYYY-Heden or YYYY-YYYY patterns, plus Functie/Werkzaamheden)
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
    });
  }

  // Find extra fields
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
    detectedPatterns,
  };
}

// ==================== Smart Template Filling ====================

/**
 * Fill a DOCX template intelligently by detecting patterns and filling them
 *
 * This handles:
 * - Fixed personal info fields (Naam:, Voornaam:, etc.)
 * - Fixed slots for education (YYYY - YYYY:)
 * - Fixed slots for experience with periods (YYYY-Heden:, Functie:, Werkzaamheden:)
 * - Extra fields (Beschikbaarheid:, Vervoer:, etc.)
 * - AI-powered content replacement (when useAI is true)
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

  // === STEP 1: Fill personal info fields ===
  for (const [fieldKey, getValue] of Object.entries(PERSONAL_FIELD_MAPPINGS)) {
    const value = getValue(profileData, customValues);
    if (value) {
      // Pattern: 'Label: </w:t>' or 'Label : </w:t>' -> 'Label: VALUE</w:t>'
      const pattern = new RegExp(`(${escapeRegexPattern(fieldKey)}\\s*:\\s*)(<\\/w:t>)`, 'gi');
      if (docXml.match(pattern)) {
        docXml = docXml.replace(pattern, `$1${escapeXml(value)}$2`);
        filledFields.push(fieldKey);
      }
    }
  }

  // === STEP 2: Fill education slots ===
  // Detect all YYYY - YYYY : patterns and fill them in order
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

  // === STEP 3: Fill experience slots ===
  // Detect experience period patterns (YYYY-Heden, YYYY-YYYY followed by :)
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
      // Truncate very long descriptions
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

  // === STEP 4: Fill custom/extra fields from customValues ===
  if (customValues) {
    for (const [key, value] of Object.entries(customValues)) {
      if (value) {
        const keyLower = key.toLowerCase();
        // Skip fields we already handled
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

      // Apply same personal field replacements to headers/footers
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

  // Check if placeholder mode found anything
  const placeholderModeWorked = filledFields.length > 0;

  // If placeholder mode didn't work and AI mode is enabled, try AI replacement
  if (!placeholderModeWorked && options?.useAI && options.aiApiKey && options.aiProvider && options.aiModel) {
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
      let aiDocXml = docXml;
      for (const replacement of aiResult.replacements) {
        if (replacement.confidence !== 'low') {
          // Escape the search text for use in XML
          const searchPattern = escapeXml(replacement.searchText);
          const replaceValue = escapeXml(replacement.replaceWith);

          // Try to find and replace in the XML (handling XML tags between words)
          const flexiblePattern = createFlexibleXmlPattern(searchPattern);
          if (aiDocXml.match(flexiblePattern)) {
            aiDocXml = aiDocXml.replace(flexiblePattern, replaceValue);
            filledFields.push(`ai_${replacement.type}`);
          }
        }
      }

      // Add AI warnings
      warnings.push(...(aiResult.warnings || []));

      // Update the document with AI replacements
      zip.file('word/document.xml', aiDocXml);

      // Generate the AI-filled DOCX
      const aiFilledBuffer = await zip.generateAsync({ type: 'arraybuffer' });

      return {
        filledBuffer: aiFilledBuffer,
        filledFields,
        warnings,
        mode: 'ai' as const,
      };
    } catch (aiError) {
      console.error('AI content replacement failed:', aiError);
      warnings.push('AI content replacement failed, using original document');
    }
  }

  // Generate the filled DOCX (placeholder mode or fallback)
  const filledBuffer = await zip.generateAsync({ type: 'arraybuffer' });

  return {
    filledBuffer,
    filledFields,
    warnings,
    mode: placeholderModeWorked ? 'placeholder' as const : 'none' as const,
  };
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
  const result = await mammoth.extractRawText({ arrayBuffer: docxBuffer });
  return result.value;
}
