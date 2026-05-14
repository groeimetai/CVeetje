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

const REMOTE_KEYWORDS = [
  'remote',
  'thuiswerk',
  'hybride',
  'hybrid',
  'work from home',
  'work-from-home',
  'wfh',
  'telework',
];

function matchesFilters(job: NormalizedJob, params: JobSearchParams): boolean {
  if (params.employmentType) {
    const target = params.employmentType.toLowerCase();
    const value = (job.employmentType ?? '').toLowerCase();
    if (!value.includes(target)) return false;
  }
  if (params.remote) {
    const haystack = [job.title, job.description, job.location, job.employmentType]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!REMOTE_KEYWORDS.some((kw) => haystack.includes(kw))) return false;
  }
  if (typeof params.salaryMin === 'number' && params.salaryMin > 0) {
    // Only filter when we actually have salary info — don't hide jobs without it
    // unless the user has signalled they only want salary-disclosing jobs (not
    // currently exposed, so default: keep unknown-salary jobs visible).
    if (job.salaryMin !== null && job.salaryMin < params.salaryMin) return false;
    if (
      job.salaryMin === null &&
      job.salaryMax !== null &&
      job.salaryMax < params.salaryMin
    ) {
      return false;
    }
  }
  if (params.inAppOnly && !job.supportsInAppApply) return false;
  return true;
}

function sortJobs(jobs: NormalizedJob[], params: JobSearchParams): NormalizedJob[] {
  const sort = params.sort ?? 'recent';
  if (sort === 'salary') {
    return [...jobs].sort((a, b) => {
      const aSal = a.salaryMax ?? a.salaryMin ?? -1;
      const bSal = b.salaryMax ?? b.salaryMin ?? -1;
      return bSal - aSal;
    });
  }
  if (sort === 'relevance' && params.q) {
    const q = params.q.toLowerCase();
    const score = (job: NormalizedJob) => {
      let s = 0;
      if (job.title?.toLowerCase().includes(q)) s += 5;
      if (job.industry?.toLowerCase().includes(q)) s += 2;
      if (job.company?.toLowerCase().includes(q)) s += 1;
      if (job.description?.toLowerCase().includes(q)) s += 1;
      return s;
    };
    return [...jobs].sort((a, b) => score(b) - score(a));
  }
  // default: recent
  return [...jobs].sort((a, b) => {
    const ta = a.postedAt ? Date.parse(a.postedAt) : 0;
    const tb = b.postedAt ? Date.parse(b.postedAt) : 0;
    return tb - ta;
  });
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

/**
 * Cap how many jobs per seeded company we keep, sorted by most recent. Stripe,
 * Booking, GitLab etc. can have 300-500 open positions; processing all of them
 * on every search is wasteful since we only show 20 per page.
 */
const MAX_JOBS_PER_SEEDED_COMPANY = 100;

async function searchSeededAts(params: JobSearchParams): Promise<NormalizedJob[]> {
  const companies = getCompanies();
  const lists = await Promise.all(
    companies.map(async (company) => {
      const provider = getProvider(company.provider);
      if (!provider) return [];
      try {
        const all = await provider.listForCompany(company.companyId);
        if (all.length <= MAX_JOBS_PER_SEEDED_COMPANY) return all;
        // Most-recent first, then cap.
        const sorted = [...all].sort((a, b) => {
          const ta = a.postedAt ? Date.parse(a.postedAt) : 0;
          const tb = b.postedAt ? Date.parse(b.postedAt) : 0;
          return tb - ta;
        });
        return sorted.slice(0, MAX_JOBS_PER_SEEDED_COMPANY);
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

  // Adzuna is the primary discovery surface — it indexes the major NL/EU
  // employers' ATS boards already. ATS detection (enrichWithAtsDetection)
  // promotes Adzuna results pointing at Greenhouse/Lever/Recruitee to
  // 1-click-apply slugs, and resolveJobBySlug's enrichFromAts fetches full
  // descriptions + apply questions lazily on the detail page.
  //
  // The seeded ATS fan-out (~14 parallel HTTP calls) was duplicating Adzuna
  // coverage and was the dominant page-render cost. It now only fires as a
  // fallback when Adzuna is not configured (e.g. local dev without keys).
  const jobs = isAdzunaConfigured()
    ? await searchAdzuna(params).catch((err) => {
        console.warn(
          '[jobs/search] Adzuna failed',
          err instanceof Error ? err.message : err,
        );
        return [] as NormalizedJob[];
      })
    : await searchSeededAts(params).catch(() => [] as NormalizedJob[]);

  // Dedupe by slug (Adzuna can return the same job under multiple ids)
  const seen = new Set<string>();
  const merged: NormalizedJob[] = [];
  for (const job of jobs) {
    if (seen.has(job.slug)) continue;
    seen.add(job.slug);
    merged.push(job);
  }

  const filtered = merged.filter((job) => matchesFilters(job, params));
  const sorted = sortJobs(filtered, params);

  const totalResults = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / perPage));
  const start = (page - 1) * perPage;
  const results = sorted.slice(start, start + perPage);

  return {
    results,
    totalResults,
    totalPages,
    currentPage: page,
  };
}
