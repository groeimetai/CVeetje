import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { JobSearchBar } from '@/components/jobs/job-search-bar';
import { JobCard } from '@/components/jobs/job-card';
import { JobPagination } from '@/components/jobs/job-pagination';
import { searchJobs } from '@/lib/jobs/search';
import type { JobSortOption } from '@/lib/jobs/providers/types';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';
import { PageHeader } from '@/components/brand/page-header';

export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    location?: string;
    page?: string;
    type?: string;
    remote?: string;
    inApp?: string;
    salaryMin?: string;
    sort?: string;
  }>;
};

const VALID_SORTS: JobSortOption[] = ['recent', 'salary', 'relevance'];

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'metadata.jobs' });

  const qSuffix = [sp.q, sp.location].filter(Boolean).join(' — ');
  const title = qSuffix ? `${qSuffix} | ${t('title')}` : t('title');

  return {
    title,
    description: t('description'),
    alternates: {
      canonical: `/${locale}/jobs`,
      languages: {
        nl: '/nl/jobs',
        en: '/en/jobs',
      },
    },
  };
}

export default async function JobsListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('jobs');

  const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;
  const q = sp.q?.trim() || undefined;
  const location = sp.location?.trim() || undefined;
  const employmentType = sp.type?.trim() || undefined;
  const remote = sp.remote === '1';
  const inAppOnly = sp.inApp === '1';
  const salaryMin = sp.salaryMin ? parseInt(sp.salaryMin, 10) : undefined;
  const sort: JobSortOption | undefined = VALID_SORTS.includes(sp.sort as JobSortOption)
    ? (sp.sort as JobSortOption)
    : undefined;

  let results: Awaited<ReturnType<typeof searchJobs>> | null = null;
  let errorMessage: string | null = null;

  try {
    results = await searchJobs({
      q,
      location,
      page,
      employmentType,
      remote,
      inAppOnly,
      salaryMin: salaryMin && !Number.isNaN(salaryMin) ? salaryMin : undefined,
      sort,
    });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }

  const activeFilters = {
    employmentType,
    remote,
    inAppOnly,
    salaryMin: salaryMin && !Number.isNaN(salaryMin) ? salaryMin : undefined,
    sort: (sort ?? 'recent') as JobSortOption,
  };

  return (
    <>
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: t('listTitle'), url: `/${locale}/jobs` },
        ]}
      />

      <PageHeader
        eyebrow="§ Vacaturebank"
        title={<>Vind een <em>vacature</em></>}
        subtitle={t('listSubtitle')}
      />

      <JobSearchBar
        defaultQuery={q ?? ''}
        defaultLocation={location ?? ''}
        defaultFilters={activeFilters}
      />

      {errorMessage && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {t('error')}: {errorMessage}
        </div>
      )}

      {!errorMessage && results && (
        <>
          <p className="text-sm text-muted-foreground">
            {t('resultCount', { count: results.totalResults })}
          </p>

          {results.results.length === 0 ? (
            <div className="rounded-md border bg-muted/20 p-8 text-center text-muted-foreground">
              {t('noResults')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.results.map((job) => (
                <JobCard key={job.sourceId} job={job} />
              ))}
            </div>
          )}

          <JobPagination
            currentPage={results.currentPage}
            totalPages={results.totalPages}
            q={q}
            location={location}
            filters={activeFilters}
          />
        </>
      )}

      <p className="text-xs text-muted-foreground pt-4 border-t">{t('poweredBy')}</p>
    </>
  );
}
