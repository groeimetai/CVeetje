import { NextResponse } from 'next/server';
import { searchJobs } from '@/lib/jobs/search';
import type { JobSortOption } from '@/lib/jobs/providers/types';

export const runtime = 'nodejs';
export const revalidate = 300;

const VALID_SORTS: JobSortOption[] = ['recent', 'salary', 'relevance'];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? undefined;
    const location = url.searchParams.get('location') ?? undefined;
    const pageStr = url.searchParams.get('page');
    const employmentType = url.searchParams.get('type') ?? undefined;
    const remote = url.searchParams.get('remote') === '1';
    const inAppOnly = url.searchParams.get('inApp') === '1';
    const salaryMinStr = url.searchParams.get('salaryMin');
    const salaryMin = salaryMinStr ? parseInt(salaryMinStr, 10) : undefined;
    const sortParam = url.searchParams.get('sort');
    const sort = VALID_SORTS.includes(sortParam as JobSortOption)
      ? (sortParam as JobSortOption)
      : undefined;

    const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

    const result = await searchJobs({
      q,
      location,
      page,
      employmentType,
      remote,
      inAppOnly,
      salaryMin: salaryMin && !Number.isNaN(salaryMin) ? salaryMin : undefined,
      sort,
    });
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
