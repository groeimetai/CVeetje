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
}

// ==================== Extraction ====================

/**
 * Find all non-overlapping occurrences of a tag pair in XML.
 * Returns { start, end } for each outermost match.
 * Uses a simple scan that handles nested tags of the same name.
 */
function findAllElements(xml: string, tagName: string): { start: number; end: number }[] {
  const results: { start: number; end: number }[] = [];
  const openPattern = new RegExp(`<${tagName}[\\s>/]`, 'g');
  const closeTag = `</${tagName}>`;

  let m: RegExpExecArray | null;
  while ((m = openPattern.exec(xml)) !== null) {
    // Check this isn't a self-closing tag
    const selfCloseCheck = xml.indexOf('/>', m.index);
    const nextClose = xml.indexOf('>', m.index);
    if (nextClose !== -1 && selfCloseCheck === nextClose - 1) {
      // Self-closing — skip
      continue;
    }

    let depth = 1;
    let pos = nextClose + 1;
    while (depth > 0 && pos < xml.length) {
      const nextOpen = xml.indexOf(`<${tagName}`, pos);
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
          results.push({ start: m.index, end: nextClosePos + closeTag.length });
        }
        pos = nextClosePos + closeTag.length;
      }
    }
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
  const segments: StructuredSegment[] = [];
  const tables: TableInfo[] = [];

  // Step 1: Find all tables
  const tableElements = findAllElements(docXml, 'w:tbl');
  const tableRanges = new Set<string>();

  for (let ti = 0; ti < tableElements.length; ti++) {
    const tbl = tableElements[ti];
    tableRanges.add(`${tbl.start}-${tbl.end}`);

    const tblSlice = docXml.substring(tbl.start, tbl.end);
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

      const rowSlice = docXml.substring(rowStart, rowEnd);
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
        const cellSlice = docXml.substring(cellStart, cellEnd);
        const paras = findParagraphs(docXml, cellStart, cellEnd);

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
  while ((wtMatch = wtRegex.exec(docXml)) !== null) {
    const absStart = wtMatch.index;
    const absEnd = absStart + wtMatch[0].length;

    // Skip if inside a table
    const inTable = tableElements.some(t => absStart >= t.start && absEnd <= t.end);
    if (inTable) continue;

    // Find parent paragraph
    const paraMatch = findParentParagraphSimple(docXml, absStart);
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

  const templateMap = buildTemplateMap(segments, tables);

  return { segments, tables, templateMap };
}

// ==================== Template Map Builder ====================

/**
 * Build a compact text representation of the template structure for AI consumption.
 * Groups segments by their structural context (body paragraphs vs table rows).
 */
export function buildTemplateMap(segments: StructuredSegment[], tables: TableInfo[]): string {
  const lines: string[] = [];

  // Body paragraphs
  const bodySegments = segments.filter(s => s.location.context === 'body');
  if (bodySegments.length > 0) {
    lines.push('--- Body Paragraphs ---');

    // Group by paragraph
    const paraGroups = groupByParagraph(bodySegments);
    for (const group of paraGroups) {
      const combinedText = group.map(s => s.text).join('');
      const ids = group.map(s => s.id).join(',');
      if (combinedText.trim()) {
        lines.push(`[${ids}] "${truncateText(combinedText, 80)}"`);
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
          cellTexts.push(`[${ids}] "${truncateText(text.replace(/\n/g, '\\n'), 60)}"`);
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
  segments: StructuredSegment[]
): string {
  // Build replacement list sorted by start position descending (reverse order)
  const replacements: { start: number; end: number; newXml: string }[] = [];

  for (const [segId, newText] of Object.entries(fills)) {
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
