# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CVeetje is an AI-powered CV generator that creates tailored CVs from LinkedIn/profile data and job vacancy requirements. Users bring their own AI API keys (encrypted at rest) or use the platform mode (credit-billed Claude Opus). All user data stays in their Firebase project. The interface is Dutch with i18n support (nl/en). Production: maakcveetje.nl. Repo: `groeimetai/CVeetje`. Deploys via Cloud Build to Cloud Run (`europe-west4`).

The app is more than a CV generator — it also bundles:
- A public **jobs board** that aggregates Adzuna + Greenhouse + Lever + Recruitee
- A per-user **applications tracker** for jobs the user actually applied to
- A **disputes** flow (user can claim a CV is wrong → AI gatekeeper decides → regenerate)
- A **feedback** flow that auto-creates GitHub issues in `groeimetai/CVeetje`
- An admin-only **kanban** for internal task management
- A multi-modal **template fill** flow for user-uploaded DOCX templates (with profile-photo replacement)

## Commands

```bash
npm run dev      # Dev server with Turbopack (localhost:3000)
npm run build    # Production build (Turbopack disabled via NEXT_PRIVATE_SKIP_TURBOPACK=1)
npm run lint     # ESLint
npm start        # Production server
```

No test framework is configured (no Jest/Vitest). Ad-hoc test scripts live at the repo root (`test-detection.js`, `test-local-template.js`, `inspect-docx.js`).

## Tech Stack

- **Next.js 16** (App Router) with React 19, TypeScript 5
- **Tailwind CSS 4** (via PostCSS plugin, no `tailwind.config` file)
- **Firebase** (Auth + Firestore + Storage) for client and admin SDK
- **Vercel AI SDK** (`ai` package, v6) with multi-provider support (OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek, Fireworks, Together, Azure)
- **Puppeteer** + `@sparticuz/chromium` for PDF generation (Cloud Run-compatible)
- **docxtemplater** + `pizzip` + `mammoth` + `docx-preview` for DOCX template handling
- **pdf-lib** for PDF post-processing (watermarks)
- **next-intl** for i18n (nl/en), default locale `nl`
- **Mollie** for payments
- **@dnd-kit** for kanban drag-and-drop
- **react-hook-form** + `zod` for forms

---

## Folder Structuur

```
cveetje/
├── src/
│   ├── app/                                # Next.js App Router
│   │   ├── [locale]/                       # i18n-prefixed pages (nl/en)
│   │   │   ├── (auth)/                     # login, register, verify-email
│   │   │   ├── (dashboard)/                # protected app surface
│   │   │   │   ├── admin/                  # cvs, disputes, emails, feedback,
│   │   │   │   │   ├── kanban/[boardId]/   # kanban, platform, profielen (NL!),
│   │   │   │   │   └── ...                 # templates, users
│   │   │   │   ├── applications/           # user's job application tracker
│   │   │   │   ├── credits/                # buy/view credits
│   │   │   │   ├── cv/                     # CV list, [id], new (wizard)
│   │   │   │   ├── dashboard/              # landing after login
│   │   │   │   ├── feedback/               # user feedback list
│   │   │   │   ├── profiles/               # saved LinkedIn profiles
│   │   │   │   ├── settings/               # API keys + LLM mode
│   │   │   │   └── templates/              # user DOCX templates
│   │   │   ├── ai-transparency/            # public AI-usage disclosure
│   │   │   ├── jobs/                       # public jobs board + [slug] detail
│   │   │   ├── privacy/, terms/            # legal pages
│   │   │   ├── layout.tsx                  # locale layout
│   │   │   └── page.tsx                    # landing
│   │   ├── api/                            # REST endpoints (NOT locale-prefixed)
│   │   │   ├── admin/                      # cvs, disputes, emails, feedback,
│   │   │   │   ├── kanban/                 # boards + cards (with reorder)
│   │   │   │   ├── platform-config/        # platform AI config
│   │   │   │   └── ...                     # impersonate, profiles, setup, templates, users
│   │   │   ├── applications/               # GET/POST list + per-id
│   │   │   ├── auth/                       # init-user, verify-captcha
│   │   │   ├── credits/check-reset/        # monthly free credit reset
│   │   │   ├── cv/                         # generate, style, style-from-template,
│   │   │   │   ├── chat/                   # interactive CV-edit chat
│   │   │   │   ├── fit-analysis/, job/parse/, avatar/
│   │   │   │   └── [id]/                   # dispute, motivation, pdf, preview-html
│   │   │   ├── feedback/                   # POST creates GitHub issue automatically
│   │   │   ├── github/webhook/             # syncs issue close/reopen → feedback status
│   │   │   ├── jobs/                       # search, [slug] detail, [slug]/apply
│   │   │   ├── linkedin/parse/
│   │   │   ├── models/                     # list available AI models
│   │   │   ├── mollie/                     # checkout + webhook
│   │   │   ├── profile/parse/              # multi-modal LinkedIn parse
│   │   │   ├── profiles/                   # CRUD + enrich + linkedin-export
│   │   │   ├── settings/                   # api-key, llm-mode, account
│   │   │   └── templates/                  # CRUD + analyze + fill + motivation
│   │   ├── layout.tsx, robots.ts, sitemap.ts, opengraph-image.tsx
│   ├── components/
│   │   ├── admin/                          # admin section components + kanban/
│   │   ├── auth/                           # auth-context, login/register/verify forms
│   │   ├── cv/                             # wizard, preview, chat panels, editors
│   │   ├── dashboard/                      # sidebar, credit-display
│   │   ├── feedback/                       # form, image upload, list, status badge
│   │   ├── jobs/                           # job-card, search-bar, pagination, apply-form
│   │   ├── landing/                        # cv-showcase
│   │   ├── profiles/                       # profile card, edit form, enrich drawer
│   │   ├── seo/                            # structured-data tags
│   │   ├── templates/                      # template-selector, configurator, list
│   │   └── ui/                             # shadcn-style primitives (Radix-based)
│   ├── hooks/                              # use-cv-chat, use-template-chat,
│   │                                       # use-profiles, use-wizard-persistence
│   ├── i18n/
│   │   ├── messages/                       # en.json, nl.json
│   │   ├── navigation.ts, request.ts, routing.ts
│   ├── lib/
│   │   ├── ai/                             # all AI generators (CV, style, jobs, etc.)
│   │   │   └── style-experts/              # 4 creativity levels + shared utils
│   │   │       └── shared/                 # base schema, prompt fragments, variation
│   │   ├── auth/                           # impersonation helper
│   │   ├── credits/                        # monthly reset + balance manager
│   │   ├── cv/                             # html-generator + renderers + templates
│   │   │   ├── renderers/                  # bold (experimental), editorial (creative)
│   │   │   └── templates/                  # base.css, themes, decorations, icons,
│   │   │                                   # adapter (legacy), color-utils
│   │   ├── docx/                           # smart/s4y template fillers + structure
│   │   │                                   # extractor + image replacer + docx→pdf
│   │   ├── email/                          # send.ts + templates/ (transactional)
│   │   ├── firebase/                       # admin SDK, client SDK, admin-utils,
│   │   │                                   # firestore helpers, auth helpers
│   │   ├── github/                         # feedback-issue.ts (creates GitHub issues)
│   │   ├── jobs/                           # search, cache, resolve, ats-detector
│   │   │   └── providers/                  # adzuna, greenhouse, lever, recruitee
│   │   ├── linkedin/                       # LinkedIn-specific parser
│   │   ├── mollie/                         # Mollie API client wrapper
│   │   ├── pdf/                            # generator, motivation-letter, template-
│   │   │                                   # filler, add-watermark
│   │   ├── recaptcha/                      # client + server v3 verification
│   │   ├── security/                       # rate-limiter, url-validator, error-sanitizer
│   │   ├── template/                       # docx-to-image (screenshot for AI vision)
│   │   └── validation/                     # shared Zod schemas
│   ├── types/
│   │   ├── index.ts                        # ~1280 lines — central type definitions
│   │   ├── design-tokens.ts                # CVDesignTokens + EditorialTokens +
│   │   │                                   # BoldTokens + variant enums
│   │   ├── application.ts                  # ApplicationRecord + ApplicationStatus
│   │   ├── chat.ts                         # CV-chat context + tool-call types
│   │   └── mammoth.d.ts                    # ambient module declarations
│   └── middleware.ts                       # locale prefix + auth route guard
├── public/                                 # static assets
├── posts/                                  # marketing posts per platform
├── docs/                                   # internal docs (e.g. tia-anthropic.md)
├── scripts/                                # setup-gcp.sh, test-fill-s4y.js
│   └── local/                              # gitignored ad-hoc debug scripts (DOCX inspect/test)
├── doc-example-template/, doc-outputs/,
├── pdf-outputs/                            # local test fixtures (gitignored output)
├── cloudbuild.yaml, Dockerfile,
├── firebase.json, firestore.rules,
├── firestore.indexes.json, storage.rules,
├── next.config.ts, tsconfig.json,
├── postcss.config.mjs, eslint.config.mjs,
├── components.json                         # shadcn config
└── package.json
```

