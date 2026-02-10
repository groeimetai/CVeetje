/**
 * S4Y-specific template filler — restored legacy code for label:value paragraph templates.
 *
 * This handles S4Y-style templates where fields use "Label : " patterns
 * (e.g., "Functie : ", "Naam : "). Restored from commit c1488e4e (last working version).
 *
 * The universal AI-driven approach (structure-extractor + template-analyzer + block-duplicator)
 * works well for table-based templates but broke S4Y's paragraph-based format.
 * This file preserves the original approach for S4Y compatibility.
 */

import JSZip from 'jszip';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from '@/lib/ai/providers';
import { withRetry } from '@/lib/ai/retry';
import type { ParsedLinkedIn, JobVacancy, OutputLanguage, FitAnalysis } from '@/types';
import type { ExperienceDescriptionFormat } from '@/types/design-tokens';
import { buildProfileSummary, buildJobSummary, buildFitAnalysisSummary } from '@/lib/ai/docx-content-replacer';
import type { FillOptions, FillResult } from './smart-template-filler';

// ==================== Section Types ====================

type SectionType =
  | 'personal_info'
  | 'education'
  | 'work_experience'
  | 'special_notes'
  | 'skills'
  | 'languages'
  | 'references'
  | 'hobbies'
  | 'unknown';

interface SectionInfo {
  type: SectionType;
  startIndex: number;
  endIndex: number;
}

// ==================== Section Detection ====================

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

function detectSectionType(text: string): SectionType | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 50) return null;

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

function splitLabelValue(text: string): { label: string; isLabelField: boolean } | null {
  const match = text.match(/^(.+?)\s*:\s*$/);
  if (match) {
    return { label: match[1], isLabelField: true };
  }
  return null;
}

function detectTabSeparatedParagraph(
  paraXml: string,
  paraStart: number,
  matchesInPara: { matchIndex: number; content: string; startInDoc: number }[]
): { labelText: string; valueText: string; labelMatchIndices: number[]; valueMatchIndices: number[] } | null {
  if (!paraXml.includes('<w:tab/>') || matchesInPara.length < 2) return null;

  const firstTabPos = paraXml.indexOf('<w:tab/>');
  if (firstTabPos === -1) return null;

  const labelMatchIndices: number[] = [];
  const valueMatchIndices: number[] = [];
  let labelText = '';
  let valueText = '';

  for (const m of matchesInPara) {
    const relPos = m.startInDoc - paraStart;

    if (relPos < firstTabPos) {
      labelMatchIndices.push(m.matchIndex);
      labelText += m.content;
    } else {
      valueMatchIndices.push(m.matchIndex);
      valueText += m.content;
    }
  }

  if (labelMatchIndices.length === 0 || valueMatchIndices.length === 0) return null;

  valueText = valueText.replace(/^:\s*/, '').trim();

  return { labelText: labelText.trim(), valueText, labelMatchIndices, valueMatchIndices };
}

function findParentRun(docXml: string, posWithinRun: number): { start: number; end: number; xml: string } | null {
  const searchArea = docXml.substring(0, posWithinRun);
  const runStart = searchArea.lastIndexOf('<w:r>');
  const runStartWithAttrs = searchArea.lastIndexOf('<w:r ');
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

function extractRunProperties(runXml: string): string {
  const match = runXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  return match ? match[0] : '';
}

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

function extractParagraphProperties(pXml: string): string | null {
  const match = pXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  return match ? match[0] : null;
}

function addTabAlignmentToParagraphXml(pPrXml: string, tabPos: number): string {
  const tabStopXml = `<w:tabs><w:tab w:val="left" w:pos="${tabPos}"/></w:tabs>`;
  const indentXml = `<w:ind w:left="${tabPos}" w:hanging="${tabPos}"/>`;

  let result = pPrXml;

  if (result.includes('<w:tabs>')) {
    result = result.replace(/<w:tabs>[\s\S]*?<\/w:tabs>/, tabStopXml);
  } else {
    const styleMatch = result.match(/<w:pStyle[^/]*\/>/);
    if (styleMatch) {
      const insertPos = result.indexOf(styleMatch[0]) + styleMatch[0].length;
      result = result.substring(0, insertPos) + tabStopXml + result.substring(insertPos);
    } else {
      result = result.replace('<w:pPr>', '<w:pPr>' + tabStopXml);
    }
  }

  if (result.includes('<w:ind')) {
    result = result.replace(/<w:ind[^/]*\/>/, indentXml);
  } else {
    result = result.replace('</w:pPr>', indentXml + '</w:pPr>');
  }

  return result;
}

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
  segmentIndices: number[];
  paragraphs: { start: number; end: number }[];
}

function detectWorkExperienceSlots(
  docXml: string,
  segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean }[]
): WorkExperienceSlot[] {
  const weSegments = segments.filter(s => s.section === 'work_experience' && !s.isHeader);
  const slots: WorkExperienceSlot[] = [];

  const periodPattern = /\d{4}\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)/;

  interface WePara { paraStart: number; paraEnd: number; combinedText: string; segments: typeof weSegments }
  const weParas: WePara[] = [];
  const seenParaStarts = new Set<number>();

  for (const seg of weSegments) {
    const p = findParentParagraph(docXml, seg.start);
    if (!p) continue;

    if (seenParaStarts.has(p.start)) {
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

  weParas.sort((a, b) => a.paraStart - b.paraStart);

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
      flushSlot();
      currentSlotParas = [wp];
    } else if (currentSlotParas.length > 0) {
      currentSlotParas.push(wp);
    }
  }

  flushSlot();

  return slots;
}

function duplicateWorkExperienceSlots(
  docXml: string,
  slots: WorkExperienceSlot[],
  targetCount: number
): string {
  if (slots.length === 0 || slots.length >= targetCount) return docXml;

  const additionalNeeded = targetCount - slots.length;
  const lastSlot = slots[slots.length - 1];
  const paras = lastSlot.paragraphs;

  const blockStart = paras[0].start;
  const blockEnd = paras[paras.length - 1].end;
  const blockXml = docXml.substring(blockStart, blockEnd);

  const spacerXml = '<w:p></w:p>';
  let insertXml = '';
  for (let i = 0; i < additionalNeeded; i++) {
    insertXml += spacerXml + blockXml;
  }

  return docXml.substring(0, blockEnd) + insertXml + docXml.substring(blockEnd);
}

// ==================== Education Block Duplication ====================

