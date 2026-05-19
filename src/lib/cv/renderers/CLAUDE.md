# Legacy renderers — `src/lib/cv/renderers/` (LEGACY v1)

> ⚠️ **Legacy.** Nieuwe CVs renderen via `src/lib/cv-engine/render/`. Deze folder blijft actief voor legacy v1 documenten (CVs zonder `engineVersion: 'v2'` op `designTokens`).

Twee gespecialiseerde renderers naast de "standard" v1 HTML-generator (`src/lib/cv/html-generator.ts`):

| Bestand | Wanneer geactiveerd |
|---|---|
| `bold.ts` | `creativityLevel: 'experimental'` met `boldTokens` op `designTokens`. Statement-typografie, paginale grids. |
| `editorial.ts` | `creativityLevel: 'editorial-paper'` of `'creative'` met `editorialTokens`. Magazine-vibe, pullquotes, lede-text. |

Caller-dispatch: `src/lib/cv/render.ts` (parent folder) kiest tussen standard / bold / editorial op basis van tokens.

## Print-safe constraints

Zie `src/lib/cv-engine/render/CLAUDE.md` — dezelfde regels gelden. Geen `transform` / `clip-path` / `:hover` / viewport-units. Google Fonts via `<link>` (in de gegenereerde HTML head).

## Tokens

Renderers consumeren tokens uit twee bronnen:
- **`CVDesignTokens`** (zie `src/types/design-tokens.ts`) — gedeelde basis met v2.
- **`EditorialTokens`** / **`BoldTokens`** — gespecialiseerd. Aangeleverd door de respectieve style-experts (`creative.ts` / `editorial-paper.ts` / `experimental.ts`).

Welke specifieke token-velden welke renderer leest staat in **`src/lib/ai/style-experts/STYLE-SYSTEM.md`** §6.

## Geen nieuwe renderers hier

Voor nieuw werk: kies de v2-engine route (`src/lib/cv-engine/render/CLAUDE.md`). Deze folder bestaat alleen om legacy documenten correct te blijven renderen tijdens regenerate/dispute flows.