---

## Architecture

### CV Generation Flow

The wizard in `src/components/cv/cv-wizard.tsx` orchestrates 9 steps (typed as `WizardStep` in `src/hooks/use-wizard-persistence.ts`):

1. **`linkedin`** — multi-modal profile input (text, image, PDF) → AI parses to `ParsedLinkedIn`
2. **`job`** — vacancy text → AI parses to `JobVacancy` with keywords
3. **`fit-analysis`** — score profile vs vacancy (`analyzeFit`)
4. **`style-choice`** — user picks: AI-generated tokens OR upload DOCX template
5. **`style`** — AI generates `CVDesignTokens` (via a style-expert for the chosen creativity level)
6. **`template-style`** — alternative path: extract style tokens from uploaded template image
7. **`template`** — fill uploaded DOCX template (Phases 1-6) with user data
8. **`generating`** — `/api/cv/generate` → AI generates `GeneratedCVContent` with Zod schema validation
9. **`preview`** — `cv-preview.tsx` with inline element editing, dispute trigger, PDF export

State is persisted to localStorage (key `cveetje_wizard_draft`, 24h expiry) via `use-wizard-persistence.ts`.

### WYSIWYG HTML Generation

`src/lib/cv/html-generator.ts` (`generateCVHTML()`) is the **single source of truth** — same HTML for browser preview and PDF rendering. For creativity levels `creative` and `experimental` the generator delegates to specialized renderers:

- `renderers/editorial.ts` (`generateEditorialHTML`) — magazine-style layouts with drop caps, pull quotes, numbered sections
- `renderers/bold.ts` (`generateBoldHTML`) — Canva/Linear-style layouts with sidebars, skill bars, gradients

All renderers are print-safe (no transforms, clip-path, hover effects) and use `print-color-adjust: exact` so saturated colors survive Puppeteer export.

### Style System (Tokens + Experts + Renderers)

Three styling layers coexist:

- **Legacy `CVStyleConfig`** — 150+ properties, kept for backward compatibility (`src/lib/cv/templates/adapter.ts` bridges)
- **Modern `CVDesignTokens`** — ~20 token properties, lives in `src/types/design-tokens.ts`. Includes nested `EditorialTokens` and `BoldTokens` for advanced renderers.
- **Style experts** — `src/lib/ai/style-experts/` has one expert per `StyleCreativityLevel`: `conservative`, `balanced`, `creative`, `experimental`. Each implements the `StyleExpert` interface (`schema`, `buildPrompt`, `normalize`, `getFallback`, `preferredTemperature`). The orchestrator (`generateDesignTokens` in `style-generator-v2.ts`) looks up an expert via `getStyleExpert(level)`.

Shared expert utilities (`style-experts/shared/`):
- `base-schema.ts` — common Zod fragments
- `prompt-fragments.ts`, `font-directions.ts`, `color-moods.ts` — reusable prompt building blocks
- `linkedin-summary.ts` — compact profile summary used by all experts
- `normalize-base.ts` — token normalization with defaults
- `variation.ts` — rotation logic so consecutive generations don't repeat values

### AI Integration (`src/lib/ai/`)

All AI calls use Vercel AI SDK's `generateObject()` with Zod schemas. The resilient wrapper `generate-resilient.ts` (`generateObjectResilient`) retries on empty/`{data: ...}`-wrapped responses and falls back to `claude-opus-4-6` for Anthropic.

