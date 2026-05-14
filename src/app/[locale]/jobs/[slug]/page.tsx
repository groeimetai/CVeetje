import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Briefcase, Building2, Clock, Euro, MapPin, ExternalLink, Zap } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';
import { JobPostingStructuredData } from '@/components/seo/job-posting-structured-data';
import { JobApplyPanel } from '@/components/jobs/job-apply-panel';
import { resolveJobBySlug } from '@/lib/jobs/resolve';

export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function formatSalary(min: number | null, max: number | null, currency: string | null) {
  if (!min && !max) return null;
  const cur = currency || 'EUR';
  const fmt = (n: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;

  const job = await resolveJobBySlug(slug).catch(() => null);
  if (!job) {
    return { title: 'Vacature niet gevonden' };
  }

  const titleBase = job.company ? `${job.title} bij ${job.company}` : job.title;
  const description = stripTags(job.description).slice(0, 160);

  return {
    title: `${titleBase} | CVeetje`,
    description,
    alternates: {
      canonical: `/${locale}/jobs/${slug}`,
      languages: {
        nl: `/nl/jobs/${slug}`,
        en: `/en/jobs/${slug}`,
      },
    },
    openGraph: {
      title: titleBase,
      description,
      type: 'article',
    },
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const job = await resolveJobBySlug(slug).catch((err) => {
    console.error('[job-detail]', err);
    return null;
  });

  if (!job) {
    notFound();
  }

  const t = await getTranslations('jobs');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';
  const canonicalUrl = `${baseUrl}/${locale}/jobs/${slug}`;
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <div className="min-h-screen flex flex-col">
      <JobPostingStructuredData job={job} url={canonicalUrl} />
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: t('listTitle'), url: `/${locale}/jobs` },
          { name: job.title, url: `/${locale}/jobs/${slug}` },
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

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/jobs">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('backToList')}
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {job.supportsInAppApply ? (
                <Badge className="bg-primary text-primary-foreground">
                  <Zap className="h-3 w-3 mr-1" />
                  {t('inAppApplyBadge')}
                </Badge>
              ) : (
                <Badge variant="outline">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {t('externalApplyBadge')}
                </Badge>
              )}
              {job.industry && <Badge variant="secondary">{job.industry}</Badge>}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">{job.title}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {job.company && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {job.company}
                </span>
              )}
              {job.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
              )}
              {job.employmentType && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  {job.employmentType}
                </span>
              )}
              {salary && (
                <span className="inline-flex items-center gap-1.5">
                  <Euro className="h-4 w-4" />
                  {salary}
                </span>
              )}
              {job.postedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {new Date(job.postedAt).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US')}
                </span>
              )}
            </div>
          </header>

          <JobApplyPanel job={job} locale={locale} />

          <section className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
            <h2>{t('detail.descriptionHeading')}</h2>
            <div
              className="leading-relaxed whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </section>

          <p className="text-xs text-muted-foreground pt-4 border-t">{t('poweredBy')}</p>
        </div>
      </main>
    </div>
  );
}