function detectEducationSlots(
  docXml: string,
  segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean }[]
): WorkExperienceSlot[] {
  const eduSegments = segments.filter(s => s.section === 'education' && !s.isHeader);
  const slots: WorkExperienceSlot[] = [];

  const periodPattern = /\d{4}(\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow))?/;

  interface EduPara { paraStart: number; paraEnd: number; combinedText: string; segments: typeof eduSegments }
  const eduParas: EduPara[] = [];
  const seenParaStarts = new Set<number>();

  for (const seg of eduSegments) {
    const p = findParentParagraph(docXml, seg.start);
    if (!p) continue;

    if (seenParaStarts.has(p.start)) {
      const existing = eduParas.find(wp => wp.paraStart === p.start)!;
      existing.combinedText += seg.text;
      existing.segments.push(seg);
    } else {
      seenParaStarts.add(p.start);
      eduParas.push({
        paraStart: p.start,
        paraEnd: p.end,
        combinedText: seg.text,
        segments: [seg],
      });
    }
  }

  eduParas.sort((a, b) => a.paraStart - b.paraStart);

  let currentSlotParas: EduPara[] = [];

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

  for (const wp of eduParas) {
    if (periodPattern.test(wp.combinedText)) {
      flushSlot();
      currentSlotParas = [wp];
    } else if (currentSlotParas.length > 0) {
      currentSlotParas.push(wp);
    }
  }

  flushSlot();

  return slots;
}

function duplicateEducationSlots(
  docXml: string,
  slots: WorkExperienceSlot[],
  targetCount: number
): string {
  if (slots.length === 0 || slots.length >= targetCount) return docXml;

  const additionalNeeded = targetCount - slots.length;
  const lastSlot = slots[slots.length - 1];
  const paras = lastSlot.paragraphs;

  const blockStart = paras[0].start;
  const blockEnd = paras[paras.length - 1].end;
  const blockXml = docXml.substring(blockStart, blockEnd);

  const spacerXml = '<w:p></w:p>';
  let insertXml = '';
  for (let i = 0; i < additionalNeeded; i++) {
    insertXml += spacerXml + blockXml;
  }

  return docXml.substring(0, blockEnd) + insertXml + docXml.substring(blockEnd);
}

// ==================== Multi-line Bullet Expansion ====================

function expandBulletParagraphs(
  value: string,
  rPrXml: string,
  pPrXml: string | null,
  tabPos: number,
  _label: string | null
): string {
  const lines = value.split('\n').filter(l => {
    const t = l.trim();
    return t && !/^\s*[-•]\s*$/.test(t);
  });
  if (lines.length <= 1) return '';

  const rPr = rPrXml ? `<w:rPr>${rPrXml.replace(/<\/?w:rPr>/g, '')}</w:rPr>` : '';

  const indentXml = `<w:ind w:left="${tabPos}"/>`;

  let basePPr = '<w:pPr>';
  if (pPrXml) {
    const styleMatch = pPrXml.match(/<w:pStyle[^/]*\/>/);
    if (styleMatch) {
      basePPr = `<w:pPr>${styleMatch[0]}`;
    }
  }
  const continuationPPr = `${basePPr}${indentXml}</w:pPr>`;

  const continuationParagraphs: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const lineText = escapeXml(lines[i].trim());
    continuationParagraphs.push(
      `<w:p>${continuationPPr}<w:r>${rPr}<w:t xml:space="preserve">${lineText}</w:t></w:r></w:p>`
    );
  }

  return continuationParagraphs.join('');
}

// ==================== Segment Extraction ====================

function extractIndexedSegments(docXml: string): {
  segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean; isWhitespace?: boolean; isBulletPlaceholder?: boolean }[];
  sections: SectionInfo[];
} {
  const segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean; isWhitespace?: boolean; isBulletPlaceholder?: boolean }[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  let index = 0;

  while ((match = regex.exec(docXml)) !== null) {
    segments.push({
      index,
      text: match[1],
      start: match.index,
      end: match.index + match[0].length,
      isWhitespace: !match[1].trim(),
    });
    index++;
  }

  interface ParaInfo { segmentIndices: number[]; combinedText: string; paraStart: number }
  const paraMap = new Map<number, ParaInfo>();

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

  const sections: SectionInfo[] = [];
  let currentSection: SectionType = 'unknown';
  let currentSectionStartIndex = 0;

  const sortedParas = [...paraMap.values()].sort((a, b) => a.paraStart - b.paraStart);

  for (const para of sortedParas) {
    const detectedSection = detectSectionType(para.combinedText);

    if (detectedSection) {
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

      for (const idx of para.segmentIndices) {
        segments[idx].section = currentSection;
        segments[idx].isHeader = true;
      }
    } else {
      const isBulletPlaceholder = /^\s*[-•]\s*$/.test(para.combinedText);

      for (const idx of para.segmentIndices) {
        segments[idx].section = currentSection;
        segments[idx].isHeader = false;
        if (isBulletPlaceholder) {
          segments[idx].isBulletPlaceholder = true;
        }
      }
    }
  }

  if (segments.length > currentSectionStartIndex) {
    sections.push({
      type: currentSection,
      startIndex: currentSectionStartIndex,
      endIndex: segments.length - 1,
    });
  }

  return { segments, sections };
}

// ==================== Apply Filled Segments ====================

const TAB_STOP_POS = 2800;

function extractTabStopPos(pPrXml: string | null): number {
  if (!pPrXml) return TAB_STOP_POS;
  const tabMatch = pPrXml.match(/<w:tab\s[^>]*w:pos="(\d+)"/);
  return tabMatch ? parseInt(tabMatch[1]) : TAB_STOP_POS;
}

