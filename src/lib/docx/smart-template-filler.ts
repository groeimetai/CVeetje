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
 * Check if content contains bullet points that need special formatting
 */
function contentHasBullets(content: string): boolean {
  // Check for common bullet patterns
  return /^[\s]*[-•·‣⁃]\s/m.test(content) || /\n[\s]*[-•·‣⁃]\s/.test(content);
}

/**
 * Parse bullet content into individual bullet items
 * Returns array of {bullet: string, text: string}
 */
function parseBulletContent(content: string): { bullet: string; text: string }[] {
  const lines = content.split('\n');
  const items: { bullet: string; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match bullet patterns: -, •, ·, ‣, ⁃
    const bulletMatch = trimmed.match(/^([-•·‣⁃])\s+(.*)$/);
    if (bulletMatch) {
      items.push({
        bullet: '•', // Normalize to bullet point
        text: bulletMatch[2],
      });
    } else {
      // Non-bullet line, add as text without bullet
      items.push({
        bullet: '',
        text: trimmed,
      });
    }
  }

  return items;
}

/**
 * Create a borderless table XML for bullet content (standalone, not inside a cell)
 * Each bullet item becomes a row with 2 cells:
 * - Cell 1: bullet character (narrow, fixed width)
 * - Cell 2: text content (remaining width)
 */
function createBulletTableXml(items: { bullet: string; text: string }[], runProps: string = ''): string {
  // Table properties: no borders, full width
  const tblPr = `<w:tblPr>
    <w:tblW w:w="5000" w:type="pct"/>
    <w:tblBorders>
      <w:top w:val="nil"/>
      <w:left w:val="nil"/>
      <w:bottom w:val="nil"/>
      <w:right w:val="nil"/>
      <w:insideH w:val="nil"/>
      <w:insideV w:val="nil"/>
    </w:tblBorders>
    <w:tblCellMar>
      <w:top w:w="0" w:type="dxa"/>
      <w:left w:w="0" w:type="dxa"/>
      <w:bottom w:w="0" w:type="dxa"/>
      <w:right w:w="0" w:type="dxa"/>
    </w:tblCellMar>
  </w:tblPr>`;

  // Grid: first column 300 twips (~0.2 inch for bullet), second column auto
  const tblGrid = `<w:tblGrid>
    <w:gridCol w:w="300"/>
    <w:gridCol w:w="8700"/>
  </w:tblGrid>`;

  // Build rows for each bullet item
  const rows = items.map(item => {
    const bulletCell = item.bullet
      ? `<w:tc>
          <w:tcPr><w:tcW w:w="300" w:type="dxa"/></w:tcPr>
          <w:p><w:r>${runProps}<w:t>${escapeXml(item.bullet)}</w:t></w:r></w:p>
        </w:tc>`
      : `<w:tc>
          <w:tcPr><w:tcW w:w="300" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t></w:t></w:r></w:p>
        </w:tc>`;

    const textCell = `<w:tc>
      <w:tcPr><w:tcW w:w="8700" w:type="dxa"/></w:tcPr>
      <w:p><w:r>${runProps}<w:t>${escapeXml(item.text)}</w:t></w:r></w:p>
    </w:tc>`;

    return `<w:tr>${bulletCell}${textCell}</w:tr>`;
  }).join('');

  return `<w:tbl>${tblPr}${tblGrid}${rows}</w:tbl>`;
}

/**
 * Create multiple paragraphs for bullet content inside an existing table cell
 * Each bullet becomes a separate paragraph with proper formatting
 */
function createBulletParagraphsXml(items: { bullet: string; text: string }[], runProps: string = ''): string {
  return items.map(item => {
    if (item.bullet) {
      // Paragraph with hanging indent for bullet alignment
      return `<w:p>
        <w:pPr>
          <w:ind w:left="227" w:hanging="227"/>
        </w:pPr>
        <w:r>${runProps}<w:t>${escapeXml(item.bullet)} ${escapeXml(item.text)}</w:t></w:r>
      </w:p>`;
    } else {
      // Non-bullet paragraph
      return `<w:p><w:r>${runProps}<w:t>${escapeXml(item.text)}</w:t></w:r></w:p>`;
    }
  }).join('');
}

