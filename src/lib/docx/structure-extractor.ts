/**
 * Structure-aware XML segment extractor for DOCX templates.
 *
 * Walks the OOXML tree with awareness of <w:tbl>, <w:tr>, <w:tc>, <w:p>
 * so that every <w:t> segment carries its structural context (body vs table,
 * which table, which row/cell). This replaces the flat regex-based
 * extractIndexedSegments() that had no table awareness.
 */

// ==================== Types ====================

export interface SegmentLocation {
  context: 'body' | 'table';
  tableIndex?: number;
  rowIndex?: number;
  cellIndex?: number;
  paragraph: { start: number; end: number };
  tableRow?: { start: number; end: number };
}

export interface StructuredSegment {
  id: string;              // "s0", "s1", ...
  text: string;
  xmlText: string;         // the raw <w:t ...>text</w:t> match
  start: number;           // byte position of <w:t> in XML
  end: number;
  location: SegmentLocation;
}

export interface TableInfo {
  tableIndex: number;
  start: number;
  end: number;
  rows: TableRowInfo[];
}

export interface TableRowInfo {
  rowIndex: number;
  start: number;
  end: number;
  cells: TableCellInfo[];
}

export interface TableCellInfo {
  cellIndex: number;
  start: number;
  end: number;
  text: string;            // combined text of all <w:t> in cell
  segmentIds: string[];
}

export interface ExtractionResult {
  segments: StructuredSegment[];
  tables: TableInfo[];
  templateMap: string;
  processedXml: string;  // XML after pre-processing (placeholder injection for empty cells)
  mergeGroups: Record<string, string[]>;  // leader segment ID → follower segment IDs
}

// ==================== Pre-processing ====================

/**
 * Inject placeholder <w:t> elements into table cell runs that have content
 * elements (<w:br/>) but no text. This makes "empty" cells (like description
 * placeholders in the Together Abroad template) visible to the AI.
 *
 * Without this, cells like:
 *   <w:r><w:rPr>...</w:rPr><w:br/></w:r>
 * would produce no segments, and the AI couldn't fill them.
 *
 * After injection:
 *   <w:r><w:rPr>...</w:rPr><w:t xml:space="preserve"> </w:t></w:r>
 */
function injectPlaceholdersForEmptyCells(docXml: string): string {
  // Find all <w:tc> cells and check if they contain runs with <w:br/> but no <w:t>
  let result = docXml;

  // Process in reverse order to keep positions valid
  const cellRegex = /<w:tc[\s>]/g;
  const cellPositions: number[] = [];
  let cm;
  while ((cm = cellRegex.exec(docXml)) !== null) {
    cellPositions.push(cm.index);
  }

  // Process cells in reverse
  for (let i = cellPositions.length - 1; i >= 0; i--) {
    const cellStart = cellPositions[i];
    const cellEndTag = result.indexOf('</w:tc>', cellStart);
    if (cellEndTag === -1) continue;
    const cellEnd = cellEndTag + '</w:tc>'.length;

    const cellXml = result.substring(cellStart, cellEnd);

    // Skip cells that already have <w:t> (they don't need placeholders)
    if (/<w:t[\s>]/.test(cellXml)) continue;

    // Skip cells without <w:br/> (truly empty cells or cells with only images/shapes)
    if (!cellXml.includes('<w:br/>')) continue;

    // Skip cells that contain <w:pict> (horizontal rules, decorative elements)
    // These are visual separators, not content placeholders
    // But only skip if ALL paragraphs have <w:pict> (some cells mix content and separators)

    // Replace <w:br/> with <w:t> placeholder in the FIRST qualifying run only.
    // One placeholder per cell keeps the template map clean for the AI.
    let newCellXml = cellXml;
    const runRegex = /<w:r[\s>][\s\S]*?<\/w:r>/g;
    let replaced = false;

    let rm;
    while ((rm = runRegex.exec(cellXml)) !== null) {
      if (replaced) break;
      const runXml = rm[0];
      // Only process runs that have <w:br/> but no <w:t> and no <w:pict>
      if (runXml.includes('<w:br/>') && !/<w:t[\s>]/.test(runXml) && !runXml.includes('<w:pict')) {
        // Replace <w:br/> with a placeholder <w:t>
        const newRun = runXml.replace('<w:br/>', '<w:t xml:space="preserve"> </w:t>');
        newCellXml = newCellXml.substring(0, rm.index) + newRun + newCellXml.substring(rm.index + rm[0].length);
        replaced = true;
      }
    }

    if (newCellXml !== cellXml) {
      result = result.substring(0, cellStart) + newCellXml + result.substring(cellEnd);
    }
  }

  return result;
}