function applyFilledSegments(
  docXml: string,
  filledSegments: Record<string, string>,
  _segments: { index: number; text: string; start: number; end: number; section?: SectionType; isHeader?: boolean; isWhitespace?: boolean; isBulletPlaceholder?: boolean }[]
): string {
  let result = docXml;

  const regex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let match;

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

  const filledIndices = new Set<number>();
  for (const indexStr of Object.keys(filledSegments)) {
    filledIndices.add(parseInt(indexStr));
  }

  interface ParaGroup {
    paraStart: number;
    paraEnd: number;
    paraXml: string;
    matchIndices: number[];
    hasLabel: boolean;
    combinedLabel?: string;
  }

  const paraGroups: ParaGroup[] = [];
  const matchToGroup = new Map<number, number>();

  for (let i = 0; i < matches.length; i++) {
    if (!filledIndices.has(i)) continue;

    const m = matches[i];
    const para = findParentParagraph(docXml, m.start);
    if (!para) continue;

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

  for (const group of paraGroups) {
    if (group.hasLabel) continue;

    const firstFilledIdx = group.matchIndices[0];
    const sectionInfo = _segments.find(s => s.index === firstFilledIdx);
    if (sectionInfo?.section !== 'personal_info' && sectionInfo?.section !== 'special_notes') continue;

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

  const handledByGroup = new Set<number>();
  for (const g of paraGroups) {
    for (const idx of g.matchIndices) {
      handledByGroup.add(idx);
    }
  }

  paraGroups.sort((a, b) => b.paraStart - a.paraStart);

  for (const group of paraGroups) {
    const allBulletPlaceholder = group.matchIndices.every(i => {
      const seg = _segments.find(s => s.index === i);
      return seg?.isBulletPlaceholder || seg?.isWhitespace;
    });
    const hasAnyFill = group.matchIndices.some(i => filledSegments[i.toString()] !== undefined);
    if (allBulletPlaceholder && !hasAnyFill) {
      result = result.substring(0, group.paraStart) + result.substring(group.paraEnd);
      continue;
    }

    if (group.hasLabel) {
      const individualLabelIdx = group.matchIndices.find(i => splitLabelValue(matches[i].content) !== null);

      let label: string;
      let valueSourceIdx: number;

      if (individualLabelIdx !== undefined) {
        label = splitLabelValue(matches[individualLabelIdx].content)!.label;
        valueSourceIdx = individualLabelIdx;
      } else if (group.combinedLabel) {
        label = group.combinedLabel;
        valueSourceIdx = group.matchIndices[0];
      } else {
        continue;
      }

      const newContent = filledSegments[valueSourceIdx.toString()];
      if (newContent === undefined) continue;

      const segmentInfo = _segments.find(s => s.index === valueSourceIdx);

      const firstMatch = matches[group.matchIndices[0]];
      const run = findParentRun(result, firstMatch.start);
      const rPrXml = run ? extractRunProperties(run.xml) : '';
      const pPrXml = extractParagraphProperties(group.paraXml);
      const pOpenMatch = group.paraXml.match(/^<w:p[^>]*>/);
      const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>';

      if (segmentInfo?.section === 'personal_info' || segmentInfo?.section === 'special_notes') {
        const rPr = rPrXml ? `<w:rPr>${rPrXml.replace(/<\/?w:rPr>/g, '')}</w:rPr>` : '';
        const newText = escapeXml(`${label}: ${newContent}`);
        const newParaXml = `${pOpen}${pPrXml || ''}<w:r>${rPr}<w:t xml:space="preserve">${newText}</w:t></w:r></w:p>`;
        result = result.substring(0, group.paraStart) + newParaXml + result.substring(group.paraEnd);
        continue;
      }

      const tabPos = extractTabStopPos(pPrXml);

      let effectiveLabel = label;
      let effectiveValue = newContent;

      if (newContent.includes('\t')) {
        const tabParts = newContent.split('\t');
        effectiveLabel = tabParts[0].trim();
        effectiveValue = tabParts.slice(1).join('\t').trim();
      }

      const lines = effectiveValue.split('\n').filter(l => {
        const t = l.trim();
        return t && !/^\s*[-•]\s*$/.test(t);
      });
      const firstLineValue = lines[0] || effectiveValue;

      const tabRuns = buildTabAlignedRuns(effectiveLabel, firstLineValue.trim(), rPrXml);

      let newPPr = pPrXml;
      if (newPPr) {
        newPPr = addTabAlignmentToParagraphXml(newPPr, tabPos);
      } else {
        newPPr = `<w:pPr><w:tabs><w:tab w:val="left" w:pos="${tabPos}"/></w:tabs><w:ind w:left="${tabPos}" w:hanging="${tabPos}"/></w:pPr>`;
      }

      const newParaXml = `${pOpen}${newPPr}${tabRuns}</w:p>`;

      let continuationXml = '';
      if (lines.length > 1) {
        continuationXml = expandBulletParagraphs(effectiveValue, rPrXml, pPrXml, tabPos, effectiveLabel);
      }

      result = result.substring(0, group.paraStart) + newParaXml + continuationXml + result.substring(group.paraEnd);
    } else {
      const segInfo = _segments.find(s => s.index === group.matchIndices[0]);
      const isWEorEdu = segInfo?.section === 'work_experience' || segInfo?.section === 'education';
      const hasTabsInPara = group.paraXml.includes('<w:tab/>');

      const allMatchesInPara: { matchIndex: number; content: string; startInDoc: number }[] = [];
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
        let filledLabel = '';
        for (const idx of tabLayout.labelMatchIndices) {
          const fill = filledSegments[idx.toString()];
          filledLabel += fill !== undefined ? fill : matches[idx].content;
        }
        let filledValue = '';
        for (const idx of tabLayout.valueMatchIndices) {
          const seg = _segments.find(s => s.index === idx);
          if (seg?.isBulletPlaceholder || seg?.isWhitespace) continue;

          const fill = filledSegments[idx.toString()];
          filledValue += fill !== undefined ? fill : matches[idx].content;
        }

        filledValue = filledValue.replace(/^:\s*/, '').trim();

        if (filledLabel.includes('\t')) {
          const tabParts = filledLabel.split('\t');
          filledLabel = tabParts[0].trim();
          if (tabParts[1]?.trim()) {
            filledValue = tabParts[1].trim();
          }
        }
        if (filledValue.includes('\t')) {
          const tabParts = filledValue.split('\t');
          filledValue = tabParts.join(' ').trim();
        }

        const firstMatch = matches[allMatchesInPara[0].matchIndex];
        const run = findParentRun(result, firstMatch.start);
        const rPrXml = run ? extractRunProperties(run.xml) : '';
        const pPrXml = extractParagraphProperties(group.paraXml);
        const pOpenMatch = group.paraXml.match(/^<w:p[^>]*>/);
        const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>';

        const tabPos = extractTabStopPos(pPrXml) !== TAB_STOP_POS
          ? extractTabStopPos(pPrXml)
          : 2880;

        const lines = filledValue.split('\n').filter(l => {
          const t = l.trim();
          return t && !/^\s*[-•]\s*$/.test(t);
        });
        const firstLineValue = lines[0] || filledValue;

        const tabRuns = buildTabAlignedRuns(filledLabel, firstLineValue.trim(), rPrXml);

        let newPPr = pPrXml;
        if (newPPr) {
          newPPr = addTabAlignmentToParagraphXml(newPPr, tabPos);
        } else {
          newPPr = `<w:pPr><w:tabs><w:tab w:val="left" w:pos="${tabPos}"/></w:tabs><w:ind w:left="${tabPos}" w:hanging="${tabPos}"/></w:pPr>`;
        }

        const periodPattern = /\d{4}\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)/;
        if (periodPattern.test(filledLabel) || periodPattern.test(tabLayout.labelText)) {
          newPPr = newPPr.replace('</w:pPr>', '<w:spacing w:before="240"/></w:pPr>');
        }

        const newParaXml = `${pOpen}${newPPr}${tabRuns}</w:p>`;

        let continuationXml = '';
        if (lines.length > 1) {
          continuationXml = expandBulletParagraphs(filledValue, rPrXml, pPrXml, tabPos, filledLabel);
        }

        result = result.substring(0, group.paraStart) + newParaXml + continuationXml + result.substring(group.paraEnd);
      } else if (isWEorEdu && !hasTabsInPara) {
        const allInPara: number[] = [];
        for (let i = 0; i < matches.length; i++) {
          if (matches[i].start >= group.paraStart && matches[i].end <= group.paraEnd) {
            allInPara.push(i);
          }
        }
        allInPara.sort((a, b) => matches[a].start - matches[b].start);

        const textParts: string[] = [];
        for (const idx of allInPara) {
          const fill = filledSegments[idx.toString()];
          const text = fill !== undefined ? fill : matches[idx].content;
          if (text.trim()) textParts.push(text);
        }
        const combinedContent = textParts.join('').trim();

        if (combinedContent) {
          const formatIdx = allInPara.find(i => {
            const fill = filledSegments[i.toString()];
            return (fill !== undefined ? fill : matches[i].content).trim().length > 0;
          }) ?? allInPara[0];

          const run = findParentRun(result, matches[formatIdx].start);
          const rPrXml = run ? extractRunProperties(run.xml) : '';
          const pPrXml = extractParagraphProperties(group.paraXml);
          const pOpenMatch = group.paraXml.match(/^<w:p[^>]*>/);
          const pOpen = pOpenMatch ? pOpenMatch[0] : '<w:p>';

          if (combinedContent.includes('\t')) {
            const tabParts = combinedContent.split('\t');
            const labelPart = tabParts[0].trim();
            const valuePart = tabParts.slice(1).join(' ').trim();

            if (labelPart && valuePart) {
              const tabPos = extractTabStopPos(pPrXml) !== TAB_STOP_POS
                ? extractTabStopPos(pPrXml)
                : 2880;

              const tabRuns = buildTabAlignedRuns(labelPart, valuePart, rPrXml);
              let newPPr = pPrXml;
              if (newPPr) {
                newPPr = addTabAlignmentToParagraphXml(newPPr, tabPos);
              } else {
                newPPr = `<w:pPr><w:tabs><w:tab w:val="left" w:pos="${tabPos}"/></w:tabs><w:ind w:left="${tabPos}" w:hanging="${tabPos}"/></w:pPr>`;
              }

              const periodPattern = /\d{4}\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent|[Nn]u|[Nn]ow)/;
              if (periodPattern.test(labelPart)) {
                newPPr = newPPr.replace('</w:pPr>', '<w:spacing w:before="240"/></w:pPr>');
              }

              const newParaXml = `${pOpen}${newPPr}${tabRuns}</w:p>`;
              result = result.substring(0, group.paraStart) + newParaXml + result.substring(group.paraEnd);
            } else {
              const plainContent = (labelPart || valuePart).replace(/\t/g, ' ');
              const indentPos = 2880;
              let newPPr = '<w:pPr>';
              if (pPrXml) {
                const styleMatch = pPrXml.match(/<w:pStyle[^/]*\/>/);
                if (styleMatch) newPPr = `<w:pPr>${styleMatch[0]}`;
              }
              newPPr += `<w:ind w:left="${indentPos}"/></w:pPr>`;

              const rPr = rPrXml ? `<w:rPr>${rPrXml.replace(/<\/?w:rPr>/g, '')}</w:rPr>` : '';
              const escapedContent = escapeXml(plainContent);
              const newParaXml = `${pOpen}${newPPr}<w:r>${rPr}<w:t xml:space="preserve">${escapedContent}</w:t></w:r></w:p>`;
              result = result.substring(0, group.paraStart) + newParaXml + result.substring(group.paraEnd);
            }
          } else {
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
          }
        } else {
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
          const indentPos = 2880;
          const afterParaOpen = result.substring(group.paraStart);
          const pprStartOff = afterParaOpen.indexOf('<w:pPr>');

          if (pprStartOff !== -1) {
            const pprEndOff = afterParaOpen.indexOf('</w:pPr>', pprStartOff) + '</w:pPr>'.length;
            const pprAbsStart = group.paraStart + pprStartOff;
            const pprAbsEnd = group.paraStart + pprEndOff;
            const currentPPr = result.substring(pprAbsStart, pprAbsEnd);

            if (!currentPPr.includes('<w:ind')) {
              const newPPr = currentPPr.replace('</w:pPr>', `<w:ind w:left="${indentPos}"/></w:pPr>`);
              result = result.substring(0, pprAbsStart) + newPPr + result.substring(pprAbsEnd);
            }
          } else {
            const pOpenMatch = afterParaOpen.match(/^<w:p[^>]*>/);
            if (pOpenMatch) {
              const insertPos = group.paraStart + pOpenMatch[0].length;
              const newPPr = `<w:pPr><w:ind w:left="${indentPos}"/></w:pPr>`;
              result = result.substring(0, insertPos) + newPPr + result.substring(insertPos);
            }
          }
        }
      }
    }
  }

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

