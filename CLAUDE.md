# CVeetje

AI-powered CV-generator. Next.js 16 (App Router) + Firebase + Cloud Run. **BYOK**-model: gebruikers leveren eigen API-keys (encrypted at rest, AES-256). Interface in NL met i18n (nl/en). Repo: `groeimetai/CVeetje`. Productie: `maakcveetje.nl`.

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript 5
- Tailwind CSS 4 (PostCSS plugin, geen `tailwind.config`)
- Firebase (Auth + Firestore) — client + admin SDK
- Vercel AI SDK (`ai` ^6.0) — multi-provider (OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek, Fireworks, Together, Azure)
- Puppeteer + `@sparticuz/chromium` voor PDF
- `docxtemplater` + `mammoth` voor DOCX
- `next-intl` voor i18n (default: `nl`)
- Mollie voor betalingen
- Cloud Build → Artifact Registry → Cloud Run (`europe-west4`)

## Commands

```bash
npm run dev      # localhost:3000, Turbopack
npm run build    # productie build (NEXT_PRIVATE_SKIP_TURBOPACK=1)
npm run lint     # ESLint
npm start        # productie server
```

Geen test-framework geconfigureerd.

## Architectuur

### CV-generation flow

`src/components/cv/cv-wizard.tsx` orchestreert 9 stappen, state in `localStorage` (`cveetje_wizard_draft`, expires na 24h):

1. **Profile input** → multi-modal (text/image/PDF) → AI parses naar `ParsedLinkedIn`
2. **Job input** → vacancy text → AI parses naar `JobVacancy` met keywords
3. **Fit analysis** → score + warnings + suggestions
4. **Style choice + style generation** → AI genereert `CVDesignTokens` (~20 props)
5. **CV generation** → `/api/cv/generate` → AI genereert `GeneratedCVContent`
6. **Preview** → `cv-preview.tsx` met inline editing
7. **Export** → PDF (Puppeteer) of DOCX (template fill)

### WYSIWYG HTML

`src/lib/cv/html-generator.ts` (`generateCVHTML()`) is de **single source of truth** voor CV-uiterlijk. Browser-preview en PDF-render gebruiken exact dezelfde HTML. Print-CSS vermijdt `transform`, `clip-path` en hover-effects voor PDF-compatibiliteit.

### Design tokens

Twee styling-systemen bestaan naast elkaar:
- **Legacy `CVStyleConfig`** (150+ properties) — gebruikt door `style-generator.ts`
- **Modern `CVDesignTokens`** (~20 props) — gebruikt door `style-generator-v2.ts`. Types in `src/types/design-tokens.ts`.

### AI integratie (`src/lib/ai/`)

Alle AI-calls gebruiken Vercel AI SDK `generateObject()` met Zod schemas voor structured output.

**Generators:**
- `cv-generator.ts` — CV-content (summary, experience, education, skills)
- `style-generator-v2.ts` — design tokens
- `job-parser.ts` — vacancy → `JobVacancy`
- `fit-analyzer.ts` — profile-to-job fit
- `motivation-generator.ts` — cover letters
- `template-analyzer.ts` + `docx-content-replacer.ts` — DOCX template fill

**Provider-laag:**
- `providers.ts` — provider factory (multi-provider)
- `platform-provider.ts` — `resolveProvider()`: BYOK + credit-aftrek logic. **Single source of truth** — niet dupliceren.
- `models-registry.ts` — fetch beschikbare modellen dynamisch

**Gedeelde laag** (opgezet als fundament voor toekomstige agent-runtime):
- `src/lib/ai/prompts/` — herbruikbare prompt-fragmenten (`honesty-rules`, `language-instructions`, `industry-guidance`, `power-words`)
- `src/lib/ai/schemas/` — gedeelde Zod-types (`experience`, `skills`, `job-requirements`)
- `src/lib/ai/tools/` — Vercel AI SDK `tool()`-wrappers rond bestaande generators
- `src/lib/ai/agent/system-prompt.md` — draft system prompt voor productie-agent (nog niet door een runtime aangeroepen)
- `src/lib/ai/agent/tools-index.ts` — exporteert alle tools als `agentTools` object

### DOCX template-systeem (`src/lib/docx/`)

- `template-filler.ts` — detecteert placeholders (`{{name}}`, `[NAME]`, `Label: _____`)
- `smart-template-filler.ts` — AI analyseert template-structuur, vult secties intelligent
- `docx-to-pdf.ts` — converteert DOCX naar PDF via Puppeteer

### Auth & middleware

- Firebase Auth (email/password, Google OAuth) — token in `firebase-token` cookie
- `src/middleware.ts` — beschermt dashboard-routes, redirects auth-routes, locale-routing
- API-routes verifiëren tokens via Firebase Admin SDK uit cookie OF `Authorization` header
- API-keys encrypted met AES-256 (`src/lib/encryption.ts`)
- **Bekende duplicatie**: ~51 API-routes herhalen dezelfde 8-liner auth-check. Toekomstige `withUser()`-helper moet dit consolideren — nog niet aanwezig.

### Credits

`src/lib/credits/manager.ts` — gratis maandcredits + gekochte credits (Mollie). 1 credit per **PDF download** (NIET per AI-call). Check vooraf, deductie na render, atomicity via `FieldValue.increment()`.

### Belangrijke types (`src/types/index.ts`)

