import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { ParsedLinkedIn, JobVacancy, OutputLanguage, FitAnalysis } from '@/types';
import type { LLMProvider } from '@/lib/ai/providers';
import type { ExperienceDescriptionFormat } from '@/types/design-tokens';
import { fillDocumentWithAI, type SectionInfo, type SectionType } from '@/lib/ai/docx-content-replacer';

// ==================== Section Detection ====================

/**
 * Patterns to detect section headers in CV templates
 * Supports both Dutch and English section names
 */
const SECTION_PATTERNS: { [K in Exclude<SectionType, 'unknown'>]: RegExp[] } = {
  personal_info: [
    /^curriculum\s*vitae$/i,
    /^persoonlijke\s*gegevens$/i,
    /^personal\s*(info|information|details)?$/i,
    /^persoonsgegevens$/i,
  ],
  education: [
    /^opleidingen?(\s*[&+]\s*cursussen)?$/i,
    /^education(\s*[&+]\s*courses)?$/i,
    /^scholing$/i,
    /^trainingen?$/i,
  ],
  work_experience: [
    /^werk\s*ervaring(\s*[+&]\s*stage)?$/i,
    /^work\s*experience$/i,
    /^employment(\s*history)?$/i,
    /^ervaring$/i,
    /^arbeidsverleden$/i,
  ],
  special_notes: [
    /^bijzonderheden$/i,
    /^additional\s*(info|information)?$/i,
    /^overige?\s*(gegevens|info)?$/i,
    /^extra\s*(info|information)?$/i,
    /^aanvullende?\s*(gegevens|informatie)?$/i,
  ],
  skills: [
    /^vaardigheden$/i,
    /^skills$/i,
    /^competenties$/i,
    /^kennis(\s*[&+]\s*vaardigheden)?$/i,
  ],
  languages: [
    /^talen$/i,
    /^languages$/i,
    /^talenkennis$/i,
  ],
  references: [
    /^referenties$/i,
    /^references$/i,
  ],
  hobbies: [
    /^hobby['']?s$/i,
    /^hobbies$/i,
    /^interesses$/i,
    /^interests$/i,
  ],
};

/**
 * Detect which section type a text segment represents
 */
function detectSectionType(text: string): SectionType | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 50) return null; // Section headers are short

  for (const sectionType of Object.keys(SECTION_PATTERNS) as Array<Exclude<SectionType, 'unknown'>>) {
    const patterns = SECTION_PATTERNS[sectionType];
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return sectionType;
      }
    }
  }
  return null;
}

/**
 * Options for filling a template
 */
export interface FillOptions {
  aiProvider: LLMProvider;
  aiApiKey: string;
  aiModel: string;
  jobVacancy?: JobVacancy;
  language?: OutputLanguage;
  fitAnalysis?: FitAnalysis;
  customInstructions?: string;
  descriptionFormat?: ExperienceDescriptionFormat;
}

/**
 * Result of filling a template
 */
