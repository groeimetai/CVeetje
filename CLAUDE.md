# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CVeetje is an AI-powered CV generator that creates tailored CVs from LinkedIn/profile data and job vacancy requirements. Users bring their own AI API keys (encrypted at rest), and all data stays in their Firebase project. Interface is in Dutch with i18n support (nl/en). Productie: maakcveetje.nl. Repo: `groeimetai/CVeetje`. Deployt via Cloud Build naar Cloud Run (`europe-west4`).

## Commands

```bash
npm run dev      # Dev server with Turbopack (localhost:3000)
npm run build    # Production build (Turbopack disabled via NEXT_PRIVATE_SKIP_TURBOPACK=1)
npm run lint     # ESLint
npm start        # Production server
```

No test framework is configured (no Jest/Vitest).

## Tech Stack

- **Next.js 16** (App Router) with React 19, TypeScript 5
- **Tailwind CSS 4** (via PostCSS plugin, no tailwind.config file)
- **Firebase** (Auth + Firestore) for client and admin SDK
- **Vercel AI SDK** (`ai` package) with multi-provider support (OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek, etc.)
- **Puppeteer** + `@sparticuz/chromium` for PDF generation
- **docxtemplater** + `mammoth` for DOCX template filling
- **next-intl** for i18n (nl/en), default locale is `nl`
- **Mollie** for payments

## Architecture

### CV Generation Flow

The wizard in `src/components/cv/cv-wizard.tsx` orchestrates:

1. **Profile Input** → multi-modal (text, image, PDF) → AI parses to `ParsedLinkedIn`
2. **Job Input** → vacancy text → AI parses to `JobVacancy` with keywords
3. **Style Generation** → AI generates `CVDesignTokens` (~20 properties vs legacy `CVStyleConfig` with 150+)
4. **CV Generation** → `/api/cv/generate` → AI generates `GeneratedCVContent` with Zod schema validation
5. **Preview** → `cv-preview.tsx` with interactive element editing
6. **Export** → PDF via Puppeteer or DOCX via template filling

### WYSIWYG HTML Generation

`src/lib/cv/html-generator.ts` (`generateCVHTML()`) produces **identical HTML** for both browser preview and PDF rendering. This is the single source of truth for CV appearance. Changes here affect both preview and PDF output.

### Design Token System

Two styling systems coexist:
- **Legacy `CVStyleConfig`** — 150+ properties, used by `style-generator.ts`
- **Modern `CVDesignTokens`** — ~20 token properties, used by `style-generator-v2.ts`

Design tokens include theme bases (professional, modern, creative, minimal, bold), font pairings, header variants, section styles, and skill display modes. Types in `src/types/design-tokens.ts`.

### AI Integration (`src/lib/ai/`)

All AI calls use Vercel AI SDK's `generateObject()` with Zod schemas for structured output. Key generators:
- `cv-generator.ts` — CV content (summary, experience, education, skills)
- `style-generator-v2.ts` — Design tokens from profile + job context
- `job-parser.ts` — Vacancy text → structured `JobVacancy`
- `fit-analyzer.ts` — Profile-to-job fit scoring
- `motivation-generator.ts` — Cover letters
- `docx-content-replacer.ts` — AI-powered DOCX placeholder filling

`providers.ts` is a factory that creates provider instances from user-supplied API keys. `models-registry.ts` fetches available models dynamically.

### DOCX Template System (`src/lib/docx/`)

- `template-filler.ts` — Detects placeholders (`{{name}}`, `[NAME]`, `Label: _____`)
- `smart-template-filler.ts` — AI analyzes template structure, fills sections intelligently
- `s4y-template-filler.ts` — Alternative filler for S4Y-style templates
- `image-replacer.ts` — Phase 6 post-processing: replaces embedded placeholder images with the user's profile photo
- `docx-to-pdf.ts` — Converts DOCX to PDF via Puppeteer

### Authentication & Middleware

