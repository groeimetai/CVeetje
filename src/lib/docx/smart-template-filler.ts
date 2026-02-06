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

  // Decode XML entities — template text may have &amp; etc.
  const decoded = trimmed
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  for (const sectionType of Object.keys(SECTION_PATTERNS) as Array<Exclude<SectionType, 'unknown'>>) {
    const patterns = SECTION_PATTERNS[sectionType];
    for (const pattern of patterns) {
      if (pattern.test(decoded)) {
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
 * Add tab stop and hanging indent to paragraph properties.
 * The tab stop positions the value column; the indent ensures wrapped lines
 * stay aligned at the tab position instead of flowing back to the left margin.
 * tabPos is in twips (1440 twips = 1 inch, 2800 twips ≈ 4.9cm)
 */
function addTabAlignmentToParagraphXml(pPrXml: string, tabPos: number): string {
  const tabStopXml = `<w:tabs><w:tab w:val="left" w:pos="${tabPos}"/></w:tabs>`;
  const indentXml = `<w:ind w:left="${tabPos}"/>`;

  let result = pPrXml;

  // Add/replace tab stops
  if (result.includes('<w:tabs>')) {
    result = result.replace(/<w:tabs>[\s\S]*?<\/w:tabs>/, tabStopXml);
  } else {
    // Insert after <w:pStyle.../> if present, else after <w:pPr>
    const styleMatch = result.match(/<w:pStyle[^/]*\/>/);
    if (styleMatch) {
      const insertPos = result.indexOf(styleMatch[0]) + styleMatch[0].length;
      result = result.substring(0, insertPos) + tabStopXml + result.substring(insertPos);
    } else {
      result = result.replace('<w:pPr>', '<w:pPr>' + tabStopXml);
    }
  }

  // Add/replace indent
  if (result.includes('<w:ind')) {
    result = result.replace(/<w:ind[^/]*\/>/, indentXml);
  } else {
    result = result.replace('</w:pPr>', indentXml + '</w:pPr>');
  }

  return result;
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
    `<w:r>${rPr}<w:t xml:space="preserve">${escapedValue}</w:t></w:r>`;
}

// ==================== Work Experience Block Duplication ====================

interface WorkExperienceSlot {
  /** Indices of all segments in this WE block */
  segmentIndices: number[];
  /** XML boundaries of all unique paragraphs in this WE block */
  paragraphs: { start: number; end: number }[];
}

/**
 * Detect work experience slots using paragraph-based grouping.
 *
 * Combines all <w:t> text within each paragraph before matching the period pattern,
 * so templates with split runs (from Word revision tracking) are handled correctly.
 * E.g., "20" + "24" + "-" + "Heden" + " : " in separate <w:t> elements within one
 * paragraph combine to "2024-Heden : " which matches the period pattern.
 */
function detectWorkExperienceSlots(
  docXml: string,
  segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean }[]
): WorkExperienceSlot[] {
  const weSegments = segments.filter(s => s.section === 'work_experience' && !s.isHeader);
  const slots: WorkExperienceSlot[] = [];

  // Period pattern to detect start of a WE block
  const periodPattern = /\d{4}\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)/;

  // Group WE segments by parent paragraph
  interface WePara { paraStart: number; paraEnd: number; combinedText: string; segments: typeof weSegments }
  const weParas: WePara[] = [];
  const seenParaStarts = new Set<number>();

  for (const seg of weSegments) {
    const p = findParentParagraph(docXml, seg.start);
    if (!p) continue;

    if (seenParaStarts.has(p.start)) {
      // Add to existing paragraph group
      const existing = weParas.find(wp => wp.paraStart === p.start)!;
      existing.combinedText += seg.text;
      existing.segments.push(seg);
    } else {
      seenParaStarts.add(p.start);
      weParas.push({
        paraStart: p.start,
        paraEnd: p.end,
        combinedText: seg.text,
        segments: [seg],
      });
    }
  }

  // Sort by position
  weParas.sort((a, b) => a.paraStart - b.paraStart);

  // Detect slots: a WE slot starts at a paragraph whose combined text matches the period pattern
  let currentSlotParas: WePara[] = [];

  const flushSlot = () => {
    if (currentSlotParas.length === 0) return;

    const segmentIndices: number[] = [];
    const paragraphs: { start: number; end: number }[] = [];

    for (const wp of currentSlotParas) {
      for (const s of wp.segments) {
        segmentIndices.push(s.index);
      }
      paragraphs.push({ start: wp.paraStart, end: wp.paraEnd });
    }

    if (paragraphs.length > 0) {
      slots.push({ segmentIndices, paragraphs });
    }
    currentSlotParas = [];
  };

  for (const wp of weParas) {
    if (periodPattern.test(wp.combinedText)) {
      // Period paragraph found — flush previous slot, start new one
      flushSlot();
      currentSlotParas = [wp];
    } else if (currentSlotParas.length > 0) {
      // Continue current slot
      currentSlotParas.push(wp);
    }
  }

  // Flush the last slot
  flushSlot();

  return slots;
}

/**
 * Duplicate work experience slots by cloning paragraph XML.
 * Clones all paragraphs of the last slot (not just 3), so templates
 * with varying paragraph counts per WE block are handled correctly.
 * Inserts clones after the last existing WE block.
 */
function duplicateWorkExperienceSlots(
  docXml: string,
  slots: WorkExperienceSlot[],
  targetCount: number
): string {
  if (slots.length === 0 || slots.length >= targetCount) return docXml;

  const additionalNeeded = targetCount - slots.length;
  const lastSlot = slots[slots.length - 1];
  const paras = lastSlot.paragraphs;

  // Extract the XML of all paragraphs in the last slot
  const blockStart = paras[0].start;
  const blockEnd = paras[paras.length - 1].end;
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
 * Extract all text segments from DOCX XML with their indices and section info.
 *
 * Uses paragraph-level text combining for section header detection, so templates
 * with split <w:t> elements (from Word revision tracking) are handled correctly.
 * E.g., "Opleidingen" + " &amp; " + "Cursussen" in separate runs are combined
 * before matching against section patterns.
 */
function extractIndexedSegments(docXml: string): {
  segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean }[];
  sections: SectionInfo[];
} {
  const segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean }[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  let index = 0;

  // Phase 1: Extract all segments with their positions
  while ((match = regex.exec(docXml)) !== null) {
    segments.push({
      index,
      text: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
    index++;
  }

  // Phase 2: Group segments by parent paragraph and detect sections using combined text
  // This handles Word revision tracking that splits text across multiple <w:t> elements
  interface ParaInfo { segmentIndices: number[]; combinedText: string; paraStart: number }
  const paraMap = new Map<number, ParaInfo>(); // paraStart → info

  for (const seg of segments) {
    const p = findParentParagraph(docXml, seg.start);
    if (!p) continue;

    const existing = paraMap.get(p.start);
    if (existing) {
      existing.segmentIndices.push(seg.index);
      existing.combinedText += seg.text;
    } else {
      paraMap.set(p.start, {
        segmentIndices: [seg.index],
        combinedText: seg.text,
        paraStart: p.start,
      });
    }
  }

  // Phase 3: Detect sections from paragraph combined text and assign to segments
  const sections: SectionInfo[] = [];
  let currentSection: SectionType = 'unknown';
  let currentSectionStartIndex = 0;

  // Sort paragraphs by position
  const sortedParas = [...paraMap.values()].sort((a, b) => a.paraStart - b.paraStart);

  for (const para of sortedParas) {
    const detectedSection = detectSectionType(para.combinedText);

    if (detectedSection) {
      // Close previous section
      const firstIdx = para.segmentIndices[0];
      if (firstIdx > currentSectionStartIndex && currentSection !== 'unknown') {
        sections.push({
          type: currentSection,
          startIndex: currentSectionStartIndex,
          endIndex: firstIdx - 1,
        });
      }
      currentSection = detectedSection;
      currentSectionStartIndex = firstIdx;

      // Mark all segments in this paragraph as header
      for (const idx of para.segmentIndices) {
        segments[idx].section = currentSection;
        segments[idx].isHeader = true;
      }
    } else {
      // Assign current section to all segments in this paragraph
      for (const idx of para.segmentIndices) {
        segments[idx].section = currentSection;
        segments[idx].isHeader = false;
      }
    }
  }

  // Close the last section
  if (segments.length > currentSectionStartIndex) {
    sections.push({
      type: currentSection,
      startIndex: currentSectionStartIndex,
      endIndex: segments.length - 1,
    });
  }

  return { segments, sections };
}

/** Default tab stop position in twips (2800 twips ≈ 4.9cm, accommodates "Werkzaamheden") */
const TAB_STOP_POS = 2800;

/**
 * Extract the existing tab stop position from paragraph properties.
 * Falls back to TAB_STOP_POS if none found.
 */
function extractTabStopPos(pPrXml: string | null): number {
  if (!pPrXml) return TAB_STOP_POS;
  const tabMatch = pPrXml.match(/<w:tab\s[^>]*w:pos="(\d+)"/);
  return tabMatch ? parseInt(tabMatch[1]) : TAB_STOP_POS;
}

/**
 * Apply filled segments back to the DOCX XML
 *
 * Groups segments by parent paragraph and processes each paragraph atomically.
 * For label:value segments (e.g., "Functie : "), creates proper tab-aligned runs.
 * For multi-line bullet content, expands into separate paragraphs.
 * Processes paragraph groups in reverse order to keep position tracking correct.
 */
function applyFilledSegments(
  docXml: string,
  filledSegments: Record<string, string>,
  _segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean }[]
): string {
  let result = docXml;

  const regex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let match;

  // Collect all <w:t> matches with their positions (from the ORIGINAL XML)
  const matches: { fullMatch: string; attrs: string; content: string; start: number; end: number }[] = [];

  while ((match = regex.exec(docXml)) !== null) {
    matches.push({
      fullMatch: match[0],
      attrs: match[1],
      content: match[2],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Identify which match indices have fills
  const filledIndices = new Set<number>();
  for (const indexStr of Object.keys(filledSegments)) {
    filledIndices.add(parseInt(indexStr));
  }

  // Group filled matches by their parent paragraph (using original XML positions)
  // Each group: { paraStart, paraEnd, paraXml, matchIndices[] }
  interface ParaGroup {
    paraStart: number;
    paraEnd: number;
    paraXml: string;
    matchIndices: number[]; // indices into the matches array
    hasLabel: boolean; // whether any match in this group is a label:value field
  }

  const paraGroups: ParaGroup[] = [];
  const matchToGroup = new Map<number, number>(); // match index → group index

  for (let i = 0; i < matches.length; i++) {
    if (!filledIndices.has(i)) continue;

    const m = matches[i];
    const para = findParentParagraph(docXml, m.start);
    if (!para) {
      // No paragraph found — will handle in fallback below
      continue;
    }

    // Check if this paragraph already has a group
    const existingGroupIdx = paraGroups.findIndex(
      g => g.paraStart === para.start && g.paraEnd === para.end
    );

    const isLabel = splitLabelValue(m.content) !== null;

    if (existingGroupIdx >= 0) {
      paraGroups[existingGroupIdx].matchIndices.push(i);
      if (isLabel) paraGroups[existingGroupIdx].hasLabel = true;
      matchToGroup.set(i, existingGroupIdx);
    } else {
      const groupIdx = paraGroups.length;
      paraGroups.push({
        paraStart: para.start,
        paraEnd: para.end,
        paraXml: para.xml,
        matchIndices: [i],
        hasLabel: isLabel,
      });
      matchToGroup.set(i, groupIdx);
    }
  }

  // Track which match indices are handled by paragraph groups
  const handledByGroup = new Set<number>();
  for (const g of paraGroups) {
    for (const idx of g.matchIndices) {
      handledByGroup.add(idx);
    }
  }

  // Sort paragraph groups by paraStart in REVERSE order
  paraGroups.sort((a, b) => b.paraStart - a.paraStart);

  // Process each paragraph group atomically
  for (const group of paraGroups) {
    if (group.hasLabel) {
      // This paragraph contains a label:value field — rebuild the entire paragraph
      // Find the FIRST label match to determine rPr and alignment
      const labelMatchIdx = group.matchIndices.find(i => splitLabelValue(matches[i].content) !== null);
      if (labelMatchIdx === undefined) continue;

      const labelMatch = matches[labelMatchIdx];
      const labelInfo = splitLabelValue(labelMatch.content)!;
      const newContent = filledSegments[labelMatchIdx.toString()];

      // Use stored group data directly — do NOT re-lookup the paragraph
      // (group.paraStart is the start of <w:p>, so findParentParagraph would
      // search backward and find the WRONG paragraph)
      const run = findParentRun(result, labelMatch.start);
      const rPrXml = run ? extractRunProperties(run.xml) : '';
      const pPrXml = extractParagraphProperties(group.paraXml);

      // Use template's existing tab stop position if available
      const tabPos = extractTabStopPos(pPrXml);

      // Handle period fields where AI returns "2020-Heden\tCompany"
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

      // Start building new paragraph: keep pPr, replace all runs
      let newPPr = pPrXml;
      if (newPPr) {
        newPPr = addTabAlignmentToParagraphXml(newPPr, tabPos);
      } else {
        newPPr = `<w:pPr><w:tabs><w:tab w:val="left" w:pos="${tabPos}"/></w:tabs><w:ind w:left="${tabPos}"/></w:pPr>`;
      }

      // Extract the paragraph open tag (may have attributes like w14:paraId)
      const pOpenMatch = group.paraXml.match(/^<w:p[^>]*>/);
      const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>';

      const newParaXml = `${pOpen}${newPPr}${tabRuns}</w:p>`;

      // Build continuation paragraphs for multi-line content
      let continuationXml = '';
      if (lines.length > 1) {
        continuationXml = expandBulletParagraphs(effectiveValue, rPrXml, pPrXml, tabPos, effectiveLabel);
      }

      // Replace the entire paragraph atomically using stored positions
      result = result.substring(0, group.paraStart) + newParaXml + continuationXml + result.substring(group.paraEnd);
    } else {
      // No label:value fields — do simple text replacements within the paragraph
      // Process match indices in reverse order (by position)
      const sortedIndices = [...group.matchIndices].sort((a, b) => matches[b].start - matches[a].start);

      for (const i of sortedIndices) {
        const m = matches[i];
        const newContent = filledSegments[i.toString()];
        if (newContent === undefined) continue;

        const escapedContent = escapeXml(newContent);
        const newTag = `<w:t${m.attrs}>${escapedContent}</w:t>`;
        result = result.substring(0, m.start) + newTag + result.substring(m.end);
      }
    }
  }

  // Fallback: handle any filled segments that weren't in a paragraph group
  // (shouldn't normally happen, but handles edge cases)
  for (let i = matches.length - 1; i >= 0; i--) {
    if (!filledIndices.has(i) || handledByGroup.has(i)) continue;

    const m = matches[i];
    const newContent = filledSegments[i.toString()];
    if (newContent === undefined) continue;

    const escapedContent = escapeXml(newContent);
    const newTag = `<w:t${m.attrs}>${escapedContent}</w:t>`;
    result = result.substring(0, m.start) + newTag + result.substring(m.end);
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
