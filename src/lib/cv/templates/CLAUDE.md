# Legacy style templates — `src/lib/cv/templates/` (LEGACY v1)

> ⚠️ **Legacy.** Style-tokens voor v1 documenten. Nieuwe CVs gebruiken v2 (`src/lib/cv-engine/`).

Style-infrastructure voor de v1 HTML-generator + bold/editorial renderers.

| Bestand | Doel |
|---|---|
| `index.ts` | Barrel + canonieke style-fetcher (`getStyleForTokens()` met design-tokens als input). |
| `base.css.ts` | Basis CSS reset + print rules voor v1. |
| `themes.ts` | `creativityConstraints` per `StyleCreativityLevel` — bepaalt welke v1-tokens binnen welke level toegestaan zijn. Caller: `style-experts` normalizers. |
| `decorations.ts` | Pure-CSS decoraties (borders, dividers, accent shapes) parametrized op tokens. Geen SVG-images. |
| `icons.ts` | Inline SVG icon set (contact info, social links). Inline omdat externe URLs in PDF-context flaky zijn. |
| `color-utils.ts` | HSL/RGB conversions, contrast helpers — gebruikt door themes + normalizers. |
| `adapter.ts` | **Brug v1 ↔ v2**: `tokensToStyleConfig(tokens)` + `styleConfigToTokens(config)`. Caller: de oude pages die `CVStyleConfig` lezen kunnen via deze adapter de nieuwe `CVDesignTokens` consumeren zonder breekwerk. |

## Patterns

- **`CVStyleConfig` is uitgefaseerd** voor nieuwe code; gebruik `CVDesignTokens` (uit `src/types/design-tokens.ts`). De adapter blijft bestaan zolang er v1 documenten in Firestore zitten.
- **Print-safety**: zelfde regels als v2 — geen transforms, geen viewport-units. Zie `src/lib/cv-engine/render/CLAUDE.md`.
- **Theme keuze**: `themes.ts` is descriptief, niet imperatief — het zegt "level X mag deze tokens kiezen", niet "level X kiest deze tokens". De expert in `src/lib/ai/style-experts/` doet de daadwerkelijke keuze.

## Nieuwe v1-token toevoegen

Niet doen tenzij strikt noodzakelijk voor bug-fix in een bestaand legacy document. Nieuw werk: v2-engine. Als het echt moet:
1. Voeg veld toe aan `CVStyleConfig` in `src/types/cv-style.ts`.
2. Update `themes.ts` met de constraints per creativity-level.
3. Update `adapter.ts` om de bridge naar `CVDesignTokens` te onderhouden.
4. Update de relevante style-expert(s) om het veld te genereren.
5. Update `STYLE-SYSTEM.md` met de nieuwe property.