function removeEmptyBulletParagraphs(docXml: string): string {
  return docXml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (paraMatch) => {
    const textMatches = [...paraMatch.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
    if (textMatches.length === 0) return paraMatch;

    const combinedText = textMatches.map(m => m[1]).join('');
    if (/^\s*:?\s*[-–—•]\s*$/.test(combinedText)) {
      return '';
    }
    return paraMatch;
  });
}

// ==================== AI Fill (Legacy indexed approach) ====================

const SECTION_RULES: Record<
  SectionType,
  { nl: string; en: string; allowedContent: string[] }
> = {
  personal_info: {
    nl: 'Alleen: naam, adres, telefoon, email, geboortedatum, nationaliteit',
    en: 'Only: name, address, phone, email, date of birth, nationality',
    allowedContent: ['name', 'address', 'phone', 'email', 'dob', 'nationality'],
  },
  work_experience: {
    nl: 'ALLEEN: bedrijfsnamen, functies, werkzaamheden/taken, periodes van WERK. Dit is de ENIGE sectie voor werkgerelateerde content!',
    en: 'ONLY: company names, job titles, tasks/responsibilities, work periods. This is the ONLY section for work-related content!',
    allowedContent: ['company', 'title', 'tasks', 'work_period'],
  },
  education: {
    nl: 'Alleen: scholen, opleidingen, diploma\'s, studierichtingen, studieperiodes',
    en: 'Only: schools, degrees, diplomas, fields of study, education periods',
    allowedContent: ['school', 'degree', 'field', 'education_period'],
  },
  special_notes: {
    nl: `ALLEEN: beschikbaarheid, vervoer, rijbewijs.
⚠️ VERBODEN: werkervaring, functies, bedrijfsnamen, periodes (2020-2024), @-tekens, talen!
Vul ALLEEN de velden in die in het template staan (bijv. "Beschikbaarheid" en "Vervoer").
Voeg GEEN extra velden toe die niet in het template staan!
Als je werkgerelateerde content hier plaatst, is het CV ONGELDIG.`,
    en: `ONLY: availability, transport, driver's license.
⚠️ FORBIDDEN: work experience, job titles, company names, periods (2020-2024), @-signs, languages!
Fill ONLY the fields that exist in the template (e.g., "Availability" and "Transport").
Do NOT add extra fields that are not in the template!
Placing work-related content here makes the CV INVALID.`,
    allowedContent: ['availability', 'transport', 'license'],
  },
  skills: {
    nl: 'Alleen: technische vaardigheden, soft skills, talen, certificaten',
    en: 'Only: technical skills, soft skills, languages, certifications',
    allowedContent: ['skills', 'certifications'],
  },
  languages: {
    nl: 'Alleen: talen en taalniveaus',
    en: 'Only: languages and proficiency levels',
    allowedContent: ['languages'],
  },
  references: {
    nl: 'Alleen: referenties en contactpersonen',
    en: 'Only: references and contact persons',
    allowedContent: ['references'],
  },
  hobbies: {
    nl: 'Alleen: hobby\'s en interesses',
    en: 'Only: hobbies and interests',
    allowedContent: ['hobbies', 'interests'],
  },
  unknown: {
    nl: 'Algemene content - bepaal op basis van context',
    en: 'General content - determine based on context',
    allowedContent: [],
  },
};

