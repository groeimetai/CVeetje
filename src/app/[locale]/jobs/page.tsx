import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { JobSearchBar } from '@/components/jobs/job-search-bar';
import { JobCard } from '@/components/jobs/job-card';
import { JobPagination } from '@/components/jobs/job-pagination';
import { searchJobs } from '@/lib/jobs/search';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; location?: string; page?: string }>;
};

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

  let results: Awaited<ReturnType<typeof searchJobs>> | null = null;
  let errorMessage: string | null = null;

  try {
    results = await searchJobs({ q, location, page });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }

  return (
    <div className="min-h-screen flex flex-col">
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: t('listTitle'), url: `/${locale}/jobs` },
        ]}
      />

      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button asChild variant="outline" size="sm">
              <Link href="/login">{locale === 'nl' ? 'Inloggen' : 'Sign in'}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">{t('listTitle')}</h1>
            <p className="text-muted-foreground">{t('listSubtitle')}</p>
          </div>

          <JobSearchBar defaultQuery={q ?? ''} defaultLocation={location ?? ''} />

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
              />
            </>
          )}

          <p className="text-xs text-muted-foreground pt-4 border-t">{t('poweredBy')}</p>
        </div>
      </main>
    </div>
  );
}
