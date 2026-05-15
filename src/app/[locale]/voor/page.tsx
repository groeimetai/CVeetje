import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { ArticleLayout } from '@/components/content/article-layout';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';
import { listPersonas } from '@/content/personas';
import type { Locale } from '@/content/types';
import { ArrowRight } from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const nl = locale === 'nl';
  const title = nl
    ? 'Voor jou — CVeetje per rol en situatie'
    : 'For you — CVeetje by role and situation';
  const description = nl
    ? 'Werkzoekend, recruiter, student, zij-instromer, loopbaancoach, product owner, hiring manager, zzp&apos;er, international of herintreder — hoe CVeetje voor jouw situatie werkt.'
    : 'Job seeker, recruiter, student, career switcher, career coach, product owner, hiring manager, freelancer, international, or returner — how CVeetje fits your situation.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/voor`,
      languages: { nl: '/nl/voor', en: '/en/voor' },
    },
    openGraph: { title, description, url: `${APP_URL}/${locale}/voor`, type: 'website' },
  };
}

export default async function VoorHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const nl = locale === 'nl';
  const personas = listPersonas(locale as Locale);

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={nl ? 'Voor jou' : 'For you'}
      description={
        nl
          ? 'Iedereen heeft een ander beginpunt. Kies hieronder de situatie die op jou past, en je krijgt een gerichte uitleg van wat CVeetje voor jou doet — wat het oplevert, wat het niet doet, en hoe je &apos;m inzet zonder ergernis.'
          : 'Everyone starts somewhere different. Pick the situation that fits you for a focused explanation of what CVeetje does for you — what it delivers, what it doesn&apos;t, and how to use it without friction.'
      }
      backHref="/"
      backLabel={nl ? 'Terug naar home' : 'Back to home'}
    >
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'Voor jou' : 'For you', url: `/${locale}/voor` },
        ]}
      />
      <div className="not-prose grid gap-4 mt-8">
        {personas.map((p) => (
          <Link
            key={p.slug}
            href={`/voor/${p.slug}`}
            className="group block p-6 rounded-2xl border hover:border-foreground/30 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2 group-hover:underline" dangerouslySetInnerHTML={{ __html: p.title }} />
            <p className="text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: p.description }} />
            <div className="mt-4 inline-flex items-center text-sm text-primary">
              {nl ? 'Lees verder' : 'Read more'} <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </ArticleLayout>
  );
}
