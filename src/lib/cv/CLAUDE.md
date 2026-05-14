# CV rendering — `src/lib/cv/`

HTML generation + style tokens + templates. **WYSIWYG single source of truth** voor preview én PDF.

## Hoofdentry

`html-generator.ts` → `generateCVHTML(content, tokens, ...)` produceert dezelfde HTML voor browser-preview én PDF-render. Delegeert naar specialized renderers bij `creative` en `experimental` levels.

Alle renderers zijn **print-safe**: geen transforms, clip-path, of hover-effects. `print-color-adjust: exact` zorgt dat saturated colors overleven in Puppeteer export.

## Renderers (`renderers/`)

| File | Doel |
|---|---|
| `editorial.ts` — `generateEditorialHTML(...)` | Creative-level: magazine layouts met drop caps, pull quotes, numbered sections |
| `bold.ts` — `generateBoldHTML(...)` | Experimental-level: Canva/Linear-style met sidebars, skill bars, gradients |

## Style system layers

Drie style-lagen co-existeren:

- **Legacy `CVStyleConfig`** (~150 properties) — kept for backward compatibility, bridged via `templates/adapter.ts`
- **Modern `CVDesignTokens`** (~20 properties) — `src/types/design-tokens.ts`. Inclusief nested `EditorialTokens` + `BoldTokens` voor advanced renderers.
- **Style experts** — `src/lib/ai/style-experts/` (zie `src/lib/ai/CLAUDE.md`)

## Templates (`templates/`)

| File | Exports |
|---|---|
| `index.ts` | Barrel — re-exports |
| `base.css.ts` | `getBaseCSS`, `getHeaderVariantCSS`, `getSectionStyleCSS`, `getSkillsDisplayCSS`, `getAccentStyleCSS`, `getNameStyleCSS`, `getSkillTagStyleCSS`, `getSidebarLayoutCSS`, `fullBleedPageCSS`, `cssVariables` |
| `themes.ts` | `fontPairings`, `typeScales`, `spacingScales`, `themeDefaults`, `creativityConstraints`, CSS-getters per dimensie, `getFontUrls`, `CreativityLevel` type |
| `decorations.ts` | `generateDecorationsHTML`, `decorationsCSS` — achtergrond per accent style |
| `icons.ts` | `contactIcons`, `contactIconsCSS` — inline SVG icons voor contact info |
| `color-utils.ts` | Color manipulation (brightness, contrast checks) |
| `adapter.ts` | `tokensToStyleConfig`, `styleConfigToTokens` — Legacy ↔ v2 bridge |

## Belangrijke patronen

- **Alle styling changes moeten zowel preview als PDF werken** — `html-generator.ts` is de bron, niet aparte CSS bestanden.
- Google Fonts worden via `<link>` tags in de gegenereerde HTML geladen (zie `getFontUrls`).
- Voor PDF compatibiliteit: geen `transform`, geen `clip-path`, geen `:hover`. Gebruik wel `print-color-adjust: exact`.
- Bij `creative`/`experimental` level moet je in de **renderer** zelf editen, niet in `html-generator.ts`.
- Nieuwe design token: type in `src/types/design-tokens.ts` + schema in relevante `style-experts/{level}.ts` + render in `html-generator.ts` of renderer.