- Firebase Auth (email/password, Google OAuth) with token in `firebase-token` cookie
- `src/middleware.ts` — Protects dashboard routes, redirects auth routes, handles locale routing
- API routes verify tokens via Firebase Admin SDK from cookie or Authorization header
- User API keys encrypted with AES-256 (`src/lib/encryption.ts`)
- Admin checks via `src/lib/firebase/admin-utils.ts` (`verifyAdminRequest`) — checks custom claims first, falls back to Firestore role
- Admin impersonation via `src/lib/auth/impersonation.ts` (`getEffectiveUserId`) — read by `/api/admin/impersonate`

### Credits System

`src/lib/credits/manager.ts` manages free monthly credits + purchased credits (via Mollie). 1 credit per PDF download. BYOK (own API key) users pay 0 credits for AI operations; platform users have per-operation costs in `src/lib/ai/platform-config.ts`.

## Key Types (`src/types/index.ts`)

All types are centralized in one ~1100-line file:
- `ParsedLinkedIn` — Profile data (experience, education, skills, languages)
- `JobVacancy` — Parsed job with keywords, requirements, salary estimate
- `CVStyleConfig` / `CVDesignTokens` — Visual styling configs
- `GeneratedCVContent` — AI output (summary, experience entries, education, skills)
- `CV` — Full Firestore document combining content + style + metadata
- `FitAnalysis` — Job fit score with strengths/warnings
- `User`, `LLMProvider`, `LLMMode`, `OutputLanguage`, `StyleCreativityLevel` — config + auth types

## Firebase Collections

- `users` — Profiles with encrypted API keys, credit balances, role
- `users/{uid}/profiles` — Saved LinkedIn-parsed profiles per user
- `users/{uid}/cvs` — Generated CV documents per user
- `users/{uid}/transactions` — Credit purchase/usage records per user
- `users/{uid}/templates` — User-uploaded DOCX templates

## Routing

All pages are under `src/app/[locale]/` for i18n. Route groups:
- `(auth)/` — Login, register, verify-email (redirects to dashboard if authenticated)
- `(dashboard)/` — Dashboard, CV creation, profiles, settings, admin (protected)

API routes are at `src/app/api/` (not locale-prefixed). Key endpoints:
- `/api/cv/generate`, `/api/cv/style`, `/api/cv/[id]/pdf`
- `/api/templates/[id]/analyze`, `/api/templates/[id]/fill`
- `/api/profile/parse`, `/api/cv/job/parse`
- `/api/settings/api-key` — Encrypted key management

## Environment Variables

Copy `.env.example` to `.env.local`. Required:
- `NEXT_PUBLIC_FIREBASE_*` — Firebase client config
- `FIREBASE_ADMIN_*` — Admin SDK credentials
- `ENCRYPTION_KEY` — AES-256 key for API key encryption
- `MOLLIE_API_KEY` — Payment processing
- `NEXT_PUBLIC_APP_URL` — Application URL

## Path Aliases

`@/*` maps to `./src/*`

## Important Patterns

- AI content generation uses strict honesty rules — prompts forbid fabricating experience or skills
- PDF generation renders the same HTML as preview for WYSIWYG fidelity
- Print CSS in `html-generator.ts` avoids transforms, clip-path, and hover effects for PDF compatibility
- Google Fonts are loaded via `<link>` tags in generated HTML
- `standalone` output mode in `next.config.ts` for Docker/Cloud Run deployment
- Cloud Build trigger op `groeimetai/CVeetje` push naar `main` → bouwt Docker image → push naar Artifact Registry → deploy naar Cloud Run

---

# Code map — waar staat wat

Dit is een concrete index voor Claude Code. Voor elk concept vind je hier het exacte bestand en — waar relevant — de exported functie of type.

## Wizard & UI

