import type { JobSourceProvider } from './providers/types';

export interface DetectedAts {
  provider: Exclude<JobSourceProvider, 'adzuna'>;
  providerCode: 'gh' | 'rt' | 'lv';
  companyId: string; // raw (token/subdomain/site)
  companyKey: string; // normalized alphanumeric
  jobId: string;
}

function normalizeKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
}

/**
 * Detect whether a job's redirect URL points at a known ATS that we support
 * 1-click applying to. Returns null if the URL doesn't match any supported ATS.
 *
 * Supported patterns:
 *   Greenhouse:
 *     https://boards.greenhouse.io/<token>/jobs/<id>
 *     https://job-boards.greenhouse.io/<token>/jobs/<id>
 *     https://<token>.greenhouse.io/jobs/<id>
 *   Lever:
 *     https://jobs.lever.co/<site>/<jobId>[/...]
 *   Recruitee:
 *     https://<subdomain>.recruitee.com/o/<slug>
 *     https://<subdomain>.recruitee.com/vacatures/<slug>  (NL)
 *     https://careers.recruitee.com/o/<slug>
 */
export function detectAtsFromUrl(rawUrl: string | null | undefined): DetectedAts | null {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, '');

  // Greenhouse
  if (host === 'boards.greenhouse.io' || host === 'job-boards.greenhouse.io') {
    const m = path.match(/^\/([^/]+)\/jobs\/(\d+)/);
    if (m) {
      const token = m[1];
      return {
        provider: 'greenhouse',
        providerCode: 'gh',
        companyId: token,
        companyKey: normalizeKey(token),
        jobId: m[2],
      };
    }
  }
  if (host.endsWith('.greenhouse.io') && host !== 'boards.greenhouse.io') {
    const subdomain = host.replace(/\.greenhouse\.io$/, '');
    const m = path.match(/\/jobs\/(\d+)/);
    if (m && subdomain && subdomain !== 'job-boards') {
      return {
        provider: 'greenhouse',
        providerCode: 'gh',
        companyId: subdomain,
        companyKey: normalizeKey(subdomain),
        jobId: m[1],
      };
    }
  }

  // Lever
  if (host === 'jobs.lever.co') {
    const m = path.match(/^\/([^/]+)\/([a-f0-9-]{8,})/);
    if (m) {
      return {
        provider: 'lever',
        providerCode: 'lv',
        companyId: m[1],
        companyKey: normalizeKey(m[1]),
        jobId: m[2],
      };
    }
  }

  // Recruitee
  if (host.endsWith('.recruitee.com')) {
    const subdomain = host.replace(/\.recruitee\.com$/, '');
    const m = path.match(/^\/(?:o|vacatures|careers)\/([^/]+)/);
    if (m && subdomain && subdomain !== 'careers') {
      // Recruitee's slug often ends with -<id>; keep whole slug as identifier
      return {
        provider: 'recruitee',
        providerCode: 'rt',
        companyId: subdomain,
        companyKey: normalizeKey(subdomain),
        jobId: m[1],
      };
    }
  }

  return null;
}
