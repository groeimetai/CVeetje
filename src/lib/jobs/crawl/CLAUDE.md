# Jobs crawl — `src/lib/jobs/crawl/`

Crawler + cache voor job-detail-pagina's. Caller: `/api/jobs/[slug]/route.ts` valt hierop terug als de provider geen volledige description in z'n search-response geeft.

| Bestand | Doel |
|---|---|
| `index.ts` | `crawlJobDetail(url)` — kies HTTP of Puppeteer op basis van heuristics, retourneer `{ description, applyQuestions? }`. |
| `cache.ts` | Firestore-backed cache (`jobs_cache` collection). TTL: 24 uur per entry. Key: gehashed URL. |
| `extractor.ts` | DOM → tekst extractie + heuristics voor section-detection (description vs nice-to-have vs requirements). |
| `http-crawler.ts` | Lightweight `fetch` + `cheerio`. Eerste keuze — sneller, geen Chromium. |
| `puppeteer-crawler.ts` | Headless browser via `@sparticuz/chromium`. Fallback voor JS-rendered ATS-pages (sommige Recruitee/Lever-instances). |

## Patterns

- **HTTP-first**: probeer altijd `http-crawler.ts` eerst. Pas naar Puppeteer als de extractor minder dan een drempel content vindt (heuristisch — zie `index.ts`).
- **Cache write-through**: schrijf naar Firestore na elke succesvolle crawl. Subsequent requests serven uit cache zolang TTL geldig is.
- **Geen retries op 404** — provider-job verwijderd. Cache de afwezigheid (negative cache) zodat we niet repetitief crawlen.
- **Rate-limiting**: respecteer `Retry-After` headers. Bij 429 → exponential backoff, niet logging-spam.

## Wanneer Puppeteer aanroepen

Alleen voor pages die client-side hydrateren — herkenbaar aan:
- Lege `<body>` in raw HTML
- `__NEXT_DATA__` / `window.__INITIAL_STATE__` aanwezig maar de description zit daar niet leesbaar in
- Specifieke ATS waar we al weten dat HTTP faalt

Puppeteer is duur (Cloud Run cold start ~3s extra). Probeer eerst extractor-tweaks voordat je naar Puppeteer fallback.

## Crawl-route via `/api/jobs/crawl`

Er is ook een dedicated `/api/jobs/crawl/route.ts` (admin/internal) voor bulk crawling. Niet voor user-facing flows.
