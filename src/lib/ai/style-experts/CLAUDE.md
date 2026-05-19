# Style experts — `src/lib/ai/style-experts/` (LEGACY v1)

> ⚠️ **Legacy.** Nieuwe CVs gebruiken `src/lib/cv-engine/ai/orchestrator.ts` (`generateStyleTokensV2`). Deze folder blijft actief voor regen-paths van legacy v1 documenten (dispute-routes branchen op `engineVersion`).

## Eén expert per creativity-level

`conservative.ts`, `balanced.ts`, `creative.ts`, `experimental.ts`, `editorial-paper.ts`. Elk exporteert een `StyleExpert` object met `schema`, `buildPrompt`, `normalize`, `getFallback`, `preferredTemperature` (interface in `types.ts`).

`registry.ts` exporteert `getStyleExpert(level: StyleCreativityLevel): StyleExpert`. Caller: `style-generator-v2.ts` (`generateDesignTokens`).

`shared/` bevat gedeelde infrastructure (zie `src/lib/ai/style-experts/shared/CLAUDE.md`).

## Volledige routekaart

**`STYLE-SYSTEM.md`** in deze folder beschrijft per creativity-level: welke schema-velden, welke constraints, welke prompt-aanpak, history-rotatie, en welke renderer-archetypes welke tokens consumeren. Werk dat document bij wanneer je een expert wijzigt — de checklist staat onderaan §8.

## Patterns

- **Pure Zod schemas** — geen runtime dependencies behalve `zod` en `@/types`.
- **Variation/rotatie**: `shared/variation.ts` (`rotateLeastUsed`) houdt een history-array bij in de caller-state, voorkomt dat opeenvolgende generaties identieke tokens produceren.
- **Normalize fills defaults** — schema kan optional zijn; `normalize()` zet ontbrekende velden op de default uit `shared/normalize-base.ts`.
- **Fallback path**: bij LLM-error roept `style-generator-v2.ts` `expert.getFallback(ctx)` aan zodat de gebruiker nooit met "geen stijl" eindigt.

## Nieuwe creativity-level toevoegen

1. Voeg level toe aan `StyleCreativityLevel` union in `@/types` (`src/types/cv-style.ts`).
2. Maak `src/lib/ai/style-experts/<level>.ts` met een `StyleExpert` export.
3. Register in `registry.ts`.
4. Update `STYLE-SYSTEM.md` met de keuzes voor deze level.
5. Update `creativityConstraints` in `src/lib/cv/templates/themes.ts` (legacy renderer-config).
