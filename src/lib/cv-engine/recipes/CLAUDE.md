# cv-engine recipes — `src/lib/cv-engine/recipes/`

Een "recipe" is één concrete visuele richting (een DesignSpec). De AI kiest er één per generatie via `orchestrator.ts`.

## Tier-folders

| Tier | Route | Recipes |
|---|---|---|
| `safe/` | `safe` | `clerk`, `monolith`, `plate` — minimaal, traditioneel, ATS-vriendelijk |
| `balanced/` | `balanced` | `grid`, `press`, `studio` — moderne layouts, lichte design accents |
| `creative/` | `creative` | `gentlewoman`, `kinfolk`, `wallpaper` — editorial inspiratie, typografisch eigen |
| `experimental/` | `experimental` | `broadcast`, `gallery`, `manifesto` — broeken-de-regels, statement design |

Elke recipe-folder bevat exact twee files:
- **`spec.ts`** — exporteert een `DesignSpec` object: shape, primitives, decorators, palette ranges (OKLch), font-pairing options.
- **`SKILL.md`** — vrije-tekst beschrijving die de AI te zien krijgt om te kiezen. Geen code; pure semantiek ("wanneer past deze recipe wel/niet").

## Bijzondere folders

- **`_vendor/`** — visuele referentie-materialen (afbeeldingen, HTML-snippets) waar recipes op gebaseerd zijn. Niet in de bundle — sluit aan voor designer-context.
- **`_visual-directions/`** — moodboards / direction-decks. Documentatie, niet code.

## Registry

`registry.ts` exporteert:
- `RECIPES` — bevroren map van alle recipes
- `getRecipeById(id)`, `listRecipesByRoute(route)`, `getAllRecipes()`, `getAllRecipeIds()`

Caller (`orchestrator.ts`) gebruikt `listRecipesByRoute` voor de shortlist die naar de AI gaat.

## Nieuwe recipe toevoegen

1. Maak `src/lib/cv-engine/recipes/<tier>/<id>/` folder.
2. Schrijf `spec.ts`: exporteer `DesignSpec` met shape, primitives, palette, fonts. Type komt uit `src/lib/cv-engine/spec.ts`.
3. Schrijf `SKILL.md`: 1-2 paragraaf wat de recipe wil zeggen, voor wie hij is, wanneer NIET kiezen.
4. Register in `registry.ts` — append in `RECIPES` map, key = `<tier>/<id>`.
5. Test door de creativity-level voor die route te draaien met meerdere `recipeUsageHistory` states, kijk of de AI hem überhaupt kiest (zo niet — SKILL.md is te zwak vs. de andere).
6. Update `STYLE-SYSTEM.md` als de recipe niet binnen het bestaande archetype past.

## Patterns

- **Recipe is data, niet code** — geen if-trees in `spec.ts`. Variatie komt uit het AI-keuze + decoratie-tokens, niet uit conditional rendering.
- **Print-safe**: alle recipes moeten WYSIWYG renderen in Puppeteer. Vermijd transforms / clip-path / shadows die print breken. Zie `src/lib/cv-engine/render/CLAUDE.md`.
- **OKLch palettes** met expliciete ranges — de AI mag binnen de range kiezen, fixe waarden raden we af (saaier én geeft minder variatie).
