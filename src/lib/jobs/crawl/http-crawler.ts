/**
 * HTTP-only crawler: follows redirect chains, unwraps Adzuna interstitials,
 * and short-circuits to a known-ATS JSON API when applicable. No JavaScript
 * rendering — the puppeteer fallback takes over for JS-rendered pages.
 *
 * The feasibility probe in /tmp/adzuna-feasibility-v2.mjs showed that NL
 * Adzuna jobs go through 1-3 redirect hops via aggregators (jobmatix,
 * appcast.io, prng.co, easyapply.jobs) before landing on the real employer
 * page — most of those intermediate hops do their final hop via JS, which
 * is where the puppeteer fallback kicks in.
 */

import { validateURL } from '@/lib/security/url-validator';
import { detectAtsFromUrl, type DetectedAts } from '../ats-detector';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_REDIRECT_HOPS = 8;
const MAX_HTML_BYTES = 500_000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const ADZUNA_INTERSTITIAL_HOSTS = new Set(['www.adzuna.nl', 'adzuna.nl', 'www.adzuna.com', 'adzuna.com']);

const TRACKER_HOSTS = [
  'googletagmanager.com', 'google-analytics.com', 'google.com', 'facebook.com',
  'twitter.com', 'doubleclick.net', 'googleadservices.com', 'bing.com',
  'fonts.gstatic.com', 'fonts.googleapis.com', 'ajax.googleapis.com',
  'cookielaw.org', 'onetrust.com', 'cdn.cookielaw.org',
];

export interface HttpCrawlResult {
  /** Final URL after all HTTP redirects + interstitial unwrap. */
  finalUrl: string;
  /** Full chain of URLs visited, including the original. */
  chain: string[];
  /** HTTP status of the final response. Null if we never got a 2xx. */
  status: number | null;
  /** Detected ATS on the final URL, if any (Greenhouse / Lever / Recruitee). */
  ats: DetectedAts | null;
  /** Raw HTML body of the final response, or null if non-HTML / failed. */
  html: string | null;
  /** Content-Type header of the final response. */
  contentType: string | null;
  /** True iff the response was 2xx and html is present. */
  ok: boolean;
  /** Short error tag if something went wrong (none, abort, fetch-error, ...). */
  error: string | null;
}

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  return fetch(url, {
    ...init,
    signal: ac.signal,
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*;q=0.8', ...(init.headers || {}) },
  }).finally(() => clearTimeout(timer));
}

async function readBodyCapped(res: Response, capBytes: number): Promise<string | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html') && !ct.includes('text/plain') && !ct.includes('application/xhtml')) {
    return null;
  }
  // Stream and cut off — protects against multi-GB pages.
  const reader = res.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let collected = '';
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    collected += decoder.decode(value, { stream: true });
    if (bytes >= capBytes) {
      try { await reader.cancel(); } catch { /* ignore */ }
      break;
    }
  }
  collected += decoder.decode();
  return collected;
}

async function fetchHop(
  url: string,
  timeoutMs: number,
  bodyCap: number,
  followRedirect: boolean,
): Promise<{ res: Response; body: string | null } | { error: string }> {
  try {
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      redirect: followRedirect ? 'follow' : 'manual',
    }, timeoutMs);
    if (res.status >= 300 && res.status < 400) {
      // Drain to free socket
      try { await res.body?.cancel?.(); } catch { /* ignore */ }
      return { res, body: null };
    }
    const body = res.ok ? await readBodyCapped(res, bodyCap) : null;
    return { res, body };
  } catch (e) {
    const name = e instanceof Error ? e.name : 'unknown';
    return { error: `fetch-error:${name}` };
  }
}

/**
 * Extract the outbound link from an Adzuna interstitial page. The page is a
 * small redirect-stub with a meta-refresh, a JS `window.location` assignment,
 * and/or a manual fallback `<a>` ("hier advertentie bekijken"). We try in
 * that order and return the first non-Adzuna, non-tracker URL we find.
 */
