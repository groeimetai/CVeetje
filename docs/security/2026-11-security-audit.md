# Security-audit maakcveetje — november 2026

**Datum:** 2026-11-02
**Scope:** de volledige codebase (`src/`, `firestore.rules`, `storage.rules`, `next.config.ts`, deploy-config, dependencies).
**Methode:** handmatige code-review van alle 71 API-routes, auth/impersonation, de credit- en betaallogica, alle server-side fetch- en Puppeteer-paden, HTML-rendering, uploads en Firebase-regels, plus `npm audit`.

Alle bevindingen hieronder zijn tegen de code geverifieerd en in dezelfde branch opgelost, tenzij ze bij *Restrisico's* staan.

---

## Samenvatting

| Ernst | Aantal | Opgelost |
|---|---|---|
| Kritiek | 5 | 5 |
| Hoog | 9 | 9 (2 met restrisico, zie onderaan) |
| Medium | 10 | 10 |
| Laag | 4 | 4 |

De grootste risico's zaten in de **billing**: er waren drie manieren om onbeperkt gratis platform-AI te gebruiken, plus een race in de Mollie-webhook waardoor één betaling meerdere keren bijgeschreven kon worden. Daarnaast zat er **HTML-injectie in server-side Puppeteer**. Die leidde tot SSRF: interne netwerkpagina's werden in de teruggegeven PDF gerenderd.

### Wat al goed was
- **Geen IDOR.** Elke `[id]`-route laadt data onder `users/{uid uit geverifieerd token}`.
- **Admin-checks en impersonation zijn correct.** Een impersonation-cookie van een niet-admin wordt genegeerd.
- **De GitHub-webhook** controleert de HMAC over de raw body met `timingSafeEqual` en faalt dicht als het secret ontbreekt.
- **API-key-encryptie** gebruikt AES-256-GCM met een random IV en salt en controleert de auth-tag. Gedecrypte keys gaan nooit naar de client of de logs.
- **Geen secrets in de repo of de git-history.** De enige key in `cloudbuild.yaml` is de publieke Firebase-web-key.
- **Mollie:** de betaalstatus en metadata worden server-side bij de Mollie-API opgehaald, niet uit de webhook-body overgenomen.

---

## Bevindingen

### Billing / credits

| ID | Ernst | Bevinding | Fix |
|---|---|---|---|
| B1 | Kritiek | **`?skipCredit=true` op `/api/templates/[id]/fill`** werd blind vertrouwd. Elke gebruiker kon zo een volledige AI-template-fill draaien op de platform-key, zonder credits. De eigen template-chat gebruikte dit zelfs voor elke beurt. | Een refill is alleen gratis met een server-side receipt (`users/{uid}/templateFills/{templateId}`) van een betaalde fill: < 24u oud, max 25 refills, atomisch in een transactie. |
| B2 | Kritiek | **CV-chat vertrouwde `chargedCredits` uit de request-body.** Met `chargedCredits: 1e9` werd er nooit afgerekend. | De server houdt per chat-id in `users/{uid}/chatSessions/{id}` bij wat al betaald is. Context en berichten hebben nu een groottelimiet. |
| B3 | Kritiek | **Disputes onbeperkt en gratis.** `firestore.rules` stond owners toe elk CV-veld te wijzigen, ook `disputeCount`, `generatedContent`, `status` en `creativityLevel`. Iemand kon dus `disputeCount: 0` terugzetten en steeds een gratis volledige regeneratie krijgen, of zelf een CV met `generatedContent` aanmaken en dat als PDF laten renderen. | De regel voor `cvs` staat geen create meer toe en alleen updates van `elementOverrides`/`updatedAt` (het enige veld dat de client schrijft). De dispute-route heeft een atomische lock. |
| B4 | Hoog | **Mollie-webhook kon dubbel bijschrijven.** De idempotency was check-then-act zonder transactie, terwijl de endpoint publiek is en `paymentId` in de checkout-response staat. Parallelle calls schreven dezelfde betaling meerdere keren bij. | `runTransaction` met `create()` op `processedPayments/{paymentId}`. Oude betalingen worden via het bestaande transactie-record herkend. `paymentId` wordt op formaat gevalideerd. |
| B5 | Hoog | **Credit-aftrek was check-then-deduct op een verouderde snapshot.** N parallelle requests met 1 credit slaagden allemaal; het saldo werd negatief en de maandelijkse reset schold de schuld kwijt. Template-motivatie en LinkedIn-export rekenden pas na de AI-call af. | `deductPlatformCredits` gebruikt één transactie: vers saldo, nooit onder 0. Motivatie en export rekenen vooraf af en storten terug bij een fout. Refunds gaan naar de juiste bucket (free of purchased). |
| B6 | Medium | **`/api/admin/setup`** controleerde `email_verified` niet. Wie als eerste een wachtwoord-account op `ADMIN_EMAIL` registreerde (bijvoorbeeld na een verwijderd account) werd admin. | Vereist een geverifieerd e-mailadres en een matchende uid, vergelijkt case-insensitief en is one-time: geweigerd zodra er al een andere admin bestaat. |
| B7 | Medium | **Account-farming.** reCAPTCHA was alleen client-side advies; `init-user` gaf elk nieuw account 10 gratis credits. | Starter-credits alleen na een server-side reCAPTCHA-check (`init_user`, score ≥ 0.5). Zonder die check wordt het account wel aangemaakt, maar met 0 credits. |

