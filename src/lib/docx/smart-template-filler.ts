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

// ==================== Work Experience Block Detection & Duplication ====================

/**
 * Represents a work experience block in the template
 */
interface WorkExperienceBlock {
  startPos: number;        // Start position in XML (start of first <w:p>)
  endPos: number;          // End position in XML (end of last </w:p>)
  xml: string;             // The XML content of this block
  segmentIndices: number[]; // Segment indices that belong to this block
}

/**
 * Detect work experience blocks in the template based on segment patterns
 *
 * A work experience block typically contains:
 * - Period/date range (e.g., "2020-2024" or "2020-Heden")
 * - Company name
 * - Position/function
 * - Tasks/responsibilities
 *
 * We look for consecutive segments in the work_experience section that form a pattern.
 */
function detectWorkExperienceBlocks(
  docXml: string,
  segments: { index: number; text: string; start: number; end: number; section?: SectionType }[]
): WorkExperienceBlock[] {
  const blocks: WorkExperienceBlock[] = [];

  // Get only work_experience segments
  const workSegments = segments.filter(s => s.section === 'work_experience');
  if (workSegments.length === 0) {
    console.log('[DOCX] No work_experience segments found');
    return blocks;
  }

  console.log(`[DOCX] Found ${workSegments.length} work_experience segments`);

  // Patterns to detect work experience period markers
  // Supports: "2020-2024", "2020 - Heden", "Jan 2020 - Dec 2024", "2020-Present :", etc.
  const periodPatterns = [
    // Simple year range: "2020-2024", "2020 - Heden"
    /^\s*\d{4}\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)?\s*:?\s*$/,
    // Year range with months: "Jan 2020 - Dec 2024"
    /^\s*[A-Za-z]{3,9}\.?\s*\d{4}\s*[-–—]\s*([A-Za-z]{3,9}\.?\s*\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)?\s*:?\s*$/i,
    // Period label followed by dates
    /^\s*(periode|period)\s*:?\s*\d{4}/i,
  ];

  // Find period markers as block boundaries
  const periodIndices: number[] = [];
  for (const seg of workSegments) {
    const isPeriod = periodPatterns.some(pattern => pattern.test(seg.text));
    if (isPeriod) {
      periodIndices.push(seg.index);
      console.log(`[DOCX] Found period marker at segment ${seg.index}: "${seg.text}"`);
    }
  }

  if (periodIndices.length === 0) {
    console.log('[DOCX] No period markers found in work experience section');
    return blocks;
  }

  // For each period, find the block boundaries
  for (let i = 0; i < periodIndices.length; i++) {
    const periodIdx = periodIndices[i];
    const nextPeriodIdx = periodIndices[i + 1] ?? Infinity;

    // Find segments that belong to this block (from period to next period)
    const blockSegments = workSegments.filter(s =>
      s.index >= periodIdx && s.index < nextPeriodIdx
    );

    if (blockSegments.length === 0) continue;

    // Find the XML boundaries for this block
    // We need to find the <w:p> elements that contain these segments
    const firstSegment = blockSegments[0];
    const lastSegment = blockSegments[blockSegments.length - 1];

    // Find the start of the first paragraph containing the first segment
    const searchArea = docXml.substring(0, firstSegment.start);
    const pStart = searchArea.lastIndexOf('<w:p');

    if (pStart === -1) continue;

    // Find the end of the last paragraph containing the last segment
    // Search for </w:p> after the last segment
    const pEndSearch = docXml.indexOf('</w:p>', lastSegment.end);
    const pEnd = pEndSearch !== -1 ? pEndSearch + '</w:p>'.length : -1;

    if (pEnd === -1) continue;

    const blockXml = docXml.substring(pStart, pEnd);

    blocks.push({
      startPos: pStart,
      endPos: pEnd,
      xml: blockXml,
      segmentIndices: blockSegments.map(s => s.index),
    });

    console.log(`[DOCX] Detected work experience block ${i + 1}: segments ${blockSegments[0].index}-${lastSegment.index}, XML length ${blockXml.length}`);
  }

  return blocks;
}

/**
 * Duplicate work experience blocks to accommodate all experiences
 * Adds experience number markers so AI knows which experience goes where
 *
 * @param docXml - The original document XML
 * @param blocks - Detected work experience blocks
 * @param requiredCount - Number of experiences to accommodate
 * @returns Modified XML with duplicated blocks containing experience markers
 */
