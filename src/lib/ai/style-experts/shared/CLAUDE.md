# Style experts shared — `src/lib/ai/style-experts/shared/`

Gedeelde infrastructure voor de per-level style experts. Pure functies, geen state.

| Bestand | Doel |
|---|---|
| `base-schema.ts` | Zod-fragmenten die élke expert composeerd: kleur/font/layout/spacing primitives. Per-level expert breidt uit met level-specifieke fragmenten (bijv. `editorialSchema`, `boldSchema`). |
| `prompt-fragments.ts` | Herbruikbare prompt-blokken: vacancy-context, profile-context, sector-guidance. Hou deze in sync met de `cv-generator.ts` honesty rules — overlap is OK, conflict is een bug. |
| `font-directions.ts` | Per-mood font-pairing suggesties (serif/sans/mono mix). Caller injecteert in prompt zodat de AI uit een gerichte set kiest in plaats van vrij te freestylen. |
| `color-moods.ts` | Per-mood paletten (warm/cold/neutral/vibrant). |
| `linkedin-summary.ts` | `createLinkedInSummaryV2(linkedIn)` — compacte 1-paragraph summary voor token-generation. Beperkt tot top-3 ervaringen + top-10 skills om context-budget te sparen. **Niet** te verwarren met de volledige profile-dump in `cv-generator.ts`. |
| `normalize-base.ts` | Default-waardes voor elk gedeeld token. Caller's `normalize()` valt hierop terug per missing field. |
| `variation.ts` | `rotateLeastUsed(options, history)` — kiest een variant die de minste keren in `history` voorkomt. Voorkomt dat regenerate twee keer hetzelfde produceert. |

## Patterns

- **Geen LLM calls vanuit deze folder** — alles is data-prep. Calls leven in `style-generator-v2.ts`.
- **Browser-safe** — geen `node:*` imports. Cv-engine v2 hergebruikt sommige fragmenten in browser-context (preview rendering).
- **History-array** voor rotatie wordt door de caller bewaard (meestal user-doc of CV-doc); zie `creativityLevelHistory` op `CV` en hoe `dispute` ermee speelt.

## Wijzigingen die de volledige routekaart raken

Werk **`src/lib/ai/style-experts/STYLE-SYSTEM.md`** bij als je iets verandert aan: een sub-schema, `creativityConstraints`, de rotation-mechanic, of de caller in `style-generator-v2.ts`. Anders raakt de documentatie out of sync met wat de AI daadwerkelijk ziet.