Centraal ~1100-line file:
- `ParsedLinkedIn`, `JobVacancy`, `CVStyleConfig`, `CVDesignTokens`, `GeneratedCVContent`, `CV`, `FitAnalysis`

### Firebase collections
- `users` — profielen, encrypted API-keys, credit-balances
- `cvs` — gegenereerde CV-documenten
- `transactions` — credit purchase/usage records

### Routing

- `src/app/[locale]/(auth)/...` — login, register, verify-email
- `src/app/[locale]/(dashboard)/...` — dashboard, cv, profiles, settings, admin (protected)
- `src/app/api/...` — niet locale-prefixed
- Path alias: `@/*` → `./src/*`

### Environment vars

Zie `.env.example`. Vereist:
- `NEXT_PUBLIC_FIREBASE_*` — client config
- `FIREBASE_ADMIN_*` — admin SDK
- `ENCRYPTION_KEY` — AES-256 voor API-key encryptie
- `MOLLIE_API_KEY` — betaling
- `NEXT_PUBLIC_APP_URL` — app URL

## Werkregels

Niet onderhandelbaar bij elke wijziging in deze repo:

1. **Wizard mag niet breken.** Elke refactor in `src/lib/ai/*` of een API-route eindigt met handmatige rooktest van de wizard end-to-end (profile → job → style → CV → preview → PDF). Geen merge zonder.
2. **Geen breaking schema-wijzigingen.** Bestaande Zod-schemas in `src/types/*` mogen alleen worden uitgebreid (optionele velden), nooit hernoemd of verwijderd zonder migratiepad.
3. **HONESTY RULES zijn niet onderhandelbaar.** Zie `src/lib/ai/prompts/honesty-rules.ts`. Geen prompt mag fabricatie van ervaring of skills toestaan. Bij twijfel: laat het weg.
4. **PDF-rendering = preview-rendering.** Wat in browser-preview staat moet identiek zijn aan PDF-output. Geen aparte HTML-generators bouwen.
5. **Credits blijven op PDF-download.** Geen credits aftrekken bij individuele AI-calls — anders wordt een toekomstige agent-modus economisch onhoudbaar.
6. **`platform-provider.ts` is de enige plek voor BYOK + credit-logic.** Niet dupliceren in routes of generators.
7. **Geen wijzigingen aan `cloudbuild.yaml` / `Dockerfile` / `next.config.ts`** zonder expliciete reden — Cloud Run deploy is werkend en stabiel.
8. **Geen secrets in committed code.** Alle credentials via Google Secret Manager of `.env.local`.

## Werkafspraken

- **Vraag bevestiging vóór bulk-refactors.** Bv. de 51 API-routes migreren: per groep (`cv/`, `profile/`, `settings/`, `admin/`), niet alles tegelijk.
- **`npm run build` na elke incrementele migratie**, niet alleen aan het eind van een batch.
- **Schrijf een log na elke substantiële sessie** in `logs/conversations/YYYY-MM-DD-onderwerp.md` — wat is gewijzigd, welke beslissingen, openstaande items.
- **Wijzig prompts via `src/lib/ai/prompts/*`**, niet door inline edits in de generator-files. Eén plek = consistentie tussen generators.

## Dev-companion conventies

Deze repo heeft een Claude Code dev-laag (`.claude/`, `mcp-servers/`, `logs/`). Gebruik:

### Slash commands (`.claude/commands/`)

- `/audit-prompts` — vind ingebedde AI-prompts in `src/lib/ai/*`, groepeer per gedeeld concept, rapporteer wat naar `src/lib/ai/prompts/` kan
- `/audit-auth` — lijst alle API-routes die nog de 8-liner auth-check gebruiken in plaats van een (toekomstige) `withUser()`-helper
- `/scaffold-tool` — voeg een nieuwe AI-tool toe volgens het uniforme pattern in `src/lib/ai/tools/`
- `/deploy-status` — laatste Cloud Build run + Cloud Run revision (gebruikt MCP)

### MCP servers (`mcp-servers/`)

**Alleen voor dev-time, niet voor productie-runtime.** De Cloud Run-app roept Firebase Admin SDK, Mollie en andere APIs direct aan — MCP servers zijn er voor de developer die in deze repo werkt met Claude Code.

- `cloudbuild` — `gcloud builds list/describe`, `gcloud run services describe` voor `groeimetai/CVeetje`
- `github-cveetje` — PR's, issues, recente commits via `gh` voor `groeimetai/CVeetje`

Registratie loopt via `claude mcp add` (eenmalig tijdens dev-companion setup).

### Logs (`logs/conversations/`)

Na elke sessie waarin code is gewijzigd: een markdown-samenvatting `YYYY-MM-DD-onderwerp.md` met wat is gedaan, welke beslissingen genomen zijn, en wat nog openstaat.

## Belangrijke patterns

- **`src/lib/cv/html-generator.ts`** is de WYSIWYG-bron. Niet kopiëren.
- **`src/lib/ai/platform-provider.ts`** is de BYOK + credit-bron. Niet kopiëren.
- **`src/lib/ai/prompts/`** is de prompt-bron. Inline prompts in generator-files zijn legacy en moeten naar deze map gemigreerd worden.
- **`standalone` output mode** in `next.config.ts` voor Docker/Cloud Run.
- **Google Fonts** worden via `<link>`-tags in gegenereerde HTML geladen (niet via Next.js font-loading) — dat is bewust voor Puppeteer-compatibiliteit.