function duplicateWorkExperienceBlocks(
  docXml: string,
  blocks: WorkExperienceBlock[],
  requiredCount: number
): string {
  if (blocks.length === 0 || blocks.length >= requiredCount) {
    console.log(`[DOCX] No duplication needed: ${blocks.length} blocks for ${requiredCount} experiences`);
    return docXml;
  }

  const additionalNeeded = requiredCount - blocks.length;
  console.log(`[DOCX] Need to duplicate: ${additionalNeeded} additional blocks`);

  // Use the last block as template for duplication
  const templateBlock = blocks[blocks.length - 1];

  // Insert duplicated blocks after the last existing block
  const insertPosition = templateBlock.endPos;

  // Create duplicated blocks with experience markers
  let duplicatedXml = '';
  for (let i = 0; i < additionalNeeded; i++) {
    const experienceNum = blocks.length + i + 1; // e.g., if 3 blocks exist, this is 4, 5, 6...

    // Add experience marker to the period field so AI knows which experience to use
    // Replace the first period pattern (e.g., "2020-2024") with "[EXPERIENCE_N]"
    let markedBlock = templateBlock.xml;

    // Replace period text to mark which experience this block is for
    // This helps AI understand: "Block for experience 4", "Block for experience 5", etc.
    // Match various period formats
    markedBlock = markedBlock.replace(
      /(<w:t[^>]*>)\s*(?:\d{4}\s*[-–—]\s*(?:\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)?|[A-Za-z]{3,9}\.?\s*\d{4}\s*[-–—]\s*(?:[A-Za-z]{3,9}\.?\s*\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)?)\s*:?\s*(<\/w:t>)/i,
      `$1[WERKERVARING ${experienceNum}]$2`
    );

    duplicatedXml += markedBlock;
    console.log(`[DOCX] Added duplicate block ${i + 1} marked as WERKERVARING ${experienceNum}`);
  }

  // Also mark existing blocks so AI knows the mapping
  let result = docXml;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const experienceNum = i + 1;

    // Find and mark the period in this block
    const blockXml = result.substring(block.startPos, block.endPos);
    const markedBlockXml = blockXml.replace(
      /(<w:t[^>]*>)\s*(?:\d{4}\s*[-–—]\s*(?:\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)?|[A-Za-z]{3,9}\.?\s*\d{4}\s*[-–—]\s*(?:[A-Za-z]{3,9}\.?\s*\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)?)\s*:?\s*(<\/w:t>)/i,
      `$1[WERKERVARING ${experienceNum}]$2`
    );

    if (markedBlockXml !== blockXml) {
      result = result.substring(0, block.startPos) + markedBlockXml + result.substring(block.endPos);
      console.log(`[DOCX] Marked existing block ${i + 1} as WERKERVARING ${experienceNum}`);

      // Adjust positions of subsequent blocks due to length change
      const lengthDiff = markedBlockXml.length - blockXml.length;
      for (let j = i + 1; j < blocks.length; j++) {
        blocks[j].startPos += lengthDiff;
        blocks[j].endPos += lengthDiff;
      }
    }
  }

  // Recalculate insert position after marking existing blocks
  const finalInsertPosition = blocks[blocks.length - 1].endPos;

  // Insert the duplicated blocks into the document
  const newDocXml = result.substring(0, finalInsertPosition) +
                    duplicatedXml +
                    result.substring(finalInsertPosition);

  console.log(`[DOCX] Document XML grew from ${docXml.length} to ${newDocXml.length} chars`);

  return newDocXml;
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

      console.log(`[DOCX] Found existing indent: left=${leftMatch?.[1]}, firstLine=${firstLineMatch?.[1]}, hanging=${hangingMatch?.[1]}`);

      // Already has hanging indent - skip modification
      if (hangingMatch) {
        console.log('[DOCX] Already has hanging indent, skipping');
        return docXml;
      }

      // Calculate new values
      const existingLeft = leftMatch ? parseInt(leftMatch[1]) : 0;
      const firstLine = firstLineMatch ? parseInt(firstLineMatch[1]) : 0;

      // Convert firstLine to hanging + add bullet space (250 twips ≈ 0.17 inch)
      // If no firstLine, use default 360 twips for bullet character
      const hanging = firstLine > 0 ? firstLine + 250 : 360;

      // Build new indent element preserving w:left
      const newIndent = `<w:ind w:left="${existingLeft}" w:hanging="${hanging}"/>`;
      console.log(`[DOCX] Converting indent: ${existingIndMatch[0]} -> ${newIndent}`);

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

  console.log('[DOCX] applyFilledSegments called with', Object.keys(filledSegments).length, 'segments');

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
    const hasBullets = contentHasBullets(newContent);
    if (hasBullets) {
      console.log(`[DOCX] Segment ${i} has bullets: "${newContent.substring(0, 50)}..."`);
      // Find the parent <w:p> start position
      const searchArea = result.substring(0, m.start);
      const pStart = searchArea.lastIndexOf('<w:p');

      // Only add indent if this paragraph doesn't have it yet
      if (pStart !== -1 && !paragraphsWithIndent.has(pStart)) {
        paragraphsWithIndent.add(pStart);
        console.log(`[DOCX] Adding hanging indent for segment ${i} at pStart ${pStart}`);

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
    let { segments, sections } = extractIndexedSegments(docXml);

    // ==== WORK EXPERIENCE BLOCK DUPLICATION ====
    // Detect how many work experience blocks exist in the template
    // and duplicate if needed to accommodate all experiences
    const experienceCount = profileData.experience?.length || 0;
    if (experienceCount > 0) {
      const workBlocks = detectWorkExperienceBlocks(docXml, segments);
      console.log(`[DOCX] Template has ${workBlocks.length} work experience blocks, profile has ${experienceCount} experiences`);

      if (workBlocks.length > 0 && workBlocks.length < experienceCount) {
        // Duplicate blocks to accommodate all experiences
        docXml = duplicateWorkExperienceBlocks(docXml, workBlocks, experienceCount);

        // Re-extract segments after modification
        const reExtracted = extractIndexedSegments(docXml);
        segments = reExtracted.segments;
        sections = reExtracted.sections;
        console.log(`[DOCX] After duplication: ${segments.length} segments, ${sections.length} sections`);
      }
    }

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