// ==================== Extraction ====================

/**
 * Find the next occurrence of an exact XML open tag (not prefix matches).
 * E.g. for tagName "w:tbl", matches `<w:tbl>` and `<w:tbl ` but NOT `<w:tblPr>`.
 */
function findNextExactOpenTag(xml: string, tagName: string, pos: number): number {
  const searchTag = `<${tagName}`;
  let i = pos;
  while (i < xml.length) {
    const idx = xml.indexOf(searchTag, i);
    if (idx === -1) return -1;
    const afterTag = idx + searchTag.length;
    if (afterTag >= xml.length) return -1;
    const ch = xml[afterTag];
    // Must be followed by whitespace, >, or / (not another letter like in <w:tblPr>)
    if (ch === '>' || ch === '/' || ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      return idx;
    }
    i = idx + 1;
  }
  return -1;
}

/**
 * Find all non-overlapping occurrences of a tag pair in XML.
 * Returns { start, end } for each outermost match.
 * Uses a simple scan that handles nested tags of the same name.
 */
function findAllElements(xml: string, tagName: string): { start: number; end: number }[] {
  const results: { start: number; end: number }[] = [];
  const closeTag = `</${tagName}>`;

  let searchPos = 0;
  while (searchPos < xml.length) {
    const m = findNextExactOpenTag(xml, tagName, searchPos);
    if (m === -1) break;

    // Check this isn't a self-closing tag
    const nextGt = xml.indexOf('>', m);
    if (nextGt === -1) break;
    if (xml[nextGt - 1] === '/') {
      // Self-closing — skip
      searchPos = nextGt + 1;
      continue;
    }

    let depth = 1;
    let pos = nextGt + 1;
    while (depth > 0 && pos < xml.length) {
      const nextOpen = findNextExactOpenTag(xml, tagName, pos);
      const nextClosePos = xml.indexOf(closeTag, pos);

      if (nextClosePos === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClosePos) {
        // Check if the open tag is a real open (not self-closing)
        const gt = xml.indexOf('>', nextOpen);
        if (gt !== -1 && xml[gt - 1] === '/') {
          // Self-closing — skip it
          pos = gt + 1;
        } else {
          depth++;
          pos = gt + 1;
        }
      } else {
        depth--;
        if (depth === 0) {
          results.push({ start: m, end: nextClosePos + closeTag.length });
        }
        pos = nextClosePos + closeTag.length;
      }
    }

    searchPos = (results.length > 0 && results[results.length - 1].start === m)
      ? results[results.length - 1].end
      : nextGt + 1;
  }

  return results;
}

/**
 * Find all <w:p> elements within a range.
 */
function findParagraphs(xml: string, rangeStart: number, rangeEnd: number): { start: number; end: number }[] {
  const slice = xml.substring(rangeStart, rangeEnd);
  const paras = findAllElements(slice, 'w:p');
  return paras.map(p => ({ start: p.start + rangeStart, end: p.end + rangeStart }));
}

/**
 * Extract all <w:t> segments from XML with their structural context.
 */
