/**
 * Token CSS — emits `:root` custom-property declarations from a ResolvedSpec.
 * The rest of the stylesheet (reset, primitives) references these vars.
 */

import type { ResolvedSpec } from '../resolve';
import { getFontPairing } from './fonts';
import { oklchToCSS } from './oklch';

const DENSITY: Record<
  'compact' | 'comfortable' | 'airy',
  { section: string; item: string; element: string; pageMargin: string; lineHeight: string }
> = {
  compact:     { section: '20pt', item: '10pt', element: '4pt', pageMargin: '14mm', lineHeight: '1.4' },
  comfortable: { section: '28pt', item: '14pt', element: '6pt', pageMargin: '18mm', lineHeight: '1.5' },
  airy:        { section: '40pt', item: '20pt', element: '8pt', pageMargin: '24mm', lineHeight: '1.65' },
};

export function tokensCSS(rs: ResolvedSpec): string {
  const font = getFontPairing(rs.fontPairing);
  const d = DENSITY[rs.spec.density];
  return `:root {
  --color-ink: ${oklchToCSS(rs.palette.ink)};
  --color-paper: ${oklchToCSS(rs.palette.paper)};
  --color-accent: ${oklchToCSS(rs.palette.accent)};
  --color-muted: ${oklchToCSS(rs.palette.muted)};
  --color-surface: ${oklchToCSS(rs.palette.surface)};

  --font-heading: ${font.heading.family};
  --font-body: ${font.body.family};

  --density-section-gap: ${d.section};
  --density-item-gap: ${d.item};
  --density-element-gap: ${d.element};
  --page-margin: ${d.pageMargin};
  --body-line-height: ${d.lineHeight};
}`;
}
