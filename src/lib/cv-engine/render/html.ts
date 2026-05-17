/** HTML escaping helper. Browser-safe. */
export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Apply accent-keyword highlights inside an already-escaped string.
 *  Wraps case-insensitive substring matches in `<mark class="accent-hit">`.
 *  Longest keyword first to avoid partial-overlap surprises. Inputs MUST
 *  be HTML-escaped before being passed in. */
export function applyAccentHighlights(escapedText: string, keywords?: string[]): string {
  if (!keywords || keywords.length === 0) return escapedText;
  const sorted = [...keywords].filter(k => k.length >= 2).sort((a, b) => b.length - a.length);
  let out = escapedText;
  for (const k of sorted) {
    const escKey = escHtml(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(${escKey})`, 'gi'), '<mark class="accent-hit">$1</mark>');
  }
  return out;
}
