# CLAUDE.md

This file is the **router** for Claude Code in dit project. Het bevat alleen high-level info en pointers — voor details kijk je in de CLAUDE.md van de relevante subfolder. Subfolder CLAUDE.md's worden lazy geladen wanneer Claude met files in die folder werkt, dus daar mag detail in.

## Project

CVeetje — AI-powered CV generator. Users bring their own AI API keys (encrypted at rest) of gebruiken platform mode (credit-billed Claude Opus). Alle user data blijft in hun Firebase project. Interface in NL met i18n (nl/en). Productie: `maakcveetje.nl`. Repo: `groeimetai/CVeetje`. Deploys via Cloud Build naar Cloud Run (`europe-west4`).

Bundelt naast CV-generation:
- Public **jobs board** (Adzuna + Greenhouse + Lever + Recruitee)
- Per-user **applications tracker**
- **Disputes** flow (AI gatekeeper → regenerate)
- **Feedback** flow met auto GitHub issues
- Admin-only **kanban**
- Multi-modal **DOCX template fill** (incl. profile-photo replacement)

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

| Folder | Bevat | CLAUDE.md |
|---|---|---|
| `src/app/[locale]/` | i18n-prefixed pages (auth, dashboard, public) | – |
| `src/app/api/` | REST endpoints | ✅ `src/app/api/CLAUDE.md` |
| `src/components/` | Component overzicht | ✅ `src/components/CLAUDE.md` |
| `src/components/cv/` | CV wizard, preview, chat, dispute dialog | ✅ `src/components/cv/CLAUDE.md` |
| `src/components/admin/` | Admin sections + kanban | ✅ `src/components/admin/CLAUDE.md` |
| `src/hooks/` | React hooks (wizard, chat, profiles) | ✅ `src/hooks/CLAUDE.md` |
| `src/i18n/` | next-intl setup + translations | ✅ `src/i18n/CLAUDE.md` |
| `src/lib/ai/` | AI generators, providers, style experts, platform-config | ✅ `src/lib/ai/CLAUDE.md` (+ `src/lib/ai/style-experts/STYLE-SYSTEM.md` voor volledige routekaart per creativity level) |
| `src/lib/credits/` | Credits manager + monthly reset | ✅ `src/lib/credits/CLAUDE.md` |
| `src/lib/cv/` | HTML generator + renderers + style templates | ✅ `src/lib/cv/CLAUDE.md` |
| `src/lib/docx/` | DOCX template system (5 phases) | ✅ `src/lib/docx/CLAUDE.md` |
| `src/lib/firebase/` | Admin + client SDK, auth helpers, collecties | ✅ `src/lib/firebase/CLAUDE.md` |
| `src/lib/jobs/` | Jobs board + ATS providers + applications | ✅ `src/lib/jobs/CLAUDE.md` |
| `src/lib/pdf/` | Puppeteer PDF generation | ✅ `src/lib/pdf/CLAUDE.md` |
| `src/types/` | Centrale type-definities | ✅ `src/types/CLAUDE.md` |
| `src/lib/auth/` | Impersonation helper | (klein — zie `src/lib/firebase/CLAUDE.md`) |
| `src/lib/email/` | Transactional emails (templates + send) | (klein) |
| `src/lib/encryption.ts` | AES-256 voor API keys | (single file) |
| `src/lib/github/` | `feedback-issue.ts` — GitHub issue create | (klein) |
| `src/lib/linkedin/` | LinkedIn-specifieke parser | (klein) |
| `src/lib/mollie/` | Mollie API client wrapper | (klein) |
| `src/lib/recaptcha/` | reCAPTCHA v3 verify (client + server) | (klein) |
| `src/lib/security/` | rate-limiter, url-validator, error-sanitizer | (klein) |
| `src/lib/template/` | `docx-to-image.ts` (screenshot voor AI vision) | (klein) |
| `src/lib/validation/` | Shared Zod schemas | (klein) |
| `src/lib/admin/` | `audit-log.ts` — AVG art. 32 audit-trail van admin-acties → Firestore `admin_audit_log` | (klein) |
| `src/middleware.ts` | Locale prefix + auth route guards | – |
| `docs/compliance/` | AVG + EU AI Act dossier (RoPA, DPIA, FRIA, TIA, DSR, incident-response, retention, vendor-review) | ✅ `docs/compliance/README.md` |

## Cross-cutting patterns

