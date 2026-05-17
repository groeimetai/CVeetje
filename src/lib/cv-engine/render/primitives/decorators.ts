/**
 * Decorator primitives — drop-cap, pull-quote, marginalia, hero-numeral,
 * poster-line. Each is opt-in per recipe via `decorators.{name} === true`,
 * with the actual content coming from `tokens.emphasis.*`.
 *
 * Phase 1 implements drop-cap + pull-quote (used by creative/kinfolk).
 * Phase 2 adds marginalia (creative/wallpaper) and poster-line + hero-numeral
 * (experimental/manifesto).
 */

import { applyAccentHighlights, escHtml } from '../html';

/** Wrap the first letter of `summaryText` (already-escaped) in a drop-cap
 *  span. If `letter` is supplied, that letter replaces the natural first
 *  letter (allowing AI/UI to pick a deliberate consonant). */
export function applyDropCap(summaryEscaped: string, letter?: string): string {
  // Find the first letter (skip leading whitespace / HTML tags from accent
  // highlights — accent-keywords almost never start at index 0 anyway).
  const match = summaryEscaped.match(/^(\s*)([A-Za-zÀ-ÿ])([\s\S]*)$/);
  if (!match) return summaryEscaped;
  const [, leading, firstLetter, rest] = match;
  const cap = letter ?? firstLetter;
  return `${leading}<span class="cv-drop-cap">${escHtml(cap)}</span>${rest}`;
}

/** Render the pull-quote block. AI fills `text` from
 *  `tokens.emphasis.pullQuoteText` (or the renderer falls back to
 *  experience[0].highlights[0] before calling this). */
export function renderPullQuote(text: string, attribution?: string, accentKeywords?: string[]): string {
  const body = applyAccentHighlights(escHtml(text), accentKeywords);
  const cite = attribution ? `<cite class="cv-pull-quote-cite">${escHtml(attribution)}</cite>` : '';
  return `<blockquote class="cv-pull-quote">
  <p class="cv-pull-quote-text">${body}</p>
  ${cite}
</blockquote>`;
}

/** CSS for the decorator primitives. Only emitted when the recipe enables
 *  the corresponding decorator. */
export function decoratorCSS(decorators: {
  dropCap: boolean;
  pullQuote: boolean;
  marginalia: boolean;
  heroNumeral: boolean;
  posterLine: boolean;
}): string {
  const parts: string[] = [];

  if (decorators.dropCap) {
    parts.push(`
.cv-drop-cap {
  font-family: var(--font-heading);
  float: left;
  font-size: 56pt;
  line-height: 0.85;
  font-weight: 700;
  color: var(--color-accent);
  padding: 6pt 8pt 0 0;
  margin-top: -2pt;
}
`);
  }

  if (decorators.pullQuote) {
    parts.push(`
.cv-pull-quote {
  margin: 18pt 0;
  padding: 14pt 0;
  border-top: 1px solid color-mix(in oklch, var(--color-accent) 50%, transparent);
  border-bottom: 1px solid color-mix(in oklch, var(--color-accent) 50%, transparent);
  text-align: center;
}
.cv-pull-quote-text {
  font-family: var(--font-heading);
  font-size: 17pt;
  font-weight: 400;
  font-style: italic;
  line-height: 1.3;
  color: var(--color-ink);
  letter-spacing: -0.01em;
  margin: 0;
}
.cv-pull-quote-cite {
  display: block;
  margin-top: 8pt;
  font-size: 8.5pt;
  font-style: normal;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--color-accent);
}
`);
  }

  // marginalia, heroNumeral, posterLine → Phase 2.

  return parts.join('\n');
}
