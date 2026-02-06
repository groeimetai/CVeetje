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

// ==================== Label:Value Alignment ====================

/**
 * Detect if a text segment has a "Label : " pattern
 * Returns the label part if detected, null otherwise
 */
function splitLabelValue(text: string): { label: string; isLabelField: boolean } | null {
  // Match patterns like "Functie : ", "Werkzaamheden : ", "Beschikbaarheid : ", "2024-Heden : "
  const match = text.match(/^(.+?)\s*:\s*$/);
  if (match) {
    return { label: match[1], isLabelField: true };
  }
  return null;
}

/**
 * Find the parent <w:r>...</w:r> element boundaries for a given position within it
 */
function findParentRun(docXml: string, posWithinRun: number): { start: number; end: number; xml: string } | null {
  const searchArea = docXml.substring(0, posWithinRun);
  const runStart = searchArea.lastIndexOf('<w:r>');
  const runStartWithAttrs = searchArea.lastIndexOf('<w:r ');
  // Pick the closest one
  const actualStart = Math.max(runStart, runStartWithAttrs);
  if (actualStart === -1) return null;

  const runEndTag = '</w:r>';
  const runEndPos = docXml.indexOf(runEndTag, posWithinRun);
  if (runEndPos === -1) return null;

  const end = runEndPos + runEndTag.length;
  return {
    start: actualStart,
    end,
    xml: docXml.substring(actualStart, end),
  };
}

/**
 * Extract <w:rPr>...</w:rPr> from a run XML string
 */
function extractRunProperties(runXml: string): string {
  const match = runXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  return match ? match[0] : '';
}

/**
 * Find the parent <w:p>...</w:p> element boundaries for a position within it
 */
function findParentParagraph(docXml: string, posWithinParagraph: number): { start: number; end: number; xml: string } | null {
  const searchArea = docXml.substring(0, posWithinParagraph);
  const pStart = searchArea.lastIndexOf('<w:p>');
  const pStartWithAttrs = searchArea.lastIndexOf('<w:p ');
  const actualStart = Math.max(pStart, pStartWithAttrs);
  if (actualStart === -1) return null;

  const pEndTag = '</w:p>';
  const pEndPos = docXml.indexOf(pEndTag, posWithinParagraph);
  if (pEndPos === -1) return null;

  const end = pEndPos + pEndTag.length;
  return {
    start: actualStart,
    end,
    xml: docXml.substring(actualStart, end),
  };
}

/**
 * Extract <w:pPr>...</w:pPr> from a paragraph XML string
 */
function extractParagraphProperties(pXml: string): string | null {
  const match = pXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  return match ? match[0] : null;
}

/**
 * Add a tab stop definition to paragraph properties
 * tabPos is in twips (1440 twips = 1 inch, 2800 twips ≈ 4.9cm)
 */
function addTabStopToParagraphXml(pPrXml: string, tabPos: number): string {
  const tabStopXml = `<w:tabs><w:tab w:val="left" w:pos="${tabPos}"/></w:tabs>`;

  // If pPr already has tabs, replace them
  if (pPrXml.includes('<w:tabs>')) {
    return pPrXml.replace(/<w:tabs>[\s\S]*?<\/w:tabs>/, tabStopXml);
  }

  // Insert tabs after opening <w:pPr> but before style (after <w:pStyle.../> if present)
  const styleMatch = pPrXml.match(/<w:pStyle[^/]*\/>/);
  if (styleMatch) {
    const insertPos = pPrXml.indexOf(styleMatch[0]) + styleMatch[0].length;
    return pPrXml.substring(0, insertPos) + tabStopXml + pPrXml.substring(insertPos);
  }

  // Insert right after <w:pPr>
  return pPrXml.replace('<w:pPr>', '<w:pPr>' + tabStopXml);
}

/**
 * Build a tab-aligned replacement for a label:value paragraph
 * Creates: <w:r>{rPr}Label</w:r><w:r>{rPr}<w:tab/></w:r><w:r>{rPr}Value</w:r>
 */
function buildTabAlignedRuns(label: string, value: string, rPrXml: string): string {
  const escapedLabel = escapeXml(label);
  const escapedValue = escapeXml(value);
  const rPr = rPrXml ? `<w:rPr>${rPrXml.replace(/<\/?w:rPr>/g, '')}</w:rPr>` : '';

  return `<w:r>${rPr}<w:t xml:space="preserve">${escapedLabel}</w:t></w:r>` +
    `<w:r>${rPr}<w:tab/></w:r>` +
    `<w:r>${rPr}<w:t>${escapedValue}</w:t></w:r>`;
}

// ==================== Work Experience Block Duplication ====================

interface WorkExperienceSlot {
  /** Indices of the 3 segments: period, functie, werkzaamheden */
  segmentIndices: [number, number, number];
  /** XML boundaries of the 3 paragraphs */
  paragraphs: { start: number; end: number }[];
}

