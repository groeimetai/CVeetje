# E2E-tests (Playwright)

End-to-end suite die de echte Next.js-app (`next start`) test tegen de **Firebase Emulator Suite** (Auth, Firestore, Storage) en een **gemockte Anthropic-API**. Er zijn geen echte Firebase-, Mollie-, GitHub- of AI-credentials nodig.

## Draaien

```bash
npm run test:e2e          # stop restanten → e2e-build → alle specs
npm run test:e2e:only     # specs draaien op de bestaande .next-e2e-build
npm run test:e2e:ui       # Playwright UI-modus
npm run e2e:stop          # achtergebleven emulator-/serverprocessen opruimen
```

Eén spec of test:

```bash
npx playwright test e2e/specs/cv-wizard.spec.ts -g "volledige flow"
```

Vereisten: Java 21+ (Firestore/Storage-emulators) en een Chromium. Standaard wordt `/opt/pw-browsers/...` gebruikt; overschrijf met `PUPPETEER_EXECUTABLE_PATH_E2E` en de Playwright-browsers met `PLAYWRIGHT_BROWSERS_PATH`.

## Hoe het werkt

| Onderdeel | Bestand | Wat |
|---|---|---|
| Env | `e2e/env.ts` | Eén bron voor build- en runtime-env (emulator-hosts, wegwerp-RSA-key voor de Admin SDK, `ANTHROPIC_BASE_URL` → mock). |
| Build | `e2e/build.ts` | `next build` in emulator-modus naar `.next-e2e` (`NEXT_PUBLIC_*` wordt bij build ingebakken). |
| Servers | `playwright.config.ts` | Start de emulators, de mock-AI en `next start -p 3100`. |
| Mock-AI | `e2e/mock-ai/server.ts` | Implementeert `POST /v1/messages` (structured output, json-tool, SSE). Antwoorden worden uit het meegestuurde JSON-schema gegenereerd, met realistische overrides per operatie. `GET /__requests` geeft de gelogde calls. |
| Emulator-helpers | `e2e/support/emulator.ts` | Reset, users aanmaken (geverifieerd/admin/credits), Firestore lezen/schrijven via REST, jobs seeden. |
| API-helpers | `e2e/support/api.ts` | Calls met het ID-token van een testgebruiker, `seedGeneratedCv()`. |
| Fixtures | `e2e/support/fixtures.ts` | `user` (verse gebruiker met 15 credits) en `loggedInPage`; de cookiebanner is weggeklikt. |

### Emulator-modus in de app

Alleen actief met `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=1` (client) of `FIREBASE_*_EMULATOR_HOST` (server). In productie verandert er niets.
- `src/lib/firebase/config.ts`: verbindt client-Auth/Firestore met de emulators.
- `next.config.ts`: voegt de emulator-origins toe aan de CSP.
- `src/lib/firebase/storage-files.ts`: publieke URL's en `makePublic` werken ook tegen de Storage-emulator.
- `JOBS_DISABLE_SEEDED_ATS=1`: geen live ATS-calls op `/jobs`.

## Specs

| Spec | Dekt |
|---|---|
| `auth.spec.ts` | Registratie + e-mailverificatie, starter-credits, welkomstmail, redirects, fout wachtwoord. |
| `cv-wizard.spec.ts` | Volledige wizard (profiel → vacature → match → stijl → CV → PDF) incl. credit-aftrek; pad zonder vacature; `?profile=`; CV-lijst-acties. |
| `cv-detail.spec.ts` | Detailpagina, PDF-route, motivatiebrief (PDF/DOCX), chat-billing per sessie, dispute. |
| `templates.spec.ts` | DOCX upload/preview/fill, gratis PDF-refill via receipt, `skipCredit`-misbruik, zip-bomb. |
| `profiles-settings.spec.ts` | Profielen-CRUD, avatar (PNG ok / SVG geweigerd), LLM-modus, API-key, export, account verwijderen, credits, race met 1 credit. |
| `applications-feedback.spec.ts` | Sollicitaties (status-enum), feedback mass-assignment. |
| `admin.spec.ts` | Toegang, users/credits/impersonation, alle adminpagina's laden zonder fouten. |
| `public.spec.ts` | Alle publieke pagina's in nl/en zonder console-errors, detailpagina's, XSS op vacature-detail, cookiebanner, SEO-endpoints, CSP. |

`test.fixme` markeert bekende bugs die in een volgende fase opgelost worden.
