import type { JobSourceProvider, JobProvider } from './types';
import { recruiteeProvider } from './recruitee';
import { greenhouseProvider } from './greenhouse';
import { leverProvider } from './lever';
import { adzunaProvider } from './adzuna';

export interface CompanyConfig {
  provider: JobSourceProvider;
  /** Provider-specific identifier (Recruitee subdomain, Greenhouse board_token, Lever site name). */
  companyId: string;
  /** Lowercase alphanumeric short key used in URL slugs (`/jobs/<title>-gh-<companyKey>-<jobId>`). */
  companyKey: string;
  /** Human-readable company name shown in UI. */
  name: string;
}

/**
 * Default seed list of companies whose vacancies we aggregate.
 *
 * Override in production by setting CVEETJE_COMPANIES_JSON to a JSON array of
 * CompanyConfig objects, e.g.:
 *   CVEETJE_COMPANIES_JSON='[{"provider":"greenhouse","companyId":"adyen","companyKey":"adyen","name":"Adyen"}]'
 *
 * How to find the right `companyId`:
 * - **Greenhouse**: visit the company's careers page hosted at
 *   `https://boards.greenhouse.io/<token>` — the `<token>` is the companyId.
 *   Test with `curl https://boards-api.greenhouse.io/v1/boards/<token>/jobs`
 *   to confirm the board is public.
 * - **Recruitee**: the company's careers page is at
 *   `https://<subdomain>.recruitee.com` — `<subdomain>` is the companyId.
 *   Test with `curl https://<subdomain>.recruitee.com/api/offers/`.
 * - **Lever**: visit `https://jobs.lever.co/<site>` — `<site>` is the companyId.
 *   Test with `curl https://api.lever.co/v0/postings/<site>?mode=json`.
 *
 * Failed companies are skipped at search time (logged as warnings), so a stale
 * entry won't break the page — it just contributes zero results.
 */
const DEFAULT_SEED: CompanyConfig[] = [
  // Greenhouse — large public boards
  { provider: 'greenhouse', companyId: 'gitlab', companyKey: 'gitlab', name: 'GitLab' },
  { provider: 'greenhouse', companyId: 'stripe', companyKey: 'stripe', name: 'Stripe' },
  { provider: 'greenhouse', companyId: 'airbnb', companyKey: 'airbnb', name: 'Airbnb' },
  { provider: 'greenhouse', companyId: 'dropbox', companyKey: 'dropbox', name: 'Dropbox' },
  { provider: 'greenhouse', companyId: 'figma', companyKey: 'figma', name: 'Figma' },
  // Lever — large public sites
  { provider: 'lever', companyId: 'shopify', companyKey: 'shopify', name: 'Shopify' },
  { provider: 'lever', companyId: 'netflix', companyKey: 'netflix', name: 'Netflix' },
  { provider: 'lever', companyId: 'spotify', companyKey: 'spotify', name: 'Spotify' },
  // Recruitee — keep one entry as starting point; add NL companies via env var
  { provider: 'recruitee', companyId: 'recruitee', companyKey: 'recruitee', name: 'Recruitee' },
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

let cachedCompanies: CompanyConfig[] | null = null;

export function getCompanies(): CompanyConfig[] {
  if (cachedCompanies) return cachedCompanies;

  const raw = process.env.CVEETJE_COMPANIES_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Array<Partial<CompanyConfig>>;
      cachedCompanies = parsed
        .filter(
          (c): c is CompanyConfig =>
            !!c.provider && !!c.companyId && !!c.name,
        )
        .map((c) => ({
          ...c,
          companyKey: normalizeKey(c.companyKey || c.companyId),
        }));
      if (cachedCompanies.length > 0) return cachedCompanies;
    } catch (err) {
      console.warn('[jobs/registry] Failed to parse CVEETJE_COMPANIES_JSON:', err);
    }
  }

  cachedCompanies = DEFAULT_SEED.map((c) => ({
    ...c,
    companyKey: normalizeKey(c.companyKey),
  }));
  return cachedCompanies;
}

export function getCompanyByKey(companyKey: string): CompanyConfig | null {
  const normalized = normalizeKey(companyKey);
  return getCompanies().find((c) => c.companyKey === normalized) ?? null;
}

export function getProvider(id: JobSourceProvider): JobProvider | null {
  if (id === 'recruitee') return recruiteeProvider;
  if (id === 'greenhouse') return greenhouseProvider;
  if (id === 'lever') return leverProvider;
  if (id === 'adzuna') return adzunaProvider;
  return null;
}

export function getProviderByCode(code: string): JobProvider | null {
  if (code === 'rt') return recruiteeProvider;
  if (code === 'gh') return greenhouseProvider;
  if (code === 'lv') return leverProvider;
  if (code === 'az') return adzunaProvider;
  return null;
}

export function hydrateProviderCompanyNames(): void {
  for (const company of getCompanies()) {
    const provider = getProvider(company.provider);
    if (!provider) continue;
    if ('setCompanyName' in provider && typeof provider.setCompanyName === 'function') {
      (provider as unknown as {
        setCompanyName(key: string, name: string): void;
      }).setCompanyName(company.companyKey, company.name);
    }
  }
}

hydrateProviderCompanyNames();
