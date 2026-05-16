/**
 * IndexNow integration — notifies Bing (and via Bing, ChatGPT/Copilot search)
 * + Yandex when our content URLs change.
 *
 * Spec: https://www.indexnow.org/documentation
 *
 * Setup:
 * - Key lives in INDEXNOW_KEY env var (fallback to the hardcoded baseline).
 * - Verification file at /public/{key}.txt must contain the same key as text.
 * - Submit endpoint: https://api.indexnow.org/indexnow
 *
 * Limits:
 * - Max 10,000 URLs per request (we chunk if exceeded).
 * - Rate limit: be reasonable; we use 24h ISR + manual triggers, not per-request.
 */

const DEFAULT_KEY = 'eb1cd08166ec7d673fc342c367585280';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

const MAX_URLS_PER_REQUEST = 10_000;

export function getIndexNowKey(): string {
  return process.env.INDEXNOW_KEY?.trim() || DEFAULT_KEY;
}

export function getKeyLocation(baseUrl: string): string {
  return `${baseUrl}/${getIndexNowKey()}.txt`;
}

interface SubmitResult {
  ok: boolean;
  status: number;
  submitted: number;
  message?: string;
}

export async function submitUrls(urls: string[]): Promise<SubmitResult[]> {
  if (urls.length === 0) {
    return [{ ok: true, status: 200, submitted: 0, message: 'no urls' }];
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';
  const host = new URL(baseUrl).host;
  const key = getIndexNowKey();
  const keyLocation = getKeyLocation(baseUrl);

  const results: SubmitResult[] = [];

  for (let i = 0; i < urls.length; i += MAX_URLS_PER_REQUEST) {
    const chunk = urls.slice(i, i + MAX_URLS_PER_REQUEST);
    const body = {
      host,
      key,
      keyLocation,
      urlList: chunk,
    };

    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'CVeetjeIndexNow/1.0',
        },
        body: JSON.stringify(body),
      });

      // IndexNow returns 200 (success), 202 (accepted), 400 (bad request),
      // 403 (key mismatch), 422 (URL mismatch), 429 (too many requests).
      results.push({
        ok: res.status === 200 || res.status === 202,
        status: res.status,
        submitted: chunk.length,
        message: res.status >= 400 ? await res.text().catch(() => undefined) : undefined,
      });
    } catch (err) {
      results.push({
        ok: false,
        status: 0,
        submitted: 0,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

/**
 * Build the canonical URL list for IndexNow submission. Mirrors src/app/sitemap.ts
 * static + content routes but skips dynamic jobs entries (their high churn would
 * blow our rate budget).
 */
export async function listIndexableUrls(): Promise<string[]> {
  const { listAllSlugs: listAllBlogSlugs } = await import('@/content/blog');
  const { allPersonaSlugs } = await import('@/content/personas');
  const { allRolePageSlugs } = await import('@/content/role-pages');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';
  const locales = ['nl', 'en'] as const;

  const staticPaths = [
    '',
    '/jobs',
    '/blog',
    '/voor',
    '/faq',
    '/cv-voorbeeld',
    '/cv-template',
    '/motivatiebrief-generator',
    '/cv-op-maat-maken',
    '/cv-stijlen',
    '/about',
    '/ai-transparency',
    '/compliance',
  ];

  const urls: string[] = [];

  for (const path of staticPaths) {
    for (const locale of locales) {
      urls.push(`${baseUrl}/${locale}${path}`);
    }
  }

  for (const s of listAllBlogSlugs()) {
    urls.push(`${baseUrl}/${s.locale}/blog/${s.slug}`);
  }

  for (const s of allPersonaSlugs()) {
    urls.push(`${baseUrl}/${s.locale}/voor/${s.slug}`);
  }

  for (const s of allRolePageSlugs()) {
    const segment = s.kind === 'voorbeeld' ? 'cv-voorbeeld' : 'cv-template';
    urls.push(`${baseUrl}/${s.locale}/${segment}/${s.slug}`);
  }

  return urls;
}
