import { NextResponse } from 'next/server';
import { resolveJobBySlug } from '@/lib/jobs/resolve';
import { sanitizeError } from '@/lib/security/error-sanitizer';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const job = await resolveJobBySlug(slug);
    if (!job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(job, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[/api/jobs/[slug]]', err);
    return NextResponse.json({ error: sanitizeError(err, 'jobs-slug').message }, { status: 500 });
  }
}
