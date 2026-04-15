import type {
  JobSearchParams,
  JobSearchResult,
  NormalizedJob,
} from './providers/types';
import { getCompanies, getProvider } from './providers/registry';
import { adzunaSearch, isAdzunaConfigured, mapAdzunaJob } from './providers/adzuna';
import { detectAtsFromUrl } from './ats-detector';
import { buildSlug } from './providers/types';

function matchesQuery(
  job: NormalizedJob,
  q: string | undefined,
  location: string | undefined,
) {
  if (!q && !location) return true;
  if (q) {
    const haystack = [job.title, job.company, job.description, job.industry]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q.toLowerCase())) return false;
  }
  if (location) {
    const loc = (job.location ?? '').toLowerCase();
    if (!loc.includes(location.toLowerCase())) return false;
  }
  return true;
}

/**
 * Take an Adzuna-sourced job and, if its redirect URL points at a known ATS
 * (Greenhouse/Lever/Recruitee), promote it to that ATS so 1-click apply works.
 * Returns the original Adzuna job unchanged if no ATS match is found.
 */
function enrichWithAtsDetection(job: NormalizedJob): NormalizedJob {
  if (job.sourceProvider !== 'adzuna') return job;
  const detected = detectAtsFromUrl(job.url);
  if (!detected) return job;

  return {
    ...job,
    sourceProvider: detected.provider,
    sourceId: detected.jobId,
    providerCompanyKey: detected.companyKey,
    providerCompanyId: detected.companyId,
    slug: buildSlug(detected.providerCode, detected.companyKey, detected.jobId, job.title),
    supportsInAppApply: true,
    // applyQuestions stay empty — we lazy-fetch them when the user opens apply.
  };
}

async function searchSeededAts(params: JobSearchParams): Promise<NormalizedJob[]> {
  const companies = getCompanies();
  const lists = await Promise.all(
    companies.map(async (company) => {
      const provider = getProvider(company.provider);
      if (!provider) return [];
      try {
        return await provider.listForCompany(company.companyId);
      } catch (err) {
        console.warn(
          `[jobs/search] ${company.provider}/${company.companyId} failed`,
          err instanceof Error ? err.message : err,
        );
        return [];
      }
    }),
  );
  return lists.flat().filter((j) => matchesQuery(j, params.q, params.location));
}

async function searchAdzuna(params: JobSearchParams): Promise<NormalizedJob[]> {
  const { results } = await adzunaSearch({
    q: params.q,
    location: params.location,
    page: params.page ?? 1,
    resultsPerPage: 50,
  });
  return results.map(mapAdzunaJob).map(enrichWithAtsDetection);
}

export async function searchJobs(params: JobSearchParams): Promise<JobSearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(50, Math.max(1, params.resultsPerPage ?? 20));

  const [adzunaJobs, seededJobs] = await Promise.all([
    isAdzunaConfigured()
      ? searchAdzuna(params).catch((err) => {
          console.warn(
            '[jobs/search] Adzuna failed',
            err instanceof Error ? err.message : err,
          );
          return [] as NormalizedJob[];
        })
      : Promise.resolve([] as NormalizedJob[]),
    searchSeededAts(params).catch(() => [] as NormalizedJob[]),
  ]);

  // Dedupe by slug (seeded ATS jobs may overlap with Adzuna-detected ATS jobs)
  const seen = new Set<string>();
  const merged: NormalizedJob[] = [];
  for (const job of [...seededJobs, ...adzunaJobs]) {
    if (seen.has(job.slug)) continue;
    seen.add(job.slug);
    merged.push(job);
  }

  merged.sort((a, b) => {
    const ta = a.postedAt ? Date.parse(a.postedAt) : 0;
    const tb = b.postedAt ? Date.parse(b.postedAt) : 0;
    return tb - ta;
  });

  const totalResults = merged.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / perPage));
  const start = (page - 1) * perPage;
  const results = merged.slice(start, start + perPage);

  return {
    results,
    totalResults,
    totalPages,
    currentPage: page,
  };
}