export interface FillResult {
  filledBuffer: ArrayBuffer;
  filledFields: string[];
  warnings: string[];
  mode: 'ai' | 'none';
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

/**
 * Extract all text segments from DOCX XML with their indices and section info
 * Returns segments grouped by detected sections for better AI context
 */
function extractIndexedSegments(docXml: string): {
  segments: { index: number; text: string; start: number; end: number; section?: SectionType }[];
  sections: SectionInfo[];
} {
  const segments: { index: number; text: string; start: number; end: number; section?: SectionType }[] = [];
  const sections: SectionInfo[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  let index = 0;
  let currentSection: SectionType = 'unknown';
  let currentSectionStartIndex = 0;

  while ((match = regex.exec(docXml)) !== null) {
    const text = match[1];

    // Check if this segment is a section header
    const detectedSection = detectSectionType(text);
    if (detectedSection) {
      // Close previous section if it had segments
      if (index > currentSectionStartIndex && currentSection !== 'unknown') {
        sections.push({
          type: currentSection,
          startIndex: currentSectionStartIndex,
          endIndex: index - 1,
        });
      }
      currentSection = detectedSection;
      currentSectionStartIndex = index;
    }

    segments.push({
      index,
      text,
      start: match.index,
      end: match.index + match[0].length,
      section: currentSection,
    });
    index++;
  }

  // Close the last section
  if (index > currentSectionStartIndex) {
    sections.push({
      type: currentSection,
      startIndex: currentSectionStartIndex,
      endIndex: index - 1,
    });
  }

  return { segments, sections };
}

/**
 * Check if content contains bullet points that need hanging indent
 */
function contentHasBullets(content: string): boolean {
  // Check for common bullet patterns
  return /^[\s]*[-•·‣⁃]\s/m.test(content) || /\n[\s]*[-•·‣⁃]\s/.test(content);
}

/**
 * Add hanging indent to paragraph properties for bullet content
 * This ensures wrapped lines align properly with bullet text
 */
function addHangingIndentToParagraph(docXml: string, textTagStart: number): string {
  // Find the parent <w:p> element that contains this <w:t>
  // Search backwards from the text tag position
  const searchArea = docXml.substring(0, textTagStart);
  const lastPStart = searchArea.lastIndexOf('<w:p');

  if (lastPStart === -1) return docXml;

  // Find the end of the <w:p...> tag
  const pTagEnd = docXml.indexOf('>', lastPStart);
  if (pTagEnd === -1) return docXml;

  // Check if there's already a <w:pPr> in this paragraph
  const pContent = docXml.substring(lastPStart, textTagStart);
  const existingPPrMatch = pContent.match(/<w:pPr[^>]*>/);

  // Hanging indent: left margin 360 twips (~0.25 inch), hanging 360 twips
  // This makes continuation lines align with text after the bullet
  const hangingIndent = '<w:ind w:left="360" w:hanging="360"/>';

  if (existingPPrMatch) {
    // Find position of existing <w:pPr> and add indent inside it
    const pPrPos = lastPStart + pContent.indexOf(existingPPrMatch[0]);
    const pPrEndTag = pPrPos + existingPPrMatch[0].length;

    // Check if there's already an <w:ind> element
    const pPrContent = docXml.substring(pPrPos, docXml.indexOf('</w:pPr>', pPrPos));
    if (pPrContent.includes('<w:ind')) {
      // Already has indent, don't modify
      return docXml;
    }

    // Insert hanging indent after the opening <w:pPr> tag
    return docXml.substring(0, pPrEndTag) + hangingIndent + docXml.substring(pPrEndTag);
  } else {
    // No <w:pPr> exists, need to add it after <w:p...>
    const insertPos = pTagEnd + 1;
    const pPrElement = `<w:pPr>${hangingIndent}</w:pPr>`;
    return docXml.substring(0, insertPos) + pPrElement + docXml.substring(insertPos);
  }
}

/**
 * Apply filled segments back to the DOCX XML
 * Replaces text content by index while preserving XML structure
 * Also adds hanging indent for bullet-containing content
 */
function applyFilledSegments(
  docXml: string,
  filledSegments: Record<string, string>
): string {
  let result = docXml;

  const regex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let match;

  // We need to collect all matches first, then replace in order
  const matches: { fullMatch: string; attrs: string; content: string; start: number }[] = [];

  while ((match = regex.exec(docXml)) !== null) {
    matches.push({
      fullMatch: match[0],
      attrs: match[1],
      content: match[2],
      start: match.index,
    });
  }

  // Track segments that need hanging indent (process after text replacement)
  const segmentsNeedingIndent: number[] = [];

  // Apply replacements in reverse order to avoid offset issues
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const indexStr = i.toString();

    if (filledSegments[indexStr] !== undefined) {
      const newContent = escapeXml(filledSegments[indexStr]);
      const newTag = `<w:t${m.attrs}>${newContent}</w:t>`;

      // Check if this content has bullets and needs hanging indent
      if (contentHasBullets(filledSegments[indexStr])) {
        segmentsNeedingIndent.push(i);
      }

      result =
        result.substring(0, m.start) +
        newTag +
        result.substring(m.start + m.fullMatch.length);
    }
  }

  // Apply hanging indents (need to re-find positions as document changed)
  // Process in order since each modification affects subsequent positions
  for (const segmentIndex of segmentsNeedingIndent.sort((a, b) => a - b)) {
    // Re-find the position of this segment in the modified document
    const segmentContent = escapeXml(filledSegments[segmentIndex.toString()]);
    const searchPattern = `<w:t${matches[segmentIndex].attrs}>${segmentContent}</w:t>`;
    const pos = result.indexOf(searchPattern);

    if (pos !== -1) {
      result = addHangingIndentToParagraph(result, pos);
    }
  }

  return result;
}

// ==================== Smart Template Filling ====================

/**
 * Fill a DOCX template using AI to intelligently replace all content
 *
 * The AI analyzes the entire document and replaces:
 * - Personal information (names, contact details, location)
 * - Work experience (companies, titles, descriptions, dates)
 * - Education (schools, degrees, dates)
 * - Skills and other sections
 *
 * AI handles any document format - no specific placeholder patterns needed.
 */
export async function fillSmartTemplate(
  docxBuffer: ArrayBuffer,
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>,
  options?: FillOptions
): Promise<FillResult> {
  const filledFields: string[] = [];
  const warnings: string[] = [];

  // Validate we have AI credentials
  if (!options?.aiApiKey || !options?.aiProvider || !options?.aiModel) {
    throw new Error('AI mode is required for template filling. Please configure your AI API key.');
  }

  // Load the DOCX as a ZIP
  const zip = await JSZip.loadAsync(docxBuffer);

  // Get the main document XML
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Invalid DOCX file: missing word/document.xml. Note: Only .docx files are supported, not .doc (Word 97-2003) files.');
  }

