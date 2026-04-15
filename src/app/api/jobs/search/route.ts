import { NextResponse } from 'next/server';
import { searchJobs } from '@/lib/jobs/search';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? undefined;
    const location = url.searchParams.get('location') ?? undefined;
    const pageStr = url.searchParams.get('page');

    const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

    const result = await searchJobs({ q, location, page });
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('[/api/jobs/search]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
