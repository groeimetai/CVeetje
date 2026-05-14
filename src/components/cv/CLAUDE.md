# CV components — `src/components/cv/`

UI voor de CV-wizard, preview, en motivatiebrief.

## CV Generation Flow

De wizard in `cv-wizard.tsx` orchestreert 9 stappen (`WizardStep` in `src/hooks/use-wizard-persistence.ts`):

1. **`linkedin`** — multi-modal profile input (text, image, PDF) → AI parses to `ParsedLinkedIn`
2. **`job`** — vacancy text → AI parses to `JobVacancy` met keywords
3. **`fit-analysis`** — score profile vs vacancy (`analyzeFit`)
4. **`style-choice`** — user picks: AI-generated tokens OF upload DOCX template
5. **`style`** — AI generates `CVDesignTokens` (via style-expert voor gekozen creativity level)
6. **`template-style`** — alternatieve path: extract style tokens uit uploaded template image
7. **`template`** — fill uploaded DOCX template (Phases 1-6) met user data
8. **`generating`** — `/api/cv/generate` → AI genereert `GeneratedCVContent` met Zod schema validation
9. **`preview`** — `cv-preview.tsx` met inline element editing, dispute trigger, PDF export

State wordt gepersisteerd in localStorage (key `cveetje_wizard_draft`, 24h expiry) via `use-wizard-persistence.ts`.

## Components

| Bestand | Doel |
|---|---|
| `cv-wizard.tsx` | Hoofdwizard (9 stappen, state in localStorage) |
| `cv-preview.tsx` | Live preview met inline editing |
| `element-editor.tsx` | Inline rich-text editor voor elementen |
| `cv-content-editor.tsx` | Side panel voor content editing |
| `profile-input.tsx` | Profile input (text/image/PDF) |
| `linkedin-input.tsx` | LinkedIn URL input |
| `job-input.tsx` | Job vacancy input |
| `fit-analysis-card.tsx` | Fit analysis card |
| `style-picker.tsx` | Style picker (legacy `CVStyleConfig`) |
| `dynamic-style-picker.tsx` | Style picker (v2 `CVDesignTokens`) |
| `template-style-picker.tsx` | Template style picker |
| `style-generation-progress.tsx` | Progress UI tijdens style-generatie |
| `cv-chat-panel.tsx` | Interactive CV-edit chat panel |
| `template-chat-panel.tsx` | Template-edit chat panel |
| `template-preview.tsx` | Template preview |
| `motivation-letter-section.tsx` | Motivatiebrief sectie (CV path) |
| `template-motivation-letter-section.tsx` | Motivatiebrief sectie (template path) |
| `cv-dispute-dialog.tsx` | Dispute dialog (≥20-char complaint) |
| `token-usage-display.tsx` | Token usage display |
| `avatar-upload.tsx` | Avatar upload |

## Belangrijke patronen

- Wizard state moet via `use-wizard-persistence.ts` zodat draft localStorage gesynced blijft
- Nieuwe wizard-stap: extend `WizardStep` in `use-wizard-persistence.ts` + voeg state + render-tak toe in `cv-wizard.tsx`
- Inline edits in preview produceren `CVElementOverrides` die naast `GeneratedCVContent` worden bewaard
- Dispute trigger zit op de preview en gebruikt `cv-dispute-dialog.tsx`; flow naar `/api/cv/[id]/dispute` (zie `src/lib/ai/CLAUDE.md`)

## Related hooks

- `src/hooks/use-wizard-persistence.ts` — localStorage draft management
- `src/hooks/use-cv-chat.ts` — `useChat()` wrapper voor chat panel
- `src/hooks/use-template-chat.ts` — idem voor templates
