/**
 * JS-rendered crawler: launches headless chromium, navigates, waits for the
 * page to settle, and returns the rendered HTML. Used as a fallback when the
 * HTTP-only crawler hits a JS-redirect stub or a SPA shell that has <1500
 * chars of static text.
 *
 * Browser launch pattern is the same as the PDF generator
 * (`src/lib/pdf/generator.ts`) — launch per call. Cold-start adds ~1-2s on
 * Cloud Run but avoids singleton lifecycle bugs.
 */

import puppeteer, { type Browser } from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { validateURL } from '@/lib/security/url-validator';

const NAV_TIMEOUT_MS = 15_000;
const SETTLE_TIMEOUT_MS = 3_000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.K_SERVICE);

async function launchBrowser(): Promise<Browser> {
  if (isServerless) {
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1366, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1366, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export interface PuppeteerCrawlResult {
  finalUrl: string;
  html: string | null;
  status: number | null;
  ok: boolean;
  error: string | null;
}

/**
 * Render a URL with chromium and return the final URL + outer HTML. Resource
 * types we don't need for text extraction (images, fonts, media, stylesheets)
 * are blocked at the request level to keep the page from waiting on them.
 */
export async function puppeteerCrawl(
  startUrl: string,
  opts: { navTimeoutMs?: number; settleTimeoutMs?: number } = {},
): Promise<PuppeteerCrawlResult> {
  const navTimeoutMs = opts.navTimeoutMs ?? NAV_TIMEOUT_MS;
  const settleTimeoutMs = opts.settleTimeoutMs ?? SETTLE_TIMEOUT_MS;

  const validation = validateURL(startUrl, { allowAnyHost: true });
  if (!validation.valid) {
    return { finalUrl: startUrl, html: null, status: null, ok: false, error: `ssrf-blocked:${validation.error}` };
  }

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const t = req.resourceType();
      if (t === 'image' || t === 'media' || t === 'font' || t === 'stylesheet') {
        req.abort().catch(() => { /* ignore */ });
      } else {
        req.continue().catch(() => { /* ignore */ });
      }
    });

    let response;
    try {
      response = await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
    } catch (e) {
      const name = e instanceof Error ? e.name : 'unknown';
      return { finalUrl: page.url(), html: null, status: null, ok: false, error: `nav-error:${name}` };
    }

    // Settle wait: try networkidle, but accept a clean timeout (some sites
    // keep long-polling forever).
    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: settleTimeoutMs });
    } catch {
      // Idle never reached — proceed with what we have.
    }

    const html = await page.content();
    const finalUrl = page.url();
    const status = response?.status() ?? null;

    // Validate the URL we actually ended up on (defence-in-depth against
    // navigations to private IPs via JS redirects).
    const finalValidation = validateURL(finalUrl, { allowAnyHost: true });
    if (!finalValidation.valid) {
      return { finalUrl, html: null, status, ok: false, error: `ssrf-blocked-after-nav:${finalValidation.error}` };
    }

    return {
      finalUrl,
      html,
      status,
      ok: typeof status === 'number' ? status >= 200 && status < 400 : true,
      error: null,
    };
  } catch (e) {
    const name = e instanceof Error ? e.name : 'unknown';
    return { finalUrl: startUrl, html: null, status: null, ok: false, error: `launch-error:${name}` };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
