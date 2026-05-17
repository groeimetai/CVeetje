# cv-engine — Recipe-based CV style engine (v2)

Vervangt de legacy `src/lib/cv/` + `src/lib/ai/style-experts/` style-pipeline. Geïnspireerd op + deels vendored uit [`nexu-io/open-design`](https://github.com/nexu-io/open-design) (Apache 2.0, zie `/NOTICE` + `cv-engine/NOTICE`).

> Voor de **legacy v1 routekaart** (style-experts, bold.ts, editorial.ts archetypes, v3/v4 convergence-drivers): zie `src/lib/ai/style-experts/STYLE-SYSTEM.md`.

## Core idee

| Concept | Wat het is |
|---|---|
| **Recipe** | Eén visual direction. Bestaat uit `SKILL.md` (open-design format, AI-prompt body) + `spec.ts` (typed DesignSpec voor renderer + UI). 12 recipes verdeeld over 4 routes. |
| **Route** | `safe \| balanced \| creative \| experimental` — mapping vanaf `StyleCreativityLevel` via `creativityLevelToRoute()`. (Legacy `editorial-paper` mapt naar `balanced` — palette zit in `balanced/press`.) |
| **Layout shape** | `single-column \| sidebar \| editorial-grid \| poster` — dispatcht naar 1 van 4 compose-functies. Recipe declareert welke shape het gebruikt. |
| **Primitive** | Kleine gemarkeerde regio's binnen een shape: header, section, skill-list, experience-item, sidebar. Elke primitive heeft N varianten — recipe kiest. |
| **Decorator** | Optionele content-driven extra's: drop-cap, pull-quote, marginalia, hero-numeral, poster-line. Recipe enabled true/false; AI levert de inhoud via `emphasis.*`. |
| **OKLch palette** | Per recipe 5 rollen (`ink`/`paper`/`accent`/`muted`/`surface`) met `anchor` + `range`. AI/UI mag binnen `range` tweaken; daarbuiten clamped. |

## Pipeline

```
caller (/api/cv/style of dispute route, source doc engineVersion === 'v2')
  → generateStyleTokensV2(input)                       [ai/orchestrator.ts]
      → creativityLevelToRoute(level)                  [ai/level-map.ts]
      → listRecipesByRoute(route)                      [recipes/registry.ts]
      → rankCandidates(…, history, industry)
      → composeSystemPrompt(layers)                    [ai/compose-system-prompt.ts]
          ↓ ports open-design's daemon stack pattern
      → generateObjectResilient({…, schema=AIOutputSchema})
      → normalizeTokens()                              [ai/normalize.ts]
      → CVStyleTokensV2 → caller → Firestore designTokens

renderer (cv-preview client-side, pdf server-side, dispatch.renderCV)
  → engineVersion === 'v2' ? composeCV() : legacy generateCVHTML()
  → composeCV()                                        [render/compose.ts]
      → resolve(spec, tokens)                          [render/resolve.ts]
      → tokensCSS + resetCSS + primitivesCSS + decoratorCSS
      → shape dispatch (single-column / sidebar / editorial-grid / poster)
      → { html, css }
```

## Folder map

```
src/lib/cv-engine/
├── spec.ts                  DesignSpec + Zod (OKLch tokens, route, layout shape, primitives, decorators, density)
├── tokens.ts                CVStyleTokensV2 + Zod (recipeId + emphasis + bounded overrides + pageMode)
├── dispatch.ts              renderCV() — routes v1 vs v2 via engineVersion
├── recipes/
│   ├── _vendor/             Verbatim SKILL.md copies from nexu-io/open-design (Apache 2.0, niet wijzigen)
│   ├── _visual-directions/  TS constants ported from open-design's 5 baselines (Phase 2+)
│   ├── parse.ts             (TODO Phase 2 server-side) SKILL.md frontmatter parser
│   ├── registry.ts          Static imports + typed map
│   ├── safe/{monolith,clerk,plate}/{SKILL.md, spec.ts}
│   ├── balanced/{studio,press,grid}/{SKILL.md, spec.ts}
│   ├── creative/{kinfolk,wallpaper,gentlewoman}/{SKILL.md, spec.ts}
│   └── experimental/{manifesto,gallery,broadcast}/{SKILL.md, spec.ts}
├── ai/
│   ├── orchestrator.ts          generateStyleTokensV2() — picks recipe + emphasis via LLM
│   ├── compose-system-prompt.ts Port van apps/daemon/src/prompts/system.ts (open-design Apache 2.0)
│   ├── normalize.ts             Clamps + validates AI output → CVStyleTokensV2
│   ├── level-map.ts             creativityLevelToRoute()
│   └── load-skill-body.ts       Server-side fs loader for SKILL.md body (AI prompt)
├── render/
│   ├── compose.ts               composeCV(content, tokens) → { html, css }
│   ├── resolve.ts               tokens + spec → ResolvedSpec
│   ├── shapes/{single-column,sidebar,editorial-grid,poster}.ts
│   ├── primitives/{header,section,skill-list,experience-item,sidebar,decorators}.ts
│   ├── primitives/header.ts     Photo support in header (single-column)
│   └── css/
│       ├── oklch.ts             oklchToCSS + clampOklch
│       ├── fonts.ts             Font pairing config + Google Fonts URLs (7 of 12 pairings live)
│       ├── reset.css.ts         Print-safe reset + pageMode-aware page surface
│       ├── tokens.css.ts        :root CSS vars from ResolvedSpec
│       └── primitives.css.ts    Per-variant CSS + shape CSS (sidebar/editorial-grid/poster)
├── NOTICE                       Per-vendored-file Apache 2.0 attribution
└── CLAUDE.md                    (this file)
```

## De 12 recipes

| Route | Recipe | Shape | Karakter | Source |
|---|---|---|---|---|
| safe | `monolith` | single-column | Inter, navy-blue accent, comma-prose skills | adapted from `_vendor/apple-hig` |
| safe | `clerk` | single-column | Libre Baskerville + Source Sans, navy on bone | adapted from `_vendor/digits-fintech-swiss-template` |
| safe | `plate` | single-column | Lato 900, warm bone, forest-green accent | original (Modern Minimal baseline) |
| balanced | `studio` | single-column | Inter, deep blue, kicker-rule, accent-rule signature | adapted from `_vendor/resume-modern` |
| balanced | `press` | single-column | Playfair + Inter, navy/cream/clay, accent-left summary | adapted from `_vendor/editorial-burgundy-principles-template` |
| balanced | `grid` | sidebar | DM Serif + DM Sans, accent-tinted left sidebar | original (Tech Utility baseline) |
| creative | `kinfolk` | single-column | Libre Baskerville + Source Sans, warm clay, drop-cap + pull-quote | adapted from `_vendor/field-notes-editorial-template` |
| creative | `gentlewoman` | single-column | Libre Baskerville, oxblood accent, paragraph experience | adapted from `_vendor/after-hours-editorial-template` |
| creative | `wallpaper` | editorial-grid | Space Grotesk + Work Sans, modernist marginalia | adapted from `_vendor/article-magazine` |
| experimental | `manifesto` | poster | Oswald hero, italic poster-line, dark credits below | adapted from `_vendor/poster-hero` |
| experimental | `gallery` | editorial-grid | Space Grotesk, fluorescent yellow accent | original (Brutalist baseline) |
| experimental | `broadcast` | sidebar | Oswald + Source Sans, **inverted** dark sidebar, dispatch-red accent | original (Tech Utility + dispatch palette) |

## Convergence-prevention

1. **Recipe-rotation** (`ai/orchestrator.ts:rankCandidates`): sort kandidaten asc op recent-use-count uit Firestore `users/{uid}/cvs?limit=10`. Geen lazy max-count-gate — least-used wint altijd.
2. **Industry-affinity is een set**: elke industry → minimaal 2 recipes; prompt biedt alle matches aan met `industry-fit` tag.
3. **AI uitvent geen colors/fonts vanaf nul**: alleen overrides binnen `recipe.palette.range` (clamped via `clampOklch`), font alleen uit `recipe.allowedFontPairings`.
4. **Content-driven emphasis** (v4-winst behouden): pull-quote tekst, accent-keywords, drop-cap letter, name-tagline, poster-line — twee CV's met dezelfde recipe verschillen via deze velden.

## pageMode

`tokens.pageMode === 'single-long'`: één doorlopende lange pagina, geen page-breaks. Default `'a4-paged'`. Per-render override mogelijk via `composeCV()`'s `pageMode` optie (PDF route mapt `'single-page'` → `'single-long'`).

## engineVersion routing — touchpoints

| File | Wat gebeurt er |
|---|---|
| `src/app/api/cv/style/route.ts:128` | Roept `generateStyleTokensV2`; doc krijgt `designTokens.engineVersion: 'v2'` |
| `src/app/api/cv/[id]/dispute/route.ts:regenerateCV` | Branch op source-doc `engineVersion` — v2 → cv-engine, v1 → legacy |
| `src/app/api/admin/disputes/.../resolve/route.ts` | Idem |
| `src/app/api/cv/[id]/tokens/route.ts:validateTokens` | Discriminator op `engineVersion` — accepteert beide schemas |
| `src/components/cv/cv-preview.tsx:cvHTML` | `renderCV()` via dispatch.ts |
| `src/lib/pdf/generator.ts` | Idem (pageMode mapping: `'single-page'` → `'single-long'`) |
| `src/components/cv/design-tweaks/design-tweaks-sheet.tsx` | Wrapper routet v1 / v2 sheets op tokens.engineVersion |

## Nieuw recipe toevoegen

1. Maak `src/lib/cv-engine/recipes/{route}/{name}/`
2. Schrijf `SKILL.md` met frontmatter (id, route, displayName, description, source, industryAffinity, layoutShape, palette OKLch ranges, allowedFontPairings, primitives, decorators, density) + body (AI-prompt brand voice + anti-patterns)
3. Schrijf `spec.ts` met dezelfde inhoud als typed `DesignSpec` (validated via `DesignSpecSchema.parse(raw)`)
4. Importeer in `recipes/registry.ts` + voeg toe aan `RECIPES` map
5. Render via `npx tsx scripts/render-recipe.mts {recipeId}` voor beide pageModes
6. Update industryAffinity zodat elke target-industry minimaal 2 recipe-matches heeft per route

## Wanneer dit document bijwerken

| Wijziging | Te updaten |
|---|---|
| Nieuw recipe of recipe weggehaald | Recipes-tabel + registry.ts |
| Nieuwe layout-shape | Folder map + shape table |
| Nieuw primitive of variant | Folder map + relevant section |
| Nieuwe decorator | Decorators sectie + render/primitives/decorators.ts |
| Nieuw veld in `DesignSpec` of `CVStyleTokensV2` | Folder map + spec.ts/tokens.ts mention |
| AI prompt-stack lagen wijzigen | Pipeline sectie + ai/compose-system-prompt.ts |
| engineVersion routing wijzigt | engineVersion routing tabel |
| Nieuwe font pairing | render/css/fonts.ts + relevant recipe `allowedFontPairings` |
| Nieuw vendored skill uit open-design | NOTICE + `_vendor/` + adapted recipe |