Key generators:
- `cv-generator.ts` — CV content (summary, experience, education, skills) with inline `honestyRules`
- `style-generator-v2.ts` — orchestrates style-experts; calls `generateDesignTokens`
- `job-parser.ts` — vacancy text → `JobVacancy`
- `fit-analyzer.ts` — profile-to-job fit score + verdict + advice
- `motivation-generator.ts` — cover letter (opening, whyCompany, whyMe, motivation, closing)
- `humanizer.ts` — **second LLM pass** that strips AI tells (significance inflation, em-dash overuse, rule-of-three patterns) from generated motivation letters. Based on Wikipedia's "Signs of AI writing" guide.
- `template-analyzer.ts` — DOCX template blueprint analysis
- `template-style-extractor.ts` — AI-vision style extraction from screenshot
- `docx-content-replacer.ts` — fill structured segments + build summary helpers
- `dispute-gatekeeper.ts` — single LLM-judge call for CV disputes (approve/reject + rationale)
- `temperature.ts` — `resolveTemperature()` handles newer models that don't accept the parameter
- `date-context.ts` — current-date strings for prompts
- `platform-config-reader.ts` — reads platform AI config (model, costs) from Firestore

Provider plumbing:
- `providers.ts` — multi-provider factory (`createAIProvider`, `getModelId`)
- `platform-provider.ts` — **single source of truth** for BYOK + credit handling (`resolveProvider`, `chargePlatformCredits`). Never duplicate this logic in routes.
- `platform-config.ts` — `PlatformOperation` enum + `PLATFORM_CREDIT_COSTS` + `PLATFORM_MODEL`
- `models-registry.ts` — dynamic model list per provider
- `retry.ts` — `withRetry()` for flaky calls

### DOCX Template System (`src/lib/docx/`)

5-phase AI-driven fill, fully universal (no hardcoded patterns):

1. `structure-extractor.ts` → `extractStructuredSegments()` — XML-aware extraction with table/row/cell context
2. `template-analyzer.ts` → `analyzeTemplateBlueprint()` — AI Phase 1: identifies sections + repeating blocks (Zod-validated)
3. `block-duplicator.ts` → `duplicateBlocksInXml()` — clones `<w:tr>` or `<w:p>` groups
4. `docx-content-replacer.ts` → `fillStructuredSegments()` — AI Phase 2: fills segment IDs with profile data
5. `smart-template-filler.ts` → `fillSmartTemplate()` — orchestrator that applies `<w:t>` replacements in **reverse XML order** (so positions stay valid)
6. `image-replacer.ts` → `replaceProfileImage()` — Phase 6 post-processing: finds the best portrait-shaped embedded image (EMU dimension check, >1cm) and swaps it with the user's avatar

Alternative paths:
- `s4y-template-filler.ts` — alternative filler for S4Y-style templates
- `template-filler.ts` — basic placeholder detection (`{{name}}`, `[NAME]`, `Label: _____`)
- `docx-to-pdf.ts` — DOCX → PDF via Puppeteer

### PDF Generation (`src/lib/pdf/`)

Separate from the DOCX flow:
- `generator.ts` — main HTML → PDF via Puppeteer (renders the same HTML as preview)
- `motivation-letter-generator.ts` — PDF for motivation letters
- `template-filler.ts` — PDF-side template fill helpers
- `add-watermark.ts` — adds preview watermark via `pdf-lib`

### Authentication & Middleware

- Firebase Auth (email/password, Google OAuth) with token in `firebase-token` cookie
- `src/middleware.ts` — protects dashboard routes, redirects auth routes, handles locale routing
- API routes verify tokens via Firebase Admin SDK from cookie or `Authorization` header
- User API keys encrypted with AES-256 (`src/lib/encryption.ts` — `encrypt`/`decrypt`)
- Admin checks via `src/lib/firebase/admin-utils.ts` (`verifyAdminRequest`) — custom claims first, Firestore role fallback
- Admin impersonation via `src/lib/auth/impersonation.ts` (`getEffectiveUserId`) — driven by `/api/admin/impersonate`

### Credits System

`src/lib/credits/manager.ts` manages free monthly credits + purchased credits (via Mollie). 1 credit per PDF download. BYOK users pay 0 credits for AI operations; platform users have per-operation costs in `src/lib/ai/platform-config.ts`. Character-based billing (cv-chat) goes through `chargePlatformCredits()`.

### Jobs Board & Applications (`src/lib/jobs/` + `src/types/application.ts`)

Public jobs board aggregates 4 ATS providers:
- `providers/adzuna.ts` — search-only (no apply API)
- `providers/greenhouse.ts`, `providers/lever.ts`, `providers/recruitee.ts` — search + 1-click apply with structured questions
- `providers/registry.ts` — registry of known companies per ATS
- `providers/types.ts` — `NormalizedJob`, `JobSearchParams`, `ApplyQuestion`, `JobSourceProvider`, `buildSlug` helper

Pipeline:
- `search.ts` — fan-out across providers + query/location filter
- `cache.ts` — Firestore-backed job cache (collection `jobs/`, public-read)
- `resolve.ts` — resolves a slug to a `NormalizedJob`
- `ats-detector.ts` — promotes Adzuna redirects to known ATS (so 1-click apply works)
- `job-vacancy-mapper.ts` — maps `NormalizedJob` → `JobVacancy` for the wizard

Applications are stored under `users/{uid}/applications` and tracked via the `applications` page. Statuses: `applied | interview | offer | rejected | accepted | withdrawn`. Creation is **Admin-SDK-only** (server records the ATS submission); the user can update `status`/`notes` and delete.

### Feedback System

- User feedback via `/api/feedback` — creates a Firestore doc AND auto-creates a GitHub issue in `groeimetai/CVeetje` (via `src/lib/github/feedback-issue.ts`). `githubIssueNumber` is stored on the feedback doc.
- Comments without a GitHub issue trigger lazy-create (see `fix: comments op feedback zonder GitHub issue (lazy-create)` in git history).
- `/api/github/webhook` receives `issues.closed`/`issues.reopened` events, HMAC-verified via `GITHUB_WEBHOOK_SECRET`, and syncs status back: closed+completed → `resolved`, closed+not_planned → `declined`, reopened → `in_progress`.
- Image uploads via `/api/feedback/upload`.

### Disputes

CV-level disputes live at `users/{uid}/cvs/{cvId}/disputes`. Flow:
1. User clicks "this CV is wrong" on the preview → `cv-dispute-dialog.tsx` collects ≥20-char complaint
2. `/api/cv/[id]/dispute` calls `disputeGatekeeper()` — single LLM-judge reviewing complaint + CV + job + profile
3. Verdict `approved` → re-trigger regeneration (preserves `pdf_ready` status if applicable; see `fix: dispute houdt pdf_ready status` in git)
4. Verdict `rejected` → returned with rationale, no credit burned for regen

Admin can see and resolve disputes via `/admin/disputes`.

### Admin Tooling