export function extractStructuredSegments(docXml: string): ExtractionResult {
  // Pre-process: inject placeholder <w:t> into empty table cells
  // so they become visible segments the AI can fill
  const processedXml = injectPlaceholdersForEmptyCells(docXml);

  const segments: StructuredSegment[] = [];
  const tables: TableInfo[] = [];

  // Step 1: Find all tables
  const tableElements = findAllElements(processedXml, 'w:tbl');
  const tableRanges = new Set<string>();

  for (let ti = 0; ti < tableElements.length; ti++) {
    const tbl = tableElements[ti];
    tableRanges.add(`${tbl.start}-${tbl.end}`);

    const tblSlice = processedXml.substring(tbl.start, tbl.end);
    const rowElements = findAllElements(tblSlice, 'w:tr');

    const tableInfo: TableInfo = {
      tableIndex: ti,
      start: tbl.start,
      end: tbl.end,
      rows: [],
    };

    for (let ri = 0; ri < rowElements.length; ri++) {
      const row = rowElements[ri];
      const rowStart = row.start + tbl.start;
      const rowEnd = row.end + tbl.start;

      const rowSlice = processedXml.substring(rowStart, rowEnd);
      const cellElements = findAllElements(rowSlice, 'w:tc');

      const rowInfo: TableRowInfo = {
        rowIndex: ri,
        start: rowStart,
        end: rowEnd,
        cells: [],
      };

      for (let ci = 0; ci < cellElements.length; ci++) {
        const cell = cellElements[ci];
        const cellStart = cell.start + rowStart;
        const cellEnd = cell.end + rowStart;

        const cellInfo: TableCellInfo = {
          cellIndex: ci,
          start: cellStart,
          end: cellEnd,
          text: '',
          segmentIds: [],
        };

        // Find all <w:t> in this cell
        const cellSlice = processedXml.substring(cellStart, cellEnd);
        const paras = findParagraphs(processedXml, cellStart, cellEnd);

        const wtRegex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
        let wtMatch;
        while ((wtMatch = wtRegex.exec(cellSlice)) !== null) {
          const absStart = wtMatch.index + cellStart;
          const absEnd = absStart + wtMatch[0].length;
          const text = wtMatch[2];

          // Find which paragraph this <w:t> is in
          const para = paras.find(p => absStart >= p.start && absEnd <= p.end)
            || { start: cellStart, end: cellEnd };

          const seg: StructuredSegment = {
            id: `s${segments.length}`,
            text,
            xmlText: wtMatch[0],
            start: absStart,
            end: absEnd,
            location: {
              context: 'table',
              tableIndex: ti,
              rowIndex: ri,
              cellIndex: ci,
              paragraph: { start: para.start, end: para.end },
              tableRow: { start: rowStart, end: rowEnd },
            },
          };

          segments.push(seg);
          cellInfo.segmentIds.push(seg.id);
          cellInfo.text += text;
        }

        rowInfo.cells.push(cellInfo);
      }

      tableInfo.rows.push(rowInfo);
    }

    tables.push(tableInfo);
  }

  // Step 2: Find all <w:t> segments in body (outside tables)
  const wtRegex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let wtMatch;
  while ((wtMatch = wtRegex.exec(processedXml)) !== null) {
    const absStart = wtMatch.index;
    const absEnd = absStart + wtMatch[0].length;

    // Skip if inside a table
    const inTable = tableElements.some(t => absStart >= t.start && absEnd <= t.end);
    if (inTable) continue;

    // Find parent paragraph
    const paraMatch = findParentParagraphSimple(processedXml, absStart);
    const para = paraMatch || { start: absStart, end: absEnd };

    const seg: StructuredSegment = {
      id: `s${segments.length}`,
      text: wtMatch[2],
      xmlText: wtMatch[0],
      start: absStart,
      end: absEnd,
      location: {
        context: 'body',
        paragraph: { start: para.start, end: para.end },
      },
    };

    segments.push(seg);
  }

  // Step 3: Sort all segments by position
  segments.sort((a, b) => a.start - b.start);

  // Re-assign IDs after sorting
  for (let i = 0; i < segments.length; i++) {
    const oldId = segments[i].id;
    const newId = `s${i}`;
    segments[i].id = newId;

    // Update cell references
    for (const table of tables) {
      for (const row of table.rows) {
        for (const cell of row.cells) {
          const idx = cell.segmentIds.indexOf(oldId);
          if (idx !== -1) cell.segmentIds[idx] = newId;
        }
      }
    }
  }

  const bodySegments = segments.filter(s => s.location.context === 'body');
  const mergeGroups = computeMergeGroups(bodySegments, processedXml);
  const templateMap = buildTemplateMap(segments, tables, processedXml, mergeGroups);

  return { segments, tables, templateMap, processedXml, mergeGroups };
}

// ==================== Merge Groups ====================

/**
 * Compute merge groups for body paragraph segments.
 *
 * Within a paragraph, Word often splits text across multiple <w:r> runs
 * (due to formatting changes, spell-check marks, etc.). This creates
 * fragmented segments like "20", "20", "-", "2025" instead of "2020-2025".
 *
 * Merge groups identify which consecutive segments should be treated as one:
 * - The first segment in the group is the "leader" — the AI fills this one.
 * - The remaining segments are "followers" — they get emptied automatically.
 * - Tab boundaries (<w:tab/>) act as separators: segments on different sides
 *   of a tab are NOT merged.
 *
 * Returns a map: leader segment ID → array of follower segment IDs.
 */
