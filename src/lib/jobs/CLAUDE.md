# Jobs board — `src/lib/jobs/`

Public jobs board aggregeert 4 ATS providers + bevat 1-click apply flow.

## Pipeline

| File | Doel |
|---|---|
| `search.ts` | `searchJobs(params)` — fan-out search across providers + query/location filter |
| `cache.ts` | Firestore-backed job cache (collection `jobs/`, public-read) |
| `resolve.ts` | `resolveJob(slug)` — slug → `NormalizedJob` |
| `ats-detector.ts` | `detectAtsFromUrl(url)` — promote Adzuna redirects naar known ATS (zodat 1-click apply werkt) |
| `job-vacancy-mapper.ts` | `NormalizedJob` → `JobVacancy` voor de wizard |

## Providers (`providers/`)

| Provider | Search | Apply |
|---|---|---|
| `adzuna.ts` | ✅ | ❌ (search-only — redirect) |
| `greenhouse.ts` | ✅ | ✅ (questions API) |
| `lever.ts` | ✅ | ✅ |
| `recruitee.ts` | ✅ | ✅ |

Plus:
- `registry.ts` — `getCompanies()`, `getProvider()` registry van bekende companies per ATS
- `types.ts` — `NormalizedJob`, `JobSearchParams`, `JobSearchResult`, `ApplyQuestion`, `JobSourceProvider`, `buildSlug` helper

## Applications tracker

Per-user job applications onder `users/{uid}/applications`. Statuses: `applied | interview | offer | rejected | accepted | withdrawn`.

- Creation is **Admin-SDK-only** (server records de ATS submission)
- User kan `status` / `notes` updaten en delete

Types: `src/types/application.ts` — `ApplicationRecord`, `ApplicationStatus`.

API routes: `src/app/api/applications/` (zie `src/app/api/CLAUDE.md`).
UI: `src/components/jobs/` + `src/app/[locale]/(dashboard)/applications/`.

## Adzuna config

`ADZUNA_APP_ID` + `ADZUNA_API_KEY` zijn **optioneel** — bij ontbreken valt search terug op providers zonder Adzuna.

## Nieuwe provider toevoegen

1. Nieuwe file in `providers/`
2. Implementeer `JobSourceProvider` interface uit `providers/types.ts`
3. Register in `providers/registry.ts` met bekende companies
4. Evt. extend `JobSourceProvider` type als de provider een nieuw concept introduceert