- `/admin/users` — role, credits, disable/enable, templates
- `/admin/cvs` — all CVs across users (read-only, delete)
- `/admin/disputes` — dispute review + manual resolution
- `/admin/emails` — outbound email log
- `/admin/feedback` — feedback inbox (synced with GitHub)
- `/admin/kanban` — `@dnd-kit`-powered task board (`kanban_boards`, `kanban_cards` top-level collections)
- `/admin/platform` — platform AI config (model, costs)
- `/admin/profielen` (NL!) — saved profiles per user
- `/admin/templates` — global templates
- Impersonation banner (`components/admin/impersonation-banner.tsx`) shows when an admin is acting as a user

## Key Types (`src/types/`)

| File | Highlights |
|---|---|
| `index.ts` (~1280 lines) | `ParsedLinkedIn`, `JobVacancy`, `CVStyleConfig`, `GeneratedCVContent`, `GeneratedCVExperience`, `GeneratedCVSkills`, `GeneratedCVEducation`, `CV`, `FitAnalysis`, `User`, `LLMProvider`, `LLMMode`, `OutputLanguage`, `StyleCreativityLevel`, `SavedProfileSummary`, `UserRole`, `TokenUsage`, `StepTokenUsage`, `CVContactInfo`, `CVElementOverrides`, `ElementOverride` |
| `design-tokens.ts` | `CVDesignTokens`, `EditorialTokens`, `BoldTokens`, `HeaderVariant`, `FontPairing`, `SpacingScale`, `SectionStyle`, `CVLayout`, `ContactLayout`, `SkillsDisplay`, `AccentStyle`, `NameStyle`, `SkillTagStyle`, `TypeScale`, `ExperienceDescriptionFormat` + bold/editorial sub-token types |
| `application.ts` | `ApplicationRecord`, `ApplicationStatus` |
| `chat.ts` | `CVChatContext`, `CVChatToolName`, `CVChatMessage`, tool-call param types |
| `mammoth.d.ts` | Ambient declarations for mammoth.js |

## Firebase Collections

Top-level:
- `users/{uid}` — profile, encrypted API keys, credits, role (sensitive fields admin-SDK-only)
- `globalTemplates/{templateId}` — admin-managed templates (auth-read, admin-write)
- `jobs/{jobSlug}` — public read-only job vacancy cache
- `feedback/{feedbackId}` — user feedback (with `githubIssueNumber`)
- `kanban_boards/{boardId}` — admin kanban boards
- `kanban_cards/{cardId}` — kanban cards (denormalized boardId)

Subcollections under `users/{uid}`:
- `transactions/{txId}` — credit purchase/usage (admin-SDK-only, immutable)
- `cvs/{cvId}` — generated CVs
  - `cvs/{cvId}/disputes/{disputeId}` — disputes per CV
- `profiles/{profileId}` — saved LinkedIn-parsed profiles
- `applications/{applicationId}` — job applications tracker (admin-SDK-create, owner-update on `status`/`notes`)
- `templates/{templateId}` — user-uploaded DOCX templates

## Routing

All pages are under `src/app/[locale]/` for i18n. API routes are at `src/app/api/` (not locale-prefixed).

Route groups:
- `(auth)/` — login, register, verify-email (redirect to dashboard if authenticated)
- `(dashboard)/` — protected app surface
- Top-level public: `/`, `/jobs`, `/jobs/[slug]`, `/privacy`, `/terms`, `/ai-transparency`

## Environment Variables

Copy `.env.example` to `.env.local`. Required:
- `NEXT_PUBLIC_FIREBASE_*` — Firebase client config
- `FIREBASE_ADMIN_*` — Admin SDK credentials
- `ENCRYPTION_KEY` — AES-256 key for API key encryption
- `MOLLIE_API_KEY` — payment processing
- `NEXT_PUBLIC_APP_URL` — application URL
- `GITHUB_TOKEN` — feedback → GitHub issue creation (`groeimetai/CVeetje`)
- `GITHUB_WEBHOOK_SECRET` — HMAC verification for `/api/github/webhook`
- `ADMIN_EMAIL` — initial admin (used by `/api/admin/setup`)
- `ADZUNA_APP_ID` + `ADZUNA_API_KEY` — jobs board (optional; falls back to provider-only search if unset)

## Path Aliases

`@/*` maps to `./src/*`

## Important Patterns

- AI content generation uses strict honesty rules — prompts forbid fabricating experience or skills
- Motivation letters get a **second humanizer pass** to remove AI tells (see `lib/ai/humanizer.ts`)
- CV disputes go through a **gatekeeper LLM call** before regenerating — saves credits when the user is wrong
- PDF generation renders the same HTML as preview for WYSIWYG fidelity
- Print CSS in renderers avoids transforms, clip-path, and hover effects for PDF compatibility
- Google Fonts are loaded via `<link>` tags in generated HTML
- `standalone` output mode in `next.config.ts` for Docker/Cloud Run deployment
- Cloud Build trigger on `groeimetai/CVeetje` push to `main` → builds Docker image → pushes to Artifact Registry → deploys to Cloud Run
- Always process DOCX XML replacements in **reverse position order** so earlier indexes stay valid
- `ParsedLinkedIn.birthDate` exists since issue #5 (2026-04-09); `nationality` is not — comes via `customValues`
- Firestore `settings()` is initialized idempotently via `initializeFirestore` (see fix `b2f23d4`)

---

# Code map — waar staat wat

Concrete index voor Claude Code. Voor elk concept vind je hier het exacte bestand en — waar relevant — de exported functie of type.

## Wizard & UI components

| Wat | Locatie |
|---|---|
| Hoofdwizard (9 stappen, state in localStorage) | `src/components/cv/cv-wizard.tsx` |
| Wizard-persistence hook + `WizardStep` type | `src/hooks/use-wizard-persistence.ts` |
| Live preview met inline editing | `src/components/cv/cv-preview.tsx` |
| Element editor (inline rich-text) | `src/components/cv/element-editor.tsx` |
| CV content editor (panel) | `src/components/cv/cv-content-editor.tsx` |
| Profile input (text/image/PDF) | `src/components/cv/profile-input.tsx` |
| LinkedIn URL input | `src/components/cv/linkedin-input.tsx` |
| Job vacancy input | `src/components/cv/job-input.tsx` |
| Fit analysis card | `src/components/cv/fit-analysis-card.tsx` |
| Style picker (legacy) | `src/components/cv/style-picker.tsx` |
| Dynamic style picker (v2 tokens) | `src/components/cv/dynamic-style-picker.tsx` |
| Template style picker | `src/components/cv/template-style-picker.tsx` |
| Style generation progress UI | `src/components/cv/style-generation-progress.tsx` |
| CV chat-edit panel | `src/components/cv/cv-chat-panel.tsx` |
| Template chat panel | `src/components/cv/template-chat-panel.tsx` |
| Template preview | `src/components/cv/template-preview.tsx` |
| Motivation letter section (CV path) | `src/components/cv/motivation-letter-section.tsx` |
| Motivation letter section (template path) | `src/components/cv/template-motivation-letter-section.tsx` |
| CV dispute dialog | `src/components/cv/cv-dispute-dialog.tsx` |
| Token usage display | `src/components/cv/token-usage-display.tsx` |
| Avatar upload | `src/components/cv/avatar-upload.tsx` |