/**
 * Check if a position is inside a table cell (<w:tc>)
 * Returns the cell boundaries if inside a cell, null otherwise
 */
function findTableCellBoundaries(docXml: string, position: number): { start: number; end: number } | null {
  // Find the most recent <w:tc> before this position
  const searchArea = docXml.substring(0, position);
  const tcStart = searchArea.lastIndexOf('<w:tc');

  if (tcStart === -1) return null;

  // Check if there's a </w:tc> between tcStart and position
  // If so, we're not inside that cell anymore
  const betweenArea = docXml.substring(tcStart, position);
  if (betweenArea.includes('</w:tc>')) return null;

  // Find the closing </w:tc> tag after position
  const tcEndTag = '</w:tc>';
  const tcEnd = docXml.indexOf(tcEndTag, position);
  if (tcEnd === -1) return null;

  return { start: tcStart, end: tcEnd + tcEndTag.length };
}

/**
 * Extract run properties (font, size, etc.) from a paragraph
 * This helps preserve styling when creating the table
 */
function extractRunProperties(docXml: string, position: number): string {
  // Find the parent <w:p> element
  const searchArea = docXml.substring(0, position);
  const lastPStart = searchArea.lastIndexOf('<w:p');
  if (lastPStart === -1) return '';

  // Find the end of this paragraph
  const pEnd = docXml.indexOf('</w:p>', lastPStart);
  if (pEnd === -1) return '';

  const pContent = docXml.substring(lastPStart, pEnd);

  // Look for <w:rPr> (run properties) within this paragraph
  const rPrMatch = pContent.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
  if (rPrMatch) {
    return `<w:rPr>${rPrMatch[1]}</w:rPr>`;
  }

  return '';
}

/**
 * Replace a paragraph with a bullet table
 * Finds the parent <w:p> element and replaces it entirely with a table
 */
function replaceParagraphWithTable(docXml: string, textTagStart: number, tableXml: string): { xml: string; lengthDiff: number } | null {
  // Find the parent <w:p> element that contains this <w:t>
  const searchArea = docXml.substring(0, textTagStart);
  const lastPStart = searchArea.lastIndexOf('<w:p');

  if (lastPStart === -1) return null;

  // Find the closing </w:p> tag
  const pEndTag = '</w:p>';
  const pEnd = docXml.indexOf(pEndTag, lastPStart);
  if (pEnd === -1) return null;

  const pEndComplete = pEnd + pEndTag.length;
  const originalLength = pEndComplete - lastPStart;

  // Replace the entire paragraph with the table
  const newXml = docXml.substring(0, lastPStart) + tableXml + docXml.substring(pEndComplete);

  return {
    xml: newXml,
    lengthDiff: tableXml.length - originalLength,
  };
}

/**
 * Find the paragraph boundaries for a given position in the XML
 * Returns { start, end } of the <w:p>...</w:p> element
 */
function findParagraphBoundaries(docXml: string, position: number): { start: number; end: number } | null {
  // Find the start of the parent <w:p> element
  const searchArea = docXml.substring(0, position);
  const pStart = searchArea.lastIndexOf('<w:p');
  if (pStart === -1) return null;

  // Find the closing </w:p> tag
  const pEndTag = '</w:p>';
  const pEnd = docXml.indexOf(pEndTag, pStart);
  if (pEnd === -1) return null;

  return { start: pStart, end: pEnd + pEndTag.length };
}

/**
 * Apply filled segments back to the DOCX XML
 * Replaces text content by index while preserving XML structure
 * For bullet content:
 * - If inside a table cell: replace paragraph with multiple bullet paragraphs (hanging indent)
 * - If standalone: replace paragraph with a borderless 2-column table
 *
 * Two-phase approach:
 * 1. Identify which paragraphs need special bullet formatting
 * 2. Process replacements, skipping non-primary matches in bullet paragraphs
 */
