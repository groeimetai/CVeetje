/**
 * HTML → plain text extraction tuned for vacancy pages.
 *
 * We don't need a perfect article extractor — the LLM consumer is robust to
 * a bit of header/footer noise. What we need is: drop the obvious chrome
 * (scripts, styles, nav, forms, hidden elements), keep readable text,
 * normalize whitespace. Pure regex; no DOM library dependency.
 *
 * Quality signal: text length. <1500 chars after strip = page is likely
 * JS-rendered or behind a cookie wall, and the caller should fall back to
 * puppeteer.
 */

export interface ExtractedText {
  /** Cleaned plain-text body of the page. */
  text: string;
  /** Length in characters. */
  length: number;
  /** True if length is below the JS-rendered/wall threshold. */
  likelyJsRendered: boolean;
  /** Optional page title from <title>. */
  title: string | null;
  /**
   * Heuristic flag: the page looks like a bot-block / 403 / cookie wall /
   * authentication gate, not real vacancy content. Caller should treat as
   * crawl failure even if text length is non-zero.
   */
  looksBlocked: boolean;
}

const BLOCK_TITLE_PATTERNS = [
  /^toegang geweigerd/i,
  /^access denied/i,
  /^403\b/,
  /^request blocked/i,
  /^attention required/i,         // Cloudflare
  /^just a moment/i,              // Cloudflare challenge
  /^please verify you are a human/i,
  /^are you a human/i,
  /^bot detection/i,
];

const BLOCK_BODY_HINTS = [
  /toegang is geweigerd/i,
  /cloudflare ray id/i,
  /please complete the security check/i,
  /verify you are a human/i,
  /enable javascript and cookies/i,
];

function looksLikeBlockPage(title: string | null, text: string): boolean {
  if (title && BLOCK_TITLE_PATTERNS.some((p) => p.test(title))) return true;
  // Only check body hints if text is short — a real vacancy page might
  // legitimately mention "javascript" in tech stacks etc.
  if (text.length < 800 && BLOCK_BODY_HINTS.some((p) => p.test(text))) return true;
  return false;
}

const STRIP_BLOCK_TAGS = [
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'iframe',
  'object',
  'embed',
  'form',
  'header',
  'footer',
  'nav',
  'aside',
];

// Common cookie-banner / chrome class names. We strip elements whose class
// list contains these (regex match on the opening tag). Cheap heuristic; misses
// some but catches the obvious ones.
const STRIP_CLASS_PATTERNS = [
  /\bcookie[-_]?(?:banner|notice|bar|consent|wall)\b/i,
  /\bonetrust\b/i,
  /\bskip[-_]?(?:link|nav|to[-_]?content)\b/i,
];

const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
  '&laquo;': '«',
  '&raquo;': '»',
  '&euro;': '€',
};

function decodeEntities(s: string): string {
  let out = s.replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39|hellip|mdash|ndash|laquo|raquo|euro);/gi, (m) => HTML_ENTITIES[m.toLowerCase()] ?? m);
  out = out.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
  return out;
}

function stripBlockTag(html: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
  let prev = '';
  let cur = html;
  // Repeat to handle nested instances of the same tag.
  while (cur !== prev) {
    prev = cur;
    cur = cur.replace(re, ' ');
  }
  // Self-closing or unclosed tags (rare for these): also drop the standalone opener.
  return cur.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), ' ');
}

function stripByClassHeuristic(html: string): string {
  // Remove any element whose opening tag class attribute matches a strip pattern.
  // This is a coarse heuristic: we drop the opening tag through its matching
  // closing tag, but only for top-level <div>/<section>/<aside> wrappers (where
  // these classes typically live). Avoids over-stripping nested content.
  const wrappers = ['div', 'section', 'aside'];
  let cur = html;
  for (const w of wrappers) {
    const tagRe = new RegExp(`<${w}\\b[^>]*class=["']([^"']+)["'][^>]*>`, 'gi');
    let m: RegExpExecArray | null;
    const toCut: Array<{ start: number; end: number }> = [];
    while ((m = tagRe.exec(cur))) {
      const classAttr = m[1];
      if (!STRIP_CLASS_PATTERNS.some((p) => p.test(classAttr))) continue;
      // Find balanced close from m.index. Cheap approach: find next </w> tag.
      // (Doesn't handle nesting perfectly, but cookie banners rarely nest.)
      const closeRe = new RegExp(`<\\/${w}>`, 'gi');
      closeRe.lastIndex = m.index + m[0].length;
      const closeMatch = closeRe.exec(cur);
      if (!closeMatch) continue;
      toCut.push({ start: m.index, end: closeMatch.index + closeMatch[0].length });
    }
    // Apply cuts in reverse so indices remain valid.
    toCut.sort((a, b) => b.start - a.start);
    for (const { start, end } of toCut) {
      cur = cur.slice(0, start) + ' ' + cur.slice(end);
    }
  }
  return cur;
}

/**
 * Pull out a sensible plain-text body from raw HTML.
 *
 * The threshold for `likelyJsRendered` is 1500 chars — anything shorter is
 * almost certainly either a JS-redirect stub, a cookie wall, or a blank SPA
 * shell, and the caller should try the puppeteer path.
 */
export function extractText(html: string, opts: { minTextThreshold?: number } = {}): ExtractedText {
  const minThreshold = opts.minTextThreshold ?? 1500;

  // Grab title before we strip everything.
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].trim()).slice(0, 200) : null;

  let cleaned = html;
  // Strip comments first.
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, ' ');
  // Strip block junk.
  for (const tag of STRIP_BLOCK_TAGS) {
    cleaned = stripBlockTag(cleaned, tag);
  }
  // Strip elements with cookie-banner-like class names.
  cleaned = stripByClassHeuristic(cleaned);
  // Insert spaces around block-level tags to preserve word boundaries.
  cleaned = cleaned.replace(/<(?:br|hr|li|p|div|section|article|h[1-6])\b[^>]*>/gi, ' $& ');
  // Strip remaining tags.
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  // Decode entities.
  cleaned = decodeEntities(cleaned);
  // Normalize whitespace.
  cleaned = cleaned.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  const looksBlocked = looksLikeBlockPage(title, cleaned);

  return {
    text: cleaned,
    length: cleaned.length,
    likelyJsRendered: cleaned.length < minThreshold,
    title,
    looksBlocked,
  };
}