## Other component folders

| Folder | Bevat |
|---|---|
| `src/components/auth/` | `auth-context.tsx` (provides `useAuth()`), login/register/verify-email forms |
| `src/components/admin/` | `cvs-section`, `disputes-section`, `emails-section`, `feedback-section`, `users-table`, `profiles-section`, `platform-config-section`, `global-templates-section`, `impersonation-banner`, detail dialogs (`admin-cv-dialog`, `email-detail-dialog`, `feedback-detail-dialog`, `profile-detail-dialog`, `user-detail-dialog`) |
| `src/components/admin/kanban/` | `kanban-board`, `kanban-column`, `kanban-card`, `card-dialog`, `board-list`, `board-settings-dialog` |
| `src/components/dashboard/` | `sidebar`, `credit-display` |
| `src/components/feedback/` | `feedback-form`, `feedback-image-upload`, `feedback-list`, `feedback-status-badge` |
| `src/components/jobs/` | `job-card`, `job-search-bar`, `job-pagination`, `apply-form` |
| `src/components/landing/` | `cv-showcase` |
| `src/components/profiles/` | `profile-card`, `profile-edit-form`, `profile-enrich-drawer`, `linkedin-export-dialog` |
| `src/components/seo/` | `structured-data`, `job-posting-structured-data` |
| `src/components/templates/` | `template-selector`, `template-configurator`, `template-list`, `templates-page`, `style-or-template-choice` (+ barrel `index.ts`) |
| `src/components/ui/` | shadcn-style primitives (Radix-based): accordion, alert(-dialog), avatar, badge, button, card, dialog, dropdown-menu, form, input, label, logo, progress, select, separator, sheet, slider, sonner, switch, table, tabs, textarea |

## Hooks (`src/hooks/`)

| Hook | Doel |
|---|---|
| `use-cv-chat.ts` | `useCVChat()` — wraps `useChat()` from `@ai-sdk/react`, handles tool-calls to mutate CV-content/tokens |
| `use-template-chat.ts` | Same but for DOCX-template editing |
| `use-wizard-persistence.ts` | localStorage draft management (key `cveetje_wizard_draft`, 24h expiry); exports `WizardStep` |
| `use-profiles.ts` | Saved-profile fetching helper |

## AI generators (`src/lib/ai/`)

| Functie / file | Wat het doet |
|---|---|
| `providers.ts` — `createAIProvider(providerId, apiKey)` | Multi-provider factory (OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek, Fireworks, Together, Azure) |
| `providers.ts` — `getModelId(providerId, modelName)` | Model-ID resolver |
| `platform-provider.ts` — `resolveProvider({ userId, operation })` | **Single source of truth** voor BYOK + credit-handling. Niet dupliceren. |
| `platform-provider.ts` — `chargePlatformCredits(userId, amount, operation)` | Manuele credit-aftrek voor character-based billing (cv-chat) |
| `platform-config.ts` | `PlatformOperation` enum + `PLATFORM_CREDIT_COSTS` + `PLATFORM_MODEL` |
| `platform-config-reader.ts` | Leest platform-config uit Firestore (override van defaults) |
| `models-registry.ts` | Dynamische lijst van beschikbare modellen per provider + `findModelInProviders` |
| `retry.ts` — `withRetry(fn)` | Retry helper voor flaky AI calls |
| `generate-resilient.ts` — `generateObjectResilient(...)` | `generateObject`-wrapper met retries + Anthropic Opus 4.6 fallback bij empty/`{data:...}` responses |
| `temperature.ts` — `resolveTemperature(...)` | Omgaan met models die geen temperature accepteren |
| `date-context.ts` | Current-date context-strings voor prompts |
| `cv-generator.ts` — `generateCV(...)` | CV-content generatie. Bevat inline `honestyRules`, `getIndustryGuidance()`, `languageInstructions`. |
| `humanizer.ts` — `humanizeMotivationLetter(...)` | Tweede LLM-pass die AI tells uit motivatiebrief verwijdert |
| `style-generator-v2.ts` — `generateDesignTokens(...)` | Orchestrator. Kiest expert op `level`, roept `expert.buildPrompt`+`generateObjectResilient`+`expert.normalize` aan, fallback naar `expert.getFallback` |
| `style-generator-v2.ts` — `createLinkedInSummaryV2(linkedIn)` | Bouwt korte summary-string voor token-generation |
| `style-experts/registry.ts` — `getStyleExpert(level)` | Lookup per `StyleCreativityLevel` |
| `style-experts/types.ts` | `StyleExpert` interface, `PromptContext`, `BuiltPrompt` |
| `style-experts/{conservative,balanced,creative,experimental}.ts` | Per-level expert: eigen schema (extend van base), prompt, normalize, fallback |
| `style-experts/shared/base-schema.ts` | Gedeelde Zod-fragmenten |
| `style-experts/shared/prompt-fragments.ts` | Herbruikbare prompt-blokken |
| `style-experts/shared/font-directions.ts`, `color-moods.ts` | Per-mood prompt-helpers |
| `style-experts/shared/linkedin-summary.ts` | Compacte profile summary voor experts |
| `style-experts/shared/normalize-base.ts` | Token-normalisatie met defaults |
| `style-experts/shared/variation.ts` | Rotation-logic om opeenvolgende generaties te variëren |
| `job-parser.ts` — `parseJobVacancy(rawText, ...)` | Vacancy text → `JobVacancy` |
| `fit-analyzer.ts` — `analyzeFit(linkedIn, jobVacancy, ...)` | Profile vs vacancy match-score + verdict + advice |
| `fit-analyzer.ts` — `getVerdictColor`, `getSeverityColor` | UI helpers voor fit-display |
| `motivation-generator.ts` — `generateMotivationLetter(...)` | Cover letter (opening, whyCompany, whyMe, motivation, closing) |
| `motivation-generator.ts` — `formatFullLetter(...)` | Post-processing tot volledige brief met datum/aanhef/closing |
| `template-analyzer.ts` — `analyzeTemplateBlueprint(templateMap, ...)` | DOCX template structure analyse (Zod schema) |
| `template-analyzer.ts` — `analyzeAndFillTemplate(...)` | Combined analyze + fill in één call |
| `template-style-extractor.ts` — `extractStyleFromTemplate(imageBase64, ...)` | AI-vision style extraction uit screenshot |
| `template-style-extractor.ts` — `getTemplateStyleFallbackTokens()` | Fallback design tokens als vision-analyse faalt |
| `docx-content-replacer.ts` — `fillStructuredSegments(...)` | AI-driven DOCX segment fill |
| `docx-content-replacer.ts` — `buildProfileSummary/buildJobSummary/buildFitAnalysisSummary` | Helpers om context-strings te bouwen voor de AI |
| `dispute-gatekeeper.ts` — `runDisputeGatekeeper(...)` | LLM-judge: returns `{ verdict: 'approved'|'rejected', rationale }` |