- **AI content generation** gebruikt strict honesty rules — prompts verbieden het verzinnen van ervaring of skills (`src/lib/ai/cv-generator.ts`)
- **Motivatiebrieven** krijgen een **tweede humanizer pass** om AI tells te verwijderen (`src/lib/ai/humanizer.ts`)
- **CV disputes** gaan door een **gatekeeper LLM call** voor regeneratie — spaart credits als user fout heeft (`src/lib/ai/dispute-gatekeeper.ts`)
- **PDF generation** rendert dezelfde HTML als preview voor WYSIWYG fidelity (zie `src/lib/pdf/CLAUDE.md`)
- **Print CSS** in renderers vermijdt transforms / clip-path / hover voor PDF compatibility
- **Google Fonts** worden via `<link>` tags in generated HTML geladen
- **DOCX XML replacements** altijd in **reverse position order** — anders schuiven indexen op
- **AI credits + provider resolution** altijd via `resolveProvider()` in `src/lib/ai/platform-provider.ts` (single source of truth, niet dupliceren)
- **Admin auth** altijd server-side verifiëren via `verifyAdminRequest()`, niet alleen `useAuth().isAdmin`
- **Firestore `settings()`** idempotent via `initializeFirestore` (zie commit `b2f23d4`)
- **`ParsedLinkedIn.birthDate`** bestaat sinds issue #5 (2026-04-09); `nationality` is **niet** op `ParsedLinkedIn` — komt via `customValues`
- **Compliance-pagina's** (`/privacy`, `/terms`, `/ai-transparency`, `/cookies`, `/sub-processors`, `/compliance`) zijn i18n via `src/i18n/messages/{nl,en}.json` — bij data-flow-wijzigingen ook deze syncen. Intern dossier in `docs/compliance/`.
- **Admin audit log** — voor élke admin-actie die persoonsdata raakt: `logAdminAction()` uit `src/lib/admin/audit-log.ts` aanroepen ná de mutatie. Firestore Security Rules zijn read-admin-only + immutable.
- **Leeftijdsverificatie** bij email/password-signup: required checkbox in `register-form.tsx`, doorgegeven via `registerWithEmail()` → `/api/auth/init-user` → `ageConfirmed` + `ageConfirmedAt` op user-doc.
- **Style-system documentatie**: `src/lib/ai/style-experts/STYLE-SYSTEM.md` bevat de volledige routekaart van wat de AI per creativity level krijgt (schema-velden, constraints, prompt-aanpak, history-rotatie, welke renderer-archetypes welke tokens consumeren). **Werk dit document bij** wanneer je iets verandert aan: een style-expert (`conservative`/`balanced`/`creative`/`experimental`/`editorial-paper`), het `baseDesignTokensSchema`, een sub-schema (`editorialSchema`/`boldSchema`), `creativityConstraints` in `themes.ts`, een renderer (`bold.ts`/`editorial.ts`), de `industryProfiles` map, de `rotateLeastUsed` mechaniek, of een caller van `generateDesignTokens`. De checklist staat onderaan STYLE-SYSTEM.md (§8).

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
| Nieuwe creativity-level voor styles | `src/lib/ai/CLAUDE.md` (style experts) + `src/types/CLAUDE.md` |
| Nieuwe API route | `src/app/api/CLAUDE.md` |
| Nieuwe admin route | `src/app/api/CLAUDE.md` (admin sectie) + `src/lib/firebase/CLAUDE.md` |
| CV-uiterlijk wijzigen (alle levels) | `src/lib/cv/CLAUDE.md` + `src/lib/ai/style-experts/STYLE-SYSTEM.md` |
| CV-uiterlijk wijzigen (creative/experimental) | `src/lib/cv/CLAUDE.md` (renderers sectie) + `src/lib/ai/style-experts/STYLE-SYSTEM.md` (§4.3 / §4.5) |
| Wat doet de AI per creativity level (prompts/tokens/constraints) | `src/lib/ai/style-experts/STYLE-SYSTEM.md` |
| Nieuw design token | `src/types/CLAUDE.md` + `src/lib/ai/CLAUDE.md` + `src/lib/cv/CLAUDE.md` + `src/lib/ai/style-experts/STYLE-SYSTEM.md` |
| Nieuwe DOCX template fill-fase | `src/lib/docx/CLAUDE.md` |
| Nieuwe credit-cost operatie | `src/lib/ai/CLAUDE.md` + `src/lib/credits/CLAUDE.md` |
| Motivatiebrief tone aanpassen | `src/lib/ai/CLAUDE.md` (motivation + humanizer) |
| Dispute-gedrag aanpassen | `src/lib/ai/CLAUDE.md` (gatekeeper) + `src/app/api/CLAUDE.md` |
| Jobs board provider toevoegen | `src/lib/jobs/CLAUDE.md` |
| Applications status flow | `src/types/CLAUDE.md` (`application.ts`) + `src/app/api/CLAUDE.md` |
| Mollie webhook | `src/app/api/CLAUDE.md` (mollie) |
| Feedback / GitHub sync | `src/app/api/CLAUDE.md` (feedback + github webhook) |
| Kanban features | `src/components/admin/CLAUDE.md` + `src/app/api/CLAUDE.md` |
| Nieuwe vertaling | `src/i18n/CLAUDE.md` |
| Auth-gedrag aanpassen | `src/lib/firebase/CLAUDE.md` |
| Impersonation | `src/lib/firebase/CLAUDE.md` (impersonation sectie) |
| Encryptie van API keys | `src/lib/encryption.ts` (`encrypt`/`decrypt`) — AES-256 |
| Firestore rules | `firestore.rules` (root) |
| Cloud Build / deploy issue | `cloudbuild.yaml` + `Dockerfile`. Status via Google Cloud Console of `gcloud builds list`. |

## Notes voor Claude Code

- **Sub-CLAUDE.md's worden lazy geladen** wanneer je met files in die folder werkt — dit dossier blijft daarom bewust kort
- Gebruik **geen** `@./relative/path` imports — die laden eager en defeaten lazy loading
- Bij twijfel: lees eerst de sub-CLAUDE.md van de relevante folder voordat je conclusies trekt