/**
 * Detect work experience slots as triplets of (period, functie, werkzaamheden)
 */
function detectWorkExperienceSlots(
  docXml: string,
  segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean }[]
): WorkExperienceSlot[] {
  const weSegments = segments.filter(s => s.section === 'work_experience' && !s.isHeader);
  const slots: WorkExperienceSlot[] = [];

  // Period pattern to detect start of a WE block
  const periodPattern = /^\s*\d{4}\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)?\s*:?\s*$/;

  for (let i = 0; i < weSegments.length; i++) {
    const seg = weSegments[i];
    if (!periodPattern.test(seg.text)) continue;

    // Found a period marker - next two segments should be Functie and Werkzaamheden
    const functieSeg = weSegments[i + 1];
    const werkSeg = weSegments[i + 2];

    if (!functieSeg || !werkSeg) continue;

    // Find paragraph boundaries for all three
    const paragraphs: { start: number; end: number }[] = [];
    for (const s of [seg, functieSeg, werkSeg]) {
      const p = findParentParagraph(docXml, s.start);
      if (!p) break;
      paragraphs.push({ start: p.start, end: p.end });
    }

    if (paragraphs.length === 3) {
      slots.push({
        segmentIndices: [seg.index, functieSeg.index, werkSeg.index],
        paragraphs,
      });
    }
  }

  return slots;
}

/**
 * Duplicate work experience slots by cloning paragraph XML
 * Inserts clones after the last existing WE block
 */
function duplicateWorkExperienceSlots(
  docXml: string,
  slots: WorkExperienceSlot[],
  targetCount: number
): string {
  if (slots.length === 0 || slots.length >= targetCount) return docXml;

  const additionalNeeded = targetCount - slots.length;
  const lastSlot = slots[slots.length - 1];

  // Extract the XML of the last 3-paragraph block
  const blockStart = lastSlot.paragraphs[0].start;
  const blockEnd = lastSlot.paragraphs[2].end;
  const blockXml = docXml.substring(blockStart, blockEnd);

  // Clone the block for each additional experience
  let insertXml = '';
  for (let i = 0; i < additionalNeeded; i++) {
    insertXml += blockXml;
  }

  // Insert after the last WE block
  return docXml.substring(0, blockEnd) + insertXml + docXml.substring(blockEnd);
}

// ==================== Multi-line Bullet Expansion ====================

/**
 * Expand multi-line bullet content into separate paragraphs
 * Returns the new XML that replaces the original paragraph
 */
function expandBulletParagraphs(
  value: string,
  rPrXml: string,
  pPrXml: string | null,
  tabPos: number,
  label: string | null
): string {
  const lines = value.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return ''; // No expansion needed

  const rPr = rPrXml ? `<w:rPr>${rPrXml.replace(/<\/?w:rPr>/g, '')}</w:rPr>` : '';

  // Build paragraph properties for continuation lines (indent to align under value column)
  const indentXml = `<w:ind w:left="${tabPos}"/>`;

  // Start with the base pPr (style etc.) but add our indent
  let basePPr = '<w:pPr>';
  if (pPrXml) {
    // Extract style from existing pPr
    const styleMatch = pPrXml.match(/<w:pStyle[^/]*\/>/);
    if (styleMatch) {
      basePPr = `<w:pPr>${styleMatch[0]}`;
    }
  }
  const continuationPPr = `${basePPr}${indentXml}</w:pPr>`;

  // Build continuation paragraphs (lines after the first)
  const continuationParagraphs: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const lineText = escapeXml(lines[i].trim());
    continuationParagraphs.push(
      `<w:p>${continuationPPr}<w:r>${rPr}<w:t xml:space="preserve">${lineText}</w:t></w:r></w:p>`
    );
  }

  return continuationParagraphs.join('');
}

/**
 * Extract all text segments from DOCX XML with their indices and section info
 * Returns segments grouped by detected sections for better AI context
 */
function extractIndexedSegments(docXml: string): {
  segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean }[];
  sections: SectionInfo[];
} {
  const segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean }[] = [];
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
      isHeader: detectedSection !== null,
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

/** Tab stop position in twips (2800 twips ≈ 4.9cm, accommodates "Werkzaamheden") */
const TAB_STOP_POS = 2800;

/**
 * Apply filled segments back to the DOCX XML
 *
 * For label:value segments (e.g., "Functie : "), creates proper tab-aligned runs.
 * For multi-line bullet content, expands into separate paragraphs.
 * Processes in reverse order to keep position tracking correct.
 */