function applyFilledSegments(
  docXml: string,
  filledSegments: Record<string, string>
): string {
  const regex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let match;

  // Collect all matches first with their positions
  const matches: { fullMatch: string; attrs: string; content: string; start: number; index: number }[] = [];

  while ((match = regex.exec(docXml)) !== null) {
    matches.push({
      fullMatch: match[0],
      attrs: match[1],
      content: match[2],
      start: match.index,
      index: matches.length,
    });
  }

  // Phase 1: Identify paragraphs that need bullet formatting
  // Map paragraph start position -> { matchIndex, content, runProps, isInsideCell }
  const bulletParagraphs = new Map<number, {
    matchIndex: number;
    content: string;
    runProps: string;
    isInsideCell: boolean;
  }>();

  for (const m of matches) {
    const indexStr = m.index.toString();
    const newContent = filledSegments[indexStr];

    if (newContent === undefined) continue;

    if (contentHasBullets(newContent)) {
      // Find paragraph boundaries in original XML
      const boundaries = findParagraphBoundaries(docXml, m.start);
      if (boundaries) {
        // Store first match with bullet content for this paragraph
        if (!bulletParagraphs.has(boundaries.start)) {
          const runProps = extractRunProperties(docXml, m.start);
          const cellBoundaries = findTableCellBoundaries(docXml, m.start);
          bulletParagraphs.set(boundaries.start, {
            matchIndex: m.index,
            content: newContent,
            runProps,
            isInsideCell: cellBoundaries !== null,
          });
        }
      }
    }
  }

  // Phase 2: Build list of replacements to apply
  // We'll collect replacements and apply them in reverse order
  interface Replacement {
    start: number;
    end: number;
    newContent: string;
    isParagraphReplacement: boolean;
  }

  const replacements: Replacement[] = [];
  const processedParagraphs = new Set<number>();

  for (const m of matches) {
    const indexStr = m.index.toString();
    const newContent = filledSegments[indexStr];

    if (newContent === undefined) continue;

    const boundaries = findParagraphBoundaries(docXml, m.start);

    // Check if this match is in a bullet paragraph
    if (boundaries && bulletParagraphs.has(boundaries.start)) {
      const bulletInfo = bulletParagraphs.get(boundaries.start)!;

      // Only process if this is the primary match for this paragraph
      // and we haven't already processed this paragraph
      if (m.index === bulletInfo.matchIndex && !processedParagraphs.has(boundaries.start)) {
        processedParagraphs.add(boundaries.start);

        // Parse bullet content
        const bulletItems = parseBulletContent(bulletInfo.content);
        if (bulletItems.length > 0) {
          let bulletXml: string;

          if (bulletInfo.isInsideCell) {
            // Inside a table cell: use multiple paragraphs with hanging indent
            // This keeps the content within the existing cell structure
            bulletXml = createBulletParagraphsXml(bulletItems, bulletInfo.runProps);
          } else {
            // Standalone paragraph: replace with a borderless table
            bulletXml = createBulletTableXml(bulletItems, bulletInfo.runProps);
          }

          replacements.push({
            start: boundaries.start,
            end: boundaries.end,
            newContent: bulletXml,
            isParagraphReplacement: true,
          });
        }
      }
      // Skip other matches in bullet paragraphs (they'll be removed with the paragraph)
      continue;
    }

    // Regular text replacement
    const escapedContent = escapeXml(newContent);
    const newTag = `<w:t${m.attrs}>${escapedContent}</w:t>`;
    replacements.push({
      start: m.start,
      end: m.start + m.fullMatch.length,
      newContent: newTag,
      isParagraphReplacement: false,
    });
  }

  // Sort replacements by start position descending (process from end to start)
  replacements.sort((a, b) => b.start - a.start);

  // Apply replacements
  let result = docXml;
  for (const r of replacements) {
    result = result.substring(0, r.start) + r.newContent + result.substring(r.end);
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
