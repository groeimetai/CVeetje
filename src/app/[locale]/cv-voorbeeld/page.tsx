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
    ? 'CV-voorbeelden per beroep — wat hoort op een CV voor jouw rol'
    : 'CV examples per profession — what belongs on a CV for your role';
  const description = nl
    ? 'Een CV-voorbeeld voor elke rol — softwareontwikkelaar, verpleegkundige, docent, accountmanager, projectmanager, data-analist en meer. Met concrete bullets, valkuilen en de juiste stijl per beroep.'
    : 'A CV example for every role — software engineer, nurse, teacher, account manager, project manager, data analyst and more. With concrete bullets, pitfalls, and the right style per profession.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/cv-voorbeeld`,
      languages: { nl: '/nl/cv-voorbeeld', en: '/en/cv-voorbeeld' },
    },
    openGraph: { title, description, url: `${APP_URL}/${locale}/cv-voorbeeld`, type: 'website' },
  };
}

export default async function CvVoorbeeldIndex({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const nl = locale === 'nl';
  const pages = listRolePages(locale as Locale, 'voorbeeld');

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={nl ? 'CV-voorbeelden per beroep' : 'CV examples per profession'}
      description={
        nl
          ? 'Een CV-voorbeeld voor jouw rol — met concrete bullets, valkuilen, en welke stijl past bij welk type werkgever.'
          : 'A CV example for your role — with concrete bullets, pitfalls, and which style fits which employer.'
      }
      backHref="/"
      backLabel={nl ? 'Terug naar home' : 'Back to home'}
    >
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'CV-voorbeelden' : 'CV examples', url: `/${locale}/cv-voorbeeld` },
        ]}
      />
      <div className="not-prose grid gap-3 mt-8">
        {pages.map((p) => (
          <Link
            key={p.slug}
            href={`/cv-voorbeeld/${p.slug}`}
            className="group block p-5 rounded-xl border hover:border-foreground/30 transition-colors"
          >
            <h2 className="text-lg font-semibold mb-1 group-hover:underline">
              {nl ? `CV voor ${p.label}` : `CV for ${p.label}`}
            </h2>
            <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
            <div className="mt-3 inline-flex items-center text-sm text-primary">
              {nl ? 'Bekijk voorbeeld' : 'See example'} <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </ArticleLayout>
  );
}