  let docXml = await documentXmlFile.async('string');

  try {
    // Extract indexed segments from the document with section detection
    const { segments, sections } = extractIndexedSegments(docXml);

    // Prepare segments for AI (index, text, and section)
    const segmentsForAI = segments.map(s => ({
      index: s.index,
      text: s.text,
      section: s.section,
    }));

    // Get AI to fill the segments with section context
    const aiResult = await fillDocumentWithAI(
      segmentsForAI,
      profileData,
      options.aiProvider,
      options.aiApiKey,
      options.aiModel,
      options.jobVacancy,
      options.language || 'nl',
      options.fitAnalysis,
      options.customInstructions,
      options.descriptionFormat || 'bullets',
      sections
    );

    // Apply filled segments back to the XML
    docXml = applyFilledSegments(docXml, aiResult.filledSegments);

    // Count filled fields
    const filledCount = Object.keys(aiResult.filledSegments).length;
    for (let i = 0; i < filledCount; i++) {
      filledFields.push(`ai_segment_${i}`);
    }

    // Add AI warnings
    warnings.push(...(aiResult.warnings || []));

    // Update the document
    zip.file('word/document.xml', docXml);

    // Also process headers and footers
    const headerFooterFiles = Object.keys(zip.files).filter(
      name => name.match(/word\/(header|footer)\d*\.xml/)
    );

    for (const fileName of headerFooterFiles) {
      const file = zip.file(fileName);
      if (file) {
        let content = await file.async('string');

        // Extract and fill segments in headers/footers too
        const { segments: hfSegments, sections: hfSections } = extractIndexedSegments(content);
        if (hfSegments.length > 0) {
          const hfSegmentsForAI = hfSegments.map(s => ({
            index: s.index,
            text: s.text,
            section: s.section,
          }));

          // Use same AI to fill header/footer segments
          const hfResult = await fillDocumentWithAI(
            hfSegmentsForAI,
            profileData,
            options.aiProvider,
            options.aiApiKey,
            options.aiModel,
            options.jobVacancy,
            options.language || 'nl',
            options.fitAnalysis,
            options.customInstructions,
            options.descriptionFormat || 'bullets',
            hfSections
          );

          content = applyFilledSegments(content, hfResult.filledSegments);
        }

        zip.file(fileName, content);
      }
    }

    // Generate the filled DOCX
    const filledBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    return {
      filledBuffer,
      filledFields,
      warnings,
      mode: filledFields.length > 0 ? 'ai' as const : 'none' as const,
    };
  } catch (aiError) {
    console.error('AI content replacement failed:', aiError);
    throw new Error('Failed to fill template with AI. Please check your API key and try again.');
  }
}

/**
 * Extract raw text from a DOCX for preview/analysis
 */
export async function extractDocxText(docxBuffer: ArrayBuffer): Promise<string> {
  const buffer = Buffer.from(docxBuffer);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
