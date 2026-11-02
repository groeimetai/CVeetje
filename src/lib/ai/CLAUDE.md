# AI — `src/lib/ai/`

Alle AI-aanroepen. Vercel AI SDK (`ai` v6, `generateObject`/`streamText`) + Zod schemas.

## Provider plumbing

| File | Exports |
|---|---|
| `providers.ts` | `createAIProvider(providerId, apiKey)` — multi-provider factory (OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek, Fireworks, Together, Azure). `getModelId(providerId, modelName)`. |
| `platform-provider.ts` | `resolveProvider({ userId, operation })` — **single source of truth** voor BYOK + credit-handling. **Niet dupliceren.** `chargePlatformCredits(userId, amount, operation)` — manuele aftrek voor character-based billing (cv-chat). |
| `platform-config.ts` | `PlatformOperation` enum + `PLATFORM_CREDIT_COSTS` + `PLATFORM_MODEL` |
| `platform-config-reader.ts` | Leest platform-config uit Firestore (override van defaults) |
| `models-registry.ts` | Dynamische model-lijst per provider + `findModelInProviders` |
| `retry.ts` | `withRetry(fn)` voor flaky calls |
| `generate-resilient.ts` | `generateObjectResilient(...)` — `generateObject` wrapper met retries + Anthropic Opus 4.6 fallback bij empty / `{data:...}`-wrapped responses |
| `temperature.ts` | `resolveTemperature(...)` — omgaan met models die geen temperature accepteren |
| `date-context.ts` | Current-date strings voor prompts |

## Content generators

| File | Functie | Doel |
|---|---|---|
| `cv-generator.ts` | `generateCV(...)` | CV-content (summary, experience, education, skills) met inline `honestyRules`, `getIndustryGuidance()`, `languageInstructions` |
| `humanizer.ts` | `humanizeMotivationLetter(...)` | **Tweede LLM-pass** die AI tells uit motivatiebrief verwijdert (significance inflation, em-dash overuse, rule-of-three patterns). Gebaseerd op Wikipedia's "Signs of AI writing" guide. |
| `motivation-generator.ts` | `generateMotivationLetter(...)`, `formatFullLetter(...)` | Cover letter (opening, whyCompany, whyMe, motivation, closing) + post-processing met datum/aanhef/closing |
| `job-parser.ts` | `parseJobVacancy(rawText, ...)` | Vacancy text → `JobVacancy` |
| `fit-analyzer.ts` | `analyzeFit(linkedIn, jobVacancy, ...)` | Profile vs vacancy match-score + verdict + advice. UI helpers `getVerdictColor`, `getSeverityColor`. |
| `dispute-gatekeeper.ts` | `runDisputeGatekeeper(...)` | LLM-judge: `{ verdict: 'approved'\|'rejected', rationale }` |

## Style system (`style-experts/`) — LEGACY v1

> ⚠️ **Legacy.** Nieuwe CV-generaties gebruiken `src/lib/cv-engine/ai/orchestrator.ts` (`generateStyleTokensV2`). De style-experts hier blijven actief voor regen-paths van legacy v1 docs (dispute-routes branchen op source `engineVersion`).
>
> Voor de nieuwe routekaart: zie **`src/lib/cv-engine/CLAUDE.md`**.

> **Volledige legacy routekaart per creativity level** — wat de AI per route krijgt aangereikt, welke tools (tokens), welke renderer-quirks, en bekende convergentie-drivers: zie **`src/lib/ai/style-experts/STYLE-SYSTEM.md`**.

Folder-overzicht + nieuw-expert checklist: zie **`src/lib/ai/style-experts/CLAUDE.md`** en **`src/lib/ai/style-experts/shared/CLAUDE.md`**.

Een expert per `StyleCreativityLevel` (`conservative`, `balanced`, `creative`, `experimental`, `editorial-paper`). Elk implementeert `StyleExpert` interface (`schema`, `buildPrompt`, `normalize`, `getFallback`, `preferredTemperature`).

Orchestrator (`generateDesignTokens` in `style-generator-v2.ts`) zoekt expert op via `getStyleExpert(level)`, roept dan `expert.buildPrompt` + `generateObjectResilient` + `expert.normalize` aan, fallback naar `expert.getFallback`.

| File | Doel |
|---|---|
| `style-generator-v2.ts` | Orchestrator. `generateDesignTokens(...)`, `createLinkedInSummaryV2(linkedIn)` (korte summary voor token generation) |
| `style-experts/registry.ts` | `getStyleExpert(level)` lookup |
| `style-experts/types.ts` | `StyleExpert` interface, `PromptContext`, `BuiltPrompt` |
| `style-experts/{conservative,balanced,creative,experimental}.ts` | Per-level expert |
| `style-experts/shared/base-schema.ts` | Gedeelde Zod-fragmenten |
| `style-experts/shared/prompt-fragments.ts` | Herbruikbare prompt-blokken |
| `style-experts/shared/font-directions.ts`, `color-moods.ts` | Per-mood helpers |
| `style-experts/shared/linkedin-summary.ts` | Compacte profile summary |
| `style-experts/shared/normalize-base.ts` | Token-normalisatie met defaults |
| `style-experts/shared/variation.ts` | Rotation-logic — voorkomt dat opeenvolgende generaties hetzelfde produceren |