function computeMergeGroups(
  bodySegments: StructuredSegment[],
  processedXml?: string,
): Record<string, string[]> {
  const mergeGroups: Record<string, string[]> = {};
  const paraGroups = groupByParagraph(bodySegments);

  for (const group of paraGroups) {
    if (group.length <= 1) continue;

    if (processedXml && paragraphHasTabs(group, processedXml)) {
      // Split segments into sub-groups at tab boundaries
      const subGroups: StructuredSegment[][] = [];
      let currentSubGroup: StructuredSegment[] = [group[0]];

      for (let i = 1; i < group.length; i++) {
        if (hasTabBetween(group[i - 1], group[i], processedXml)) {
          subGroups.push(currentSubGroup);
          currentSubGroup = [group[i]];
        } else {
          currentSubGroup.push(group[i]);
        }
      }
      subGroups.push(currentSubGroup);

      // Each sub-group with >1 segment forms a merge group
      for (const subGroup of subGroups) {
        if (subGroup.length > 1) {
          const leader = subGroup[0].id;
          const followers = subGroup.slice(1).map(s => s.id);
          mergeGroups[leader] = followers;
        }
      }
    } else {
      // No tabs — entire paragraph group is one merge group
      const leader = group[0].id;
      const followers = group.slice(1).map(s => s.id);
      mergeGroups[leader] = followers;
    }
  }

  return mergeGroups;
}

// ==================== Template Map Builder ====================

/**
 * Build a compact text representation of the template structure for AI consumption.
 * Groups segments by their structural context (body paragraphs vs table rows).
 */