const indexedFillSchema = z.object({
  filledSegments: z.array(
    z.object({
      index: z.string().describe('The segment number as a string (e.g., "0", "1", "5")'),
      value: z.string().describe('The filled text value for this segment'),
    })
  ).describe('Array of segments to fill. Only include segments that need to be changed.'),
  warnings: z.array(z.string()).optional().describe('Any warnings about the fill process'),
});

interface IndexedFillResult {
  filledSegments: Record<string, string>;
  warnings: string[];
}

function getSectionRulesText(language: OutputLanguage): string {
  const isEn = language === 'en';

  if (isEn) {
    return `
=== SECTION RULES (CRITICAL!) ===

1. WORK EXPERIENCE SECTION:
   - Fill ONLY: company names, job titles, tasks/responsibilities, work periods
   - This is the ONLY section for work-related content
   - NEVER put work experience in other sections!

2. SPECIAL NOTES / ADDITIONAL INFO ("Bijzonderheden") SECTION:
   ⚠️ CRITICAL RESTRICTIONS:
   - Fill ONLY the exact fields that exist in the template (e.g., "Beschikbaarheid", "Vervoer")
   - Do NOT add content for fields that don't exist (e.g., don't add "Talen" if there's no Talen field)
   - FORBIDDEN CONTENT (will be removed):
     * Job titles (Developer, Manager, Founder, etc.)
     * Company names
     * Work periods (2020-2024, 2025-Heden)
     * Career summaries
     * @ symbols (like "Developer @ Company")
     * Languages (unless there is a specific "Talen" field)
   - If you place work-related content here, it will be DELETED!

3. EDUCATION SECTION:
   - Fill ONLY: schools, degrees, fields of study, education periods
   - NEVER put work experience here!

4. PERSONAL INFO SECTION:
   - Fill ONLY: name, address, phone, email, date of birth

⚠️ WARNING: Each content type belongs in ONLY ONE specific section!
`;
  }

  return `
=== SECTIE REGELS (KRITIEK!) ===

1. WERKERVARING SECTIE:
   - Vul ALLEEN: bedrijfsnamen, functies, werkzaamheden/taken, werkperiodes
   - Dit is de ENIGE sectie voor werkgerelateerde content
   - ZET NOOIT werkervaring in andere secties!

2. BIJZONDERHEDEN / AANVULLENDE INFO SECTIE:
   ⚠️ KRITIEKE BEPERKINGEN:
   - Vul ALLEEN de exacte velden in die in het template staan (bijv. "Beschikbaarheid", "Vervoer")
   - Voeg GEEN content toe voor velden die niet bestaan (bijv. geen "Talen" als er geen Talen veld is)
   - VERBODEN CONTENT (wordt verwijderd):
     * Functietitels (Developer, Manager, Founder, etc.)
     * Bedrijfsnamen
     * Werkperiodes (2020-2024, 2025-Heden)
     * Carrière samenvattingen
     * @ symbolen (zoals "Developer @ Bedrijf")
     * Talen (tenzij er specifiek een "Talen" veld is)
   - Als je werkgerelateerde content hier plaatst, wordt het VERWIJDERD!

3. OPLEIDINGEN SECTIE:
   - Vul ALLEEN: scholen, diploma's, studierichtingen, studieperiodes
   - ZET NOOIT werkervaring hier!

4. PERSOONLIJKE GEGEVENS SECTIE:
   - Vul ALLEEN: naam, adres, telefoon, email, geboortedatum

⚠️ WAARSCHUWING: Elk type content hoort in SLECHTS ÉÉN specifieke sectie!
`;
}

function buildSectionGroupedDocument(
  segments: { index: number; text: string; section?: SectionType; isHeader?: boolean }[],
  sections: SectionInfo[],
  language: OutputLanguage
): string {
  const isEn = language === 'en';

  if (sections.length === 0 || sections.every(s => s.type === 'unknown')) {
    return segments.map(seg => {
      if (seg.isHeader) {
        return `[${seg.index}] ${seg.text} [SECTION HEADER - DO NOT MODIFY]`;
      }
      return `[${seg.index}] ${seg.text}`;
    }).join('\n');
  }

  const parts: string[] = [];

  for (const section of sections) {
    const rule = SECTION_RULES[section.type];
    const sectionName = section.type.replace(/_/g, ' ').toUpperCase();

    parts.push(`\n=== ${sectionName} (${section.startIndex}-${section.endIndex}) ===`);
    parts.push(`📋 ${isEn ? rule.en : rule.nl}`);
    parts.push('');

    for (const seg of segments) {
      if (seg.index >= section.startIndex && seg.index <= section.endIndex) {
        if (seg.isHeader) {
          parts.push(`[${seg.index}] ${seg.text} [SECTION HEADER - DO NOT MODIFY]`);
        } else {
          parts.push(`[${seg.index}] ${seg.text}`);
        }
      }
    }
  }

  return parts.join('\n');
}

