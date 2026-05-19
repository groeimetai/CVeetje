# CLAUDE.md

This file is the **router** for Claude Code in dit project. Het bevat alleen project-overzicht en pointers — patterns en details staan in de CLAUDE.md van de relevante subfolder. Sub-CLAUDE.md's worden lazy geladen wanneer Claude met files in die folder werkt; daarom blijft dit dossier bewust kort.

## Project

CVeetje — AI-powered CV generator. Users bring their own AI API keys (encrypted at rest) of gebruiken platform mode (credit-billed Claude Opus). Alle user data blijft in hun Firebase project. Interface in NL met i18n (nl/en). Productie: `maakcveetje.nl`. Repo: `groeimetai/CVeetje`. Deploys via Cloud Build naar Cloud Run (`europe-west4`).

Bundelt naast CV-generation:
- Public **jobs board** (Adzuna + Greenhouse + Lever + Recruitee)
- Per-user **applications tracker**
- **Disputes** flow (AI gatekeeper → regenerate)
- **Feedback** flow met auto GitHub issues
- Admin-only **kanban**
- Multi-modal **template fill** voor DOCX én PDF — flat PDFs zonder formvelden gaan door een AI-vision hybrid (overlay tenzij overflow → HTML-reconstructie), incl. profile-photo replacement en auto-translate naar vacaturetaal

## Commands

```bash
npm run dev      # Dev server met Turbopack (localhost:3000)
npm run build    # Production build (Turbopack disabled via NEXT_PRIVATE_SKIP_TURBOPACK=1)
npm run lint     # ESLint
npm start        # Production server
```

Geen test framework. Ad-hoc test scripts in repo root (`test-detection.js`, `test-local-template.js`, `inspect-docx.js`).

## Tech stack

- **Next.js 16** (App Router) + React 19 + TypeScript 5
- **Tailwind CSS 4** (PostCSS plugin, geen `tailwind.config`)
- **Firebase** (Auth + Firestore + Storage), client + admin SDK
- **Vercel AI SDK** (`ai` v6) — multi-provider
- **Puppeteer** + `@sparticuz/chromium` voor PDF (Cloud Run-compatible)
- **docxtemplater** + `pizzip` + `mammoth` + `docx-preview` voor DOCX templates
- **pdf-lib** voor PDF post-processing (watermarks)
- **next-intl** voor i18n (nl/en), default `nl`
- **Mollie** voor payments
- **@dnd-kit** voor kanban DnD
- **react-hook-form** + `zod` voor forms

## Path aliases

`@/*` → `./src/*`

## Environment variables

Copy `.env.example` → `.env.local`. Required:
- `NEXT_PUBLIC_FIREBASE_*` — Firebase client config
- `FIREBASE_ADMIN_*` — Admin SDK credentials
- `ENCRYPTION_KEY` — AES-256 voor API key encryption
- `MOLLIE_API_KEY` — payments
- `NEXT_PUBLIC_APP_URL` — application URL
- `GITHUB_TOKEN` — feedback → GitHub issue creation (`groeimetai/CVeetje`)
- `GITHUB_WEBHOOK_SECRET` — HMAC verify voor `/api/github/webhook`
- `ADMIN_EMAIL` — initial admin (gebruikt door `/api/admin/setup`)
- `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` — jobs board (optioneel)

## Folder map → waar zit de detail-CLAUDE.md

Onderstaande tabel toont **alleen top-level oriëntatiepunten**. Diepere sub-sub-folders (bijv. `cv-engine/recipes/` of `components/cv/wizard/`) hebben eigen CLAUDE.md's die uit de parent-CLAUDE.md gelinkt zijn.

| Folder | Bevat | CLAUDE.md |
|---|---|---|
| `src/app/[locale]/` | i18n-prefixed pages (auth, dashboard, public) | – (zie `src/middleware.ts` voor routing-flow) |
| `src/app/api/` | REST endpoints | ✅ `src/app/api/CLAUDE.md` |
| `src/components/` | Component overzicht | ✅ `src/components/CLAUDE.md` |
| `src/components/cv/` | CV wizard, preview, chat, dispute dialog | ✅ `src/components/cv/CLAUDE.md` |
| `src/components/admin/` | Admin sections + kanban | ✅ `src/components/admin/CLAUDE.md` |
| `src/hooks/` | React hooks (wizard, chat, profiles) | ✅ `src/hooks/CLAUDE.md` |
| `src/i18n/` | next-intl setup + translations | ✅ `src/i18n/CLAUDE.md` |
| `src/lib/admin/` | `audit-log.ts` — AVG art. 32 admin-actie audit-trail | ✅ `src/lib/admin/CLAUDE.md` |
| `src/lib/ai/` | AI generators, providers, style experts, platform-config | ✅ `src/lib/ai/CLAUDE.md` |
| `src/lib/credits/` | Credits manager + monthly reset | ✅ `src/lib/credits/CLAUDE.md` |
| `src/lib/cv-engine/` | **Active CV style engine (v2)** — recipes, OKLch palettes, 4 layout shapes, AI orchestrator | ✅ `src/lib/cv-engine/CLAUDE.md` |
| `src/lib/cv/` | **Legacy** HTML generator + renderers + style templates (v1 docs only) | ✅ `src/lib/cv/CLAUDE.md` |
| `src/lib/docx/` | DOCX template system (6 phases) | ✅ `src/lib/docx/CLAUDE.md` |
| `src/lib/email/` | Transactional emails (templates + send) | ✅ `src/lib/email/templates/CLAUDE.md` |
| `src/lib/firebase/` | Admin + client SDK, auth helpers, collecties | ✅ `src/lib/firebase/CLAUDE.md` |
| `src/lib/jobs/` | Jobs board + ATS providers + applications | ✅ `src/lib/jobs/CLAUDE.md` |
| `src/lib/pdf/` | Puppeteer PDF generation | ✅ `src/lib/pdf/CLAUDE.md` |
| `src/types/` | Centrale type-definities (domain-split + barrel) | ✅ `src/types/CLAUDE.md` |
| `src/lib/auth/` | Impersonation helper | (klein — zie `src/lib/firebase/CLAUDE.md`) |
| `src/lib/encryption.ts` | AES-256 voor API keys | (single file) |
| `src/lib/github/` | `feedback-issue.ts` — GitHub issue create | (klein) |
| `src/lib/indexnow/` | IndexNow submission helper | (klein) |
| `src/lib/linkedin/` | LinkedIn-specifieke parser | (klein) |
| `src/lib/mollie/` | Mollie API client wrapper | (klein) |
| `src/lib/recaptcha/` | reCAPTCHA v3 verify (client + server) | (klein) |
| `src/lib/security/` | rate-limiter, url-validator, error-sanitizer | (klein) |
| `src/lib/template/` | `docx-to-image.ts` (screenshot voor AI vision) | (klein) |
| `src/lib/validation/` | Shared Zod schemas | (klein) |
| `src/middleware.ts` | Locale prefix + auth route guards | – |
| `docs/compliance/` | AVG + EU AI Act dossier (RoPA, DPIA, FRIA, TIA, DSR, incident-response, retention, vendor-review) | ✅ `docs/compliance/README.md` |

