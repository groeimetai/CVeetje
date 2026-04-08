# 2026-04-08 — Cveetje v2: Agent runtime + auth-helper pilot

## Wat is gedaan

Tweede fase van de **agentic transitie** voor cveetje uitgevoerd, conform plan `~/.claude/plans/jaunty-honking-otter.md`. Drie van de vier v2-lagen volledig of pilot, één bewust uitgesteld.

### Laag 3 — Agent runtime (volledig)

**Tools-laag refactor naar session-based pattern:**
De v1-tools namen complexe objecten (`linkedIn`, `jobVacancy`, `cvContent`) via `inputSchema` — wat betekent dat de LLM ze elke tool-call als JSON moest serialiseren. Token-verspilling én foutgevoelig. v2 heeft de tools gerefactord naar **mutable session state via `ctx.session`**:

- `src/lib/ai/tools/_context.ts` — uitgebreid met `AgentSession` interface (linkedIn, jobVacancy, fitAnalysis, cvContent, designTokens, language). `ToolContext` heeft nu een mutable `session` field.
- `parse-job.ts` — schrijft resultaat naar `ctx.session.jobVacancy`. Input: alleen `rawText`.
- `analyze-fit.ts` — leest profile + jobVacancy uit session, schrijft `fitAnalysis` terug. Input: leeg.
- `generate-cv-content.ts` — leest profile + jobVacancy uit session, schrijft `cvContent` terug. Input: alleen optionele `descriptionFormat`.
- `generate-design-tokens.ts` — bouwt LinkedIn-summary uit session via `createLinkedInSummaryV2()`, schrijft `designTokens` terug. Input: optionele user-prefs/creativityLevel/hasPhoto.
- `generate-motivation.ts` — vereist alle drie (profile, jobVacancy, cvContent) in session, geeft duidelijke errors als een ontbreekt. Geen mutatie.
- `analyze-template.ts` — gebruikt `ctx.session.linkedIn` voor profileCounts. Input: alleen `templateMap`.
- `fill-docx.ts` — leest profile/jobVacancy/fitAnalysis uit session. Input: `templateMap`, `blueprint`, `customInstructions`.

Resultaat: de LLM hoeft nooit complexe objecten te serialiseren. Tool-calls worden eenvoudige `{}` of `{ rawText: "..." }`.

**Agent runtime route:**
- `src/app/api/cv/agent/route.ts` (179 regels) — nieuwe POST-route die:
  1. Auth (8-liner; v2 Laag 2 vervangt dit later)
  2. `resolveProvider({ userId, operation: 'cv-chat' })` — BYOK + 0 credits per call
  3. Bouwt mutable `AgentSession` uit request body (linkedIn verplicht)
  4. Bouwt `ToolContext` met session
  5. `createAgentTools(ctx)` voor de zeven tools
  6. Bouwt system prompt door `CVEETJE_AGENT_SYSTEM_PROMPT` te concatten met een runtime-context-block (`buildSessionContextBlock(session)`)
  7. `streamText({ model, system, messages, tools, stopWhen: stepCountIs(10) })` — multi-step tool execution tot 10 steps
  8. `result.toUIMessageStreamResponse()` voor `useChat`-compatibele streaming

**System prompt als runtime-string:**
- `src/lib/ai/agent/system-prompt.ts` — exporteert `CVEETJE_AGENT_SYSTEM_PROMPT` als template literal. Reden: Next.js standalone output bundelt geen `.md` files uit `src/`, dus runtime `fs.readFileSync()` op `system-prompt.md` zou in Cloud Run breken. De `.md` versie blijft als human-readable docs naast het `.ts` runtime-bestand staan; sync is handmatig (gedocumenteerd in beide files).

### Laag 4 — Dashboard agent-mode UI hook (minimal)

Géén volledige dashboard-redesign — alleen een **minimale test-page** zodat de agent runtime end-to-end gevalideerd kan worden zonder de wizard aan te raken.

- `src/app/[locale]/(dashboard)/agent-test/page.tsx` (~230 regels) — single-file React client component:
  1. Loadt user-profielen via bestaande `/api/profiles` endpoint
  2. Profielen-dropdown om er één te kiezen
  3. Loadt het volledige profiel via `/api/profiles/[id]` voor de geselecteerde
  4. `useChat()` hook van `@ai-sdk/react` met `DefaultChatTransport` naar `/api/cv/agent`
  5. Chat-feed toont text-deltas, tool-calls (met input/output) en status
  6. Geen styling-polish, geen integratie met de bestaande dashboard layout — bewust marked als dev-test