| Wat | Locatie |
|---|---|
| Hoofdwizard (9 stappen, state in localStorage) | `src/components/cv/cv-wizard.tsx` |
| Wizard-persistence hook | `src/hooks/use-wizard-persistence.ts` |
| Live preview met inline editing | `src/components/cv/cv-preview.tsx` |
| Element editor | `src/components/cv/element-editor.tsx` |
| Profile input (text/image/PDF) | `src/components/cv/profile-input.tsx` |
| LinkedIn URL input | `src/components/cv/linkedin-input.tsx` |
| Job vacancy input | `src/components/cv/job-input.tsx` |
| Fit analysis card | `src/components/cv/fit-analysis-card.tsx` |
| Style picker (legacy) | `src/components/cv/style-picker.tsx` |
| Dynamic style picker (v2) | `src/components/cv/dynamic-style-picker.tsx` |
| Template style picker | `src/components/cv/template-style-picker.tsx` |
| Style generation progress UI | `src/components/cv/style-generation-progress.tsx` |
| CV chat-edit panel | `src/components/cv/cv-chat-panel.tsx` |
| Template chat panel | `src/components/cv/template-chat-panel.tsx` |
| Template preview | `src/components/cv/template-preview.tsx` |
| Motivation letter section | `src/components/cv/motivation-letter-section.tsx` |
| Token usage display | `src/components/cv/token-usage-display.tsx` |
| Avatar upload | `src/components/cv/avatar-upload.tsx` |
| Dashboard sidebar | `src/components/dashboard/sidebar.tsx` |
| Dashboard credit display | `src/components/dashboard/credit-display.tsx` |

## Hooks (`src/hooks/`)

| Hook | Doel |
|---|---|
| `use-cv-chat.ts` | `useCVChat()` — wrapt `useChat()` van `@ai-sdk/react`, handelt tool-calls af om CV-content/tokens te muteren |
| `use-template-chat.ts` | Hetzelfde maar voor DOCX-template editing |
| `use-wizard-persistence.ts` | localStorage draft management voor de wizard (key `cveetje_wizard_draft`, expires 24h) |
| `use-profiles.ts` | Saved-profile fetching helper |

## AI generators (`src/lib/ai/`)

| Functie / file | Wat het doet |
|---|---|
| `providers.ts` — `createAIProvider(providerId, apiKey)` | Multi-provider factory (OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek, Fireworks, Together, Azure) |
| `providers.ts` — `getModelId(providerId, modelName)` | Model-ID resolver |
| `platform-provider.ts` — `resolveProvider({ userId, operation })` | **Single source of truth** voor BYOK + credit-handling. Niet dupliceren. |
| `platform-provider.ts` — `chargePlatformCredits(userId, amount, operation)` | Manuele credit-aftrek voor character-based billing (cv-chat) |
| `platform-config.ts` | `PlatformOperation` enum + `PLATFORM_CREDIT_COSTS` + `PLATFORM_MODEL` |
| `models-registry.ts` | Dynamische lijst van beschikbare modellen per provider |
| `retry.ts` — `withRetry(fn)` | Retry helper voor flaky AI calls |
| `cv-generator.ts` — `generateCV(...)` | CV-content generatie. Bevat inline `honestyRules`, `getIndustryGuidance()`, `languageInstructions`. |
| `style-generator-v2.ts` — `generateDesignTokens(...)` | Design tokens vanuit profile-summary + (optioneel) job |
| `style-generator-v2.ts` — `createLinkedInSummaryV2(linkedIn)` | Bouwt korte summary-string voor token-generation |
| `job-parser.ts` — `parseJobVacancy(rawText, ...)` | Vacancy text → `JobVacancy` |
| `fit-analyzer.ts` — `analyzeFit(linkedIn, jobVacancy, ...)` | Profile vs vacancy match-score + verdict + advice |
| `fit-analyzer.ts` — `getVerdictColor(verdict)`, `getSeverityColor(severity)` | UI helpers voor fit-display |
| `motivation-generator.ts` — `generateMotivationLetter(...)` | Cover letter (opening, whyCompany, whyMe, motivation, closing) |
| `motivation-generator.ts` — `formatFullLetter(...)` | Post-processing tot volledige brief met datum/aanhef/closing |
| `template-analyzer.ts` — `analyzeTemplateBlueprint(templateMap, ...)` | DOCX template structure analyse |
| `template-analyzer.ts` — `analyzeAndFillTemplate(...)` | Combined analyze + fill in één call |
| `template-style-extractor.ts` — `extractStyleFromTemplate(imageBase64, ...)` | AI-vision style extraction uit screenshot |
| `template-style-extractor.ts` — `getTemplateStyleFallbackTokens()` | Fallback design tokens als vision-analyse faalt |
| `docx-content-replacer.ts` — `fillStructuredSegments(...)` | AI-driven DOCX segment fill |
| `docx-content-replacer.ts` — `buildProfileSummary/buildJobSummary/buildFitAnalysisSummary` | Helpers om context-strings te bouwen voor de AI |

