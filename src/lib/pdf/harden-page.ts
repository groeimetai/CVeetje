import type { Page, HTTPRequest } from 'puppeteer';

/**
 * Puppeteer-hardening voor server-side rendering van (deels) door gebruikers
 * of AI aangeleverde HTML.
 *
 * Waarom: alle renderers draaien `page.setContent(html)` op een `about:blank`
 * page in een Chromium die op Cloud Run zonder sandbox draait. Zonder filter
 * kan geïnjecteerde HTML (`<iframe src="http://10.x/...">`, `fetch()`) het
 * interne netwerk of localhost bereiken en het resultaat in de PDF/screenshot
 * laten renderen (SSRF). Deze helper zet request-interceptie aan en laat
 * alleen een expliciete allowlist door.
 */

const ALLOWED_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'lh3.googleusercontent.com',
  'media.licdn.com',
  'cdn.tailwindcss.com',
]);

const ALLOWED_HOST_SUFFIXES = ['.licdn.com', '.googleusercontent.com'];

export function isAllowedRenderRequest(rawUrl: string): boolean {
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl === 'about:blank') {
    return true;
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '443') return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s));
}

/**
 * Activeer request-interceptie met allowlist. Roep aan vóór `setContent`.
 */
export async function hardenPage(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  page.on('request', (req: HTTPRequest) => {
    if (req.isInterceptResolutionHandled()) return;
    if (isAllowedRenderRequest(req.url())) {
      req.continue().catch(() => {});
    } else {
      req.abort('blockedbyclient').catch(() => {});
    }
  });
}

/**
 * Hardened variant van `page.setContent(html, { waitUntil: 'networkidle0' })`.
 * Puppeteer 25 ondersteunt `networkidle0` niet meer voor setContent, dus we
 * wachten op `load` en daarna (best effort) op network-idle.
 */
export async function setContentHardened(
  page: Page,
  html: string,
  opts: { timeoutMs?: number } = {},
): Promise<void> {
  await hardenPage(page);
  await page.setContent(html, { waitUntil: 'load', timeout: opts.timeoutMs ?? 30000 });
  await page
    .waitForNetworkIdle({ idleTime: 300, timeout: Math.min(opts.timeoutMs ?? 10000, 10000) })
    .catch(() => {});
}
