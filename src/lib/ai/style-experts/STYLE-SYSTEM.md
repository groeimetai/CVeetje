# Style System — volledige routekaart

> **Doel van dit document**: een volgende agent of ontwikkelaar moet hier alles vinden om te begrijpen wat de AI per creativity level krijgt aangereikt en wat de renderer er daadwerkelijk mee doet. Geen onderzoek meer hoeven herhalen.
>
> **Onderhoudsregel** (uit root `CLAUDE.md`): elke wijziging in een style-expert, het base-schema, een renderer, of de constraints/industry-profile maps moet hier worden bijgewerkt. Zie sectie "Wanneer bijwerken" onderaan.

## Inhoud

1. [Pipeline](#1-pipeline)
2. [Base schema — wat élke expert kan invullen](#2-base-schema--wat-élke-expert-kan-invullen)
3. [Industry style profile (cross-cutting)](#3-industry-style-profile-cross-cutting)
4. [Per route in detail](#4-per-route-in-detail)
   - 4.1 [`conservative`](#41-conservative)
   - 4.2 [`balanced`](#42-balanced)
   - 4.3 [`creative`](#43-creative)
   - 4.4 [`editorial-paper`](#44-editorial-paper)
   - 4.5 [`experimental`](#45-experimental)
5. [History-rotatie (rotateLeastUsed)](#5-history-rotatie-rotateleastused)
6. [Callers — waar generateDesignTokens vandaan komt](#6-callers--waar-generatedesigntokens-vandaan-komt)
7. [Bekende drivers van visuele convergentie](#7-bekende-drivers-van-visuele-convergentie)
8. [Wanneer dit document bijwerken](#8-wanneer-dit-document-bijwerken)

---

## 1. Pipeline

Eén orchestrator (`src/lib/ai/style-generator-v2.ts`) drijft alle 5 routes:

```
caller (/api/cv/style of /dispute)
  → generateDesignTokens(linkedInSummary, jobVacancy, provider, apiKey,
                         model, userPrefs, level, hasPhoto, styleHistory)
  → expert = getStyleExpert(level)            // src/lib/ai/style-experts/registry.ts
  → { system, user } = expert.buildPrompt(ctx)
  → generateObjectResilient(schema = expert.schema,
                            temperature = expert.preferredTemperature,
                            normalize = expert.normalize)
  → expert.normalize(raw, ctx)                // merge over fallback + history-rotatie
  → bij totale fail: expert.getFallback(industry)
```

`PromptContext` (`src/lib/ai/style-experts/types.ts`):

| Veld | Bron | Aanwezig bij dispute-routes? |
|---|---|---|
| `linkedInSummary` | `createLinkedInSummaryV2(linkedIn)` | ja |
| `jobVacancy` | request body | ja |
| `userPreferences` | request body, optioneel | ja |
| `hasPhoto` | request body | ja |
| `styleHistory` | Firestore `users/{uid}/cvs?limit=10` | **alleen in `/api/cv/style`**, niet in dispute-routes |

Output: één `CVDesignTokens` (`src/types/design-tokens.ts`) — gaat direct naar `generateCVHTML` (`src/lib/cv/html-generator.ts`), die delegeert naar `renderers/editorial.ts` (creative) of `renderers/bold.ts` (experimental) bij die levels.

---

## 2. Base schema — wat élke expert kan invullen

`src/lib/ai/style-experts/shared/base-schema.ts`. Alle velden `optional` op Zod-niveau — `normalize()` merget op een volledige fallback zodat downstream géén undefineds ziet.

| Categorie | Velden | Opties / type |
|---|---|---|
| Meta | `styleName`, `styleRationale`, `industryFit` | string |
| Theme | `themeBase` | `professional \| modern \| creative \| minimal \| bold` |
| Kleuren | `colors.{primary,secondary,accent,text,muted}` | hex string |
| Fonts | `fontPairing` | 12 paren (zie `themes.ts` `fontPairings`) |
| Typografie | `scale`, `spacing` | `small\|medium\|large`, `compact\|comfortable\|spacious` |
| Header | `headerVariant`, `headerGradient`, `headerFullBleed` | `simple\|accented\|banner\|split\|asymmetric`; `none\|subtle\|radial`; bool |
| Sectie­stijl | `sectionStyle` | `clean\|underlined\|boxed\|timeline\|accent-left\|card\|alternating\|magazine` |
| Skills | `skillsDisplay` | `tags\|list\|compact\|bars` |
| Layout | `headerVariant` (zie boven), `contactLayout` | — |
| Visueel | `showPhoto`, `useIcons`, `roundedCorners`, `borderRadius`, `decorations`, `accentStyle`, `nameStyle`, `skillTagStyle`, `pageBackground` | enums + bools |
| Volgorde | `sectionOrder[]` | array van section-namen |
| Beschrijving | `experienceDescriptionFormat` | `bullets\|paragraph` |

**Belangrijke renderer-quirk**: `headerVariant` en `sectionStyle` worden door de `bold` renderer (experimental) ge­negeerd voor alle archetypes behalve `sidebar-canva`. De editorial renderer (creative) heeft eigen primitives in het `editorial` sub-schema. Het base-schema is dus voor conservative/balanced/editorial-paper grotendeels het volledige verhaal; voor creative/experimental is het slechts de fundering en doen de sub-schemas het zware werk.

---

## 3. Industry style profile (cross-cutting)

`src/lib/cv/templates/themes.ts` `getIndustryStyleProfile(industry)` (regel ~783). Aangeroepen door `buildCommonUserPreamble` (`src/lib/ai/style-experts/shared/prompt-fragments.ts`) — geldt dus **voor élke expert die `buildCommonUserPreamble` gebruikt** (= alle 5).

Per industry een blok in de user-prompt:

```
INDUSTRY STYLE PROFILE — <label>
- Color direction: <colorMood>
- Decoration theme: <decorationTheme>  (geometric|organic|minimal|tech|creative|abstract)
- Font character: <fontCharacter>
- Preferred theme bases: <preferredThemes>
```

Industries die mapping kennen (partial substring match, case-insensitive):

| Trefwoorden | Label | Decoration | Preferred themes |
|---|---|---|---|
| tech, software, it, developer, engineer, data, ai, cloud, devops, saas | Technology / Software | tech | modern, creative |
| finance, bank, invest, fintech, accounting, audit, tax | Finance / Banking | minimal | professional, modern |
| ...overige... | zie `themes.ts:634` voor de volledige `industryProfiles` array | | |

> Industries die hier **niet** matchen krijgen geen profiel-blok in de prompt — AI valt dan terug op generieke directives uit de level-prompt. Belangrijk om in gedachten te houden bij debug van convergentie op niche-vacatures.

---

## 4. Per route in detail

Alle 5 routes geregistreerd in `src/lib/ai/style-experts/registry.ts`. `StyleCreativityLevel` type in `src/types/cv-style.ts`.

### 4.1 `conservative`

| Aspect | Waarde |
|---|---|
| Bestand | `src/lib/ai/style-experts/conservative.ts` (~137 regels) |
| Renderer | `html-generator.ts` (standaard) |
| Sub-schema | géén — alleen `baseDesignTokensSchema` |
| Temperatuur | default (laag) |
| `styleHistory` gebruikt? | nee (zie `style/route.ts:89` — enkel balanced/creative/experimental) |

**Constraints** (`creativityConstraints.conservative`, `themes.ts:472`):

| Constraint | Toegestaan |
|---|---|
| themes | `professional`, `minimal` |
| fonts | `inter-inter`, `roboto-roboto`, `lato-lato` |
| header | `simple`, `accented` |
| sections | `clean`, `underlined` |
| decorations | `none` |
| layout | `single-column` |
| nameStyle | `normal` |
| skillTagStyle | `filled` |
| accentStyle | `none` |
| borderRadius | `none`, `small` |

**Prompt-aanpak**: ATS-veilig, single-column, minimale styling. Geen variation-nudge, geen kleur-pools, geen avant-garde directives.

**Normalize**: standaard merge over fallback + `applyBaseValidations`. Geen `rotateLeastUsed` (niet zinvol; pools zijn te klein).

---

### 4.2 `balanced`

| Aspect | Waarde |
|---|---|
| Bestand | `src/lib/ai/style-experts/balanced.ts` (~383 regels) |
| Renderer | `html-generator.ts` (standaard) |
| Sub-schema | géén — alleen `baseDesignTokensSchema` |
| Temperatuur | default |
| `styleHistory` gebruikt? | **ja** |

**Constraints**:

| Constraint | Toegestaan |
|---|---|
| themes | `professional`, `modern`, `minimal` |
| fonts | `inter-inter`, `montserrat-open-sans`, `lato-lato`, `raleway-lato`, `playfair-inter` |
| header | `simple`, `accented`, `split` (split is balanced's eigen header) |
| sections | `clean`, `underlined`, `boxed`, `accent-left` |
| decorations | `none`, `minimal` |
| layout | `single-column` (sidebar verboden) |
| borderRadius | `none`, `small`, `medium` |
| accentStyle | `none`, `border-left` |
| nameStyle | `normal`, `uppercase` |
| skillTagStyle | `filled`, `outlined` |

**Prompt-aanpak**: één niveau speelser dan conservative, nog zakelijk. Geen sub-schema; AI tuned alleen base-velden.

**History-rotatie**: `headerVariant`, `sectionStyle`, `fontPairing`, `accentStyle` — getoond in `normalize()`.

---

### 4.3 `creative`

> **v4 (2026-05-15)**: concept-first + content-driven herontwerp, parallel aan experimental v4. AI schrijft eerst een editorial concept-statement (Kinfolk / Wallpaper / Gentlewoman / Frieze / Apartamento / Monocle / Cabinet / Tech-Review), kiest dán welke inhoud wordt uitgelicht (pullQuoteText, ledeText, dropCapLetter, nameTagline, accentKeywords, marginNoteCopy) en welke `paletteRule` het palet stuurt. Twee nieuwe archetypes: `cover-feature` en `index-card`. Backwards-compatible.

| Aspect | Waarde |
|---|---|
| Bestand | `src/lib/ai/style-experts/creative.ts` (~870 regels) |
| Renderer | **`src/lib/cv/renderers/editorial.ts`** (~2100 regels — 7 archetypes) |
| Sub-schema | `editorial` sub-object op tokens |
| Temperatuur | `0.9` |
| `styleHistory` gebruikt? | **ja** — ook in dispute-routes (sinds v4) |

**Base-constraints** (`creativityConstraints.creative`):

| Constraint | Toegestaan |
|---|---|
| themes | `modern`, `creative` |
| fonts | `playfair-inter`, `montserrat-open-sans`, `poppins-nunito`, `oswald-source-sans`, `dm-serif-dm-sans`, `space-grotesk-work-sans`, `libre-baskerville-source-sans` |
| header | `banner`, `asymmetric` (basis-schema; renderer negeert dit) |
| sections | `timeline`, `card`, `alternating`, `magazine` (idem) |
| decorations | `minimal`, `moderate` |
| layout | `sidebar-left`, `sidebar-right` (verplicht — uitzonderingen via archetype-default) |
| borderRadius | `small`, `medium`, `large` |
| nameStyle | `uppercase`, `extra-bold` |
| skillTagStyle | `outlined`, `pill` |

**Sub-schema `editorial`** (`creative.ts`):

**Concept-first (v4)** — AI vult deze eerst:

| Veld | Opties | Doel | Gebruikt door renderer? |
|---|---|---|---|
| `conceptStatement` | string (max 240 chars) | Een-zins editorial art-direction-brief | metadata (logged) |
| `conceptMotif` | `kinfolk`, `wallpaper`, `gentlewoman`, `frieze`, `apartamento`, `monocle`, `cabinet`, `tech-review` | Visuele wereld-shorthand | input voor rotation + bodyDensity-defaults |

**Content-driven primitives (v4)**:

| Veld | Type | Doel | Gebruikt door renderer? |
|---|---|---|---|
| `pullQuoteText` | string (max 240 chars) | De daadwerkelijke pull-quote tekst | ja — wint van afgeleid `experience[0].highlights[0]` |
| `pullQuoteAttribution` | string (max 80 chars) | Cite-line bij pull-quote | ja — wint van afgeleid `— title, company` |
| `dropCapLetter` | string (1 char) | Letter voor drop-cap | ja — wint van eerste letter; gerenderd als `<span class="drop-cap-glyph">` |
| `ledeText` | string (max 220 chars) | Opening-zin in display font | ja — wint van afgeleide eerste zin |
| `nameTagline` | string (max 80 chars) | Monocle-style tagline onder naam | ja — `<p class="name-tagline">` met separators |
| `accentKeywords` | string[] (3-7) | Highlights in body text | ja — `applyAccentHighlights` → `<mark class="editorial-accent-hit">` op summary + experience |
| `marginNoteCopy` | string[] (max 8) | Custom marginalia (1 per experience) | ja in editorial-spread met marginalia |

**Palette-rule (v4)**:

| Veld | Opties | Doel |
|---|---|---|
| `paletteRule` | `ink-and-paper`, `kinfolk-calm`, `literary-tritone`, `gallery-restraint`, `ochre-paper`, `modernist-clash`, `tri-warmth`, `tri-cool`, `riso-zine` | Stuurt AI naar coherent palet |

**Typografisch ritme (v4)**:

| Veld | Type | Default | Effect |
|---|---|---|---|
| `headingScaleRatio` | number 1.0–3.0 | archetype-bias (cover-feature: 2.4, asymmetric-feature: 2.0, manuscript-mono: 1.4, index-card: 1.3, anders 1.7) | CSS var `--e-heading-scale` |
| `bodyDensity` | `whisper`, `normal`, `airy` | motif-bias (kinfolk/gentlewoman: airy; cabinet/frieze: whisper) | CSS vars `--e-body-leading`, `--e-body-tracking` |
| `asymmetryStrength` | `none`, `subtle`, `considered` | motif-bias (wallpaper / asymmetric-feature: considered) | CSS var `--e-asym-offset` |

**Archetype + compositie** (legacy + v4):

| Veld | Opties |
|---|---|
| `layoutArchetype` | `magazine-column`, `editorial-spread`, `asymmetric-feature`, `feature-sidebar`, `manuscript-mono`, **`cover-feature`**, **`index-card`** |
| `colorPolicy` | `mono-accent`, `duotone`, `tritone` |
| `secondaryColor` | hex (afgeleid via `deriveSecondaryColor` als ongezet en tritone) |
| `decorElements` | array van max 4 uit 8 opties (zie schema) |
| `headerLayout` | `stacked`, `split`, `band`, `overlap` |
| `nameTreatment` | `oversized-serif`, `oversized-sans`, `uppercase-tracked`, `mixed-italic`, `condensed-impact` (font-pairing-aware) |
| `accentTreatment` | `thin-rule`, `vertical-bar`, `marker-highlight`, `ornament`, `number-prefix` |
| `sectionTreatment` | `numbered`, `kicker`, `sidenote`, `drop-cap`, `pull-quote` |
| `grid` | `asymmetric-60-40`, `asymmetric-70-30`, `full-bleed`, `manuscript`, `three-column-intro` |
| `divider` | `none`, `hairline`, `double-rule`, `ornament`, `whitespace-large` |
| `typographyScale` | `modest`, `editorial`, `hero` (legacy — v4 voegt continuous `headingScaleRatio` toe) |
| `sectionNumbering` | bool |

**Welke archetype consumeert welke v4 primitives**:

| Archetype | ledeText | pullQuote | dropCap | nameTagline | accentKeywords | marginNoteCopy | rhythm (scale/density/asym) |
|---|---|---|---|---|---|---|---|
| `magazine-column` | ja (first-line-emphasis) | ja | ja | ja | ja | — | ja |
| `editorial-spread` | ja | ja | — | ja | ja | **ja** | ja |
| `asymmetric-feature` | ja | ja | — | ja | ja | — | ja |
| `feature-sidebar` | ja | ja | — | ja | ja | — | ja |
| `manuscript-mono` | — | ja | **ja** | ja | ja | — | ja |
| **`cover-feature`** (v4) | ja | ja | — | **ja** (hero) | ja | — | **ja** (scale + asym-offset op naam) |
| **`index-card`** (v4) | — | — | — | ja | ja | — | ja (compacte schaal) |

**Renderer-helpers (v4)** (`editorial.ts`):

| Helper | Wat |
|---|---|
| `applyAccentHighlights(escapedText, keywords)` | Wraps accentKeywords matches in `<mark class="editorial-accent-hit">`. Longest-first, case-insensitive |
| `resolveDropCapLetter(aiChoice, sourceText)` | Picks `dropCapLetter` of valt terug op eerste letter |
| `bodyDensityValues(d)` | `{leading, tracking}` voor whisper/normal/airy |
| `asymmetryValues(a)` | `{offset}` voor none/subtle/considered |

**Prompt-aanpak**:
- 5-staps systeem-prompt (concept, content-elevation, archetype, palette+rhythm, decor)
- User-prompt heeft directe history-hint: laatste 3 archetype+motif+paletteRule combos met "DO NOT repeat"
- Variation-nudge per call met `pickFrom`
- Industry-routing: per sector specifiek motif + paletteRule + font advies

**Normalize**:
- merge AI output over `getContextualFallback(ctx)` met 4 paden: literaire rol → Gentlewoman cover-feature, corporate → Monocle editorial-spread, creative/loud → Wallpaper asymmetric-feature, minimal → Kinfolk manuscript-mono
- `validateAndFixEditorialTokens` valideert + vult v4 velden; font/nameTreatment compatibiliteit
- `secondaryColor` afgeleid via `deriveSecondaryColor` (HSL hue-shift) als tritone en ongezet
- `rotateLeastUsed` op alle string-velden inclusief `editorial.conceptMotif`, `editorial.paletteRule`, `editorial.bodyDensity`, `editorial.asymmetryStrength`

---

### 4.4 `editorial-paper`

| Aspect | Waarde |
|---|---|
| Bestand | `src/lib/ai/style-experts/editorial-paper.ts` (~161 regels) |
| Renderer | `html-generator.ts` (standaard) — géén eigen renderer |
| Sub-schema | géén — alleen `baseDesignTokensSchema` |
| Temperatuur | `0.3` (lager dan conservative voor brand-consistency) |
| `styleHistory` gebruikt? | **nee** (niet in `style/route.ts:89` whitelist) |

**Speciale eigenschap**: de **enige route met een hard-gecodeerd palet** (`BRAND_COLORS`, regel 29):
- primary: `#1a2540` (deep navy)
- secondary: `#f9f3e3` (cream tinted)
- accent: `#c2410c` (clay terracotta)
- text: `#1a1f3a`
- muted: `#7a7363`

`normalize()` forceert `accent`, `text`, `secondary` altijd terug naar brand-waarden (regel 117). Alleen `primary` en `muted` mag AI aanpassen.

**Constraints**:

| Constraint | Toegestaan |
|---|---|
| themes | `modern`, `creative` |
| fonts | `libre-baskerville-source-sans`, `dm-serif-dm-sans`, `playfair-inter` |
| header | `simple`, `split` |
| sections | `underlined`, `magazine` |
| decorations | `minimal` |
| layout | `single-column` |
| nameStyle | `normal` |
| skillTagStyle | `outlined`, `pill` |

**Prompt-aanpak**: meest opinionated. Expliciet "DO NOT pick banner/asymmetric/bright primaries/abundant decorations".

**History-rotatie**: `fontPairing`, `headerVariant`, `sectionStyle`.

---

### 4.5 `experimental`

> **v4 (2026-05-15)**: concept-first + content-driven herontwerp. AI schrijft eerst een art-direction-statement, kiest dán welk stuk content (poster-zin, accent-keywords, hero-numeral) wordt uitgelicht en welke palette-rule het palet stuurt. Twee nieuwe archetypes (`typographic-poster`, `photo-montage`). Vorige versies (v3) zijn nog backwards compatible — oude CV's renderen identiek.

| Aspect | Waarde |
|---|---|
| Bestand | `src/lib/ai/style-experts/experimental.ts` (~830 regels) |
| Renderer | **`src/lib/cv/renderers/bold.ts`** (~3800 regels — 9 archetypes) |
| Sub-schema | `bold` sub-object op tokens |
| Temperatuur | `1.2` (hoogste van alle experts) |
| `styleHistory` gebruikt? | **ja** — ook in dispute-routes (sinds v4) |

**Base-constraints**:

| Constraint | Toegestaan |
|---|---|
| themes | `creative`, `bold` |
| fonts | `playfair-inter`, `oswald-source-sans`, `dm-serif-dm-sans`, `space-grotesk-work-sans`, `libre-baskerville-source-sans`, `merriweather-source-sans` |
| header | `asymmetric` (één optie — base schema; `bold` renderer negeert dit voor niet-sidebar-canva archetypes) |
| sections | `alternating`, `magazine` (idem — genegeerd door bold renderer) |
| decorations | `moderate`, `abundant` |
| layout | `sidebar-left`, `sidebar-right` (forced naar `single-column` door normalize wanneer archetype niet `sidebar-canva` is) |
| borderRadius | `large`, `pill` |
| accentStyle | `border-left`, `background`, `quote` |
| nameStyle | `uppercase`, `extra-bold` |
| skillTagStyle | `outlined`, `pill` |

**Sub-schema `bold`** (`experimental.ts`):

**Concept-first (v4)** — AI vult deze eerst, daarna pas de rest:

| Veld | Opties | Doel | Gebruikt door renderer? |
|---|---|---|---|
| `conceptStatement` | string (max 240 chars) | Één-zins art-direction-brief; primt downstream-keuzes | gelogd in CSS-comment |
| `conceptMotif` | `archive`, `broadcast`, `manifesto`, `gallery`, `specimen`, `manuscript`, `protest`, `editorial` | Visuele wereld-shorthand | input voor rotation |

**Content-driven primitives (v4)** — AI kiest welke content wordt uitgelicht:

| Veld | Type | Doel | Gebruikt door renderer? |
|---|---|---|---|
| `posterLine` | string (max 160 chars) | Zin die poster-scale wordt | ja in manifesto / magazine-cover / editorial-inversion / typographic-poster / photo-montage — via `resolvePosterLine` |
| `posterLineSource` | `summary-first-sentence`, `summary-extract`, `role-title`, `invented-tagline` | Bron-tag | metadata + rotation |
| `accentKeywords` | string[] (3-7) | Woorden die accent-kleur krijgen in body text | ja — `applyAccentHighlights` wraps `<mark class="accent-hit">` |
| `heroNumeralValue` | string (max 12 chars) | Letterlijke inhoud van backgroundNumeral | ja — voorrang in `backgroundNumeralContent` |
| `nameTreatment` | `unified`, `first-name-dominant`, `last-name-dominant`, `stacked`, `separated-by-rule`, `first-letter-massive`, `inline-with-role` | Naam-typografie | ja — `renderNameMarkup` + `nameTreatmentCSS` |

**Typografisch ritme (v4)**:

| Veld | Type | Default | Effect |
|---|---|---|---|
| `headingScaleRatio` | number 1.0–4.0 | archetype-bias (typographic-poster: 2.6, manifesto: 2.6, brutalist-grid: 2.2, magazine-cover: 2.4, anders 1.8) | CSS var `--b-heading-scale` — schaalt alle heading sizes |
| `bodyDensity` | `whisper`, `normal`, `shout` | `normal` | CSS vars `--b-body-leading` + `--b-body-tracking` |
| `asymmetryStrength` | `none`, `subtle`, `strong`, `extreme` | archetype-bias | CSS vars `--b-asym-offset` + `--b-asym-rotation` (typographic-poster naam) |

**Palette-rule (v4)** — vervangt de 10 vaste palettes:

| Veld | Opties | Doel |
|---|---|---|
| `paletteRule` | `split-complement-clash`, `mono-with-scream`, `analog-warm`, `analog-cool`, `tri-clash`, `duo-riso`, `paper-and-ink`, `fluorescent-pop`, `museum-restraint` | Stuurt AI naar coherent palet; rotation-input |

> De 10 oude `avantGardePalettes` blijven bestaan maar alleen als **fallback**-referentie wanneer de AI-call faalt. Primaire route laat de AI zelf hex-waarden invullen onder een paletteRule.

**Archetype + compositie**:

| Veld | Opties | Doel | Gebruikt door renderer? |
|---|---|---|---|
| `layoutArchetype` | `sidebar-canva`, `manifesto`, `magazine-cover`, `editorial-inversion`, `brutalist-grid`, `vertical-rail`, `mosaic`, **`typographic-poster`**, **`photo-montage`** | Hele DOM-skelet (switch in `renderArchetypeBody`) | dispatcher |
| `columnCount` | `1\|2\|3\|4` | Grid-kolommen | ja in manifesto/brutalist-grid/mosaic |
| `backgroundNumeral` | `none`, `initials`, `year`, `section-number`, `role` | Reuzen-anker | ja — combineert met `heroNumeralValue` |
| `marginalia` | `none`, `vertical-strip`, `numbered`, `kicker-callouts` | Margin-annotaties | ja |
| `paletteSaturation` | `monochrome-plus-one`, `duotone`, `tri-tone`, `full-palette` | Aggressie palet | ja via `paletteSaturationCSS` |
| `manifestoOpener` | bool | Summary als poster-statement | ja in manifesto/magazine-cover/editorial-inversion/typographic-poster |
| `headerLayout` | `hero-band`, `split-photo`, `tiled`, `asymmetric-burst` | Header-compositie | **alleen `sidebar-canva`** |
| `sidebarStyle` | `solid-color`, `gradient`, `photo-hero`, `transparent` | Sidebar | **alleen `sidebar-canva`** |
| `skillStyle` | `bars-gradient`, `dots-rating`, `icon-tagged`, `colored-pills` | Skill-rendering | ja |
| `photoTreatment` | `circle-halo`, `squircle`, `color-overlay`, `badge-framed` | Foto-frame | ja |
| `accentShape` | `diagonal-stripe`, `angled-corner`, `colored-badge`, `hex-pattern` | Sectie-accent | ja |
| `iconTreatment` | `solid-filled`, `duotone`, `line-with-accent` | Contact-iconen | ja |
| `headingStyle` | `oversized-numbered`, `kicker-bar`, `gradient-text`, `bracketed`, `stacked-caps`, `overlap-block` | Sectietitels | ja |
| `gradientDirection` | `none`, `linear-vertical`, `linear-diagonal`, `radial-burst`, `duotone-split`, `offset-clash` | Gradient | ja |
| `surfaceTexture` | `none`, `halftone`, `riso-grain`, `screen-print`, `stripe-texture` | Overlay-textuur | ja — `getSurfaceTextureCSS` (geforceerd != none) |

**Avant-garde palettes** (`avantGardePalettes`, `experimental.ts:204-265`) — 10 stuks:

| Naam | Primary | Accent | Vibe |
|---|---|---|---|
| `riso-red-teal` | #d73838 | #1d8a99 | Toilet Paper magazine |
| `hot-pink-forest` | #e91e63 | #1b5e20 | Aries Moross |
| `mustard-plum` | #5a2442 | #d4a21a | Bauhaus reprint |
| `electric-violet-olive` | #6b21a8 | #6e7e3c | Stedelijk/MoMA PS1 |
| `sage-hot-coral` | #5b7a5c | #f96958 | Apartamento |
| `paper-bone-black-red` | #0f0f0f | #d9322b | Kruger / Vignelli |
| `navy-mustard-pink` | #1e2847 | #d6a42b | 1970s art-book |
| `terracotta-teal` | #b8613b | #155e63 | Centre Pompidou |
| `riso-pink-blue` | #ff3d7f | #2d5fff | Riso duotone |
| `black-neon-yellow` | #0a0a0a | #e8fc4a | Kunsthalle Basel |

**Pools `BOLD_POOLS`** (`experimental.ts:147`): per veld de toegestane waarden voor rotatie + nudges. **`sidebar-canva` is bewust uit `layoutArchetype` pool weggehouden** om bias naar de avant-garde archetypes te forceren; het schema staat het toe maar de pool trekt 'm niet terug.

**Prompt-aanpak**:
- System prompt is in 3 stappen opgebouwd: (1) Pick archetype, (2) Compositorische primitives, (3) Layered primitives. Plus referentielijst (MSCHF, Toilet Paper, Kruger, Carson, Saville, Stedelijk, Vignelli) en rejection-test.
- User prompt (`experimental.ts:561`) krijgt **per-call** een variation-nudge: random `pickFrom()` per veld geeft concrete suggestie ("try `bold.layoutArchetype` = manifesto, palette = …"). Industry-routing geeft suggestie voor welk idioom te spreken per sector.

**Normalize** (`experimental.ts:812`):
- merge AI output over `getContextualFallback(ctx)` (industry/role-signal-aware fallback — corporate/minimal → "Gallery Corporate", creative/loud → "Poster Experimental")
- `validateAndFixBoldTokens()`: onbekende values → `pickFrom(BOLD_POOLS.x)` (random per call)
- `surfaceTexture === 'none'` wordt geforceerd naar `riso-grain`
- archetype-consistency: niet-`sidebar-canva` → `layout='single-column'`, `sidebarSections=[]`
- `rotateLeastUsed` op alle string-velden in `bold.*` plus `fontPairing` (zie sectie 5)

**Fallbacks**:
- `getContextualFallback(ctx)` — leest signals uit `userPreferences` + industry; kiest preset
- `getFallback(industry)` — bij totale fail; default: archetype `manifesto` + `duotone` + `halftone` + `initials` + `oswald-source-sans`

**Renderer-architectuur** (`bold.ts`):

| Functie | Wat |
|---|---|
| `generateBoldHTML(content, tokens, ...)` | Public entry |
| `resolveBoldTokens(tokens)` | Bold-velden met defaults voor missende keys (incl. v4 velden) |
| `generateBoldCSS(tokens, b, fontConfig)` | Base CSS — kleuren, fonts, surface texture, **v4 vars** (`--b-heading-scale`, `--b-body-leading/tracking`, `--b-asym-*`) |
| `generateArchetypeCSS(b, tokens)` | Per-archetype CSS (manifestoCSS, magazineCoverCSS, editorialInversionCSS, brutalistGridCSS, verticalRailCSS, mosaicCSS, **typographicPosterCSS**, **photoMontageCSS**) |
| `renderArchetypeBody(archetype, ...)` | Switch op archetype — 9 cases |
| `renderSidebarCanva` | Legacy Canva-stijl: header + sidebar + main |
| `renderManifesto` | Oversized opener + statement + grid van secties |
| `renderMagazineCover` | Naam als cover headline boven, dense column eronder |
| `renderEditorialInversion` | Summary/lead boven, contact onder |
| `renderBrutalistGrid` | Hard N-koloms grid, bordered cellen |
| `renderVerticalRail` | Naam verticaal langs linkerrand |
| `renderMosaic` | Asymmetrische blokken-mozaïek |
| **`renderTypographicPoster`** (v4) | Type-only protest poster, geen foto. Naam vult bovenkant, posterLine als blockquote, secties als 2-kolom credits in small print |
| **`renderPhotoMontage`** (v4) | Portrait-dominant magazine cover. Foto bleeds 60%, info in 2-koloms cards eronder. Vereist foto (downgrade naar magazine-cover als geen foto) |

**v4 helpers (gedeeld over archetypes)**:

| Helper | Wat |
|---|---|
| `resolvePosterLine(aiChoice, summary, headline, fullName)` | Picks `b.posterLine` of valt terug op eerste summary-zin → headline → naam |
| `applyAccentHighlights(escapedText, keywords)` | Wraps `accentKeywords` matches in `<mark class="accent-hit">`. Longest-first, case-insensitive. Toegepast op summary + experience descriptions/highlights + poster-zinnen |
| `renderNameMarkup(fullName, treatment, headline?)` | Typeset naam volgens `nameTreatment` — 7 varianten |
| `nameTreatmentCSS()` | CSS voor alle 7 nameTreatment varianten + `mark.accent-hit` |
| `bodyDensityValues(d)` | `{leading, tracking}` voor whisper/normal/shout |
| `asymmetryValues(a)` | `{offset, rotation}` voor none/subtle/strong/extreme |
| `backgroundNumeralContent(style, name, content, heroNumeralValue?)` | v4: prefer literal `heroNumeralValue` boven afgeleide waarde |
| `renderCredits(label, entries, overrides, accentKeywords?)` | Compacte 2-koloms credit-style sectie (typographic-poster) |

**Welke `bold.*` velden komen per archetype tot leven**:

| Archetype | columnCount | bgNumeral | marginalia | paletteSat | manifestoOpener | headerLayout | sidebarStyle | skillStyle | photoTreatment | accentShape | iconTreatment | headingStyle | gradientDir | surfaceTexture | posterLine | accentKeywords | heroNumeralValue | nameTreatment | rhythm (scale/density/asym) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `sidebar-canva` | — | ja | ja | ja | — | **ja** | **ja** | ja | ja | ja | ja | ja | ja | ja | — | ja | ja | — | ja |
| `manifesto` | **ja** | ja | ja | ja | **ja** | — | — | ja | ja | ja | ja | ja | ja | ja | **ja** (statement) | ja | ja | — | ja |
| `magazine-cover` | — | ja | ja | ja | **ja** | — | — | ja | ja | ja | ja | ja | ja | ja | **ja** (headline) | ja | ja | **ja** | ja |
| `editorial-inversion` | — | ja | ja | ja | **ja** | — | — | ja | ja | ja | ja | ja | ja | ja | **ja** (lead) | ja | ja | — | ja |
| `brutalist-grid` | **ja** | ja | ja | ja | — | — | — | ja | ja | ja | ja | ja | ja | ja | — | ja | ja | — | ja |
| `vertical-rail` | — | ja | ja | ja | — | — | — | ja | ja | ja | ja | ja | ja | ja | — | ja | ja | — | ja |
| `mosaic` | **ja** | ja | ja | ja | — | — | — | ja | ja | ja | ja | ja | ja | ja | — | ja | ja | — | ja |
| **`typographic-poster`** (v4) | — | ja | — | ja | impliciet | — | — | als inline list | — (geen foto) | — | — | ja | ja | ja | **ja** (giant blockquote) | ja | ja | **ja** | **ja** (scale + asym op naam) |
| **`photo-montage`** (v4) | — | — | — | ja | impliciet | — | — | als card | — (foto bleeds) | — | — | ja | — | ja | **ja** (poster line onder cover) | ja | — | **ja** | ja (scale) |

> `headerLayout` + `sidebarStyle` worden door de AI gevraagd én door history geroteerd, maar zijn voor 6 van de 7 archetypes effectief dood gewicht.

---

## 5. History-rotatie (rotateLeastUsed)

`src/lib/ai/style-experts/shared/variation.ts`. Anti-convergentie-mechaniek.

**Hoe het werkt**:
1. `buildUsageCounts(history, trackedFields)` telt hoe vaak elke value voorkomt in de N laatste CV's
2. `pickLeastUsed(field, currentValue, counts, allowedValues)` — **alléén** roteren wanneer de huidige waarde gelijk is aan de max-count in history. Anders no-op.
3. Bij rotatie pickt het uit alle values met min-count (random tiebreaker).

**Gotchas**:
- Werkt op **string-velden** (`getAtPath` returnt enkel strings).
- **v4: `columnCount` rotereert nu wel** via custom number-rotatie (`rotateColumnCount` in `experimental.ts`), maar alleen voor archetypes die kolommen consumeren (manifesto / brutalist-grid / mosaic) en met archetype-specifieke allowed-lists (brutalist-grid mag niet 1 zijn).
- Lazy rotatie: bij 2-3 historische CV's met onderling verschillende values gebeurt er nooit een rotatie — alle counts zijn 1 = max. **v4 mitigeert dit voor experimental** met een directe history-hint in de user-prompt (zie §4.5 prompt-aanpak): de laatste 3 archetype+motif+paletteRule combinaties worden geciteerd met "DO NOT repeat" instructie. Dit werkt aanvullend op de lazy rotation.
- Géén rotatie als history leeg (length 0).
- **v4: dispute-routes laden nu wel `styleHistory`** (zie §6).

**Per expert getrackte velden**:

| Expert | Getrackte velden |
|---|---|
| `conservative` | — (geen rotatie) |
| `balanced` | `headerVariant`, `sectionStyle`, `fontPairing`, `accentStyle` |
| `creative` (v4) | `editorial.layoutArchetype`, `editorial.conceptMotif`, `editorial.paletteRule`, `editorial.colorPolicy`, `editorial.headerLayout`, `editorial.nameTreatment`, `editorial.sectionTreatment`, `editorial.grid`, `editorial.divider`, `editorial.accentTreatment`, `editorial.typographyScale`, `editorial.bodyDensity`, `editorial.asymmetryStrength`, `fontPairing` |
| `editorial-paper` | `fontPairing`, `headerVariant`, `sectionStyle` |
| `experimental` (v4) | `bold.layoutArchetype`, `bold.conceptMotif`, `bold.paletteRule`, `bold.nameTreatment`, `bold.bodyDensity`, `bold.asymmetryStrength`, `bold.backgroundNumeral`, `bold.marginalia`, `bold.paletteSaturation`, `bold.headerLayout`, `bold.sidebarStyle`, `bold.skillStyle`, `bold.headingStyle`, `bold.gradientDirection`, `bold.accentShape`, `bold.photoTreatment`, `bold.surfaceTexture`, `bold.posterLineSource`, `fontPairing` (+ `layout` wanneer archetype = `sidebar-canva`) **+ `bold.columnCount` via custom `rotateColumnCount` (numbers)** |

---

## 6. Callers — waar generateDesignTokens vandaan komt

| Route | `styleHistory` doorgegeven? | Variation-rotatie actief? |
|---|---|---|
| `src/app/api/cv/style/route.ts` | **ja** (lijn 88-100, alleen voor balanced/creative/experimental) | ja voor die levels |
| `src/app/api/cv/[id]/dispute/route.ts` | **ja (v4)** — laadt 10 recente CV's voor regen | ja |
| `src/app/api/admin/disputes/[userId]/[disputeId]/resolve/route.ts` | **ja (v4)** — laadt 10 recente CV's voor regen | ja |

Sinds v4 hebben dispute-regeneraties dezelfde anti-convergentie als reguliere style-generaties.

---

## 7. Bekende drivers van visuele convergentie

### 7a. Experimental — status per driver na v4 (2026-05-15)

1. **De renderer bezit de look, niet de AI.** Elk archetype heeft nog steeds een vast CSS-blok. **Gemitigeerd in v4** door (a) content-driven primitives die per CV verschillen ongeacht het archetype (posterLine, accentKeywords, heroNumeralValue, nameTreatment), (b) typografisch-ritme tokens (headingScaleRatio, bodyDensity, asymmetryStrength) die CSS-vars binnen het archetype shiften, en (c) 2 extra archetypes (typographic-poster, photo-montage). **Niet volledig opgelost** — twee `manifesto`-CV's met identieke posterLine + nameTreatment + ritme lijken nog steeds op elkaar.

2. **`columnCount` werd nooit geroteerd.** **Opgelost in v4** via `rotateColumnCount` met archetype-aware allowed-lists.

3. **`headerLayout`/`sidebarStyle` zijn dood gewicht voor 8/9 archetypes.** Niet opgelost — ze worden nog steeds gevraagd. **Gemitigeerd** doordat ze geen visueel effect hebben voor de andere archetypes, dus convergentie op die velden is harmless.

4. **History-rotatie is "lazy"**: alleen actief als huidige waarde >= max in history. **Gemitigeerd in v4** door de directe history-hint in de user-prompt — de laatste 3 archetype+motif+paletteRule combos worden geciteerd met "DO NOT repeat" instructie. Dit is veel sterker dan `rotateLeastUsed`.

5. **`styleHistory` ontbrak in dispute-routes.** **Opgelost in v4** — beide dispute-routes laden nu 10 recente CV's.

6. **De prompt-nudge mocht overrulen worden** en AI viel terug op industry-default. **Gemitigeerd in v4** door de concept-first stap: AI schrijft eerst `conceptStatement`, en de prompt zegt expliciet "everything downstream flows from this". Plus de DO-NOT-repeat hint dwingt afwijking van vorige combos.

7. **Content-driven primitives ontbraken.** **Opgelost in v4** — `posterLine` (welke zin wordt poster), `accentKeywords` (welke woorden krijgen accent), `heroNumeralValue` (welk getal/woord is de anchor), `nameTreatment` (hoe naam wordt typgezet), allemaal door AI gekozen op basis van actuele content.

8. **Geen branche-typisch iconen-/decoratievocabulaire.** Niet volledig opgelost — `decorationTheme` blijft 6 enums. **Gemitigeerd in v4** doordat `paletteRule` (9 opties) + `conceptMotif` (8 opties) + de industry-routing in de user-prompt branche-typische combinaties veel sterker sturen dan de oude vaste 10-palette pool.

### 7b. Creative — status per driver na v4 (2026-05-15)

Dezelfde structurele drivers als experimental, met gelijke mitigaties:

1. **Renderer bezit de look** (vaste CSS per archetype). **Gemitigeerd in v4** door content-driven primitives (pullQuoteText, ledeText, dropCapLetter, nameTagline, accentKeywords, marginNoteCopy) die per CV verschillen ongeacht het archetype, plus typografie-ritme (headingScaleRatio, bodyDensity, asymmetryStrength) en 2 nieuwe archetypes (cover-feature, index-card).

2. **History-rotatie was "lazy"** (alleen actief bij max-count). **Gemitigeerd in v4** door directe history-hint in user-prompt — laatste 3 archetype+motif+paletteRule combos worden geciteerd met "DO NOT repeat" instructie.

3. **`styleHistory` ontbrak in dispute-routes.** **Opgelost** sinds de experimental v4 fix — beide dispute-routes laden nu 10 recente CV's en geven die door aan álle expert-levels (incl. creative).

4. **AI viel terug op industry-default.** **Gemitigeerd in v4** door concept-first stap (conceptStatement primt downstream-keuzes) en DO-NOT-repeat hint.

5. **Content-driven primitives ontbraken** (AI koos shape, niet content). **Opgelost in v4** — pullQuoteText, ledeText, dropCapLetter, nameTagline, accentKeywords, marginNoteCopy zijn allemaal AI-keuzes op basis van actuele content.

6. **Palette uit fixed colorMoods pool.** **Opgelost in v4** — `paletteRule` (9 editorial-flavored regels) stuurt AI naar coherente palettes; AI vult zelf de hex-waarden in.

7. **`typographyScale` was discreet (3 opties).** **Aanvullend opgelost in v4** door continuous `headingScaleRatio` (1.0-3.0) bovenop de bestaande enum.

8. **Geen iconografisch / motif-vocabulaire per branche.** Niet volledig opgelost — `decorationTheme` is gedeeld met experimental. **Gemitigeerd** doordat `conceptMotif` (8 editorial-werelden) + `paletteRule` (9 regels) + industry-routing dezelfde rol spelen als bij experimental.

---

## 8. Wanneer dit document bijwerken

Werk dit bestand bij wanneer je één van deze dingen verandert:

| Wijziging | Te updaten sectie |
|---|---|
| Veld toevoegen/verwijderen in `base-schema.ts` | §2 |
| Veld toevoegen/verwijderen in een sub-schema (`editorialSchema`, `boldSchema`) | §4.3 / §4.5 tabel |
| Nieuwe `BoldLayoutArchetype` of `EditorialLayoutArchetype` | §4.5 / §4.3 + dispatcher-tabel §4.5 |
| Nieuw v4-veld op `BoldTokens` (`conceptStatement`, `posterLine`, `accentKeywords`, `heroNumeralValue`, `nameTreatment`, `headingScaleRatio`, `bodyDensity`, `asymmetryStrength`, `paletteRule`, `conceptMotif`, `posterLineSource`) | §4.5 concept/content/rhythm/palette tabellen + archetype-consumptie tabel |
| Nieuw v4-veld op `EditorialTokens` (`conceptStatement`, `conceptMotif`, `pullQuoteText`, `pullQuoteAttribution`, `dropCapLetter`, `ledeText`, `nameTagline`, `accentKeywords`, `marginNoteCopy`, `paletteRule`, `headingScaleRatio`, `bodyDensity`, `asymmetryStrength`) | §4.3 concept/content/rhythm/palette tabellen + archetype-consumptie tabel |
| Nieuwe creativity level (nieuwe expert + registry-entry) | nieuwe §4.x + §6 |
| Wijziging in `creativityConstraints` voor een level | constraints-tabel van betreffend level |
| Industry profile toevoegen in `themes.ts` `industryProfiles` | §3 |
| Wijziging in `rotateLeastUsed` mechaniek of `rotateColumnCount` | §5 |
| Caller toegevoegd/verwijderd voor `generateDesignTokens` | §6 |
| Nieuwe rendering-functie of helper in `bold.ts` (`applyAccentHighlights`, `renderNameMarkup`, `resolvePosterLine`, `renderCredits`, etc.) of `editorial.ts` | §4.5 renderer-tabel of §4.3 |
| Nieuwe avant-garde palette toegevoegd/verwijderd | §4.5 palettes-tabel |
| `styleHistory`-load logica in `/api/cv/style` of dispute-routes wijzigt | §6 |
| Verandering aan de prompt-history-hint (DO NOT repeat-blok) | §5 + §7 (driver #4) |
| Nieuwe convergence-driver geïdentificeerd of bestaande opgelost | §7 |

Vergeet niet ook de pointer in `src/lib/ai/CLAUDE.md` en `src/lib/cv/CLAUDE.md` bij te werken als de **vorm** van dit document verandert (nieuwe top-level secties, hernoemde anchors).

---

## Changelog

- **v4 creative (2026-05-15)** — Concept-first + content-driven redesign van creative, parallel aan experimental v4. Nieuwe `EditorialTokens` velden: `conceptStatement`, `conceptMotif`, `pullQuoteText`, `pullQuoteAttribution`, `dropCapLetter`, `ledeText`, `nameTagline`, `accentKeywords`, `marginNoteCopy`, `paletteRule`, `headingScaleRatio`, `bodyDensity`, `asymmetryStrength`. Nieuwe archetypes: `cover-feature`, `index-card`. Renderer past nu accent-keywords highlights toe op summary + experience body, en consumeert content-driven primitives (pullQuote/lede/dropCap/tagline/marginNote). Directe history-hint in user-prompt.
- **v4 experimental (2026-05-15)** — Concept-first + content-driven redesign van experimental. Nieuwe velden: `conceptStatement`, `conceptMotif`, `posterLine`, `posterLineSource`, `accentKeywords`, `heroNumeralValue`, `nameTreatment`, `headingScaleRatio`, `bodyDensity`, `asymmetryStrength`, `paletteRule`. Nieuwe archetypes: `typographic-poster`, `photo-montage`. `columnCount` rotereert nu (custom number-rotation). Dispute-routes laden `styleHistory`. Directe history-hint in user-prompt voor sterkere anti-convergentie.
- **v3** — Bold archetypes geïntroduceerd (`manifesto`, `magazine-cover`, `editorial-inversion`, `brutalist-grid`, `vertical-rail`, `mosaic`). Editorial sub-schema voor creative. `rotateLeastUsed` mechaniek.