### SSRF / server-side rendering

| ID | Ernst | Bevinding | Fix |
|---|---|---|---|
| S1 | Kritiek | **HTML-injectie in de Puppeteer-PDF's.** `motivation-letter-generator.ts` escapete niets; de invoer kwam rechtstreeks uit de body van `/api/templates/motivation/download`. De legacy CV-renderer zette kleuren en overrides uit de body van `/api/cv/[id]/pdf` ongefilterd in CSS en `style`. `pdf-html-reconstructor` gebruikte `JSON.stringify(avatarUrl)` in een `<script>`. Een `<iframe src="http://10.x/">` werd zo in de teruggegeven PDF gerenderd. | Alles wordt nu geëscaped (`src/lib/security/html-escape.ts`). Tokens en overrides gaan door een sanitizer (`src/lib/cv/sanitize-tokens.ts`). Project-URL's zijn alleen nog http(s). |
| S2 | Hoog | **Puppeteer zonder request-filter.** Alle renders draaiden met JS aan en zonder interceptie; op Cloud Run is Chromium bovendien `--no-sandbox`. | `src/lib/pdf/harden-page.ts` blokkeert in elke render alle requests buiten een allowlist (Google Fonts, Firebase Storage, LinkedIn/Google-avatar-CDN's, een vastgezette Tailwind-CDN). `browser.close()` staat nu in `finally`. Getest: een geïnjecteerde iframe, img, fetch en CSS naar 127.0.0.1 leveren 0 requests op. |
| S3 | Hoog | **URL-validator zonder DNS-resolutie**, met gaten in IPv6 (`[::ffff:7f00:1]`, ULA, link-local), trailing dots (`metadata.google.internal.`) en ranges (0/8, 198.18/15). | De IP-checks zijn uitgebreid. Nieuw is `safe-fetch.ts`: DNS-lookup met controle van alle adressen, handmatige redirects met revalidatie per hop en een byte-limiet. |
| S4 | Hoog | **Avatar-fetches volgden redirects zonder check** (`image-replacer`, `smart-pdf-filler`). Een 302 naar een intern adres werd als "afbeelding" in de DOCX ingesloten. | Gaan nu via `safeFetch`; SVG en niet-afbeeldingen worden geweigerd. |
| S5 | Medium | **Puppeteer-crawler** controleerde alleen de start- en eind-URL; JS op de pagina kon interne endpoints fetchen. `/api/jobs/crawl` was open voor elke ingelogde gebruiker en had geen limiet. | Elke request wordt gevalideerd, inclusief een DNS-check. De HTTP-crawler doet ook een DNS-check per hop. `/api/jobs/crawl` is admin-only; geen enkele gebruikersflow gebruikte hem. |

### XSS / browser

| ID | Ernst | Bevinding | Fix |
|---|---|---|---|
| X1 | Hoog | **Stored XSS op de publieke jobpagina.** `job.description` van externe ATS-feeds ging via `dangerouslySetInnerHTML`. Adzuna werd niet gestript, en bij Recruitee sloot de concatenatie van description en requirements een open `<img onerror=` alsnog. | Wordt nu als tekst gerenderd; titel en description van Adzuna worden gestript. |
| X2 | Medium | **`</script>`-breakout in JSON-LD** via job-titels en bedrijfsnamen. | `jsonForScript()` in alle structured-data-componenten. |
| X3 | Hoog | **CV-preview-iframe** had `sandbox="allow-same-origin allow-scripts"`, wat de sandbox opheft. Geïnjecteerde tokens (B3/S1) liepen zo op de app-origin, ook in de browser van een admin die impersoneert, en konden het Firebase-token stelen. | De sandbox is nu `allow-scripts` (opaque origin). De hoogte komt via postMessage, en de message-handler accepteert alleen berichten van de eigen iframe. |
| X4 | Medium | **Dashboard-activity-list** zette vacature- en sollicitatievelden als HTML neer. `application.status` was bovendien vrij schrijfbaar via Firestore. | Alle velden worden geëscaped. `firestore.rules` beperkt `status` tot de enum en `notes` tot 5000 tekens. |
| X5 | Medium | **Clickjacking:** `frame-ancestors *`. | `frame-ancestors 'self'` (uit te breiden via de env-variabele `FRAME_ANCESTORS`), `object-src 'none'`, en `'unsafe-eval'` alleen in development. Getest: geen CSP-schendingen op `/nl`, `/nl/login`, `/nl/jobs` en `/nl/blog`. |
| X6 | Laag | `postMessage`-handler zonder controle op de afzender. | Opgelost samen met X3. |

### Overige hardening

| ID | Ernst | Bevinding | Fix |
|---|---|---|---|
| H1 | Hoog | **Mass assignment in feedback** (`...fields` na de vertrouwde velden). Daarmee konden `userId`, `status` en `githubIssueUrl` vervalst worden, en kon de daglimiet omzeild worden met de `GITHUB_TOKEN` van de server. | Allow-list van velden. GitHub-issues bevatten de uid in plaats van het e-mailadres (AVG), user-tekst wordt geneutraliseerd (geen @mentions of HTML) en alleen eigen screenshot-URL's worden opgenomen. |
| H2 | Medium | **Rate limiting** was in-memory (per instance, max 10 instances) en stond maar op 5 routes. `getClientIP` nam het spoofbare eerste `X-Forwarded-For`-element. | Nieuw `checkRateLimitPersistent` / `enforceRateLimit` (Firestore fixed-window, per userId) op alle AI-, Puppeteer- en upload-routes. `getClientIP` neemt het laatste element. |
| H3 | Medium | **Uploads** vertrouwden de content-type van de client; SVG/HTML werd publiek gemaakt. `storage.rules` stond directe client-writes naar `avatars/` toe zonder type- of groottelimiet. | Magic-byte-check: alleen PNG, JPEG en WebP, met extensie en type bepaald door de server. Directe client-writes naar `avatars/` zijn dicht. |
| H4 | Medium | **Zip-bomb:** een DOCX werd alleen op gecomprimeerde grootte gecontroleerd. | `assertDocxSafe` controleert het aantal entries, de uitgepakte grootte en de compressieratio. Body-limiet van 20 MB op `profile/parse` en `linkedin/parse`. |
| H5 | Medium | **Ruwe `error.message`** (Firestore-, GCS- en provider-fouten) ging naar de client. `sanitizeError` werd nergens gebruikt. | Toegepast in de AI-routes, jobs-routes, profiles, avatar en templates. |
| H6 | Laag | Het `firebase-token`-cookie had geen `Secure`-vlag. | `Secure` op https. (`HttpOnly` kan niet, omdat het cookie client-side gezet wordt; zie restrisico's.) |
| H7 | Laag | De data-export bevatte `apiKey.encryptedKey`; de delete gebruikte verkeerde veldnamen. | Alleen provider en model worden nog geëxporteerd. |
| H8 | Laag | `validateEncryptionKey()` werd nergens aangeroepen; `scryptSync` liep bij elke encrypt/decrypt. | De key wordt eenmalig gevalideerd (luide log, geen throw) en afgeleide keys worden gecached. |

### Dependencies

| ID | Ernst | Bevinding | Fix |
|---|---|---|---|
| D1 | Kritiek | `next@16.1.4` viel onder meerdere unauthenticated-RCE-advisories (Image Optimizer, `use cache`) en onder middleware-bypasses. | `next@16.4.3` en `eslint-config-next@16.4.3`. |
| D2 | Hoog | `puppeteer@24` met high-severity transitive dependencies (`basic-ftp`, `ws`, `tar-fs`, `zod`). | `puppeteer@25.16.0`. `setContent` ondersteunt `networkidle0` niet meer; dat is opgevangen in `setContentHardened`. |
| D3 | — | `npm audit fix` (non-breaking) is toegepast. | Wat overblijft staat bij de restrisico's. |

---

## Restrisico's en vervolgacties

1. **Overgebleven `npm audit`-meldingen (1 kritiek, 7 hoog), alleen via major upgrades op te lossen:**
   - `pdfjs-dist@3` (CVE-2024-4367): gemitigeerd met `isEvalSupported: false`. `tar`, `canvas` en `node-pre-gyp` zijn transitieve dependencies die alleen bij installatie een rol spelen. Upgraden naar v4+ vraagt aanpassingen; zie `src/lib/pdf/CLAUDE.md` ("pdfjs v3 i.p.v. v4").
   - `firebase` (client) / `@grpc/grpc-js`: het betreft een server-side DoS in grpc. De browser-SDK gebruikt die transportlaag niet. Opvolgen bij de volgende major van Firebase.
2. **Chromium `--no-sandbox` op Cloud Run.** Dat blijft nodig in de container. Het netwerk is nu afgeschermd met de allowlist, maar een renderer-exploit landt nog steeds in het Node-proces met alle secrets. Overweeg rendering in een aparte service zonder secrets.
3. **`'unsafe-inline'` in `script-src`** is nodig voor de inline hydration van Next. Nonce-based CSP is een vervolgstap.
4. **Het `firebase-token`-cookie is leesbaar voor JS** (dat is het ontwerp: client-side gezet). Een server-side session-cookie (`createSessionCookie`, HttpOnly) is een vervolgstap.
5. **DNS-rebinding (TOCTOU)** tussen de lookup in `safeFetch` en de connect is een klein venster. Volledige pinning vraagt een eigen undici-dispatcher.
6. **Geen afhandeling van Mollie-refunds en -chargebacks.** Credits blijven staan na een refund.
7. **Configuratie in GCP/Firebase-console, handmatig controleren:**
   - Restricties op de Firebase-web-key (`AIza…` in `cloudbuild.yaml`): HTTP-referrers en API-restricties.
   - Een **TTL-policy** op `rateLimits.expiresAt` om oude tellers op te ruimen.
   - De volgorde van `X-Forwarded-For` op de productie-ingress. Bij een domain mapping direct op Cloud Run is het laatste element het client-IP. Staat er een externe load balancer voor, dan is dat het op-één-na-laatste.
   - Of `RECAPTCHA_SECRET_KEY` in Secret Manager staat (zonder die key slaan de server-side checks over).
8. **Clickjacking-wijziging:** de app mag niet meer door andere sites geframed worden. Is een externe embed bewust gewenst, zet dan `FRAME_ANCESTORS` (bijvoorbeeld `https://partner.nl`).

## Verificatie

- `npm run build` slaagt en `npx tsc --noEmit` is schoon.
- Scripts gedraaid (in de scratchpad, niet in de repo):
  - **URL-validator:** 16 bypass-varianten geblokkeerd, publieke hosts toegestaan.
  - **Puppeteer-allowlist:** 0 hits op een lokale "interne" server vanuit een geïnjecteerde iframe, img, fetch en CSS.
  - **Escaping:** breakout via kleur-tokens, overrides en `javascript:`-URL's in de legacy-renderer geblokkeerd.
  - **Zip-bomb:** een DOCX van 80 KB die naar 80 MB uitpakt wordt geweigerd; een normale DOCX gaat door.
- Productieserver met Playwright: geen CSP-schendingen; de security-headers zijn aanwezig.
- **Niet lokaal te testen (er waren geen Firebase/Mollie-credentials), dus na deploy handmatig controleren:**
  - Template-fill → PDF-download → template-chat. De refills moeten gratis blijven.
  - CV-chat: de credits lopen op en een nieuwe sessie na "chat legen" kost minimaal 1 credit.
  - Mollie-testbetaling; daarna dezelfde webhook nog eens posten. Er mag geen tweede bijschrijving komen.
  - Dispute-flow (1e/2e met AI, 3e naar een admin) en een preview-edit (inline bewerken moet blijven werken).
  - Deploy van de `firestore.rules` en `storage.rules` (`firebase deploy --only firestore:rules,storage`).