## CV rendering (`src/lib/cv/`)

| File / functie | Wat het doet |
|---|---|
| `html-generator.ts` — `generateCVHTML(content, tokens, ...)` | **WYSIWYG single source of truth** — produceert dezelfde HTML voor preview én PDF |

## DOCX template system (`src/lib/docx/`)

| File / functie | Wat het doet |
|---|---|
| `smart-template-filler.ts` — `fillSmartTemplate(buffer, options)` | Hoofd-entry voor template fill (Phases 1-6) |
| `s4y-template-filler.ts` — `fillS4YTemplate(buffer, options)` | Alternatieve filler voor S4Y-stijl templates |
| `template-filler.ts` | Placeholder-detectie (`{{name}}`, `[NAME]`, `Label: _____`) |
| `block-duplicator.ts` — `duplicateBlocksInXml(...)` | Dupliceert repeating blocks in DOCX XML |
| `image-replacer.ts` — `replaceProfileImage(zip, avatarUrl)` | Phase 6: vervangt embedded placeholder images met user's profielfoto. Selecteert beste portrait candidate via EMU dimension check (>1cm). |
| `docx-to-pdf.ts` | Convert DOCX → PDF via Puppeteer |

## API routes (`src/app/api/`)

### CV
| Route | Method | Wat |
|---|---|---|
| `cv/generate/route.ts` | POST | Hoofdgeneratie van CV-content |
| `cv/style/route.ts` | POST | Design token generatie (streaming) |
| `cv/style-from-template/route.ts` | POST | Style extractie uit template |
| `cv/fit-analysis/route.ts` | POST | Fit-analyse profile vs vacancy |
| `cv/job/parse/route.ts` | POST | Parse vacancy text → JobVacancy |
| `cv/chat/route.ts` | POST | **Interactive CV-edit chat** (Vercel AI SDK `streamText` + `tool()` calls) |
| `cv/[id]/pdf/route.ts` | POST | PDF-export — **dit is het credit-aftrekpunt** |
| `cv/[id]/preview-html/route.ts` | GET | HTML preview van CV |
| `cv/[id]/motivation/route.ts` | POST | Motivatiebrief genereren |
| `cv/[id]/motivation/download/route.ts` | GET | Motivatiebrief download |
| `cv/avatar/route.ts` | POST | Avatar upload |

### Templates
| Route | Method | Wat |
|---|---|---|
| `templates/route.ts` | GET/POST | List + create user templates |
| `templates/[id]/route.ts` | GET/PATCH/DELETE | Per-template CRUD |
| `templates/[id]/analyze/route.ts` | POST | DOCX structure + style analyse |
| `templates/[id]/fill/route.ts` | POST | Vul template met user data (Phase 1-6, inclusief image replace) |
| `templates/motivation/route.ts` + `templates/motivation/download/route.ts` | POST/GET | Motivatiebrief template flow |

