import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { ArticleLayout } from '@/components/content/article-layout';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';
import { listRolePages } from '@/content/role-pages';
import type { Locale } from '@/content/types';
import { ArrowRight } from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const nl = locale === 'nl';
  const title = nl
    ? 'CV-templates per situatie — zonder ervaring, student, switcher, 55+'
    : 'CV templates per situation — no experience, student, switcher, 55+';
  const description = nl
    ? 'Een CV-template per situatie. Zonder werkervaring, student, carrière-switcher, herintreder, 55+, expat, freelancer, part-time, remote, senior, stage, na ontslag.'
    : 'A CV template per situation. No experience, student, career changer, returner, 55+, expat, freelancer, part-time, remote, senior, internship, after redundancy.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/cv-template`,
      languages: { nl: '/nl/cv-template', en: '/en/cv-template' },
    },
    openGraph: { title, description, url: `${APP_URL}/${locale}/cv-template`, type: 'website' },
  };
}

export default async function CvTemplateIndex({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const nl = locale === 'nl';
  const pages = listRolePages(locale as Locale, 'template');

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={nl ? 'CV-templates per situatie' : 'CV templates per situation'}
      description={
        nl
          ? 'Een CV-template voor jouw situatie — zonder werkervaring, student, switcher, herintreder, 55+, freelancer en meer.'
          : 'A CV template for your situation — no experience, student, switcher, returner, 55+, freelancer and more.'
      }
      backHref="/"
      backLabel={nl ? 'Terug naar home' : 'Back to home'}
    >
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'CV-templates' : 'CV templates', url: `/${locale}/cv-template` },
        ]}
      />
      <div className="not-prose grid gap-3 mt-8">
        {pages.map((p) => (
          <Link
            key={p.slug}
            href={`/cv-template/${p.slug}`}
            className="group block p-5 rounded-xl border hover:border-foreground/30 transition-colors"
          >
            <h2 className="text-lg font-semibold mb-1 group-hover:underline">{p.label}</h2>
            <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
            <div className="mt-3 inline-flex items-center text-sm text-primary">
              {nl ? 'Bekijk template' : 'See template'} <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </ArticleLayout>
  );
}
