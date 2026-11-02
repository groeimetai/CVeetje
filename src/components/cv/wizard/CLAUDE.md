# Wizard helpers — `src/components/cv/wizard/`

Stateless helper-componenten voor de CV-wizard (`src/components/cv/cv-wizard.tsx`).

| Bestand | Doel |
|---|---|
| `language-selector.tsx` | NL/EN toggle voor `outputLanguage`. Auto-detect uit job-vacancy gebeurt in `cv-wizard.tsx` via `detectLanguageFromText()`; deze component is alleen UI + onChange. |
| `no-api-key-alert.tsx` | Alert wanneer user geen BYOK-key heeft EN niet in platform mode is. Link naar `/settings`. |
| `resume-draft-dialog.tsx` | Dialog die bij wizard-start verschijnt als er een geldige draft in `localStorage` staat (`cveetje_wizard_draft`, 24u TTL). Bevat een `stepLabels` map die ALLE `WizardStep` values moet dekken — vergeet niet bij te werken bij een nieuwe stap. |
| `wizard-progress.tsx` | Fase-gebaseerde voortgang (5 zichtbare fases: profile → job → match → design → result). Interne `WizardStep`s worden op een fase gemapt (`PHASE_OF`); afgeronde fases zijn klikbaar (`onNavigate`), Match toont 'overgeslagen' zonder vacature. Toont ook de credit-schatting (uit `PLATFORM_CREDIT_COSTS`). |
| `generating-progress.tsx` | Voortgang per fase tijdens `generating` (CV-pad én template-pad) i.p.v. een kale spinner. |

## Patterns

- **Stateless** — alle state leeft in `cv-wizard.tsx`. Deze helpers krijgen props + emit callbacks.
- **`useTranslations('cvWizard')`** voor alle strings — keys in `src/i18n/messages/{nl,en}.json`.
- **Nieuwe wizard-stap**: extend `WizardStep` in `src/hooks/use-wizard-persistence.ts`, map de stap op een fase in `wizard-progress.tsx` (`PHASE_OF`), én voeg een entry toe in `resume-draft-dialog.tsx` `stepLabels` (TypeScript faalt anders op `Record<WizardStep, string>`).