### Profiles & input parsing
| Route | Method | Wat |
|---|---|---|
| `profile/parse/route.ts` | POST | Multi-modal LinkedIn parse (text/image/PDF) |
| `profiles/route.ts` | GET/POST | List + save profielen |
| `profiles/[id]/route.ts` | GET/PATCH/DELETE | Per-profile CRUD |
| `profiles/[id]/enrich/route.ts` | POST | AI enrichment van een bestaand profiel |
| `profiles/[id]/linkedin-export/route.ts` | GET | Export naar LinkedIn-formaat |
| `linkedin/parse/route.ts` | POST | LinkedIn-specifieke parsing |

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
| `mollie/webhook/route.ts` | POST | Mollie webhook handler — credits bijschrijven na betaling |

### Admin
| Route | Method | Wat |
|---|---|---|
| `admin/users/route.ts` + `[userId]/...` | GET/POST/etc | User management (rollen, credits, templates) |
| `admin/impersonate/route.ts` | POST | Start admin impersonation (set cookie) |
| `admin/templates/route.ts` + `[id]/route.ts` | * | Admin template CRUD |
| `admin/setup/route.ts` | POST | Initial admin setup via `ADMIN_EMAIL` env var |
| `admin/kanban/...` | * | Admin kanban features |

### Utilities
| Route | Method | Wat |
|---|---|---|
| `models/route.ts` | GET | Lijst beschikbare AI-modellen |
| `feedback/...` | * | User feedback flow — POST creëert auto GitHub issue in `groeimetai/CVeetje` en slaat `githubIssueNumber` op de feedback doc op |
| `github/webhook/route.ts` | POST | GitHub webhook receiver — verifieert HMAC (`GITHUB_WEBHOOK_SECRET`) en syncct `issues.closed`/`issues.reopened` terug naar de feedback `status` (closed+completed → `resolved`, closed+not_planned → `declined`, reopened → `in_progress`) |

## Auth & Firebase (`src/lib/firebase/`, `src/lib/auth/`)

| File | Exports |
|---|---|
| `firebase/admin.ts` | `getAdminAuth()`, `getAdminDb()`, `getAdminStorage()` — singleton pattern |
| `firebase/admin-utils.ts` | `verifyAdminRequest(token)`, `getUserIdFromToken(token)`, `setUserRole`, `disableUser`, `enableUser`, `getAllUsers`, `getUserById`, `updateUserCredits`, `deleteUser`, `getAllCVs`, `getAdminCVFull`, `deleteAdminCV`, `setupInitialAdmin` |
| `firebase/client.ts` (of vergelijkbaar) | Firebase client SDK init |
| `auth/impersonation.ts` | `getEffectiveUserId(request)`, `IMPERSONATE_COOKIE_NAME` |
| `components/auth/auth-context.tsx` | `AuthProvider`, `useAuth()` — client-side context met `firebaseUser`, `userData`, `credits`, `isAdmin`, `llmMode`, `effectiveUserId`, `startImpersonation`, `stopImpersonation`, ... |
| `middleware.ts` (root van src) | Locale prefixing + dashboard route guards + auth redirects |

## Credits, payments & encryption (`src/lib/`)

| File | Doel |
|---|---|
| `credits/manager.ts` | `checkAndResetMonthlyCredits`, `hasEnoughCredits`, `getDaysUntilReset` |
| `mollie/` | Mollie client wrapper + checkout helpers |
| `encryption.ts` | `encrypt(plaintext)`, `decrypt(ciphertext)` — AES-256 voor API keys |
| `email/send.ts` + `email/templates/*` | Transactional email queueing |
| `recaptcha/` | reCAPTCHA v3 verification |
| `security/url-validator.ts` | `validateAvatarURL` — wordt o.a. door `image-replacer.ts` gebruikt |

## Types (`src/types/`)