function getPrompts(language: OutputLanguage) {
  if (language === 'en') {
    return {
      system: `You are a CV filling specialist. You receive a numbered CV template and must fill in the values.

CRITICAL RULES:
- Use ONLY the exact data from the profile
- NEVER invent extra education, experiences or years
- If data is "Unknown", leave the field empty or use "-"
- FILL ALL work experience and education, including older ones - skip NOTHING!
- If there are more experiences than template slots, fill available slots with most recent/relevant
- Do NOT worry about space or following sections - fill everything that fits

SECTION HEADERS (marked with [SECTION HEADER - DO NOT MODIFY]):
- NEVER include section header segments in your output
- These are formatting elements that must remain unchanged

LABEL:VALUE FIELDS:
- For segments with "Label : " pattern (e.g., "Position : ", "Tasks : "), return ONLY the value
- Example: [13] "Position : " → return { "index": "13", "value": "ServiceNow Developer" }
- Do NOT repeat the label in your value! Wrong: "Position : ServiceNow Developer"
- For period fields like "2024-Present : ", return the REAL period and company separated by a tab
- Example: [12] "2024-Present : " → return { "index": "12", "value": "2020-Present\tAlliander" }

TAB-SEPARATED FIELDS:
- Some templates have label and value in separate segments separated by tab characters
- Segments like ": " or ": CompanyName" after tabs contain the value — return ONLY the value without the ":"
- Example: [13] ": Alliander" → return { "index": "13", "value": "Snow-Flow" }
- Example: [10] ": ServiceNow Developer" → return { "index": "10", "value": "Data Engineer" }
- For period segments (e.g., "2024" or "2025-Heden"), return "YEAR-YEAR\tCompanyName" with tab separator

EDUCATION PERIOD FIELDS:
- Education periods work the SAME way as work experience periods
- For period segments in education (e.g., "2022-2024" or "2022-2024 : "), return "STARTYEAR-ENDYEAR\tSchoolName - Degree"
- Example: [5] "2022-2024" → return { "index": "5", "value": "2015-2017\tRijn IJssel - MBO 4 Entrepreneurship" }
- ALWAYS include the school name and degree after the tab separator! Never return just the year range.
- ALWAYS keep the full year range together (e.g., "2015-2017"), NEVER split it across label and value
- The year range goes in the LEFT column, school + degree in the RIGHT column

INSTRUCTIONS:
1. You receive text segments with numbers: [0] text, [1] text, etc.
2. Fill each segment with the correct profile data
3. Return an ARRAY of objects with index and value
4. Only segments that need to be CHANGED should be in the output
5. NEVER modify segments marked [SECTION HEADER - DO NOT MODIFY]`,
      templateHeader: 'NUMBERED TEMPLATE',
      profileHeader: 'PROFILE DATA',
      jobHeader: 'TARGET JOB (adapt content to this)',
      instructions: `Fill all segments with the correct profile data. Return an array of { index, value } objects.

WORK EXPERIENCE ORDER:
The first "Position :" and "Tasks :" after a period belong to work experience 1.
The second set belongs to work experience 2, etc.

After block duplication, all work experience slots may have IDENTICAL placeholder text.
You MUST fill each slot with a DIFFERENT experience from the profile, in chronological order (most recent first).
Slot 1 = experience 1, Slot 2 = experience 2, Slot 3 = experience 3, etc.
NEVER fill two slots with the same experience!

EDUCATION ORDER:
Education entries follow the same pattern as work experience.
After block duplication, all education slots may have IDENTICAL placeholder text.
You MUST fill each slot with a DIFFERENT education from the profile, in chronological order (most recent first).
Slot 1 = education 1, Slot 2 = education 2, etc.
NEVER fill two education slots with the same education!
Each education period segment MUST contain "STARTYEAR-ENDYEAR\tSchool - Degree" (with tab separator).
NEVER return just the year range — ALWAYS include the school name and degree after the tab.

IMPORTANT:
- Fill ALL empty segments where data belongs
- For "Label : " segments, return ONLY the value (not the label)
- For period segments ("2024-Present : "), return "YEAR-YEAR\tCompanyName"
- For education period segments ("2022-2024" or "2022-2024 : "), return "STARTYEAR-ENDYEAR\tSchool - Degree"
- Fill availability, transport etc. if known
- Return ONLY segments that need to be changed
- NEVER return section header segments
- FILL ALL work experience - including older jobs! Skip no experience.
- FILL ALL education entries - including older ones! Skip no education.
- If there are multiple work experience slots, fill them ALL with available experiences
- If there are multiple education slots, fill them ALL with available educations
- Space is NOT a problem - fill everything from the profile`,
    };
  }

  // Dutch (default)
  return {
    system: `Je bent een CV invul-specialist. Je krijgt een genummerd CV template en moet de waarden invullen.

KRITIEKE REGELS:
- Gebruik ALLEEN de exacte gegevens uit de profieldata
- VERZIN NOOIT extra opleidingen, ervaringen of jaren
- Als data "Onbekend" is, laat het veld dan leeg of gebruik "-"
- VUL ALLE werkervaring en opleidingen in, ook oudere - sla NIETS over!
- Als er meer ervaringen zijn dan template slots, vul dan de beschikbare slots met de meest recente/relevante
- Maak je GEEN zorgen over ruimte of volgende secties - vul alles in wat past

SECTIE HEADERS (gemarkeerd met [SECTION HEADER - DO NOT MODIFY]):
- Neem NOOIT sectie header segmenten op in je output
- Dit zijn opmaak-elementen die ongewijzigd moeten blijven

LABEL:WAARDE VELDEN:
- Voor segmenten met "Label : " patroon (bijv. "Functie : ", "Werkzaamheden : "), retourneer ALLEEN de waarde
- Voorbeeld: [13] "Functie : " → retourneer { "index": "13", "value": "ServiceNow Developer" }
- Herhaal NIET het label in je waarde! Fout: "Functie : ServiceNow Developer"
- Voor periode velden zoals "2024-Heden : ", retourneer de ECHTE periode en bedrijfsnaam gescheiden door een tab
- Voorbeeld: [12] "2024-Heden : " → retourneer { "index": "12", "value": "2020-Heden\tAlliander" }

TAB-GESCHEIDEN VELDEN:
- Sommige templates hebben label en waarde in aparte segmenten gescheiden door tab-tekens
- Segmenten zoals ": " of ": Bedrijfsnaam" na tabs bevatten de waarde — retourneer ALLEEN de waarde zonder de ":"
- Voorbeeld: [13] ": Alliander" → retourneer { "index": "13", "value": "Snow-Flow" }
- Voorbeeld: [10] ": ServiceNow Developer" → retourneer { "index": "10", "value": "Data Engineer" }
- Voor periode segmenten (bijv. "2024" of "2025-Heden"), retourneer "JAAR-JAAR\tBedrijfsnaam" met tab-scheiding

OPLEIDING PERIODE VELDEN:
- Opleidingsperiodes werken HETZELFDE als werkervaring periodes
- Voor periode segmenten in opleidingen (bijv. "2022-2024" of "2022-2024 : "), retourneer "STARTJAAR-EINDJAAR\tSchool - Diploma"
- Voorbeeld: [5] "2022-2024" → retourneer { "index": "5", "value": "2015-2017\tRijn IJssel - MBO 4 Entrepreneurship" }
- Retourneer ALTIJD de schoolnaam en diploma na de tab-scheiding! Retourneer nooit alleen het jaarbereik.
- Houd ALTIJD het volledige jaarbereik bij elkaar (bijv. "2015-2017"), splits het NOOIT over label en waarde
- Het jaarbereik gaat in de LINKER kolom, school + diploma in de RECHTER kolom

INSTRUCTIES:
1. Je krijgt tekst segmenten met nummers: [0] tekst, [1] tekst, etc.
2. Vul elk segment in met de juiste profieldata
3. Retourneer een ARRAY van objecten met index en value
4. Alleen segmenten die GEWIJZIGD moeten worden hoeven in de output
5. Wijzig NOOIT segmenten gemarkeerd met [SECTION HEADER - DO NOT MODIFY]`,
    templateHeader: 'GENUMMERD TEMPLATE',
    profileHeader: 'PROFIELDATA',
    jobHeader: 'DOELVACATURE (pas content hierop aan)',
    instructions: `Vul alle segmenten in met de juiste profieldata. Retourneer een array van { index, value } objecten.

WERKERVARING VOLGORDE:
De eerste "Functie :" en "Werkzaamheden :" na een periode horen bij werkervaring 1.
De tweede set hoort bij werkervaring 2, etc.

Na blok-duplicatie kunnen alle werkervaring slots IDENTIEKE placeholder tekst hebben.
Je MOET elk slot vullen met een ANDERE ervaring uit het profiel, in chronologische volgorde (meest recent eerst).
Slot 1 = ervaring 1, Slot 2 = ervaring 2, Slot 3 = ervaring 3, etc.
Vul NOOIT twee slots met dezelfde ervaring!

OPLEIDING VOLGORDE:
Opleidingen volgen hetzelfde patroon als werkervaring.
Na blok-duplicatie kunnen alle opleiding slots IDENTIEKE placeholder tekst hebben.
Je MOET elk slot vullen met een ANDERE opleiding uit het profiel, in chronologische volgorde (meest recent eerst).
Slot 1 = opleiding 1, Slot 2 = opleiding 2, etc.
Vul NOOIT twee opleiding slots met dezelfde opleiding!
Elk opleiding-periode segment MOET "STARTJAAR-EINDJAAR\tSchool - Diploma" bevatten (met tab-scheiding).
Retourneer NOOIT alleen het jaarbereik — neem ALTIJD de schoolnaam en diploma op na de tab.

BELANGRIJK:
- Vul ALLE lege segmenten in waar data hoort
- Voor "Label : " segmenten, retourneer ALLEEN de waarde (niet het label)
- Voor periode segmenten ("2024-Heden : "), retourneer "JAAR-JAAR\tBedrijfsnaam"
- Voor opleiding periode segmenten ("2022-2024" of "2022-2024 : "), retourneer "STARTJAAR-EINDJAAR\tSchool - Diploma"
- Beschikbaarheid, vervoer etc. ook invullen indien bekend
- Retourneer ALLEEN segmenten die gewijzigd moeten worden
- Retourneer NOOIT sectie header segmenten
- VUL ALLE werkervaring in - ook oudere banen! Sla geen ervaring over.
- VUL ALLE opleidingen in - ook oudere! Sla geen opleiding over.
- Als er meerdere werkervaring slots zijn, vul ze ALLEMAAL in met de beschikbare ervaringen
- Als er meerdere opleiding slots zijn, vul ze ALLEMAAL in met de beschikbare opleidingen
- Ruimte is GEEN probleem - vul alles in wat in het profiel staat`,
  };
}

