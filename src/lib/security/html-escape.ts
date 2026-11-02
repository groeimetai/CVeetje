/**
 * Output-encoding helpers voor server-side gegenereerde HTML (PDF-renderers,
 * legacy CV-HTML, JSON-LD). Gebruik deze overal waar user-, AI- of
 * request-body-data in HTML/CSS/`<script>` belandt.
 */

/** Escape voor HTML-tekst en attribuutwaarden. */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC_COLOR = /^(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(\s*[-0-9.%\s,/a-z]*\)$/i;
const NAMED_COLOR = /^[a-z]{3,20}$/i;

/**
 * Laat alleen veilige CSS-kleurwaarden door (hex, rgb()/hsl()/oklch()…,
 * named colors). Alles met `;`, `"`, `<`, `{`, `}` etc. valt terug op de
 * fallback, zodat een kleurwaarde nooit uit een style-attribuut of
 * `<style>`-blok kan breken.
 */
export function sanitizeCssColor(input: unknown, fallback = 'inherit'): string {
  if (typeof input !== 'string') return fallback;
  const v = input.trim();
  if (v.length === 0 || v.length > 64) return fallback;
  if (HEX_COLOR.test(v) || FUNC_COLOR.test(v) || NAMED_COLOR.test(v)) return v;
  return fallback;
}

/**
 * JSON-serialisatie die veilig in een inline `<script>` kan (JSON-LD of JS).
 * Escapet `<`, `>`, `&` en U+2028/2029 zodat `</script>` niet kan uitbreken.
 */
export function jsonForScript(value: unknown): string {
  return (JSON.stringify(value) ?? 'null')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Geeft de URL terug als het een http(s)-URL is, anders null (geen `javascript:`). */
export function safeHttpUrl(input: unknown): string | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  try {
    const u = new URL(input.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
