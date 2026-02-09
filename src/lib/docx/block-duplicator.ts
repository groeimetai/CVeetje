/**
 * Universal block duplicator for DOCX templates.
 *
 * Clones repeating blocks (table rows or paragraph groups) so the template
 * has enough slots for all profile entries. Works with:
 * - Table-based templates: clones <w:tr> elements
 * - Paragraph-based templates: clones <w:p> groups
 *
 * All operations happen in reverse document order to keep byte offsets valid.
 */

import type { TemplateBlueprint } from '@/lib/ai/template-analyzer';
import type { StructuredSegment, TableInfo } from './structure-extractor';

export interface DuplicationResult {
  xml: string;
  duplicated: boolean;
  details: string[];
}

/**
 * Duplicate repeating blocks in the document XML based on the AI blueprint
 * and the actual profile entry counts.
 *
 * Handles both table rows and paragraph groups by extracting block XML
 * at the byte positions identified by the blueprint segments.
 */
export function duplicateBlocksInXml(
  docXml: string,
  blueprint: TemplateBlueprint,
  segments: StructuredSegment[],
  tables: TableInfo[],
  profileCounts: { workExperience: number; education: number },
): DuplicationResult {
  const details: string[] = [];
  let result = docXml;
  let duplicated = false;

  // Collect all duplication operations
  const operations: { insertAfter: number; blockStart: number; blockEnd: number; count: number; type: string }[] = [];

  for (const block of blueprint.repeatingBlocks) {
    const targetCount = block.sectionType === 'work_experience'
      ? profileCounts.workExperience
      : block.sectionType === 'education'
        ? profileCounts.education
        : 0;

    if (targetCount <= 0) continue;

    const currentCount = block.instances.length;
    if (currentCount >= targetCount) {
      details.push(`${block.sectionType}: ${currentCount} slots >= ${targetCount} needed`);
      continue;
    }

    const additionalNeeded = targetCount - currentCount;

    // Find the last instance's segment range
    const lastInstance = block.instances[block.instances.length - 1];
    const lastSegIds = new Set(lastInstance.segmentIds);
    const lastSegs = segments.filter(s => lastSegIds.has(s.id));
    if (lastSegs.length === 0) continue;

    let blockStart: number;
    let blockEnd: number;

    if (block.blockType === 'table_rows') {
      // Find table rows for this instance
      const tableIndex = lastSegs[0].location.tableIndex;
      if (tableIndex === undefined) continue;

      const table = tables.find(t => t.tableIndex === tableIndex);
      if (!table) continue;

      const rowIndices = new Set<number>();
      for (const seg of lastSegs) {
        if (seg.location.rowIndex !== undefined) {
          rowIndices.add(seg.location.rowIndex);
        }
      }

      const sortedRows = [...rowIndices].sort((a, b) => a - b);
      const rows = table.rows.filter(r => sortedRows.includes(r.rowIndex));
      if (rows.length === 0) continue;

      blockStart = rows[0].start;
      blockEnd = rows[rows.length - 1].end;
    } else {
      // Paragraph groups
      const paraStarts = lastSegs.map(s => s.location.paragraph.start);
      const paraEnds = lastSegs.map(s => s.location.paragraph.end);

      blockStart = Math.min(...paraStarts);
      blockEnd = Math.max(...paraEnds);
    }

    if (blockStart >= blockEnd) continue;

    operations.push({
      insertAfter: blockEnd,
      blockStart,
      blockEnd,
      count: additionalNeeded,
      type: block.blockType,
    });

    details.push(`${block.sectionType}: duplicating ${additionalNeeded} ${block.blockType} (${currentCount} -> ${targetCount})`);
  }

  // Sort by position descending (reverse order)
  operations.sort((a, b) => b.insertAfter - a.insertAfter);

  for (const op of operations) {
    const blockXml = result.substring(op.blockStart, op.blockEnd);
    const spacer = op.type === 'paragraph_group' ? '<w:p></w:p>' : '';

    let insertXml = '';
    for (let i = 0; i < op.count; i++) {
      insertXml += spacer + blockXml;
    }

    result = result.substring(0, op.insertAfter) + insertXml + result.substring(op.insertAfter);
    duplicated = true;
  }

  return { xml: result, duplicated, details };
}