## CV rendering (`src/lib/cv/`)

| File / functie | Wat het doet |
|---|---|
| `html-generator.ts` — `generateCVHTML(content, tokens, ...)` | **WYSIWYG single source of truth** — produceert dezelfde HTML voor preview én PDF. Delegeert naar editorial/bold renderer bij creative/experimental levels. |
| `renderers/editorial.ts` — `generateEditorialHTML(...)` | Creative-level renderer (editorial/magazine layouts) |
| `renderers/bold.ts` — `generateBoldHTML(...)` | Experimental-level renderer (Canva/Linear-style met sidebars, gradients, skill bars) |
| `templates/index.ts` | Barrel — re-exports voor base.css/themes/adapter |
| `templates/base.css.ts` | `getBaseCSS`, `getHeaderVariantCSS`, `getSectionStyleCSS`, `getSkillsDisplayCSS`, `getAccentStyleCSS`, `getNameStyleCSS`, `getSkillTagStyleCSS`, `getSidebarLayoutCSS`, `fullBleedPageCSS`, `cssVariables`, baseStyles + variant-style maps |
| `templates/themes.ts` | `fontPairings`, `typeScales`, `spacingScales`, `themeDefaults`, `creativityConstraints`, CSS-getters voor font/type/spacing/colors/border-radius, `getFontUrls`, `CreativityLevel` type |
| `templates/decorations.ts` — `generateDecorationsHTML`, `decorationsCSS` | Achtergrond-decoraties per accent style |
| `templates/icons.ts` — `contactIcons`, `contactIconsCSS` | Inline SVG icons voor contact info |
| `templates/color-utils.ts` | Color manipulation (brightness, contrast checks) |
| `templates/adapter.ts` — `tokensToStyleConfig`, `styleConfigToTokens` | Legacy `CVStyleConfig` ↔ `CVDesignTokens` bridge |

## DOCX template system (`src/lib/docx/`)

| File / functie | Wat het doet |
|---|---|
| `smart-template-filler.ts` — `fillSmartTemplate(buffer, options)` | Hoofd-entry voor template fill (orchestreert Phases 1-6) |
| `structure-extractor.ts` — `extractStructuredSegments(...)` | XML-aware extractie met table/row/cell context, bouwt template-map |
| `template-analyzer.ts` (in `lib/ai/`) | AI Phase 1 — zie boven |
| `block-duplicator.ts` — `duplicateBlocksInXml(...)` | Universele duplicatie voor table rows en paragraph groups |
| `docx-content-replacer.ts` (in `lib/ai/`) | AI Phase 2 — zie boven |
| `s4y-template-filler.ts` — `fillS4YTemplate(buffer, options)` | Alternatieve filler voor S4Y-stijl templates |
| `template-filler.ts` | Placeholder-detectie (`{{name}}`, `[NAME]`, `Label: _____`) |
| `image-replacer.ts` — `replaceProfileImage(zip, avatarUrl)` | Phase 6: vervangt embedded placeholder images met user's profielfoto. Selecteert beste portrait candidate via EMU dimension check (>1cm). |
| `docx-to-pdf.ts` | Convert DOCX → PDF via Puppeteer |

## PDF rendering (`src/lib/pdf/`)

| File | Doel |
|---|---|
| `generator.ts` | HTML → PDF via Puppeteer (hoofd-entry voor `/api/cv/[id]/pdf`) |
| `motivation-letter-generator.ts` | PDF voor motivatiebrieven |
| `template-filler.ts` | PDF-side template fill helpers |
| `add-watermark.ts` | Preview-watermark via `pdf-lib` |

## Jobs board (`src/lib/jobs/`)

| File | Doel |
|---|---|
| `search.ts` — `searchJobs(params)` | Fan-out search across providers + filter |
| `cache.ts` | Firestore-backed job cache (`jobs/` collection) |
| `resolve.ts` — `resolveJob(slug)` | Slug → `NormalizedJob` |
| `ats-detector.ts` — `detectAtsFromUrl(url)` | Promote Adzuna redirects to known ATS |
| `job-vacancy-mapper.ts` | `NormalizedJob` → `JobVacancy` voor de wizard |
| `providers/registry.ts` — `getCompanies`, `getProvider` | Known-companies registry |
| `providers/types.ts` | `NormalizedJob`, `JobSearchParams`, `JobSearchResult`, `ApplyQuestion`, `JobSourceProvider`, `buildSlug` |
| `providers/adzuna.ts` | Adzuna search (search-only) |
| `providers/greenhouse.ts` | Greenhouse search + apply (questions API) |
| `providers/lever.ts` | Lever search + apply |
| `providers/recruitee.ts` | Recruitee search + apply |

## API routes (`src/app/api/`)

### CV
| Route | Method | Wat |
|---|---|---|
| `cv/generate/route.ts` | POST | Hoofdgeneratie van CV-content |
| `cv/style/route.ts` | POST | Design token generatie (streaming) |
| `cv/style-from-template/route.ts` | POST | Style extractie uit template-screenshot |
| `cv/fit-analysis/route.ts` | POST | Fit-analyse profile vs vacancy |
| `cv/job/parse/route.ts` | POST | Parse vacancy text → JobVacancy |
| `cv/chat/route.ts` | POST | **Interactive CV-edit chat** (Vercel AI SDK `streamText` + `tool()` calls) |
| `cv/[id]/pdf/route.ts` | POST | PDF-export — **credit-aftrekpunt** |
| `cv/[id]/preview-html/route.ts` | GET | HTML preview van CV |
| `cv/[id]/motivation/route.ts` | POST | Motivatiebrief genereren (met humanizer pass) |
| `cv/[id]/motivation/download/route.ts` | GET | Motivatiebrief download (PDF/DOCX) |
| `cv/[id]/dispute/route.ts` | POST | Dispute indienen — roept gatekeeper aan, evt regen |
| `cv/avatar/route.ts` | POST | Avatar upload |

