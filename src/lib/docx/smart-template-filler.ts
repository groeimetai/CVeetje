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
 * Detect if a paragraph uses tab-separated layout: [label] [tab(s)] [value]
 * Returns the label/value text and which match indices are label vs value.
 * Used for templates like John Doe where fields are "Functie [TAB x4] Developer".
 *
 * paraStart is the absolute position of the paragraph in the document XML,
 * used to compute each match's relative offset within the paragraph.
 */
function detectTabSeparatedParagraph(
  paraXml: string,
  paraStart: number,
  matchesInPara: { matchIndex: number; content: string; startInDoc: number }[]
): { labelText: string; valueText: string; labelMatchIndices: number[]; valueMatchIndices: number[] } | null {
  // Must have tabs and at least 2 text segments
  if (!paraXml.includes('<w:tab/>') || matchesInPara.length < 2) return null;

  // Find position of first <w:tab/> within the paragraph XML
  const firstTabPos = paraXml.indexOf('<w:tab/>');
  if (firstTabPos === -1) return null;

  const labelMatchIndices: number[] = [];
  const valueMatchIndices: number[] = [];
  let labelText = '';
  let valueText = '';

  for (const m of matchesInPara) {
    // Position of this match relative to the paragraph start
    const relPos = m.startInDoc - paraStart;

    if (relPos < firstTabPos) {
      labelMatchIndices.push(m.matchIndex);
      labelText += m.content;
    } else {
      valueMatchIndices.push(m.matchIndex);
      valueText += m.content;
    }
  }

  // Must have both label and value parts
  if (labelMatchIndices.length === 0 || valueMatchIndices.length === 0) return null;

  // Strip leading `: ` or `:` from value text (John Doe template has ": value" after tabs)
  valueText = valueText.replace(/^:\s*/, '').trim();

  return { labelText: labelText.trim(), valueText, labelMatchIndices, valueMatchIndices };
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
  const indentXml = `<w:ind w:left="${tabPos}" w:hanging="${tabPos}"/>`;

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

  // Clone the block for each additional experience, with spacer between blocks
  const spacerXml = '<w:p></w:p>';
  let insertXml = '';
  for (let i = 0; i < additionalNeeded; i++) {
    insertXml += spacerXml + blockXml;
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
    matchIndices: number[]; // filled indices into the matches array
    hasLabel: boolean; // whether this paragraph is a label:value field
    combinedLabel?: string; // label from combined paragraph text (for split-run detection)
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

  // Combined-text label detection for split-run paragraphs.
  // Word revision tracking may split "Label : " across multiple <w:t> elements,
  // e.g., "Naam" + ":" + " " in separate runs. Individual segments don't match
  // splitLabelValue, but the combined paragraph text does.
  //
  // IMPORTANT: Only apply to personal_info and special_notes sections.
  // WE/education fields use the template's own tab structure (multiple <w:tab/>
  // elements) for alignment — rebuilding those paragraphs would lose the tabs
  // and produce wrong values (split date segments like "20"+"25" get misinterpreted).
  for (const group of paraGroups) {
    if (group.hasLabel) continue;

    // Only apply combined detection for front-page and special-notes sections
    const firstFilledIdx = group.matchIndices[0];
    const sectionInfo = _segments.find(s => s.index === firstFilledIdx);
    if (sectionInfo?.section !== 'personal_info' && sectionInfo?.section !== 'special_notes') continue;

    // Find ALL <w:t> matches in this paragraph (filled or not)
    const allInPara: number[] = [];
    for (let i = 0; i < matches.length; i++) {
      if (matches[i].start > group.paraStart && matches[i].end < group.paraEnd) {
        allInPara.push(i);
      }
    }
    allInPara.sort((a, b) => matches[a].start - matches[b].start);

    const combinedText = allInPara.map(i => matches[i].content).join('');
    const labelInfo = splitLabelValue(combinedText);
    if (labelInfo) {
      group.hasLabel = true;
      group.combinedLabel = labelInfo.label;
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
      // This paragraph contains a label:value field — rebuild the entire paragraph.
      // Label detection works two ways:
      //   1. Single-run: one <w:t> contains "Label : " → splitLabelValue matches
      //   2. Split-run: "Label" + ":" + " " across separate <w:t> elements (Word
      //      revision tracking) → combinedLabel was set by paragraph-level detection

      // Determine label and value source
      const individualLabelIdx = group.matchIndices.find(i => splitLabelValue(matches[i].content) !== null);

      let label: string;
      let valueSourceIdx: number;

      if (individualLabelIdx !== undefined) {
        // Single-run: label text is in one <w:t>
        label = splitLabelValue(matches[individualLabelIdx].content)!.label;
        valueSourceIdx = individualLabelIdx;
      } else if (group.combinedLabel) {
        // Split-run: label from combined paragraph text, value from first filled segment
        label = group.combinedLabel;
        valueSourceIdx = group.matchIndices[0];
      } else {
        continue;
      }

      const newContent = filledSegments[valueSourceIdx.toString()];
      if (newContent === undefined) continue;

      // Determine section for this paragraph
      const segmentInfo = _segments.find(s => s.index === valueSourceIdx);

      // Extract formatting from original paragraph
      const firstMatch = matches[group.matchIndices[0]];
      const run = findParentRun(result, firstMatch.start);
      const rPrXml = run ? extractRunProperties(run.xml) : '';
      const pPrXml = extractParagraphProperties(group.paraXml);
      const pOpenMatch = group.paraXml.match(/^<w:p[^>]*>/);
      const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>';

      if (segmentInfo?.section === 'personal_info' || segmentInfo?.section === 'special_notes') {
        // Front page / special notes: simple "Label: Value" — replace entire paragraph with single run
        const rPr = rPrXml ? `<w:rPr>${rPrXml.replace(/<\/?w:rPr>/g, '')}</w:rPr>` : '';
        const newText = escapeXml(`${label}: ${newContent}`);
        const newParaXml = `${pOpen}${pPrXml || ''}<w:r>${rPr}<w:t xml:space="preserve">${newText}</w:t></w:r></w:p>`;
        result = result.substring(0, group.paraStart) + newParaXml + result.substring(group.paraEnd);
        continue;
      }

      // WE/education/other: tab-aligned runs with hanging indent
      const tabPos = extractTabStopPos(pPrXml);

      // Handle period fields where AI returns "2020-Heden\tCompany"
      let effectiveLabel = label;
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
        newPPr = `<w:pPr><w:tabs><w:tab w:val="left" w:pos="${tabPos}"/></w:tabs><w:ind w:left="${tabPos}" w:hanging="${tabPos}"/></w:pPr>`;
      }

      const newParaXml = `${pOpen}${newPPr}${tabRuns}</w:p>`;

      // Build continuation paragraphs for multi-line content
      let continuationXml = '';
      if (lines.length > 1) {
        continuationXml = expandBulletParagraphs(effectiveValue, rPrXml, pPrXml, tabPos, effectiveLabel);
      }

      // Replace the entire paragraph atomically using stored positions
      result = result.substring(0, group.paraStart) + newParaXml + continuationXml + result.substring(group.paraEnd);
    } else {
      // No label:value fields — check for tab-separated WE/education paragraphs
      const segInfo = _segments.find(s => s.index === group.matchIndices[0]);
      const isWEorEdu = segInfo?.section === 'work_experience' || segInfo?.section === 'education';
      const hasTabsInPara = group.paraXml.includes('<w:tab/>');

      // Build match info for tab detection
      const matchesInPara = group.matchIndices.map(i => ({
        matchIndex: i,
        content: matches[i].content,
        startInDoc: matches[i].start,
      }));

      // Also include non-filled matches in this paragraph for complete label detection
      const allMatchesInPara: typeof matchesInPara = [];
      for (let i = 0; i < matches.length; i++) {
        if (matches[i].start >= group.paraStart && matches[i].end <= group.paraEnd) {
          allMatchesInPara.push({
            matchIndex: i,
            content: matches[i].content,
            startInDoc: matches[i].start,
          });
        }
      }

      const tabLayout = isWEorEdu && hasTabsInPara
        ? detectTabSeparatedParagraph(group.paraXml, group.paraStart, allMatchesInPara)
        : null;

      if (tabLayout && isWEorEdu) {
        // Tab-separated WE/education paragraph — rebuild with proper alignment
        // Gather the filled content for label and value parts
        let filledLabel = '';
        for (const idx of tabLayout.labelMatchIndices) {
          const fill = filledSegments[idx.toString()];
          filledLabel += fill !== undefined ? fill : matches[idx].content;
        }
        let filledValue = '';
        for (const idx of tabLayout.valueMatchIndices) {
          const fill = filledSegments[idx.toString()];
          filledValue += fill !== undefined ? fill : matches[idx].content;
        }

        // Strip `: ` prefix from value (AI or template may include it)
        filledValue = filledValue.replace(/^:\s*/, '').trim();

        // Handle period fields where AI returns "2020-Heden\tCompany"
        if (filledLabel.includes('\t')) {
          const tabParts = filledLabel.split('\t');
          filledLabel = tabParts[0].trim();
          // If there's a company name after the tab, use it as the value
          if (tabParts[1]?.trim()) {
            filledValue = tabParts[1].trim();
          }
        }
        // Also check value for tab (AI might put "period\tcompany" in any segment)
        if (filledValue.includes('\t')) {
          const tabParts = filledValue.split('\t');
          filledValue = tabParts.join(' ').trim();
        }

        // Extract formatting from original paragraph
        const firstMatch = matches[allMatchesInPara[0].matchIndex];
        const run = findParentRun(result, firstMatch.start);
        const rPrXml = run ? extractRunProperties(run.xml) : '';
        const pPrXml = extractParagraphProperties(group.paraXml);
        const pOpenMatch = group.paraXml.match(/^<w:p[^>]*>/);
        const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>';

        // Use existing tab position or default for multi-tab templates (4 tabs × 720 = 2880)
        const tabPos = extractTabStopPos(pPrXml) !== TAB_STOP_POS
          ? extractTabStopPos(pPrXml)
          : 2880;

        // Split multi-line content: first line goes with label, rest are continuation paragraphs
        const lines = filledValue.split('\n').filter(l => l.trim());
        const firstLineValue = lines[0] || filledValue;

        // Build the tab-aligned runs for label + value
        const tabRuns = buildTabAlignedRuns(filledLabel, firstLineValue.trim(), rPrXml);

        // Build new paragraph properties with tab alignment
        let newPPr = pPrXml;
        if (newPPr) {
          newPPr = addTabAlignmentToParagraphXml(newPPr, tabPos);
        } else {
          newPPr = `<w:pPr><w:tabs><w:tab w:val="left" w:pos="${tabPos}"/></w:tabs><w:ind w:left="${tabPos}" w:hanging="${tabPos}"/></w:pPr>`;
        }

        // Add spacing before period paragraphs (start of a WE block) for visual separation
        const periodPattern = /\d{4}\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)/;
        if (periodPattern.test(filledLabel) || periodPattern.test(tabLayout.labelText)) {
          newPPr = newPPr.replace('</w:pPr>', '<w:spacing w:before="240"/></w:pPr>');
        }

        const newParaXml = `${pOpen}${newPPr}${tabRuns}</w:p>`;

        // Build continuation paragraphs for multi-line content
        let continuationXml = '';
        if (lines.length > 1) {
          continuationXml = expandBulletParagraphs(filledValue, rPrXml, pPrXml, tabPos, filledLabel);
        }

        // Replace the entire paragraph atomically
        result = result.substring(0, group.paraStart) + newParaXml + continuationXml + result.substring(group.paraEnd);
      } else if (isWEorEdu && !hasTabsInPara) {
        // Non-tab WE/education continuation paragraph — rebuild cleanly.
        // Original template may have leading whitespace runs (spaces used for
        // alignment) and w:firstLine that cause misalignment. Rebuild with
        // just the content text and w:left indent, dropping whitespace runs.

        // Gather all text segments in this paragraph (filled and unfilled)
        const allInPara: number[] = [];
        for (let i = 0; i < matches.length; i++) {
          if (matches[i].start >= group.paraStart && matches[i].end <= group.paraEnd) {
            allInPara.push(i);
          }
        }
        allInPara.sort((a, b) => matches[a].start - matches[b].start);

        // Combine text: use filled content where available, skip whitespace-only segments
        const textParts: string[] = [];
        for (const idx of allInPara) {
          const fill = filledSegments[idx.toString()];
          const text = fill !== undefined ? fill : matches[idx].content;
          if (text.trim()) textParts.push(text);
        }
        const combinedContent = textParts.join('').trim();

        if (combinedContent) {
          // Extract formatting from first non-whitespace run
          const formatIdx = allInPara.find(i => {
            const fill = filledSegments[i.toString()];
            return (fill !== undefined ? fill : matches[i].content).trim().length > 0;
          }) ?? allInPara[0];

          const run = findParentRun(result, matches[formatIdx].start);
          const rPrXml = run ? extractRunProperties(run.xml) : '';
          const pPrXml = extractParagraphProperties(group.paraXml);
          const pOpenMatch = group.paraXml.match(/^<w:p[^>]*>/);
          const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>';

          // Build clean pPr with style + left indent only
          const indentPos = 2880;
          let newPPr = '<w:pPr>';
          if (pPrXml) {
            const styleMatch = pPrXml.match(/<w:pStyle[^/]*\/>/);
            if (styleMatch) newPPr = `<w:pPr>${styleMatch[0]}`;
          }
          newPPr += `<w:ind w:left="${indentPos}"/></w:pPr>`;

          const rPr = rPrXml ? `<w:rPr>${rPrXml.replace(/<\/?w:rPr>/g, '')}</w:rPr>` : '';
          const escapedContent = escapeXml(combinedContent);
          const newParaXml = `${pOpen}${newPPr}<w:r>${rPr}<w:t xml:space="preserve">${escapedContent}</w:t></w:r></w:p>`;

          result = result.substring(0, group.paraStart) + newParaXml + result.substring(group.paraEnd);
        } else {
          // All whitespace — preserve as-is (spacer paragraph)
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
      } else {
        // Other paragraphs (non-WE/education, or edge case with tabs) — simple replacement
        const sortedIndices = [...group.matchIndices].sort((a, b) => matches[b].start - matches[a].start);

        for (const i of sortedIndices) {
          const m = matches[i];
          const newContent = filledSegments[i.toString()];
          if (newContent === undefined) continue;

          const escapedContent = escapeXml(newContent);
          const newTag = `<w:t${m.attrs}>${escapedContent}</w:t>`;
          result = result.substring(0, m.start) + newTag + result.substring(m.end);
        }

        if (isWEorEdu && hasTabsInPara) {
          // Tab-separated paragraph where detection didn't match — add hanging indent
          const indentPos = 2880;
          const afterParaOpen = result.substring(group.paraStart);
          const pprStartOff = afterParaOpen.indexOf('<w:pPr>');

          if (pprStartOff !== -1) {
            const pprEndOff = afterParaOpen.indexOf('</w:pPr>', pprStartOff) + '</w:pPr>'.length;
            const pprAbsStart = group.paraStart + pprStartOff;
            const pprAbsEnd = group.paraStart + pprEndOff;
            const currentPPr = result.substring(pprAbsStart, pprAbsEnd);

            if (!currentPPr.includes('<w:ind')) {
              const newPPr = currentPPr.replace('</w:pPr>', `<w:ind w:left="${indentPos}" w:hanging="${indentPos}"/></w:pPr>`);
              result = result.substring(0, pprAbsStart) + newPPr + result.substring(pprAbsEnd);
            }
          } else {
            const pOpenMatch = afterParaOpen.match(/^<w:p[^>]*>/);
            if (pOpenMatch) {
              const insertPos = group.paraStart + pOpenMatch[0].length;
              const newPPr = `<w:pPr><w:ind w:left="${indentPos}" w:hanging="${indentPos}"/></w:pPr>`;
              result = result.substring(0, insertPos) + newPPr + result.substring(insertPos);
            }
          }
        }
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
      sections,
      customValues,
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
            hfSections,
            customValues,
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
