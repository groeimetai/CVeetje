# cv-engine AI orchestrator — `src/lib/cv-engine/ai/`

V2 token-generation pipeline. Replaceer van de legacy v1 style-experts.

| Bestand | Doel |
|---|---|
| `orchestrator.ts` | `generateStyleTokensV2(input: OrchestratorInput): Promise<OrchestratorResult>` — kiest een recipe + emphasis (pull-quote, accent keywords) via één AI-call. Caller: `/api/cv/style-v2/route.ts`. |
| `compose-system-prompt.ts` | Bouwt de system prompt: recipe-shortlist (per route), creativity-level hints, output schema. Veranderingen hier hebben grote impact — test op alle creativity levels. |
| `level-map.ts` | Mapping van `StyleCreativityLevel` → `Route` (`safe` / `balanced` / `creative` / `experimental`). Route bepaalt welke recipes de AI mag kiezen. |
| `load-skill-body.ts` | Laadt de `SKILL.md` body uit `src/lib/cv-engine/recipes/<tier>/<id>/SKILL.md` — wordt aan de AI gegeven als beschrijving van wat de recipe doet. |
| `normalize.ts` | Post-AI normalisatie: clamp emphasis-arrays, vul defaults vanuit `spec.ts` van de gekozen recipe, valideer paletteOverride. |

## Flow

```
generateStyleTokensV2(input)
  ├─ recipes = listRecipesByRoute(levelMap[level])  // recipes/registry.ts
  ├─ promptBody = composeSystemPrompt(recipes, input.linkedInSummary, ...)
  ├─ { value } = generateObjectResilient({ schema: styleTokensV2Schema, ... })
  ├─ recipe = getRecipeById(value.recipeId)         // recipes/registry.ts
  └─ return normalize(value, recipe)                // → CVStyleTokensV2
```

## Patterns

- **Geen content-generatie** — alleen STYLE tokens. CV-content komt uit `src/lib/ai/cv-generator.ts`. De twee draaien onafhankelijk.
- **Recipe shortlist binden aan route**: een `safe` user krijgt alleen `safe/*` recipes te zien in de prompt, voorkomt dat de AI naar `experimental/manifesto` springt.
- **Convergentie-anti-pattern**: de AI heeft de neiging om altijd dezelfde recipe in een route te kiezen. `recipeUsageHistory` op user-doc voedt `rotateLeastUsed` (zie `style-experts/shared/CLAUDE.md`) zodat opeenvolgende generaties variëren.
- **Token-output is gegenereerd, niet gerenderd hier** — render pipeline staat in `../render/`.

## Nieuwe recipe toevoegen of orchestrator-prompt aanpassen

- Recipe toevoegen: zie `src/lib/cv-engine/recipes/CLAUDE.md`.
- Prompt-tweaks: pas `compose-system-prompt.ts` aan, test door `/api/cv/style-v2` aan te roepen met meerdere `creativityLevel` waarden en kijk of recipes nog gekozen worden waar je ze verwacht.
