# Types — `src/types/`

Centrale type-definities, domain-split per file. Imports via `@/types`.

## Structuur

`index.ts` is een **barrel** (~30 regels) die alle domain-files re-exporteert. Je hoeft nooit per-file paths te importeren — `import { ParsedLinkedIn, CV } from '@/types'` werkt.

| File | Bevat |
|---|---|
| `linkedin.ts` | `ParsedLinkedIn`, `LinkedInExperience` / `Education` / `Skill` / `Language` / `Certification` / `Project`, `CVContactInfo`, `SavedProfile`, `SavedProfileSummary` |
| `job.ts` | `JobVacancy`, `FitAnalysis`, `FitWarning` / `Strength`, `FitVerdict`, `FitAnalysisRequest/Response`, `GeneratedMotivationLetter` |
| `cv.ts` | `CV`, `GeneratedCVContent`, `GeneratedCVExperience` / `Education` / `Skills` / `Language` / `Project`, `CVTemplate`, `CVStatus`, `CVColorScheme`, `EditableElementType`, `ElementOverride`, `CVTextEdits`, `CVElementOverrides`, `RequiredItemsSelection`, `CVAIUsageEntry` |
| `cv-style.ts` | Legacy `CVStyleConfig` (~150 properties). Bridged naar `CVDesignTokens` via `src/lib/cv/templates/adapter.ts`. |
| `design-tokens.ts` | `CVDesignTokens`, `EditorialTokens`, `BoldTokens` + variant enums (`HeaderVariant`, `FontPairing`, `SpacingScale`, `SectionStyle`, `CVLayout`, `ContactLayout`, `SkillsDisplay`, `AccentStyle`, `NameStyle`, `SkillTagStyle`, `TypeScale`, `ExperienceDescriptionFormat`) |
| `user.ts` | `User`, `UserRole`, `LLMProvider`, `LLMMode`, `StyleCreativityLevel`, `TokenUsage`, `StepTokenUsage` |
| `language.ts` | `OutputLanguage` (`'nl' \| 'en'`) |
| `input.ts` | Multi-modal profile input types |
| `application.ts` | `ApplicationRecord`, `ApplicationStatus` (`applied \| interview \| offer \| rejected \| accepted \| withdrawn`) voor de applications tracker |
| `chat.ts` | CV-chat types: `CVChatContext`, `CVChatToolName`, `CVChatMessage` + tool-call param types |
| `dispute.ts` | `DisputeAttempt`, `DisputeGatekeeperVerdict` |
| `feedback.ts` | `Feedback`, `FeedbackStatus`, `FeedbackComment` |
| `kanban.ts` | `KanbanBoard`, `KanbanCard`, `KanbanColumnDef` |
| `template.ts` | DOCX/PDF template types: `Template`, `TemplateField`, `TemplatePhase` |
| `api.ts` | Gedeelde request/response envelopes voor API routes |
| `mammoth.d.ts` | Ambient module declarations voor `mammoth` (DOCX → HTML) |

## Patterns

- **`ParsedLinkedIn.birthDate`** bestaat sinds issue #5 (2026-04-09). `nationality` is **niet** op `ParsedLinkedIn` — komt via `customValues` in de DOCX flow.
- Legacy `CVStyleConfig` (~150 properties) wordt bridged via `src/lib/cv/templates/adapter.ts` (`tokensToStyleConfig`, `styleConfigToTokens`). Nieuwe code: gebruik `CVDesignTokens`.
- **`RequiredItemsSelection`** (`cv.ts`) bevat per-categorie indices van items die de gebruiker MUST-INCLUDE heeft gepind in de wizard. Caller-flow: wizard → `/api/cv/generate` → `generateCV()` injecteert "MANDATORY ITEMS" sectie in de prompt. Default leeg = AI beslist zelf.
- Nieuwe creativity level: extend `StyleCreativityLevel` in `user.ts` + maak expert onder `src/lib/ai/style-experts/` + register in `registry.ts`.
- Nieuw domain: maak `<domain>.ts`, voeg `export * from './<domain>'` toe aan `index.ts`. Houd één concept per file — geen kitchen-sink modules.