function filterInvalidSectionContent(
  filledSegments: Record<string, string>,
  segments: { index: number; text: string; section?: SectionType }[]
): { filtered: Record<string, string>; removedCount: number } {
  const filtered = { ...filledSegments };
  let removedCount = 0;

  const workExperiencePatterns = [
    /\d{4}\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent)/,
    /@/,
    /\b(Founder|Co-?[Ff]ounder|CEO|CTO|Manager|Director|Lead|Developer|Engineer|Consultant)\b/i,
    /\b(Technical|Senior|Junior|Head of|VP|Vice President)\b/i,
    /\b(BV|B\.V\.|NV|N\.V\.|Inc|LLC|Ltd|GmbH)\b/i,
  ];

  for (const [indexStr, value] of Object.entries(filtered)) {
    const index = parseInt(indexStr);
    const segment = segments.find(s => s.index === index);

    if (segment?.section === 'special_notes' && value) {
      const hasWorkContent = workExperiencePatterns.some(pattern => pattern.test(value));

      if (hasWorkContent) {
        delete filtered[indexStr];
        removedCount++;
        console.warn(`[s4y-template-filler] Removed work experience content from special_notes: "${value.substring(0, 50)}..."`);
      }
    }
  }

  return { filtered, removedCount };
}

async function fillDocumentWithAI(
  indexedSegments: { index: number; text: string; section?: SectionType; isHeader?: boolean }[],
  profileData: ParsedLinkedIn,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  jobVacancy?: JobVacancy,
  language: OutputLanguage = 'nl',
  fitAnalysis?: FitAnalysis,
  customInstructions?: string,
  descriptionFormat: ExperienceDescriptionFormat = 'bullets',
  sections: SectionInfo[] = [],
  customValues?: Record<string, string>,
): Promise<IndexedFillResult> {
  const aiProvider = createAIProvider(provider, apiKey);

  const profileSummary = buildProfileSummary(profileData, language, customValues);
  const jobSummary = jobVacancy ? buildJobSummary(jobVacancy, language) : null;
  const fitSummary = buildFitAnalysisSummary(fitAnalysis, language);

  const numberedDoc = buildSectionGroupedDocument(indexedSegments, sections, language);

  const prompts = getPrompts(language);

  const hasSections = sections.length > 0 && sections.some(s => s.type !== 'unknown');
  const sectionRules = hasSections ? getSectionRulesText(language) : '';
  const systemPrompt = prompts.system + sectionRules;

  const formatInstruction = descriptionFormat === 'paragraph'
    ? (language === 'en'
        ? '\n--- EXPERIENCE FORMAT: PARAGRAPH ---\nWrite work experience as flowing paragraphs (2-3 sentences). Do not use bullet points.'
        : '\n--- WERKERVARING FORMAAT: PARAGRAAF ---\nSchrijf werkervaring als doorlopende paragrafen (2-3 zinnen). Gebruik geen opsommingstekens.')
    : (language === 'en'
        ? '\n--- EXPERIENCE FORMAT: BULLETS ---\nUse bullet points (starting with "- ") for work experience descriptions.'
        : '\n--- WERKERVARING FORMAAT: BULLETS ---\nGebruik opsommingstekens (beginnend met "- ") voor werkervaring beschrijvingen.');

  const customInstructionsSection = customInstructions
    ? `\n--- ${language === 'en' ? 'USER INSTRUCTIONS (IMPORTANT - follow these adjustments)' : 'GEBRUIKER INSTRUCTIES (BELANGRIJK - volg deze aanpassingen)'} ---\n${customInstructions}\n`
    : '';

  const userPrompt = `${prompts.templateHeader}:
${numberedDoc}

${prompts.profileHeader}:
${profileSummary}
${jobSummary ? `\n${prompts.jobHeader}:\n${jobSummary}` : ''}${fitSummary}${formatInstruction}${customInstructionsSection}

${prompts.instructions}`;

  try {
    const result = await withRetry(() =>
      generateObject({
        model: aiProvider(model),
        schema: indexedFillSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.5,
      })
    );

    const filledSegmentsRecord: Record<string, string> = {};
    for (const segment of result.object.filledSegments) {
      filledSegmentsRecord[segment.index] = segment.value;
    }

    // Post-processing: Strip accidental label prefixes
    for (const [idx, value] of Object.entries(filledSegmentsRecord)) {
      const origSegment = indexedSegments.find(s => s.index === parseInt(idx));
      if (origSegment) {
        const labelMatch = origSegment.text.match(/^(.+?)\s*:\s*$/);
        if (labelMatch) {
          const label = labelMatch[1].trim();
          const labelPrefix = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i');
          if (labelPrefix.test(value)) {
            filledSegmentsRecord[idx] = value.replace(labelPrefix, '').trim();
          }
        }
      }
    }

    // Post-processing: Strip leading `:` prefix from tab-separated value segments
    for (const [idx, value] of Object.entries(filledSegmentsRecord)) {
      const origSegment = indexedSegments.find(s => s.index === parseInt(idx));
      if (origSegment && /^:\s/.test(origSegment.text) && /^:\s*/.test(value)) {
        filledSegmentsRecord[idx] = value.replace(/^:\s*/, '').trim();
      }
    }

    // Post-processing: Remove header segments
    for (const seg of indexedSegments) {
      if (seg.isHeader && filledSegmentsRecord[seg.index.toString()] !== undefined) {
        delete filledSegmentsRecord[seg.index.toString()];
      }
    }

    // Post-processing: Filter invalid section content
    const { filtered, removedCount } = filterInvalidSectionContent(
      filledSegmentsRecord,
      indexedSegments
    );

    const warnings = result.object.warnings || [];
    if (removedCount > 0) {
      warnings.push(`Removed ${removedCount} segment(s) with misplaced work experience content from special_notes section.`);
    }

    return {
      filledSegments: filtered,
      warnings,
    };
  } catch (error) {
    console.error('Error filling document with AI (S4Y legacy):', error);
    throw new Error('Failed to fill document with AI');
  }
}

