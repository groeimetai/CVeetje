import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { listIndexableUrls, submitUrls } from '@/lib/indexnow';

/**
 * POST /api/indexnow/submit
 *
 * Notifies IndexNow (Bing + Yandex) about all our public content URLs.
 * Useful after deploying new content. Admin-only.
 *
 * Optional body: { urls?: string[] } — restrict to a specific subset.
 * Default: submit every static content URL we have (blog, voor, cv-voorbeeld,
 * cv-template, FAQ, feature pages). Skips jobs (high-churn, would burn budget).
 */
export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 },
      );
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 },
      );
    }

    let urls: string[];
    try {
      const body = await request.json().catch(() => ({}));
      if (Array.isArray(body?.urls) && body.urls.length > 0) {
        urls = body.urls.filter((u: unknown): u is string => typeof u === 'string');
      } else {
        urls = await listIndexableUrls();
      }
    } catch {
      urls = await listIndexableUrls();
    }

    const results = await submitUrls(urls);
    const allOk = results.every((r) => r.ok);
    const submitted = results.reduce((acc, r) => acc + r.submitted, 0);

    return NextResponse.json(
      {
        ok: allOk,
        submitted,
        chunks: results.length,
        results,
      },
      { status: allOk ? 200 : 207 }, // 207 multi-status when partial
    );
  } catch (err) {
    console.error('[IndexNow] submit failed', err);
    return NextResponse.json(
      { error: 'IndexNow submit failed', message: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/indexnow/submit
 *
 * Dry-run: returns the URL list we would submit. Admin-only.
 */
export async function GET(request: NextRequest) {
  const token =
    request.cookies.get('firebase-token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await verifyAdminRequest(token);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const urls = await listIndexableUrls();
  return NextResponse.json({ count: urls.length, urls });
}