### Templates
| Route | Method | Wat |
|---|---|---|
| `templates/route.ts` | GET/POST | List + create user templates (`users/{uid}/templates`) |
| `templates/[id]/route.ts` | GET/PATCH/DELETE | Per-template CRUD |
| `templates/[id]/analyze/route.ts` | POST | DOCX structure + style analyse |
| `templates/[id]/fill/route.ts` | POST | Vul template met user data (Phase 1-6) |
| `templates/motivation/route.ts` + `download/` | POST/GET | Motivatiebrief template-flow |

### Profiles & input parsing
| Route | Method | Wat |
|---|---|---|
| `profile/parse/route.ts` | POST | Multi-modal LinkedIn parse (text/image/PDF) |
| `profiles/route.ts` | GET/POST | List + save profielen |
| `profiles/[id]/route.ts` | GET/PATCH/DELETE | Per-profile CRUD |
| `profiles/[id]/enrich/route.ts` | POST | AI enrichment van een bestaand profiel |
| `profiles/[id]/linkedin-export/route.ts` | GET | Export naar LinkedIn-formaat |
| `linkedin/parse/route.ts` | POST | LinkedIn-specifieke parsing |

### Jobs & applications
| Route | Method | Wat |
|---|---|---|
| `jobs/search/route.ts` | GET | Fan-out search over providers |
| `jobs/[slug]/route.ts` | GET | Job detail (resolve via cache → provider) |
| `jobs/[slug]/apply/route.ts` | POST | 1-click apply via ATS provider |
| `applications/route.ts` | GET/POST | List user's applications + record nieuwe |
| `applications/[id]/route.ts` | GET/PATCH/DELETE | Per-application CRUD (status, notes) |

### Auth & settings
| Route | Method | Wat |
|---|---|---|
| `auth/init-user/route.ts` | POST | Firestore user-doc creëren na sign-in |
| `auth/verify-captcha/route.ts` | POST | reCAPTCHA verify |
| `settings/api-key/route.ts` | POST/PATCH/DELETE | Encrypted API key management |
| `settings/llm-mode/route.ts` | POST | Switch BYOK ↔ platform mode |
| `settings/account/route.ts` | DELETE | Account verwijdering |

### Credits & payments
| Route | Method | Wat |
|---|---|---|
| `credits/check-reset/route.ts` | POST | Monthly free credit reset (idempotent) |
| `mollie/checkout/route.ts` | POST | Mollie payment session aanmaken |
| `mollie/webhook/route.ts` | POST | Mollie webhook — credits bijschrijven na betaling |

### Feedback & GitHub sync
| Route | Method | Wat |
|---|---|---|
| `feedback/route.ts` | GET/POST | List + create user feedback (POST creëert auto GitHub issue in `groeimetai/CVeetje`) |
| `feedback/[id]/route.ts` | GET/PATCH/DELETE | Per-feedback CRUD |
| `feedback/upload/route.ts` | POST | Feedback image upload |
| `github/webhook/route.ts` | POST | GitHub webhook — verifieert HMAC, sync issue close/reopen → feedback status |

### Admin
| Route | Method | Wat |
|---|---|---|
| `admin/users/route.ts` + `[userId]/...` | * | User management (rollen, credits, templates) |
| `admin/users/[userId]/credits/route.ts` | * | Credits aanpassen per user |
| `admin/users/[userId]/templates/route.ts` | * | Templates beheren per user |
| `admin/cvs/route.ts` + `[cvId]/route.ts` | * | Alle CVs across users (admin view) |
| `admin/disputes/route.ts` + `[userId]/[disputeId]/resolve/route.ts` | * | Disputes inbox + resolve |
| `admin/emails/route.ts` | * | Email log |
| `admin/feedback/route.ts` + `[id]/...` + `[id]/comments/route.ts` | * | Feedback admin + comments |
| `admin/kanban/boards/route.ts` + `[boardId]/route.ts` | * | Board CRUD (`kanban_boards`) |
| `admin/kanban/cards/route.ts` + `[cardId]/route.ts` + `reorder/route.ts` | * | Card CRUD + reorder (`kanban_cards`) |
| `admin/platform-config/route.ts` | * | Platform AI config (model, costs) |
| `admin/profiles/[userId]/[profileId]/route.ts` | * | Admin profile inspection |
| `admin/impersonate/route.ts` | POST | Start admin impersonation (set cookie) |
| `admin/templates/route.ts` + `[id]/route.ts` | * | Global template CRUD |
| `admin/setup/route.ts` | POST | Initial admin setup via `ADMIN_EMAIL` env var |

### Utilities
| Route | Method | Wat |
|---|---|---|
| `models/route.ts` | GET | Lijst beschikbare AI-modellen |

## Auth & Firebase (`src/lib/firebase/`, `src/lib/auth/`)

| File | Exports |
|---|---|
| `firebase/admin.ts` | `getAdminAuth()`, `getAdminDb()`, `getAdminStorage()` — singleton pattern, idempotente `initializeFirestore` |
| `firebase/admin-utils.ts` | `verifyAdminRequest`, `getUserIdFromToken`, `setUserRole`, `disableUser`, `enableUser`, `getAllUsers`, `getUserById`, `updateUserCredits`, `deleteUser`, `getAllCVs`, `getAdminCVFull`, `deleteAdminCV`, `setupInitialAdmin` |
| `firebase/config.ts` | Firebase client config |
| `firebase/auth.ts` | Client-side auth helpers (`signIn`, `signUp`, OAuth, etc.) |
| `firebase/firestore.ts` | Client-side Firestore CRUD helpers (CVs, profiles, templates, transactions) |
| `auth/impersonation.ts` | `getEffectiveUserId(request)`, `IMPERSONATE_COOKIE_NAME` |
| `components/auth/auth-context.tsx` | `AuthProvider`, `useAuth()` — client-side context met `firebaseUser`, `userData`, `credits`, `isAdmin`, `llmMode`, `effectiveUserId`, `startImpersonation`, `stopImpersonation`, ... |
| `middleware.ts` (root van src) | Locale prefixing + dashboard route guards + auth redirects |