Beschikbaar op `/nl/agent-test` en `/en/agent-test` (beide locale-prefixen). Auth wordt geërfd van het `(dashboard)` route group.

### Laag 2 — Auth-helper + pilot (3 routes)

**`src/lib/auth/with-user.ts`** — gedeelde auth-helper die de drie patronen consolideert:
1. Token-verificatie (cookie + Authorization header fallback)
2. Admin-check (custom claim → Firestore role fallback, alleen wanneer nodig)
3. Impersonation (alleen voor admins, met target-user-bestaan-check)

API:
```typescript
withUser(request, async (req, ctx) => { ... }, { requireAdmin?, allowImpersonation? })
```

`ctx` bevat `uid` (caller), `effectiveUserId` (impersonated indien admin+cookie, anders uid), `isImpersonating`, `isAdmin`, `decodedToken`. Routes kiezen zelf welk veld ze nodig hebben — voor caller-private data zoals API keys gebruik je `uid` + `allowImpersonation: false`; voor data-operaties op user-niveau gebruik je `effectiveUserId`.

**Pilot-migratie (3 routes, in volgorde van complexiteit):**

1. `src/app/api/credits/check-reset/route.ts` — POST. Standard auth pattern. Effective userId. Geen impersonation issues.
2. `src/app/api/auth/init-user/route.ts` — POST. Caller-only (`uid`), impersonation expliciet uitgezet — een admin moet niet kunnen "initialiseren" voor een impersonated user.
3. `src/app/api/settings/api-key/route.ts` — POST + PATCH + DELETE (drie handlers in één file). Caller-only, alle drie met `allowImpersonation: false` omdat API-keys caller-private credentials zijn.

**Stop voor bulk migratie.** De overige ~48 routes worden in een volgende sessie gemigreerd in groepen (cv/, profile/, settings/, admin/, ...) volgens de plan-regel "vraag bevestiging vóór bulk-refactors. Per groep, niet alles tegelijk."

### Laag 5 / language patterns — uitgesteld

Niet aangeraakt in deze sessie. Conform v1 sessie-log: behoeven per-file behavior-changing rewrites die buiten de scope van een snelle bulk-refactor vallen. Wordt later opgepakt als aparte taak.

## Beslissingen

1. **Tools refactored vóór de route, niet erna.** De v1-tools (LLM passes complex args via inputSchema) waren type-correct maar token-onefficiënt en foutgevoelig in een echte agent-loop. v2 heeft ze direct gerefactord naar het session-pattern omdat de agent route ze toch nodig had — apart laten staan zou twee patronen tegelijk hebben opgeleverd.

2. **`stopWhen: stepCountIs(10)` voor multi-step.** Default in `ai` v6.0.38 is `stepCountIs(1)` (single step). Voor de agent-loop zijn 10 stappen ruim genoeg — typische CV-flow is 4-6 tool-calls (parse_job → analyze_fit → generate_design_tokens → generate_cv_content → optioneel generate_motivation). Een hogere limiet zou agent-loops kunnen laten ontsporen.

3. **`cv-chat` als platform operation, geen nieuwe `cv-agent`.** Reden: `cv-chat` heeft cost 0 en staat al in `platform-config.ts`. Een nieuwe operation toevoegen raakt productie-config. Voor v2 is hergebruik veiliger; een aparte `cv-agent` operation kan in de toekomst als character-based billing nodig blijkt.

4. **System prompt als TypeScript constant, niet als markdown-import.** Reden: Next.js `standalone` output bundelt geen `.md` files uit `src/` — runtime `fs.readFileSync()` zou in Cloud Run breken. Het `.md` bestand blijft naast het `.ts` bestand staan als human-readable bron; sync is handmatige discipline.

5. **Test-page in plaats van volledige UI-integratie.** Een echte dashboard mode-toggle vereist een grondige UI-redesign met live preview, tool-call feed, mode-state management. Buiten v2 scope. De test-page is een dev-only validatie-interface die net genoeg doet om de agent route te kunnen testen, zonder dat we ons committeren aan een UI-design.

