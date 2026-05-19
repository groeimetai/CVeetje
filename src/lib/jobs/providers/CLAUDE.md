# Jobs providers — `src/lib/jobs/providers/`

ATS-provider abstractie. Eén file per provider; uniforme `JobProvider` interface.

| Bestand | Doel |
|---|---|
| `types.ts` | Centrale types: `JobProvider` interface (search + apply), `NormalizedJob` (vendor → unified shape), `ApplyQuestion`, `ApplyCandidate`, `ApplyResult`. Plus pure helpers: `normalizedJobToJobVacancy()`, `buildSlug()`, `parseSlug()`, `slugifyForUrl()`. |
| `registry.ts` | Companies-config + provider lookup. `getCompanies()`, `getCompanyByKey(key)`, `getProvider(id)`, `getProviderByCode(code)`. `hydrateProviderCompanyNames()` wordt bij boot aangeroepen om provider-side company display-names op te halen. |
| `adzuna.ts` | Adzuna API (aggregator, alleen search). Vereist `ADZUNA_APP_ID` + `ADZUNA_APP_KEY`. |
| `greenhouse.ts` | Greenhouse Job Board API. Search + apply (multi-step form). |
| `lever.ts` | Lever API. Search + apply (form posting). |
| `recruitee.ts` | Recruitee API. Search + apply. |

## `JobProvider` interface

Elke provider implementeert:
- `id: JobSourceProvider` (union: `'adzuna' \| 'greenhouse' \| 'lever' \| 'recruitee'`)
- `search(params: JobSearchParams): Promise<JobSearchResult>`
- `getJob(slug): Promise<NormalizedJob \| null>`
- `apply(candidate: ApplyCandidate): Promise<ApplyResult>` — optioneel, alleen voor providers met in-app apply

`adzuna` heeft géén apply — het is een aggregator, gebruiker wordt extern doorverwezen. UI checkt `supportsInAppApply` op de cached job-meta.

## Patterns

- **Normalisatie aan de provider-rand**: elke provider mapt vendor-payload naar `NormalizedJob`. De rest van de codebase ziet alleen `NormalizedJob` / `JobVacancy`.
- **Slug-formaat**: `<provider>__<company>__<originalId>` via `buildSlug()`. Bij URL-gebruik door `slugifyForUrl()` heen. Decode via `parseSlug()`.
- **Pagination**: search-params hebben `page` + `perPage`. Caller (`/api/jobs/search`) fan-outt over actieve providers en merget resultaten.
- **Caching**: search-resultaten en job-details worden gecached (zie `src/lib/jobs/crawl/CLAUDE.md`).

## Nieuwe provider toevoegen

1. Maak `src/lib/jobs/providers/<provider>.ts` die `JobProvider` implementeert.
2. Voeg de id toe aan `JobSourceProvider` union in `types.ts`.
3. Register in `registry.ts` (`PROVIDERS` map + eventuele company-configs).
4. Voeg env vars toe aan `.env.example` als de provider auth nodig heeft.
5. Update `src/lib/jobs/CLAUDE.md` met de nieuwe provider-rij.
