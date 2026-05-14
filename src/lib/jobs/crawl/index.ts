/**
 * Crawl orchestrator. Public entry-point: `crawlVacancy(url)`.
 *
 * Pipeline:
 *   1. Firestore cache check (sha256 of source URL, 7d TTL).
 *   2. HTTP-only crawl: follow redirects, unwrap Adzuna interstitial.
 *      - If the final URL is a known ATS we already support, fetch via JSON API.
 *      - Otherwise, extract text from the HTML.
 *   3. If extracted text is too short (<1500 chars → likely JS-rendered),
 *      fall back to puppeteer and re-extract.
 *   4. Cache the result.
 *
 * All failures are soft: callers receive `{ ok: false, fullText: '' }` and
 * can fall back to whatever short snippet they already have. The crawler
 * never throws upward.
 */

import { httpCrawl } from './http-crawler';
import { puppeteerCrawl } from './puppeteer-crawler';
import { extractText } from './extractor';
import { getCrawlCache, setCrawlCache, type CrawlMethod } from './cache';
import { getProvider } from '../providers/registry';
import type { DetectedAts } from '../ats-detector';

const MIN_TEXT_THRESHOLD = 1500;

export interface CrawlVacancyResult {
  ok: boolean;
  sourceUrl: string;
  finalUrl: string;
  fullText: string;
  title: string | null;
  method: CrawlMethod;
  bytes: number;
  cached: boolean;
  error: string | null;
}

async function fetchViaAts(ats: DetectedAts): Promise<{ description: string; title: string | null } | null> {
  const provider = getProvider(ats.provider);
  if (!provider) return null;
  try {
    const job = await provider.fetchJob(ats.companyId, ats.jobId);
    if (!job) return null;
    return { description: job.description || '', title: job.title || null };
  } catch {
    return null;
  }
}

function emptyResult(sourceUrl: string, finalUrl: string, error: string): CrawlVacancyResult {
  return {
    ok: false,
    sourceUrl,
    finalUrl,
    fullText: '',
    title: null,
    method: 'http',
    bytes: 0,
    cached: false,
    error,
  };
}

export interface CrawlOpts {
  /** Skip the puppeteer fallback even if the HTTP path got thin content. */
  skipPuppeteer?: boolean;
  /** Skip the Firestore cache (e.g. for the re-feasibility test script). */
  skipCache?: boolean;
}

export async function crawlVacancy(sourceUrl: string, opts: CrawlOpts = {}): Promise<CrawlVacancyResult> {
  if (!sourceUrl || !sourceUrl.trim()) {
    return emptyResult(sourceUrl, sourceUrl, 'no-url');
  }

  // 0. Cache
  if (!opts.skipCache) {
    try {
      const cached = await getCrawlCache(sourceUrl);
      if (cached) {
        return {
          ok: cached.fullText.length > 0,
          sourceUrl: cached.sourceUrl,
          finalUrl: cached.finalUrl,
          fullText: cached.fullText,
          title: cached.title,
          method: cached.method,
          bytes: cached.bytes,
          cached: true,
          error: null,
        };
      }
    } catch (e) {
      // Cache read failure is non-fatal — proceed to crawl.
      console.warn('[crawl] cache read failed:', e instanceof Error ? e.message : e);
    }
  }

  // 1. HTTP crawl
  const http = await httpCrawl(sourceUrl);

  // 2a. ATS short-circuit (Greenhouse / Lever / Recruitee). Even if the HTML
  //     came through, the JSON API gives us much cleaner content.
  if (http.ats) {
    const ats = await fetchViaAts(http.ats);
    if (ats && ats.description.trim().length > 0) {
      const result: CrawlVacancyResult = {
        ok: true,
        sourceUrl,
        finalUrl: http.finalUrl,
        fullText: ats.description.trim(),
        title: ats.title,
        method: 'ats-api',
        bytes: ats.description.length,
        cached: false,
        error: null,
      };
      await safeCacheWrite(result);
      return result;
    }
  }

  // 2b. Extract text from the HTTP HTML.
  if (http.html) {
    const extracted = extractText(http.html, { minTextThreshold: MIN_TEXT_THRESHOLD });
    if (!extracted.likelyJsRendered && !extracted.looksBlocked) {
      const result: CrawlVacancyResult = {
        ok: true,
        sourceUrl,
        finalUrl: http.finalUrl,
        fullText: extracted.text,
        title: extracted.title,
        method: 'http',
        bytes: extracted.length,
        cached: false,
        error: null,
      };
      await safeCacheWrite(result);
      return result;
    }
  }

  // 3. Puppeteer fallback. Try to render whatever the HTTP path landed on,
  //    or — if HTTP failed entirely — the original URL.
  if (!opts.skipPuppeteer) {
    const startForPup = http.finalUrl || sourceUrl;
    const pup = await puppeteerCrawl(startForPup);
    if (pup.html) {
      const extracted = extractText(pup.html, { minTextThreshold: MIN_TEXT_THRESHOLD });
      if (extracted.text.length > 0 && !extracted.looksBlocked) {
        const result: CrawlVacancyResult = {
          ok: true,
          sourceUrl,
          finalUrl: pup.finalUrl,
          fullText: extracted.text,
          title: extracted.title,
          method: 'puppeteer',
          bytes: extracted.length,
          cached: false,
          error: null,
        };
        await safeCacheWrite(result);
        return result;
      }
      if (extracted.looksBlocked) {
        return emptyResult(sourceUrl, pup.finalUrl, 'blocked-by-source');
      }
    }
  }

  // 4. Give up — return whatever we got from HTTP, even if thin.
  if (http.html) {
    const extracted = extractText(http.html, { minTextThreshold: 0 });
    return {
      ok: extracted.text.length > 0,
      sourceUrl,
      finalUrl: http.finalUrl,
      fullText: extracted.text,
      title: extracted.title,
      method: 'http',
      bytes: extracted.length,
      cached: false,
      error: http.error || 'thin-content',
    };
  }

  return emptyResult(sourceUrl, http.finalUrl, http.error || 'no-content');
}

async function safeCacheWrite(result: CrawlVacancyResult): Promise<void> {
  if (!result.ok || result.fullText.length === 0) return;
  try {
    await setCrawlCache({
      sourceUrl: result.sourceUrl,
      finalUrl: result.finalUrl,
      fullText: result.fullText,
      title: result.title,
      method: result.method,
      bytes: result.bytes,
    });
  } catch (e) {
    console.warn('[crawl] cache write failed:', e instanceof Error ? e.message : e);
  }
}
