# Components — `src/components/`

UI components, grotendeels gestructureerd per domein.

## Folder overzicht

| Folder | Bevat | Eigen CLAUDE.md? |
|---|---|---|
| `cv/` | Wizard, preview, chat, dispute dialog, motivatiebrief secties | ✅ |
| `admin/` | Admin sections + kanban | ✅ |
| `auth/` | `auth-context.tsx` (`useAuth()`), login/register/verify-email forms | – |
| `dashboard/` | `sidebar`, `credit-display` | – |
| `feedback/` | `feedback-form`, `feedback-image-upload`, `feedback-list`, `feedback-status-badge` | – |
| `jobs/` | `job-card`, `job-search-bar`, `job-pagination`, `apply-form` | – |
| `landing/` | `cv-showcase` (landing page) | – |
| `profiles/` | `profile-card`, `profile-edit-form`, `profile-enrich-drawer`, `linkedin-export-dialog` | – |
| `seo/` | `structured-data`, `job-posting-structured-data` | – |
| `templates/` | `template-selector`, `template-configurator`, `template-list`, `templates-page`, `style-or-template-choice` (+ barrel `index.ts`) | – |
| `ui/` | shadcn-style primitives (Radix-based) | – |

## UI primitives (`src/components/ui/`)

shadcn/Radix-based: accordion, alert(-dialog), avatar, badge, button, card, dialog, dropdown-menu, form, input, label, logo, progress, select, separator, sheet, slider, sonner, switch, table, tabs, textarea.

Geconfigureerd via `components.json` (root).

## Top-level

| Bestand | Doel |
|---|---|
| `cookie-consent.tsx` | Cookie banner |
| `footer.tsx` | Site footer |
| `language-switcher.tsx` | nl/en switcher |
| `theme-provider.tsx`, `theme-switcher.tsx` | Light/dark mode |

## Auth context

`auth/auth-context.tsx` exporteert `AuthProvider` + `useAuth()`. Levert:
- `firebaseUser`, `userData`, `credits`, `isAdmin`, `llmMode`
- `effectiveUserId` (voor impersonation)
- `startImpersonation`, `stopImpersonation`
- Session helpers

Wrap dashboard layout met `AuthProvider`. Server-side auth: zie `src/lib/firebase/CLAUDE.md`.
