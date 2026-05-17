/**
 * DOCX run-normalization pre-pass.
 *
 * Word sometimes splits visually contiguous text across multiple <w:r> runs
 * even when the runs share identical formatting (revision history, font
 * autocorrect, copy-paste artifacts). Examples seen in the wild:
 *
 *   <w:r><w:rPr>…</w:rPr><w:t>20</w:t></w:r>
 *   <w:r><w:rPr>…</w:rPr><w:t>16</w:t></w:r>      ← together "2016"
 *   <w:r><w:rPr>…</w:rPr><w:t>-20</w:t></w:r>
 *   <w:r><w:rPr>…</w:rPr><w:t>21</w:t></w:r>      ← together "2016-2021"
 *
 * The AI fill flow sees these as four independent segments and ends up
 * writing partial values like "22", "24", "", "" → output "2224" instead
 * of "2022-2024". Merging adjacent same-style runs into one before
 * extraction lets the AI see the period as a single field.
 *
 * Safe by construction: only merges within one <w:p>, only when both runs
 * have IDENTICAL <w:rPr>…</w:rPr> (or both have none) AND both runs contain
 * exactly one <w:t> child with no other run-children (no breaks, no tabs,
 * no fields, no drawings). Anything more complex is left alone.
 */

const RUN_RE = /<w:r(\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
const PARA_OPEN_RE = /<w:p(\s[^>]*)?>/g;
const PARA_CLOSE_TAG = '</w:p>';

interface ParsedRun {
  rPr: string; // raw <w:rPr>...</w:rPr> or '' if absent
  text: string; // inner text of the single <w:t>
  textElemOpen: string; // exact opening tag, e.g. '<w:t xml:space="preserve">'
}

/**
 * Try to parse a run as "rPr + single <w:t>". Returns null when the run
 * contains anything else (tabs, breaks, fields, drawings, multiple <w:t>).
 */
function parseSimpleRun(runInner: string): ParsedRun | null {
  // Extract optional <w:rPr>...</w:rPr> at the start
  let rPr = '';
  let rest = runInner;
  const rPrMatch = runInner.match(/^\s*<w:rPr>[\s\S]*?<\/w:rPr>\s*/);
  if (rPrMatch) {
    rPr = rPrMatch[0].trim();
    rest = runInner.slice(rPrMatch[0].length);
  }
  rest = rest.trim();

  // Must be exactly one <w:t…>…</w:t>
  const tMatch = rest.match(/^(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)$/);
  if (!tMatch) return null;

  return { rPr, text: tMatch[2], textElemOpen: tMatch[1] };
}

/**
 * Merge adjacent simple runs with identical rPr inside one paragraph block.
 * Returns the modified paragraph XML (or the input unchanged if nothing merged).
 */
function mergeRunsInParagraph(paraXml: string): string {
  const runs: { full: string; parsed: ParsedRun | null; matchStart: number; matchEnd: number }[] = [];
  RUN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RUN_RE.exec(paraXml)) !== null) {
    const parsed = parseSimpleRun(m[2]);
    runs.push({
      full: m[0],
      parsed,
      matchStart: m.index,
      matchEnd: m.index + m[0].length,
    });
  }

  if (runs.length < 2) return paraXml;

  // Group adjacent simple runs with identical rPr.
  // Within a group, replace the first run's text with the concatenation and
  // mark the others for removal.
  const removeRanges: { start: number; end: number }[] = [];
  const replacements: { start: number; end: number; replacement: string }[] = [];

  let i = 0;
  while (i < runs.length) {
    const a = runs[i];
    if (!a.parsed) {
      i++;
      continue;
    }

    let j = i + 1;
    const mergedText: string[] = [a.parsed.text];
    while (j < runs.length) {
      const b = runs[j];
      if (!b.parsed) break;
      if (b.parsed.rPr !== a.parsed.rPr) break;
      mergedText.push(b.parsed.text);
      j++;
    }

    if (j > i + 1) {
      const combined = mergedText.join('');
      // Always declare xml:space="preserve" on merged text — combined text often contains
      // leading/trailing spaces that would otherwise be stripped by Word.
      const newRunInner = `${a.parsed.rPr}<w:t xml:space="preserve">${combined}</w:t>`;
      const newRun = `<w:r>${newRunInner}</w:r>`;
      replacements.push({ start: a.matchStart, end: a.matchEnd, replacement: newRun });
      for (let k = i + 1; k < j; k++) {
        removeRanges.push({ start: runs[k].matchStart, end: runs[k].matchEnd });
      }
    }
    i = j;
  }

  if (replacements.length === 0 && removeRanges.length === 0) return paraXml;

  // Apply edits in reverse order so earlier offsets stay valid.
  const allEdits = [
    ...replacements.map((r) => ({ ...r, type: 'replace' as const })),
    ...removeRanges.map((r) => ({ ...r, type: 'remove' as const, replacement: '' })),
  ].sort((a, b) => b.start - a.start);

  let result = paraXml;
  for (const edit of allEdits) {
    result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
  }
  return result;
}

/**
 * Walk every <w:p>…</w:p> in the document and run mergeRunsInParagraph on it.
 * Safe to call multiple times (idempotent for already-merged docs).
 */
export function mergeAdjacentRunsInDocument(docXml: string): string {
  PARA_OPEN_RE.lastIndex = 0;
  const paraRanges: { start: number; end: number }[] = [];

  let openMatch: RegExpExecArray | null;
  while ((openMatch = PARA_OPEN_RE.exec(docXml)) !== null) {
    const openStart = openMatch.index;
    const afterOpen = openMatch.index + openMatch[0].length;
    // Find matching </w:p>. Paragraphs cannot nest in OOXML, so a literal search is safe.
    const closeIdx = docXml.indexOf(PARA_CLOSE_TAG, afterOpen);
    if (closeIdx < 0) continue;
    const end = closeIdx + PARA_CLOSE_TAG.length;
    paraRanges.push({ start: openStart, end });
    PARA_OPEN_RE.lastIndex = end;
  }

  if (paraRanges.length === 0) return docXml;

  // Edit in reverse to preserve offsets.
  let result = docXml;
  for (let i = paraRanges.length - 1; i >= 0; i--) {
    const { start, end } = paraRanges[i];
    const para = result.slice(start, end);
    const merged = mergeRunsInParagraph(para);
    if (merged !== para) {
      result = result.slice(0, start) + merged + result.slice(end);
    }
  }
  return result;
}
