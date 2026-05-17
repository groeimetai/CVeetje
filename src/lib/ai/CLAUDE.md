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
| `docx-content-replacer.ts` | `fillStructuredSegments(...)` — Phase 2: vul segment IDs met profile data. Helpers: `buildProfileSummary`, `buildJobSummary`, `buildFitAnalysisSummary`. |

Voor de volledige DOCX flow zie `src/lib/docx/CLAUDE.md`.

## Belangrijke patronen

- AI-credit operaties **altijd** via `resolveProvider({ userId, operation })`. Niet eigen credit-logica schrijven.
- Character-based billing (cv-chat): `chargePlatformCredits()` apart aanroepen na de operatie.
- Flaky Anthropic structured-output: gebruik `generateObjectResilient` (heeft Opus 4.6 fallback).
- Honesty rules zitten **inline** in `cv-generator.ts` — prompts verbieden expliciet het verzinnen van ervaring of skills.
- Motivatiebrieven krijgen **altijd** een humanizer pass — `generateMotivationLetter` → `humanizeMotivationLetter`.
- Disputes: gatekeeper LLM-call **voor** regeneratie zodat credits niet verspild worden als de user fout heeft.

## Nieuwe generator toevoegen

1. Volg patroon van `cv-generator.ts`
2. Provider via `resolveProvider()` als de host route credits af kan trekken
3. Schema via Zod
4. Gebruik `generateObjectResilient` voor flaky Anthropic structured-output
5. Voeg evt. nieuwe `PlatformOperation` toe in `platform-config.ts`