export function buildTemplateMap(
  segments: StructuredSegment[],
  tables: TableInfo[],
  processedXml?: string,
  mergeGroups?: Record<string, string[]>,
): string {
  const lines: string[] = [];

  // Build a set of all follower IDs for quick lookup
  const followerIds = new Set<string>();
  if (mergeGroups) {
    for (const followers of Object.values(mergeGroups)) {
      for (const fid of followers) followerIds.add(fid);
    }
  }

  // Body paragraphs
  const bodySegments = segments.filter(s => s.location.context === 'body');
  if (bodySegments.length > 0) {
    lines.push('--- Body Paragraphs ---');

    // Group by paragraph
    const paraGroups = groupByParagraph(bodySegments);
    for (const group of paraGroups) {
      const combinedText = group.map(s => s.text).join('');
      if (!combinedText.trim()) continue;

      if (mergeGroups && Object.keys(mergeGroups).length > 0) {
        // Use merge-aware rendering
        if (processedXml && group.length > 1 && paragraphHasTabs(group, processedXml)) {
          // Tab-separated paragraph: split into sub-groups at tab boundaries,
          // then show leader + combined text per sub-group
          const parts: string[] = [];
          const subGroups: StructuredSegment[][] = [];
          let currentSubGroup: StructuredSegment[] = [group[0]];

          for (let i = 1; i < group.length; i++) {
            if (hasTabBetween(group[i - 1], group[i], processedXml)) {
              subGroups.push(currentSubGroup);
              currentSubGroup = [group[i]];
            } else {
              currentSubGroup.push(group[i]);
            }
          }
          subGroups.push(currentSubGroup);

          for (let si = 0; si < subGroups.length; si++) {
            const sub = subGroups[si];
            const leader = sub[0];
            const subText = sub.map(s => s.text).join('');
            parts.push(`[${leader.id}] "${truncateText(subText, 40)}"`);
            if (si < subGroups.length - 1) {
              parts.push('[TAB]');
            }
          }
          lines.push(parts.join(' '));
        } else {
          // Non-tab paragraph: show leader ID + combined text
          const leader = group[0];
          lines.push(`[${leader.id}] "${truncateText(combinedText, 80)}"`);
        }
      } else {
        // Fallback: no merge groups (backwards compat)
        if (processedXml && group.length > 1 && paragraphHasTabs(group, processedXml)) {
          const parts: string[] = [];
          for (let i = 0; i < group.length; i++) {
            parts.push(`[${group[i].id}] "${truncateText(group[i].text, 40)}"`);
            if (i < group.length - 1 && hasTabBetween(group[i], group[i + 1], processedXml)) {
              parts.push('[TAB]');
            }
          }
          lines.push(parts.join(' '));
        } else {
          const ids = group.map(s => s.id).join(',');
          lines.push(`[${ids}] "${truncateText(combinedText, 80)}"`);
        }
      }
    }
    lines.push('');
  }

  // Tables
  for (const table of tables) {
    const tableSegs = segments.filter(
      s => s.location.context === 'table' && s.location.tableIndex === table.tableIndex
    );
    if (tableSegs.length === 0) continue;

    // Determine table dimensions
    const numRows = table.rows.length;
    const numCols = Math.max(...table.rows.map(r => r.cells.length), 0);

    // Try to identify the table purpose from first row content
    const firstRowText = table.rows[0]?.cells.map(c => c.text.trim()).filter(Boolean).join(' | ');
    const tableLabel = firstRowText ? ` [${truncateText(firstRowText, 40)}]` : '';

    lines.push(`--- Table ${table.tableIndex} (${numRows} rows x ${numCols} cols)${tableLabel} ---`);

    for (const row of table.rows) {
      const cellTexts: string[] = [];
      for (const cell of row.cells) {
        const cellSegs = tableSegs.filter(s =>
          s.location.rowIndex === row.rowIndex && s.location.cellIndex === cell.cellIndex
        );
        if (cellSegs.length === 0) {
          cellTexts.push('(empty)');
        } else {
          const ids = cellSegs.map(s => s.id).join(',');
          const text = cellSegs.map(s => s.text).join('');
          const displayText = text.trim() === ''
            ? '(placeholder - fill with content)'
            : truncateText(text.replace(/\n/g, '\\n'), 60);
          cellTexts.push(`[${ids}] "${displayText}"`);
        }
      }
      lines.push(`  Row ${row.rowIndex}: ${cellTexts.join(' | ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ==================== Apply Fills ====================

/**
 * Apply AI-generated fills back to the DOCX XML.
 * Operates on the raw XML using byte-position replacement in reverse order.
 *
 * `fills` is a map from segment ID ("s0", "s1") to the new text value.
 */
export function applyStructuredFills(
  docXml: string,
  fills: Record<string, string>,
  segments: StructuredSegment[],
  mergeGroups?: Record<string, string[]>,
): string {
  // Expand fills: when a leader segment has a fill, add empty fills for its followers
  const expandedFills = { ...fills };
  if (mergeGroups) {
    for (const [leaderId, followerIds] of Object.entries(mergeGroups)) {
      if (leaderId in expandedFills) {
        for (const fid of followerIds) {
          // Only auto-empty followers that the AI didn't explicitly fill
          if (!(fid in expandedFills)) {
            expandedFills[fid] = '';
          }
        }
      }
    }
  }

  // Build replacement list sorted by start position descending (reverse order)
  const replacements: { start: number; end: number; newXml: string }[] = [];

  for (const [segId, newText] of Object.entries(expandedFills)) {
    const seg = segments.find(s => s.id === segId);
    if (!seg) continue;

    const escapedText = escapeXml(newText);
    // Preserve the original <w:t> attributes (like xml:space="preserve")
    const attrMatch = seg.xmlText.match(/^<w:t([^>]*)>/);
    const attrs = attrMatch ? attrMatch[1] : '';
    // Ensure xml:space="preserve" is set for filled content
    const finalAttrs = attrs.includes('xml:space')
      ? attrs
      : ` xml:space="preserve"${attrs}`;
    const newXml = `<w:t${finalAttrs}>${escapedText}</w:t>`;

    replacements.push({ start: seg.start, end: seg.end, newXml });
  }

  // Sort by start position descending
  replacements.sort((a, b) => b.start - a.start);

  let result = docXml;
  for (const r of replacements) {
    result = result.substring(0, r.start) + r.newXml + result.substring(r.end);
  }

  return result;
}

// ==================== Helpers ====================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}

function findParentParagraphSimple(xml: string, pos: number): { start: number; end: number } | null {
  const before = xml.substring(0, pos);
  const pStart1 = before.lastIndexOf('<w:p>');
  const pStart2 = before.lastIndexOf('<w:p ');
  const pStart = Math.max(pStart1, pStart2);
  if (pStart === -1) return null;

  const pEnd = xml.indexOf('</w:p>', pos);
  if (pEnd === -1) return null;

  return { start: pStart, end: pEnd + '</w:p>'.length };
}

/**
 * Check if there is a <w:tab/> between two consecutive segments in the XML.
 */
function hasTabBetween(segA: StructuredSegment, segB: StructuredSegment, xml: string): boolean {
  const between = xml.substring(segA.end, segB.start);
  return between.includes('<w:tab/>') || between.includes('<w:tab />');
}

/**
 * Check if any <w:tab/> exists between consecutive segments in a paragraph group.
 */
function paragraphHasTabs(group: StructuredSegment[], xml: string): boolean {
  for (let i = 0; i < group.length - 1; i++) {
    if (hasTabBetween(group[i], group[i + 1], xml)) {
      return true;
    }
  }
  return false;
}

function groupByParagraph(segments: StructuredSegment[]): StructuredSegment[][] {
  const groups: StructuredSegment[][] = [];
  let currentGroup: StructuredSegment[] = [];
  let currentParaStart = -1;

  for (const seg of segments) {
    if (seg.location.paragraph.start !== currentParaStart) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [seg];
      currentParaStart = seg.location.paragraph.start;
    } else {
      currentGroup.push(seg);
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups;
}
