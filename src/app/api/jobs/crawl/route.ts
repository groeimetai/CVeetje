/**
 * POST /api/jobs/crawl
 *
 * Server-side vacancy crawler. Pulls the full vacancy text behind an Adzuna
 * interstitial redirect or any other URL — falls back to puppeteer when the
 * landing page is JS-rendered. Result is cached per source URL for 7 days
 * (see src/lib/jobs/crawl/cache.ts).
 *
 * Auth: requires a valid Firebase ID token (Bearer or `firebase-token` cookie).
 * No rate limit — the cache + auth are the natural rate-limiters.
 *
 * Request:  { url: string }
 * Response: { ok, fullText, finalUrl, method, cached, bytes, title, error? }
 */

import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { crawlVacancy } from '@/lib/jobs/crawl';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  // Prefer the Bearer header (used by client fetch helpers); fall back to the
  // firebase-token cookie which the middleware also reads.
  const auth = request.headers.get('authorization') || request.headers.get('Authorization');
  let token: string | null = null;
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7).trim();
  }
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const m = cookieHeader.match(/(?:^|;\s*)firebase-token=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  const uid = await getUserIdFromRequest(request);
  if (!uid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url) {
    return NextResponse.json({ error: 'missing-url' }, { status: 400 });
  }

  // Surface-level URL sanity (deeper SSRF check lives inside crawlVacancy).
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'invalid-url' }, { status: 400 });
  }

  const started = Date.now();
  const result = await crawlVacancy(url);
  const elapsedMs = Date.now() - started;

  // Telemetry without leaking the body.
  console.log(
    `[crawl] uid=${uid} url=${url.slice(0, 120)} method=${result.method} ok=${result.ok} bytes=${result.bytes} cached=${result.cached} ms=${elapsedMs}${result.error ? ' err=' + result.error : ''}`,
  );

  return NextResponse.json({
    ok: result.ok,
    sourceUrl: result.sourceUrl,
    finalUrl: result.finalUrl,
    fullText: result.fullText,
    title: result.title,
    method: result.method,
    bytes: result.bytes,
    cached: result.cached,
    error: result.error,
  });
}