export function extractAdzunaOutbound(html: string, baseUrl: string): string | null {
  const candidates: string[] = [];

  // 1. meta-refresh
  const meta = html.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"'>\s]+)/i);
  if (meta) candidates.push(meta[1]);

  // 2. window.location / location.replace
  const wl = html.match(/(?:window\.location(?:\.href)?|location\.href|location\.replace\()\s*=?\s*["']([^"']+)["']/i);
  if (wl) candidates.push(wl[1]);

  // 3. Any href
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html))) candidates.push(m[1]);

  for (const c of candidates) {
    try {
      const u = new URL(c, baseUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      const host = u.hostname.toLowerCase();
      if (ADZUNA_INTERSTITIAL_HOSTS.has(host)) continue;
      if (host.endsWith('.adzuna.com') || host.endsWith('.adzuna.nl')) continue;
      if (TRACKER_HOSTS.some((t) => host === t || host.endsWith('.' + t))) continue;
      return u.toString();
    } catch {
      // Skip malformed
    }
  }
  return null;
}

function isAdzunaInterstitialUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ADZUNA_INTERSTITIAL_HOSTS.has(u.hostname.toLowerCase()) && u.pathname.includes('/land/ad/');
  } catch {
    return false;
  }
}

/**
 * Crawl a URL through HTTP redirects only. Handles Adzuna interstitial
 * unwrap transparently. Returns the final URL, status, and body (when HTML).
 *
 * SSRF: we validate every URL we're about to fetch against the existing
 * `validateURL` (blocks private IPs, localhost, cloud metadata endpoints).
 * Redirect targets are validated too — a 302 to 169.254.169.254 will be
 * refused.
 */
export async function httpCrawl(
  startUrl: string,
  opts: { timeoutMs?: number; maxHops?: number; maxBytes?: number } = {},
): Promise<HttpCrawlResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxHops = opts.maxHops ?? MAX_REDIRECT_HOPS;
  const maxBytes = opts.maxBytes ?? MAX_HTML_BYTES;

  const result: HttpCrawlResult = {
    finalUrl: startUrl,
    chain: [startUrl],
    status: null,
    ats: null,
    html: null,
    contentType: null,
    ok: false,
    error: null,
  };

  const startValidation = validateURL(startUrl, { allowAnyHost: true });
  if (!startValidation.valid) {
    result.error = `ssrf-blocked:${startValidation.error}`;
    return result;
  }

  let current = startUrl;

  for (let hop = 0; hop < maxHops; hop++) {
    const validation = validateURL(current, { allowAnyHost: true });
    if (!validation.valid) {
      result.error = `ssrf-blocked:${validation.error}`;
      return result;
    }

    const hopResult = await fetchHop(current, timeoutMs, maxBytes, false);
    if ('error' in hopResult) {
      result.error = hopResult.error;
      result.finalUrl = current;
      return result;
    }
    const { res, body } = hopResult;

    // Follow HTTP redirect manually so we can validate every hop.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) {
        result.status = res.status;
        result.error = `redirect-${res.status}-no-location`;
        result.finalUrl = current;
        return result;
      }
      try {
        current = new URL(loc, current).toString();
      } catch {
        result.error = 'redirect-invalid-location';
        result.finalUrl = current;
        return result;
      }
      result.chain.push(current);
      continue;
    }

    result.status = res.status;
    result.contentType = res.headers.get('content-type');
    result.finalUrl = current;

    if (!res.ok) {
      result.error = `http-${res.status}`;
      return result;
    }

    // Adzuna interstitial: unwrap and recurse on the outbound link.
    if (isAdzunaInterstitialUrl(current) && body) {
      const outbound = extractAdzunaOutbound(body, current);
      if (outbound && outbound !== current) {
        result.chain.push(outbound);
        current = outbound;
        continue;
      }
      // No outbound found — return the interstitial body, low-quality but real.
    }

    result.html = body;
    result.ok = body !== null;
    result.ats = detectAtsFromUrl(current);
    return result;
  }

  result.error = 'too-many-redirects';
  return result;
}
