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
 *
 * CRITICAL: Must handle existing indent correctly:
 * - Template may have w:firstLine (pushes first line right - WRONG for bullets)
 * - We need w:hanging (creates hanging indent - CORRECT for bullets)
 * - Must preserve original w:left value for proper column alignment
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

  // Default hanging indent for paragraphs without existing indent
  const defaultHangingIndent = '<w:ind w:left="360" w:hanging="360"/>';

  if (existingPPrMatch) {
    // Find position of existing <w:pPr>
    const pPrPos = lastPStart + pContent.indexOf(existingPPrMatch[0]);
    const pPrEndTagPos = docXml.indexOf('</w:pPr>', pPrPos);
    if (pPrEndTagPos === -1) return docXml;

    const pPrContent = docXml.substring(pPrPos, pPrEndTagPos);

    // Check for existing <w:ind> element
    const existingIndMatch = pPrContent.match(/<w:ind([^>]*)\/>/);

    if (existingIndMatch) {
      // Parse existing indent values
      const indAttrs = existingIndMatch[1];
      const leftMatch = indAttrs.match(/w:left="(\d+)"/);
      const firstLineMatch = indAttrs.match(/w:firstLine="(\d+)"/);
      const hangingMatch = indAttrs.match(/w:hanging="(\d+)"/);

      // Already has hanging indent - skip modification
      if (hangingMatch) return docXml;

      // Calculate new values
      const existingLeft = leftMatch ? parseInt(leftMatch[1]) : 0;
      const firstLine = firstLineMatch ? parseInt(firstLineMatch[1]) : 0;

      // Convert firstLine to hanging + add bullet space (250 twips ≈ 0.17 inch)
      // If no firstLine, use default 360 twips for bullet character
      const hanging = firstLine > 0 ? firstLine + 250 : 360;

      // Build new indent element preserving w:left
      const newIndent = `<w:ind w:left="${existingLeft}" w:hanging="${hanging}"/>`;

      // Find and replace the existing <w:ind.../> element
      const indStartPos = pPrPos + pPrContent.indexOf(existingIndMatch[0]);

      return docXml.substring(0, indStartPos) + newIndent +
             docXml.substring(indStartPos + existingIndMatch[0].length);
    }

    // No <w:ind> exists yet, insert after opening <w:pPr> tag
    const pPrEndTag = pPrPos + existingPPrMatch[0].length;
    return docXml.substring(0, pPrEndTag) + defaultHangingIndent + docXml.substring(pPrEndTag);
  } else {
    // No <w:pPr> exists, need to add it after <w:p...>
    const insertPos = pTagEnd + 1;
    const pPrElement = `<w:pPr>${defaultHangingIndent}</w:pPr>`;
    return docXml.substring(0, insertPos) + pPrElement + docXml.substring(insertPos);
  }
}

/**
 * Apply filled segments back to the DOCX XML
 * Replaces text content by index while preserving XML structure
 * Also adds hanging indent for bullet-containing content
 *
 * CRITICAL: Hanging indent must be applied DURING replacement, not after,
 * because indexOf-based re-finding is unreliable when multiple segments
 * have the same content.
 */
function applyFilledSegments(
  docXml: string,
  filledSegments: Record<string, string>
): string {
  let result = docXml;

  const regex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let match;

  // Collect all matches first with their positions
  const matches: { fullMatch: string; attrs: string; content: string; start: number }[] = [];

  while ((match = regex.exec(docXml)) !== null) {
    matches.push({
      fullMatch: match[0],
      attrs: match[1],
      content: match[2],
      start: match.index,
    });
  }

  // Track which paragraphs already have hanging indent added (by their <w:p> start position)
  // This prevents adding indent multiple times to the same paragraph
  const paragraphsWithIndent = new Set<number>();

  // Track cumulative offset from indent insertions
  // When we add indent XML, all positions AFTER that point shift
  let cumulativeOffset = 0;

  // Process in FORWARD order for indent tracking, but we need to handle offsets carefully
  // Actually, process in REVERSE order - this way positions we haven't processed yet remain accurate
  // and we only need to track indent additions for determining which paragraphs are done
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const indexStr = i.toString();

    if (filledSegments[indexStr] === undefined) continue;

    const newContent = filledSegments[indexStr];

    // STEP 1: If content has bullets, add hanging indent FIRST (position is still accurate)
    if (contentHasBullets(newContent)) {
      // Find the parent <w:p> start position
      const searchArea = result.substring(0, m.start);
      const pStart = searchArea.lastIndexOf('<w:p');

      // Only add indent if this paragraph doesn't have it yet
      if (pStart !== -1 && !paragraphsWithIndent.has(pStart)) {
        paragraphsWithIndent.add(pStart);

        const beforeLength = result.length;
        result = addHangingIndentToParagraph(result, m.start);
        const afterLength = result.length;

        // Calculate how much XML was added (for offset tracking if needed)
        const addedLength = afterLength - beforeLength;

        // The indent insertion happens BEFORE m.start (at the <w:p> level),
        // so m.start itself shifts. We need to account for this in the text replacement.
        // Since we're processing in reverse order, this shift only affects the current replacement.

        // Recalculate the position of our <w:t> tag after indent insertion
        // The indent was inserted somewhere between pStart and m.start
        const newStart = m.start + addedLength;

        // STEP 2: Replace the text content at the new position
        const escapedContent = escapeXml(newContent);
        const newTag = `<w:t${m.attrs}>${escapedContent}</w:t>`;

        result = result.substring(0, newStart) + newTag +
                 result.substring(newStart + m.fullMatch.length);
      } else {
        // Paragraph already has indent or no paragraph found, just replace text
        const escapedContent = escapeXml(newContent);
        const newTag = `<w:t${m.attrs}>${escapedContent}</w:t>`;

        result = result.substring(0, m.start) + newTag +
                 result.substring(m.start + m.fullMatch.length);
      }
    } else {
      // No bullets, just replace the text content
      const escapedContent = escapeXml(newContent);
      const newTag = `<w:t${m.attrs}>${escapedContent}</w:t>`;

      result = result.substring(0, m.start) + newTag +
               result.substring(m.start + m.fullMatch.length);
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