## Credits, payments, encryption, security (`src/lib/`)

| File | Doel |
|---|---|
| `credits/manager.ts` | `checkAndResetMonthlyCredits`, `hasEnoughCredits`, `getDaysUntilReset` |
| `mollie/client.ts` | Mollie client wrapper + checkout/webhook helpers |
| `encryption.ts` | `encrypt(plaintext)`, `decrypt(ciphertext)` — AES-256 voor API keys |
| `email/send.ts` + `email/templates/{base-layout,welcome,credits-low,credits-reset,payment-confirmation}.ts` | Transactional email queueing |
| `recaptcha/client.ts` + `recaptcha/server.ts` | reCAPTCHA v3 verification |
| `security/url-validator.ts` | `validateAvatarURL` — gebruikt door `image-replacer.ts` |
| `security/rate-limiter.ts` | Per-IP/per-user rate limiting |
| `security/error-sanitizer.ts` | Strip stack traces / secrets uit error-responses |
| `security/index.ts` | Barrel exports |
| `github/feedback-issue.ts` | `createFeedbackIssue(...)` — POST naar GitHub Issues API |
| `linkedin/parser.ts` | LinkedIn-specifieke parser logic |
| `template/docx-to-image.ts` | Screenshot een DOCX (gebruikt voor AI-vision style extraction) |
| `validation/schemas.ts` | Shared Zod schemas voor input validation |

## i18n (`src/i18n/`)

- `routing.ts` — locales (`['nl', 'en']`), default `nl`
- `navigation.ts` — typed `Link`, `redirect`, `usePathname`, `useRouter` voor next-intl
- `request.ts` — server-side locale resolution
- `messages/en.json`, `messages/nl.json` — translation strings

## Deployment

| File | Doel |
|---|---|
| `cloudbuild.yaml` | 3 stappen: docker build → push naar Artifact Registry → deploy naar Cloud Run (`europe-west4`, service `cveetje`) |
| `Dockerfile` | Multi-stage build met `standalone` Next.js output |
| `next.config.ts` | `output: 'standalone'` voor Docker/Cloud Run |
| `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules` | Firebase project config |
| `trigger-config.yaml` | Cloud Build trigger config |
| `scripts/setup-gcp.sh` | GCP project bootstrap |

---

# Common dev tasks — waar moet ik kijken?

| Wat wil je doen | Begin hier |
|---|---|
| Nieuwe wizard-stap toevoegen | `src/components/cv/cv-wizard.tsx` (voeg state + render-tak toe) + nieuwe component in `src/components/cv/` + extend `WizardStep` in `use-wizard-persistence.ts` |
| Wizard state aanpassen of debuggen | `src/components/cv/cv-wizard.tsx` + `src/hooks/use-wizard-persistence.ts` |
| Nieuwe AI-generator | Volg pattern van `src/lib/ai/cv-generator.ts`. Provider via `resolveProvider()` als de host route credits af moet kunnen trekken. Schema via Zod. Gebruik `generateObjectResilient` voor flaky Anthropic structured-output. |
| Nieuwe creativity-level voor styles | Implementeer `StyleExpert` interface in nieuwe file onder `src/lib/ai/style-experts/`, voeg toe aan `registry.ts`, en aan `StyleCreativityLevel` in `src/types/index.ts` |
| Nieuwe API route | `src/app/api/<path>/route.ts`. Auth via `getAdminAuth().verifyIdToken()` (cookie of Authorization header). Provider via `resolveProvider()`. |
| Nieuwe admin route | `src/app/api/admin/<path>/route.ts`. Auth via `verifyAdminRequest()` uit `admin-utils.ts`. |
| CV-uiterlijk wijzigen (alle levels) | `src/lib/cv/html-generator.ts` + `src/lib/cv/templates/base.css.ts` + `themes.ts` — geldt voor preview én PDF |
| CV-uiterlijk wijzigen (creative level) | `src/lib/cv/renderers/editorial.ts` |
| CV-uiterlijk wijzigen (experimental level) | `src/lib/cv/renderers/bold.ts` |
| Nieuw design token | Type in `src/types/design-tokens.ts`. Schema in relevante `style-experts/{level}.ts` + `shared/base-schema.ts`. Render in `html-generator.ts` of renderer. |
| Nieuwe DOCX template fill-fase | `src/lib/docx/smart-template-filler.ts` of `s4y-template-filler.ts`. Phase 6 als voorbeeld: `image-replacer.ts`. |
| Nieuwe credit-cost operatie | `src/lib/ai/platform-config.ts` (`PlatformOperation`, `PLATFORM_CREDIT_COSTS`). Aanroepen via `resolveProvider({ userId, operation })`. |
| Motivatiebrief tone of style aanpassen | `src/lib/ai/motivation-generator.ts` (generation) + `src/lib/ai/humanizer.ts` (post-process AI tells) |
| Dispute-gedrag aanpassen | `src/lib/ai/dispute-gatekeeper.ts` (judge) + `src/app/api/cv/[id]/dispute/route.ts` (regen flow) |
| Jobs board provider toevoegen | Nieuwe file in `src/lib/jobs/providers/`, register in `providers/registry.ts`, evt extend `JobSourceProvider` in `providers/types.ts` |
| Applications status flow | `src/types/application.ts` (statussen) + `src/app/api/applications/...` |
| Mollie webhook of payment flow | `src/app/api/mollie/*` + `src/lib/mollie/client.ts` |
| Feedback flow + GitHub sync | `src/app/api/feedback/*` + `src/lib/github/feedback-issue.ts` + `src/app/api/github/webhook/route.ts` |
| Kanban features | `src/app/api/admin/kanban/*` + `src/components/admin/kanban/*` (top-level `kanban_boards` + `kanban_cards`) |
| Nieuwe vertaling | `src/i18n/messages/{nl,en}.json` |
| Auth-gedrag aanpassen | `src/middleware.ts` (route guards), `src/components/auth/auth-context.tsx` (client state), `src/lib/firebase/admin.ts` (server SDK) |
| Impersonation | `src/lib/auth/impersonation.ts` + `src/app/api/admin/impersonate/route.ts` + `src/components/admin/impersonation-banner.tsx` |
| Encryptie van API keys | `src/lib/encryption.ts` (`encrypt`/`decrypt`) — AES-256 |
| Firestore rules | `firestore.rules` (top-level) |
| Cloud Build / deploy issue | `cloudbuild.yaml` + `Dockerfile`. Live status via Google Cloud Console of `gcloud builds list`. |