| File | Belangrijkste types |
|---|---|
| `index.ts` (~1100 regels) | `ParsedLinkedIn`, `JobVacancy`, `CVStyleConfig`, `GeneratedCVContent`, `GeneratedCVExperience`, `GeneratedCVSkills`, `GeneratedCVEducation`, `CV`, `FitAnalysis`, `User`, `LLMProvider`, `LLMMode`, `OutputLanguage`, `StyleCreativityLevel`, `SavedProfileSummary`, `UserRole`, `TokenUsage` |
| `design-tokens.ts` | `CVDesignTokens`, `HeaderVariant`, `FontPairing`, `SpacingScale`, `SectionStyle`, `CVLayout`, `ContactLayout`, `SkillsDisplay`, `AccentStyle`, `NameStyle`, `SkillTagStyle`, `TypeScale`, `ExperienceDescriptionFormat` |
| `chat.ts` | `CVChatContext`, `CVChatToolName`, `CVChatMessage`, tool-call param types |

## i18n (`src/i18n/`)

- `routing.ts` — locales (`['nl', 'en']`), default `nl`
- `navigation.ts` — typed `Link`, `redirect`, `usePathname`, `useRouter` voor next-intl
- `request.ts` — server-side locale resolution
- `messages/` — translation JSON files per locale

## Deployment

| File | Doel |
|---|---|
| `cloudbuild.yaml` | 3 stappen: docker build → push naar Artifact Registry → deploy naar Cloud Run (`europe-west4`, service `cveetje`) |
| `Dockerfile` | Multi-stage build met `standalone` Next.js output |
| `next.config.ts` | `output: 'standalone'` voor Docker/Cloud Run |
| `firebase.json`, `firestore.rules`, `storage.rules` | Firebase project config |

---

# Common dev tasks — waar moet ik kijken?

| Wat wil je doen | Begin hier |
|---|---|
| Nieuwe wizard-stap toevoegen | `src/components/cv/cv-wizard.tsx` (voeg state + render-tak toe) + nieuwe component in `src/components/cv/` |
| Wizard state aanpassen of debuggen | `src/components/cv/cv-wizard.tsx` + `src/hooks/use-wizard-persistence.ts` |
| Nieuwe AI-generator | Volg pattern van `src/lib/ai/cv-generator.ts`. Provider via `createAIProvider()` (of liever via `resolveProvider()` als de host route credits af moet kunnen trekken). Schema via Zod. |
| Nieuwe API route | `src/app/api/<path>/route.ts`. Auth via `getAdminAuth().verifyIdToken()` (cookie of Authorization header). Provider via `resolveProvider()`. |
| Nieuwe admin route | `src/app/api/admin/<path>/route.ts`. Auth via `verifyAdminRequest()` uit `admin-utils.ts`. |
| CV-uiterlijk wijzigen | `src/lib/cv/html-generator.ts` — geldt voor preview én PDF tegelijk |
| Nieuw design token | Type in `src/types/design-tokens.ts`. Schema in `src/lib/ai/style-generator-v2.ts`. Render in `html-generator.ts`. |
| Nieuwe DOCX template fill-fase | `src/lib/docx/smart-template-filler.ts` of `s4y-template-filler.ts`. Phase 6 als voorbeeld: `image-replacer.ts`. |
| Nieuwe credit-cost operatie | `src/lib/ai/platform-config.ts` (`PlatformOperation`, `PLATFORM_CREDIT_COSTS`). Aanroepen via `resolveProvider({ userId, operation })`. |
| Mollie webhook of payment flow | `src/app/api/mollie/*` + `src/lib/mollie/` |
| Nieuwe vertaling | `src/i18n/messages/{nl,en}.json` |
| Auth-gedrag aanpassen | `src/middleware.ts` (route guards), `src/components/auth/auth-context.tsx` (client state), `src/lib/firebase/admin.ts` (server SDK) |
| Impersonation | `src/lib/auth/impersonation.ts` + `src/app/api/admin/impersonate/route.ts` |
| Encryptie van API keys | `src/lib/encryption.ts` (`encrypt`/`decrypt`) — AES-256 |
| Cloud Build / deploy issue | `cloudbuild.yaml` + `Dockerfile`. Live status via Google Cloud Console of `gcloud builds list`. |
