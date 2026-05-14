# Types — `src/types/`

Centrale type-definities. Imports via `@/types`.

## Files

### `index.ts` (~1280 lines)

Hoofdfile met de meeste types.

Highlights:
- **Profile**: `ParsedLinkedIn`, `SavedProfileSummary`, `CVContactInfo`
- **Job**: `JobVacancy`, `FitAnalysis`
- **CV content**: `GeneratedCVContent`, `GeneratedCVExperience`, `GeneratedCVSkills`, `GeneratedCVEducation`, `CV`
- **Styling (legacy)**: `CVStyleConfig`
- **User**: `User`, `UserRole`, `LLMProvider`, `LLMMode`, `OutputLanguage`
- **Stylevariatie**: `StyleCreativityLevel`
- **Editing**: `CVElementOverrides`, `ElementOverride`
- **Telemetrie**: `TokenUsage`, `StepTokenUsage`

### `design-tokens.ts`

Modern style system.

- `CVDesignTokens` — ~20 properties, hoofdtoken-object
- `EditorialTokens`, `BoldTokens` — nested tokens voor advanced renderers (creative/experimental)
- Variant enums: `HeaderVariant`, `FontPairing`, `SpacingScale`, `SectionStyle`, `CVLayout`, `ContactLayout`, `SkillsDisplay`, `AccentStyle`, `NameStyle`, `SkillTagStyle`, `TypeScale`, `ExperienceDescriptionFormat`

### `application.ts`

`ApplicationRecord`, `ApplicationStatus` voor de applications tracker.
Statuses: `applied | interview | offer | rejected | accepted | withdrawn`.

### `chat.ts`

CV-chat types: `CVChatContext`, `CVChatToolName`, `CVChatMessage` + tool-call param types.

### `mammoth.d.ts`

Ambient module declarations voor `mammoth` (DOCX → HTML).

## Patterns

- **`ParsedLinkedIn.birthDate`** bestaat sinds issue #5 (2026-04-09). `nationality` is **niet** op `ParsedLinkedIn` — komt via `customValues` in de DOCX flow.
- Legacy `CVStyleConfig` (150+ properties) wordt bridged via `src/lib/cv/templates/adapter.ts` (`tokensToStyleConfig`, `styleConfigToTokens`). Nieuwe code: gebruik `CVDesignTokens`.
- Nieuwe creativity level: extend `StyleCreativityLevel` in `index.ts` + maak expert onder `src/lib/ai/style-experts/` + register in `registry.ts`.