// ==================== Main Entry Point ====================

/**
 * Fill an S4Y-style DOCX template (label:value paragraph format) using the legacy approach.
 *
 * This is the original filling logic that was proven to work for S4Y templates.
 * It uses paragraph-based segment extraction + indexed AI filling + label:value alignment.
 */
export async function fillS4YTemplate(
  docxBuffer: ArrayBuffer,
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>,
  options?: FillOptions,
): Promise<FillResult> {
  const filledFields: string[] = [];
  const warnings: string[] = [];

  if (!options?.aiApiKey || !options?.aiProvider || !options?.aiModel) {
    throw new Error('AI mode is required for template filling. Please configure your AI API key.');
  }

  const zip = await JSZip.loadAsync(docxBuffer);

  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Invalid DOCX file: missing word/document.xml. Note: Only .docx files are supported, not .doc (Word 97-2003) files.');
  }

  let docXml = await documentXmlFile.async('string');

  try {
    // ==== WORK EXPERIENCE BLOCK DUPLICATION ====
    const experienceCount = profileData.experience?.length || 0;
    if (experienceCount > 0) {
      const preliminary = extractIndexedSegments(docXml);
      const weSlots = detectWorkExperienceSlots(docXml, preliminary.segments);

      if (weSlots.length > 0 && weSlots.length < experienceCount) {
        docXml = duplicateWorkExperienceSlots(docXml, weSlots, experienceCount);
      }
    }

    // ==== EDUCATION BLOCK DUPLICATION ====
    const educationCount = profileData.education?.length || 0;
    if (educationCount > 0) {
      const preliminary = extractIndexedSegments(docXml);
      const eduSlots = detectEducationSlots(docXml, preliminary.segments);

      if (eduSlots.length > 0 && eduSlots.length < educationCount) {
        docXml = duplicateEducationSlots(docXml, eduSlots, educationCount);
      }
    }

    // Extract indexed segments with section detection
    const { segments, sections } = extractIndexedSegments(docXml);

    // Prepare segments for AI (filter whitespace and bullet placeholders)
    const segmentsForAI = segments
      .filter(s => !s.isWhitespace && !s.isBulletPlaceholder)
      .map(s => ({
        index: s.index,
        text: s.text,
        section: s.section,
        isHeader: s.isHeader,
      }));

    // AI fills segments
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

    // Header protection
    const headerIndices = new Set(
      segments.filter(s => s.isHeader).map(s => s.index.toString())
    );
    for (const idx of Object.keys(aiResult.filledSegments)) {
      if (headerIndices.has(idx)) {
        delete aiResult.filledSegments[idx];
      }
    }

    // Apply filled segments
    docXml = applyFilledSegments(docXml, aiResult.filledSegments, segments);

    // Remove leftover bullet placeholders
    docXml = removeEmptyBulletParagraphs(docXml);

    // Count filled fields
    const filledCount = Object.keys(aiResult.filledSegments).length;
    for (let i = 0; i < filledCount; i++) {
      filledFields.push(`ai_segment_${i}`);
    }

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

        const { segments: hfSegments, sections: hfSections } = extractIndexedSegments(content);
        if (hfSegments.length > 0) {
          const hfSegmentsForAI = hfSegments.map(s => ({
            index: s.index,
            text: s.text,
            section: s.section,
            isHeader: s.isHeader,
          }));

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
    console.error('AI content replacement failed (S4Y legacy):', aiError);
    throw new Error('Failed to fill template with AI. Please check your API key and try again.');
  }
}
