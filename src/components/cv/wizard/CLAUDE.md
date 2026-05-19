# Wizard helpers — `src/components/cv/wizard/`

Stateless helper-componenten voor de CV-wizard (`src/components/cv/cv-wizard.tsx`).

| Bestand | Doel |
|---|---|
| `language-selector.tsx` | NL/EN toggle voor `outputLanguage`. Auto-detect uit job-vacancy gebeurt in `cv-wizard.tsx` via `detectLanguageFromText()`; deze component is alleen UI + onChange. |
| `no-api-key-alert.tsx` | Alert wanneer user geen BYOK-key heeft EN niet in platform mode is. Link naar `/settings`. |
| `resume-draft-dialog.tsx` | Dialog die bij wizard-start verschijnt als er een geldige draft in `localStorage` staat (`cveetje_wizard_draft`, 24u TTL). Bevat een `stepLabels` map die ALLE `WizardStep` values moet dekken — vergeet niet bij te werken bij een nieuwe stap. |
| `wizard-progress.tsx` | Stepper-balk bovenaan. Data-driven via de `steps` array uit `cv-wizard.tsx`, dus nieuwe stappen tonen automatisch zodra ze in `steps` staan. |

## Patterns

- **Stateless** — alle state leeft in `cv-wizard.tsx`. Deze helpers krijgen props + emit callbacks.
- **`useTranslations('cvWizard')`** voor alle strings — keys in `src/i18n/messages/{nl,en}.json`.
- **Nieuwe wizard-stap**: extend `WizardStep` in `src/hooks/use-wizard-persistence.ts`, voeg label toe in `cv-wizard.tsx` `steps`-array (progress-bar pakt 'm op), én voeg een entry toe in `resume-draft-dialog.tsx` `stepLabels` (TypeScript faalt anders op `Record<WizardStep, string>`).