function applyFilledSegments(
  docXml: string,
  filledSegments: Record<string, string>,
  segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean }[]
): string {
  let result = docXml;

  const regex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let match;

  // Collect all matches with their positions
  const matches: { fullMatch: string; attrs: string; content: string; start: number }[] = [];

  while ((match = regex.exec(docXml)) !== null) {
    matches.push({
      fullMatch: match[0],
      attrs: match[1],
      content: match[2],
      start: match.index,
    });
  }

  // Process in REVERSE order so earlier positions stay valid
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const indexStr = i.toString();

    if (filledSegments[indexStr] === undefined) continue;

    const newContent = filledSegments[indexStr];
    const labelInfo = splitLabelValue(m.content);

    if (labelInfo) {
      // This is a label:value field - use tab alignment
      const run = findParentRun(result, m.start);
      const para = findParentParagraph(result, m.start);
      if (!run || !para) {
        // Fallback: simple text replacement
        const escapedContent = escapeXml(newContent);
        const newTag = `<w:t${m.attrs}>${escapedContent}</w:t>`;
        result = result.substring(0, m.start) + newTag + result.substring(m.start + m.fullMatch.length);
        continue;
      }

      const rPrXml = extractRunProperties(run.xml);
      const pPrXml = extractParagraphProperties(para.xml);

      // Handle period fields where AI returns "2020-Heden\tCompany"
      // The tab character separates the new period label from the company value
      let effectiveLabel = labelInfo.label;
      let effectiveValue = newContent;

      if (newContent.includes('\t')) {
        const tabParts = newContent.split('\t');
        effectiveLabel = tabParts[0].trim();
        effectiveValue = tabParts.slice(1).join('\t').trim();
      }

      // Split multi-line content: first line is the value, rest are continuation paragraphs
      const lines = effectiveValue.split('\n').filter(l => l.trim());
      const firstLineValue = lines[0] || effectiveValue;

      // Build the tab-aligned runs for label + value
      const tabRuns = buildTabAlignedRuns(effectiveLabel, firstLineValue.trim(), rPrXml);

      // Add tab stop to paragraph properties
      let newParaXml = para.xml;
      if (pPrXml) {
        const newPPr = addTabStopToParagraphXml(pPrXml, TAB_STOP_POS);
        newParaXml = newParaXml.replace(pPrXml, newPPr);
      } else {
        // No pPr exists, add one
        const pOpenEnd = newParaXml.indexOf('>') + 1;
        const tabPPr = `<w:pPr><w:tabs><w:tab w:val="left" w:pos="${TAB_STOP_POS}"/></w:tabs></w:pPr>`;
        newParaXml = newParaXml.substring(0, pOpenEnd) + tabPPr + newParaXml.substring(pOpenEnd);
      }

      // Replace the run with tab-aligned runs
      newParaXml = newParaXml.replace(run.xml, tabRuns);

      // Build continuation paragraphs for multi-line content
      let continuationXml = '';
      if (lines.length > 1) {
        continuationXml = expandBulletParagraphs(effectiveValue, rPrXml, pPrXml, TAB_STOP_POS, effectiveLabel);
      }

      // Replace the entire paragraph and append continuation paragraphs
      result = result.substring(0, para.start) + newParaXml + continuationXml + result.substring(para.end);
    } else {
      // Not a label field - simple text replacement
      const escapedContent = escapeXml(newContent);
      const newTag = `<w:t${m.attrs}>${escapedContent}</w:t>`;
      result = result.substring(0, m.start) + newTag + result.substring(m.start + m.fullMatch.length);
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
    // ==== WORK EXPERIENCE BLOCK DUPLICATION ====
    // Must happen BEFORE extractIndexedSegments so AI sees all slots
    const experienceCount = profileData.experience?.length || 0;
    if (experienceCount > 0) {
      // Do a preliminary segment extraction to detect WE slots
      const preliminary = extractIndexedSegments(docXml);
      const weSlots = detectWorkExperienceSlots(docXml, preliminary.segments);

      if (weSlots.length > 0 && weSlots.length < experienceCount) {
        docXml = duplicateWorkExperienceSlots(docXml, weSlots, experienceCount);
      }
    }

    // Extract indexed segments from the document with section detection
    const { segments, sections } = extractIndexedSegments(docXml);

    // Prepare segments for AI (index, text, section, and header flag)
    const segmentsForAI = segments.map(s => ({
      index: s.index,
      text: s.text,
      section: s.section,
      isHeader: s.isHeader,
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

    // ==== HEADER PROTECTION ====
    // Remove any AI modifications to section header segments
    const headerIndices = new Set(
      segments.filter(s => s.isHeader).map(s => s.index.toString())
    );
    for (const idx of Object.keys(aiResult.filledSegments)) {
      if (headerIndices.has(idx)) {
        delete aiResult.filledSegments[idx];
      }
    }

    // Apply filled segments back to the XML
    docXml = applyFilledSegments(docXml, aiResult.filledSegments, segments);

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
            isHeader: s.isHeader,
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

          content = applyFilledSegments(content, hfResult.filledSegments, hfSegments);
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