6. **`withUser()` zonder generic return type.** TypeScript inferentie probleem: een handler die `NextResponse.json({ data })` én `NextResponse.json({ error })` retourneert kreeg type errors omdat TS het generic op de eerste response inferde. Oplossing: signature is `Promise<NextResponse>` zonder generic. Routes managen hun eigen response-types.

7. **Pilot-migratie strikt op 3 routes.** Plan-regel uit `CLAUDE.md`: "Vraag bevestiging vóór bulk-refactors." De 3 pilots dekken het meeste patroon-spectrum (standaard auth, caller-only met disabled impersonation, multi-handler file). De resterende 48+ routes zijn voor een volgende sessie.

## Verificatie

- `npm run build` slaagt na elke incrementele wijziging (5× gedraaid in deze sessie)
- `npm run lint` op aangeraakte files: **0 errors** (initiële React 19 setState-in-effect lint error in `agent-test/page.tsx` is opgelost door loading-state af te leiden uit `profiles === null`)
- `/api/cv/agent` staat in de Next.js routes-lijst
- `/nl/agent-test` en `/en/agent-test` staan in de pages-lijst
- Alle 7 tool-files compileren en exporteren factory-functies die `ToolContext` met session accepteren
- `withUser()` is geïmporteerd in 3 routes en compileert

## Wat NIET in v2 zit

- **Bulk migratie van 48+ routes naar `withUser()`** — wacht op review van de pilot
- **Volledige dashboard integratie** voor agent-mode (mode-toggle, live preview, tool-call feed in dashboard layout) — alleen test-page in v2
- **Bespoke language pattern consolidatie** in motivation/style/template/docx generators — uitgesteld zoals in v1 al gedocumenteerd
- **Functionele runtime-test** van de agent route — `npm run build` slaagt en de route is registreerbaar, maar end-to-end test vereist een browser-sessie. Te valideren door Niels via `/nl/agent-test` na `npm run dev`.

## Openstaande acties (v3 of volgende sessie)

1. **Functionele test van agent runtime** door Niels: 
   - `cd /Users/nielsvanderwerf/Projects/cveetje && npm run dev`
   - Login → naar `/nl/agent-test`
   - Selecteer een bestaand profiel
   - Plak een vacature: "Hier is een vacature: [tekst]"
   - Verifieer dat agent `parse_job` aanroept → result toont in feed
   - Vraag om fit-analyse + CV-content en kijk of de multi-step loop werkt

2. **Pilot review** door Niels op de 3 gemigreerde routes:
   - `/api/credits/check-reset` (POST)
   - `/api/auth/init-user` (POST)
   - `/api/settings/api-key` (POST/PATCH/DELETE)
   
   Controleer dat de routes nog correct authorize-en, en dat `withUser()` semantisch klopt voor jouw use case.

3. **Bulk migratie** van resterende 48 routes naar `withUser()` — in groepen:
   - `/api/credits/*` (1 al gedaan, ~1 over)
   - `/api/settings/*` (1 al gedaan, ~2 over)
   - `/api/profile/*` + `/api/profiles/*` (~5)
   - `/api/cv/*` (~10, complexer met rate-limit en credit-handling)
   - `/api/templates/*` (~5)
   - `/api/admin/*` (~10, met `requireAdmin: true`)
   - `/api/mollie/*` + overig (~5)

4. **Echte dashboard agent-mode UI** als de runtime-tests slagen:
   - Mode-toggle in `(dashboard)/dashboard/page.tsx`
   - Chat-paneel + live preview integratie
   - Tool-call feed met user-friendly labels
   - Wizard blijft de default

5. **Bespoke language patterns** in 4 generators (zie v1 sessie-log voor details)

## Niet gewijzigd in deze sessie

- `cloudbuild.yaml`, `Dockerfile`, `next.config.ts` — Cloud Run deploy ongewijzigd
- `src/middleware.ts`
- `src/components/cv/cv-wizard.tsx` en alle wizard-stappen
- `src/app/api/cv/chat/route.ts` — bestaande chat-route ongemoeid
- 48+ API-routes met de 8-liner auth-check
- Bestaande generators en hun Zod-schemas (cv-generator was in v1 al gemigreerd; de andere blijven bewust onaangetast)
- `system-prompt.md` — blijft naast `system-prompt.ts` als human-readable docs
