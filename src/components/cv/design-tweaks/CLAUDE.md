# Design tweaks — `src/components/cv/design-tweaks/`

Live tweak-panel in de preview-view: gebruiker schuift accent-kleur, spacing, font-pairing, etc. zonder een nieuwe AI-style call te triggeren.

| Bestand | Doel |
|---|---|
| `design-tweaks-sheet.tsx` | **v1** sheet — werkt op legacy `CVStyleConfig` (~150 properties, `src/types/cv-style.ts`). Alleen aktief voor CVs zonder `engineVersion: 'v2'`. |
| `design-tweaks-sheet-v2.tsx` | **v2** sheet — werkt op `CVDesignTokens` (`src/types/design-tokens.ts`) en de v2 engine-tokens (`CVStyleTokensV2` uit `src/lib/cv-engine/tokens.ts`). Dit is het actieve pad. |
| `controls.tsx` | Gedeelde control-primitives: `SliderControl`, `SelectControl`, `ColorControl`, `ToggleControl`. Stateless — emit `onChange` met de nieuwe token-waarde. |
| `tweak-schema.ts` | Declaratieve schema die definieert welke tokens tweakbaar zijn per shape/archetype. Voorkomt dat we voor elke v2 shape opnieuw conditional rendering schrijven. |

## Patterns

- **v1 vs v2 split**: de wrapper in `cv-preview.tsx` kiest de juiste sheet aan de hand van `designTokens.engineVersion`. Nooit beide laden — v2-only callers krijgen ook v2-only state-types.
- **Reset**: beide sheets lezen `cv.originalDesignTokens` als reset-target (de AI-baseline op het moment van generatie/regeneratie).
- **Live update**: tweaks gaan naar `PATCH /api/cv/[id]/tokens` (zie `src/app/api/CLAUDE.md`) — geen credit-aftrek, want geen LLM-call.
- **Geen** AI-call vanuit dit panel. Voor "AI maakt iets anders" → dispute-flow (`cv-dispute-dialog.tsx`).

## Nieuwe tweak toevoegen (v2)

1. Voeg de token toe in `src/lib/cv-engine/tokens.ts` (`CVStyleTokensV2Schema`).
2. Update `tweak-schema.ts` met de control-config (slider/select/color + per welke shape relevant).
3. Update `design-tweaks-sheet-v2.tsx` als de control niet in het schema-pattern past.
4. Update de render-pipeline (`src/lib/cv-engine/render/`) zodat de nieuwe token daadwerkelijk consumeerd wordt.
