import type { ApplyResult, JobProvider, NormalizedJob } from './types';
import { slugifyForUrl } from './types';

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';

interface AdzunaRawJob {
  id: string;
  title: string;
  description: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  redirect_url: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  contract_time?: string;
  category?: { label?: string; tag?: string };
}

export interface AdzunaSearchResponse {
  count: number;
  results: AdzunaRawJob[];
}

export interface AdzunaSearchParams {
  q?: string;
  location?: string;
  page?: number;
  resultsPerPage?: number;
}

export function isAdzunaConfigured(): boolean {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

function getCredentials() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY || 'nl';
  if (!appId || !appKey) {
    throw new Error('Adzuna credentials missing (ADZUNA_APP_ID / ADZUNA_APP_KEY)');
  }
  return { appId, appKey, country };
}

export function mapAdzunaJob(raw: AdzunaRawJob): NormalizedJob {
  const companyName = raw.company?.display_name?.trim() || null;
  const companyKey = companyName
    ? slugifyForUrl(companyName).replace(/-/g, '').slice(0, 24)
    : 'unknown';
  const titleSlug = slugifyForUrl(raw.title || 'vacature').slice(0, 50);

  return {
    sourceProvider: 'adzuna',
    sourceId: raw.id,
    providerCompanyKey: companyKey,
    providerCompanyId: null,
    slug: [titleSlug, 'az', companyKey, raw.id].filter(Boolean).join('-'),
    title: raw.title?.trim() || 'Untitled position',
    company: companyName,
    location: raw.location?.display_name?.trim() || null,
    description: raw.description?.trim() || '',
    industry: raw.category?.label?.trim() || null,
    employmentType:
      [raw.contract_time, raw.contract_type].filter(Boolean).join(' / ') || null,
    salaryMin: typeof raw.salary_min === 'number' ? raw.salary_min : null,
    salaryMax: typeof raw.salary_max === 'number' ? raw.salary_max : null,
    salaryCurrency: 'EUR',
    url: raw.redirect_url,
    postedAt: raw.created ?? null,
    supportsInAppApply: false,
    applyQuestions: [],
  };
}

export async function adzunaSearch(
  params: AdzunaSearchParams,
): Promise<{ results: AdzunaRawJob[]; totalResults: number }> {
  const { appId, appKey, country } = getCredentials();
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(50, Math.max(1, params.resultsPerPage ?? 20));

  const url = new URL(`${ADZUNA_BASE}/${country}/search/${page}`);
  url.searchParams.set('app_id', appId);
  url.searchParams.set('app_key', appKey);
  url.searchParams.set('content-type', 'application/json');
  url.searchParams.set('results_per_page', String(perPage));
  if (params.q) url.searchParams.set('what', params.q);
  if (params.location) url.searchParams.set('where', params.location);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Adzuna request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as AdzunaSearchResponse;
  return { results: data.results ?? [], totalResults: data.count ?? 0 };
}

/**
 * Adzuna as a JobProvider is discovery-only: it can list jobs but cannot accept
 * inbound applications. The apply method always returns an error pointing users
 * to the original redirect URL.
 */
export class AdzunaProvider implements JobProvider {
  readonly id = 'adzuna' as const;
  readonly code = 'az';

  async listForCompany(): Promise<NormalizedJob[]> {
    // Adzuna is not per-company; listing is done via adzunaSearch() in search.ts.
    return [];
  }

  async fetchJob(_companyId: string, jobId: string): Promise<NormalizedJob | null> {
    // Adzuna has no single-job endpoint; find by id via search.
    try {
      const { results } = await adzunaSearch({ q: jobId, resultsPerPage: 50 });
      const hit = results.find((r) => r.id === jobId);
      return hit ? mapAdzunaJob(hit) : null;
    } catch {
      return null;
    }
  }

  async apply(): Promise<ApplyResult> {
    return {
      ok: false,
      errors: [
        {
          message:
            'Adzuna-vacatures ondersteunen geen 1-klik solliciteren. Gebruik de externe link.',
        },
      ],
    };
  }
}

export const adzunaProvider = new AdzunaProvider();