## Deployment

- `output: 'standalone'` in `next.config.ts` voor Docker/Cloud Run
- Cloud Build trigger op push naar `main` → builds Docker image → pusht naar Artifact Registry → deployt naar Cloud Run
- Files: `cloudbuild.yaml`, `Dockerfile`, `trigger-config.yaml`, `scripts/setup-gcp.sh`
- Service: `cveetje` in `europe-west4`

## Common dev tasks — waar moet ik kijken?

| Wat wil je doen | Begin hier |
|---|---|
| Nieuwe wizard-stap | `src/components/cv/CLAUDE.md` + `src/hooks/CLAUDE.md` |
| Wizard state debuggen | `src/hooks/CLAUDE.md` |
| Nieuwe AI-generator | `src/lib/ai/CLAUDE.md` |
| Nieuwe creativity-level voor styles | `src/lib/ai/CLAUDE.md` + `src/lib/ai/style-experts/STYLE-SYSTEM.md` |
| Nieuwe API route | `src/app/api/CLAUDE.md` |
| Nieuwe admin route | `src/app/api/CLAUDE.md` + `src/lib/firebase/CLAUDE.md` |
| Admin actie die persoonsdata raakt (AVG audit) | `src/lib/admin/CLAUDE.md` |
| CV-uiterlijk wijzigen (nieuwe v2 engine) | `src/lib/cv-engine/CLAUDE.md` |
| CV-uiterlijk wijzigen (legacy v1) | `src/lib/cv/CLAUDE.md` + `src/lib/ai/style-experts/STYLE-SYSTEM.md` |
| Nieuw design token (v2) | `src/lib/cv-engine/CLAUDE.md` |
| Nieuw design token (v1, legacy) | `src/types/CLAUDE.md` + `src/lib/cv/CLAUDE.md` + `src/lib/ai/style-experts/STYLE-SYSTEM.md` |
| Nieuwe DOCX template fill-fase | `src/lib/docx/CLAUDE.md` |
| Nieuwe credit-cost operatie | `src/lib/ai/CLAUDE.md` + `src/lib/credits/CLAUDE.md` |
| Motivatiebrief tone aanpassen | `src/lib/ai/CLAUDE.md` (motivation + humanizer) |
| Dispute-gedrag aanpassen | `src/lib/ai/CLAUDE.md` (gatekeeper) + `src/app/api/CLAUDE.md` |
| Jobs board provider toevoegen | `src/lib/jobs/CLAUDE.md` |
| Applications status flow | `src/types/CLAUDE.md` + `src/app/api/CLAUDE.md` |
| Mollie webhook | `src/app/api/CLAUDE.md` |
| Feedback / GitHub sync | `src/app/api/CLAUDE.md` |
| Kanban features | `src/components/admin/CLAUDE.md` |
| Nieuwe vertaling | `src/i18n/CLAUDE.md` |
| Compliance-pagina syncen | `src/i18n/CLAUDE.md` + `docs/compliance/README.md` |
| Auth-gedrag aanpassen | `src/lib/firebase/CLAUDE.md` |
| Impersonation | `src/lib/firebase/CLAUDE.md` |
| Encryptie van API keys | `src/lib/encryption.ts` (`encrypt`/`decrypt`) — AES-256 |
| Firestore rules | `firestore.rules` (root) |
| Cloud Build / deploy issue | `cloudbuild.yaml` + `Dockerfile`. Status via Google Cloud Console of `gcloud builds list`. |

## Notes voor Claude Code

- **Cross-cutting patterns** (AI honesty rules, DOCX reverse-order XML, `resolveProvider()` single source of truth, `verifyAdminRequest()`, Firestore `settings()` idempotency, `ParsedLinkedIn.birthDate` quirk, etc.) zijn **bewust verhuisd naar de relevante sub-CLAUDE.md's**. Ze staan dáár omdat ze daar gelden, en worden zo lazy geladen wanneer je in die folder werkt — i.p.v. permanent in elke context.
- **Sub-CLAUDE.md's worden lazy geladen** wanneer Claude met files in die folder werkt — dit dossier blijft daarom kort.
- Gebruik **geen** `@./relative/path` imports — die laden eager en defeaten lazy loading.
- Bij twijfel: lees eerst de sub-CLAUDE.md van de relevante folder voordat je conclusies trekt.
