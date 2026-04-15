import { NextResponse } from 'next/server';
import { resolveJobBySlug } from '@/lib/jobs/resolve';

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
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
