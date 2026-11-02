/** Minimal print-safe reset. No transforms, no clip-path, no hover. */

export type PageMode = 'a4-paged' | 'single-long';

export function resetCSS(pageMode: PageMode = 'a4-paged'): string {
  const pageHeight = pageMode === 'a4-paged'
    ? 'min-height: 297mm;'
    : '/* single-long: body grows to content height */';

  // a4-paged: lange CV's lopen over meerdere A4-pagina's. Zonder clone
  // begon pagina 2+ zonder marge bovenaan (content plakte tegen de rand) en
  // kregen koppen geen keep-with-next. box-decoration-break: clone herhaalt
  // padding + achtergrond per paginafragment (Chromium LayoutNG).
  const printBlock = pageMode === 'a4-paged'
    ? `@media print {
  html, body { width: 210mm; }
  @page { size: A4; margin: 0; }
  .cv-page {
    box-shadow: none;
    margin: 0;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  /* Shapes met padding op kolommen i.p.v. op .cv-page */
  .cv-shape-sidebar .cv-main,
  .cv-shape-sidebar .cv-sidebar,
  .cv-shape-editorial-grid,
  .cv-shape-poster {
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  .cv-section-title, .cv-section-kicker, h2, h3 { break-after: avoid; page-break-after: avoid; }
  li, .cv-item { break-inside: avoid; page-break-inside: avoid; }
  p { orphans: 3; widows: 3; }
}`
    : `@media print {
  html, body { width: 210mm; }
  @page { size: 210mm auto; margin: 0; }
  .cv-page { box-shadow: none; margin: 0; }
}`;

  return `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: var(--color-paper); color: var(--color-ink); }
body {
  font-family: var(--font-body);
  font-size: 10.5pt;
  line-height: var(--body-line-height);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-ink); font-weight: 600; }
p { margin: 0; }
ul, ol { list-style: none; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }

/* Page surface — single A4 sheet (a4-paged) or single tall page (single-long) */
.cv-page {
  width: 210mm;
  ${pageHeight}
  margin: 0 auto;
  padding: var(--page-margin);
  background: var(--color-paper);
  position: relative;
}

/* Signature top rule — a thin accent stripe at the very top of the page */
.cv-page::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4pt;
  background: var(--color-accent);
}

${printBlock}
`;
}
