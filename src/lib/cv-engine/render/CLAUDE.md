# cv-engine render — `src/lib/cv-engine/render/`

Render-pipeline: content + tokens → HTML/CSS. Browser-safe; geen LLM-calls.

## Hoofdfiles

| Bestand | Doel |
|---|---|
| `compose.ts` | `composeCV(content, tokens, opts) → ComposeResult` — orchestreert resolve → shape-dispatch → primitive composition → CSS assembly. Re-exports `PageMode` (`'a4-paged'` / `'single-long'`). |
| `resolve.ts` | Combineert `recipe.spec` met user-tokens (en eventueel `paletteOverride`, tweaks) tot een `ResolvedSpec` — één bron van waarheid die door alle shape-renderers gelezen wordt. |
| `html.ts` | Klein HTML-shell builder (head + style block + body wrapper). |
| `labels.ts` | i18n-bewuste section-labels (`Werkervaring` / `Work Experience`, etc.). |

## Subfolders

- **`shapes/`** — één file per layout-archetype: `single-column.ts`, `sidebar.ts`, `editorial-grid.ts`, `poster.ts`. `composeCV` dispatcht op `spec.shape`. Elke shape iterateert `content.experience` / `.projects` / etc. in volgorde en delegeert aan primitives.
- **`primitives/`** — herbruikbare render-eenheden: `header.ts`, `section.ts`, `experience-item.ts`, `skill-list.ts`, `sidebar.ts`, `decorators.ts`. Variants gekozen via tokens — bijv. `header.variant: 'banner' | 'minimal' | 'editorial'`.
- **`css/`** — `reset.css.ts` (print-safe reset, `@page` config per `PageMode`), `tokens.css.ts` (CSS-vars uit ResolvedSpec), `primitives.css.ts` (per-primitive styles), `fonts.ts` (Google Fonts `<link>` URLs per `FontPairingId`), `oklch.ts` (OKLch clamping + fallback hex).

## Print-safe constraints

PDF wordt door Puppeteer gegenereerd uit dezelfde HTML als preview. **WYSIWYG fidelity** vereist:

- ❌ Geen `transform`, `clip-path`, `filter`, `mix-blend-mode` — Puppeteer print engine struikelt of negeert.
- ❌ Geen `:hover` styling die layout-shift veroorzaakt.
- ❌ Geen viewport-units (`vh`, `vw`) — gebruik `mm` of `pt`.
- ✅ Wel: flexbox, grid, `@page` size+margin, OKLch met hex fallback.
- ✅ Google Fonts via `<link>` tags (geïnjecteerd door `fonts.ts` op basis van gekozen `FontPairingId`) — geen `@font-face` met externe URLs (Puppeteer cachet anders dan browser).

Zie `reset.css.ts` voor de canonieke `@page` config per `PageMode`. **Single-long** mode geeft `@page { size: 210mm auto }` voor een doorlopende pagina zonder pagina-breaks.

## Patterns

- **Content blijft puur** — render leest `GeneratedCVContent` zoals het uit de AI komt. Geen content-mutaties hier; alleen presentatie.
- **Geen client-side state** — alle render-functies zijn pure (input → output string). Renderen kan zowel server-side (PDF) als client-side (preview) zonder verschil.
- **CSS-vars als bridge** tussen tokens en stylesheets — `tokens.css.ts` zet `--cv-accent: oklch(...)` zodat primitives generic kunnen blijven.

## Nieuwe shape toevoegen

1. Voeg shape-id toe aan `spec.ts` (`ShapeIdSchema`).
2. Maak `shapes/<shape>.ts` met `(spec, content, tokens) => string`.
3. Dispatch in `compose.ts`.
4. Update relevante recipes' `spec.ts` om de nieuwe shape te kunnen kiezen.
5. Test op alle 4 page-mode + content-size combinaties (kort/lang CV × a4-paged/single-long).