## Template AI (DOCX)

| File | Doel |
|---|---|
| `template-analyzer.ts` | `analyzeTemplateBlueprint(templateMap, ...)` — Phase 1: sections + repeating blocks (Zod schema). `analyzeAndFillTemplate(...)` combined call. |
| `template-style-extractor.ts` | `extractStyleFromTemplate(imageBase64, ...)` — AI-vision style extraction uit screenshot. `getTemplateStyleFallbackTokens()` als vision faalt. |
| `docx-content-replacer.ts` | `fillStructuredSegments(...)` — Phase 2: vul segment IDs met profile data. Helpers: `buildProfileSummary`, `buildJobSummary`, `buildFitAnalysisSummary` (ook hergebruikt door de PDF-flow). |

Voor de volledige DOCX flow zie `src/lib/docx/CLAUDE.md`.

## Template AI (PDF) — hybrid

| File | Doel |
|---|---|
| `pdf-template-analyzer.ts` | `analyzePDFTemplate({ pages, profileCounts, ... })` — AI-vision blueprint met **boxes** (x/y/width/height, top-left origin, PDF points), font-hints, sectie-classificatie, `repeatingBlocks`, optioneel `photoSlot`. Zod-schema `pdfBlueprintSchema`. |
| `pdf-content-replacer.ts` | `fillPDFFields({ blueprint, profileData, ... })` — geeft per `fieldId` een waarde, vertaalt naar vacaturetaal. Hergebruikt `buildProfileSummary`/`buildJobSummary`/`buildFitAnalysisSummary` uit `docx-content-replacer.ts`. |
| `pdf-html-reconstructor.ts` | `reconstructPDFFromBlueprint(...)` — fallback voor templates waar overlay overflowt. AI bouwt semantische HTML+Tailwind op basis van page-images + blueprint, Puppeteer → PDF. |
| `language-detect.ts` | `detectLanguageFromText(text)` — heuristische taaldetectie (NL/EN stopwoorden). Pure synchroon, geen AI-call. Pre-vult `LanguageSelector` in de wizard zodra `jobVacancy.description` binnenkomt. |

Orchestrator + drempel-logica zit in `src/lib/pdf/smart-pdf-filler.ts` (zie `src/lib/pdf/CLAUDE.md`).

## Belangrijke patronen

- **Required items override** (`cv-generator.ts`): de wizard kan een `RequiredItemsSelection` meegeven met indices van experiences/projects/education/certifications die de gebruiker per se op het CV wil. `buildPrompt` zet een `## === MANDATORY ITEMS ===` sectie aan het einde van de prompt die de eerdere "OR omit if CV is already long enough" instructie (Step 6, line ~751) **overrulet** voor pinned items. Daarnaast loopt er een safety net in `normalizeCVContent → enforceRequiredItems()`: als de LLM een pinned item alsnog weglaat (case-insensitive match per categorie), wordt het mechanisch uit het profiel toegevoegd. Niet-pinned items blijven onder de bestaande AI-vrijheid vallen.
- AI-credit operaties **altijd** via `resolveProvider({ userId, operation })`. Niet eigen credit-logica schrijven.
- Character-based billing (cv-chat): `chargePlatformCredits()` apart aanroepen na de operatie.
- Flaky Anthropic structured-output: gebruik `generateObjectResilient` (heeft Opus 4.6 fallback).
- Honesty rules zitten **inline** in `cv-generator.ts` — prompts verbieden expliciet het verzinnen van ervaring of skills. Geen tegenstrijdige instructies toevoegen (bv. "quantify" zonder "alleen cijfers uit het profiel"); de eval in `eval/` meet verzonnen getallen.
- **Claim-validator** (`validators/claim-validator.ts`) strip na generatie claims zonder bewijs in het profiel. Matching: exact → substring → kernterm tussen haakjes → alle significante tokens (generieke beschrijvers als "development"/"beheer" tellen niet mee); talen NL↔EN via een alias-tabel.
- **Evaluatie:** `npm run eval:docgen` (zie `eval/README.md`) — fixtures, automatische checks en optionele LLM-judge. Draai vóór en na prompt-wijzigingen.
- Motivatiebrieven krijgen **altijd** een humanizer pass — `generateMotivationLetter` → `humanizeMotivationLetter`.
- Disputes: gatekeeper LLM-call **voor** regeneratie zodat credits niet verspild worden als de user fout heeft.

## Nieuwe generator toevoegen

1. Volg patroon van `cv-generator.ts`
2. Provider via `resolveProvider()` als de host route credits af kan trekken
3. Schema via Zod
4. Gebruik `generateObjectResilient` voor flaky Anthropic structured-output
5. Voeg evt. nieuwe `PlatformOperation` toe in `platform-config.ts`
