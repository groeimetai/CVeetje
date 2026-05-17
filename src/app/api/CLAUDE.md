# API routes — `src/app/api/`

REST endpoints. **Niet locale-prefixed** (alleen pagina's onder `[locale]/`).

## Auth-patroon

Alle protected routes verifiëren tokens via Firebase Admin SDK:
- Cookie `firebase-token` of `Authorization: Bearer <token>` header
- Admin routes: `verifyAdminRequest()` uit `src/lib/firebase/admin-utils.ts`
- AI-credit operaties: `resolveProvider({ userId, operation })` uit `src/lib/ai/platform-provider.ts` (**single source of truth** — niet dupliceren)
- Impersonatie-bewust: `getEffectiveUserId(request)` uit `src/lib/auth/impersonation.ts`

## CV

| Route | Method | Wat |
|---|---|---|
| `cv/generate/route.ts` | POST | Hoofdgeneratie van CV-content |
| `cv/style/route.ts` | POST | Design token generatie (streaming) |
| `cv/style-from-template/route.ts` | POST | Style extractie uit template-screenshot |
| `cv/fit-analysis/route.ts` | POST | Fit-analyse profile vs vacancy |
| `cv/job/parse/route.ts` | POST | Parse vacancy text → JobVacancy |
| `cv/chat/route.ts` | POST | Interactive CV-edit chat (`streamText` + `tool()` calls) |
| `cv/[id]/pdf/route.ts` | POST | PDF-export — **credit-aftrekpunt** (1 credit per download) |
| `cv/[id]/preview-html/route.ts` | GET | HTML preview |
| `cv/[id]/motivation/route.ts` | POST | Motivatiebrief genereren (met humanizer pass) |
| `cv/[id]/motivation/download/route.ts` | GET | Download PDF/DOCX |
| `cv/[id]/dispute/route.ts` | POST | Dispute indienen — roept gatekeeper aan, evt regen |
| `cv/avatar/route.ts` | POST | Avatar upload |

## Templates

| Route | Method | Wat |
|---|---|---|
| `templates/route.ts` | GET/POST | List + create (`users/{uid}/templates`) |
| `templates/[id]/route.ts` | GET/PATCH/DELETE | Per-template CRUD |
| `templates/[id]/analyze/route.ts` | POST | DOCX structure + style analyse |
| `templates/[id]/fill/route.ts` | POST | Vul template. DOCX: 6-fase AI pipeline (`src/lib/docx/CLAUDE.md`). PDF: AcroForm → coordinates → AI-vision hybrid (`src/lib/pdf/CLAUDE.md`). Credit-aftrek via `resolveProvider({operation:'template-fill'})` voor AI-paden, flat `chargePlatformCredits` voor AcroForm/coords. |
| `templates/motivation/route.ts` + `download/` | POST/GET | Motivatiebrief template-flow |

## Profiles & input parsing

| Route | Method | Wat |
|---|---|---|
| `profile/parse/route.ts` | POST | Multi-modal LinkedIn parse (text/image/PDF) |
| `profiles/route.ts` | GET/POST | List + save profielen |
| `profiles/[id]/route.ts` | GET/PATCH/DELETE | Per-profile CRUD |
| `profiles/[id]/enrich/route.ts` | POST | AI enrichment van een bestaand profiel |
| `profiles/[id]/linkedin-export/route.ts` | GET | Export naar LinkedIn-formaat |
| `linkedin/parse/route.ts` | POST | LinkedIn-specifieke parsing |

## Jobs & applications

| Route | Method | Wat |
|---|---|---|
| `jobs/search/route.ts` | GET | Fan-out search over providers |
| `jobs/[slug]/route.ts` | GET | Job detail (cache → provider) |
| `jobs/[slug]/apply/route.ts` | POST | 1-click apply via ATS provider |
| `applications/route.ts` | GET/POST | List + record applications (creation **Admin-SDK-only**) |
| `applications/[id]/route.ts` | GET/PATCH/DELETE | Per-application CRUD (status, notes) |

## Auth & settings

| Route | Method | Wat |
|---|---|---|
| `auth/init-user/route.ts` | POST | Firestore user-doc creëren na sign-in |
| `auth/verify-captcha/route.ts` | POST | reCAPTCHA verify |
| `settings/api-key/route.ts` | POST/PATCH/DELETE | Encrypted API key management |
| `settings/llm-mode/route.ts` | POST | Switch BYOK ↔ platform mode |
| `settings/account/route.ts` | DELETE | Account verwijdering |

## Credits & payments

| Route | Method | Wat |
|---|---|---|
| `credits/check-reset/route.ts` | POST | Monthly free credit reset (idempotent) |
| `mollie/checkout/route.ts` | POST | Mollie payment session aanmaken |
| `mollie/webhook/route.ts` | POST | Mollie webhook — credits bijschrijven na betaling |

## Feedback & GitHub sync

| Route | Method | Wat |
|---|---|---|
| `feedback/route.ts` | GET/POST | List + create (POST creëert auto GitHub issue in `groeimetai/CVeetje`) |
| `feedback/[id]/route.ts` | GET/PATCH/DELETE | Per-feedback CRUD |
| `feedback/upload/route.ts` | POST | Image upload |
| `github/webhook/route.ts` | POST | GitHub webhook — verifieert HMAC, sync issue close/reopen → feedback status |

## Admin

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

## Utilities

| Route | Method | Wat |
|---|---|---|
| `models/route.ts` | GET | Lijst beschikbare AI-modellen |

## Nieuwe API route toevoegen

1. Maak `src/app/api/<path>/route.ts`
2. Auth via Firebase Admin SDK (cookie of Authorization header), of `verifyAdminRequest()` voor admin
3. AI-credit operaties: gebruik `resolveProvider()` — niet eigen credit-logica schrijven
4. Voor character-based billing: `chargePlatformCredits()` apart aanroepen
