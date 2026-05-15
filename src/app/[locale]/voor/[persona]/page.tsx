import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ArticleLayout } from '@/components/content/article-layout';
import {
  ArticleStructuredData,
  BreadcrumbStructuredData,
} from '@/components/seo/structured-data';
import { getPersona, allPersonaSlugs } from '@/content/personas';
import { getArticle } from '@/content/blog';
import type { Locale } from '@/content/types';

type Props = { params: Promise<{ locale: string; persona: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

export async function generateStaticParams() {
  return allPersonaSlugs().map((s) => ({ locale: s.locale, persona: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, persona } = await params;
  const p = getPersona(locale as Locale, persona);
  if (!p) return { title: 'Niet gevonden' };
  return {
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    alternates: { canonical: `/${locale}/voor/${persona}` },
    openGraph: {
      title: p.title,
      description: p.description,
      type: 'article',
      url: `${APP_URL}/${locale}/voor/${persona}`,
    },
  };
}

export default async function PersonaPageRoute({ params }: Props) {
  const { locale, persona } = await params;
  setRequestLocale(locale);
  const p = getPersona(locale as Locale, persona);
  if (!p) notFound();
  const nl = locale === 'nl';

  const related = (p.relatedBlogSlugs ?? [])
    .map((s) => getArticle(locale as Locale, s))
    .filter((a): a is NonNullable<typeof a> => a !== null);

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={p.title}
      description={p.hero}
      backHref="/voor"
      backLabel={nl ? 'Terug naar alle situaties' : 'Back to all situations'}
      ctaPrimary={{ href: '/register', label: nl ? 'Start gratis' : 'Start free' }}
      ctaSecondary={{ href: '/blog', label: nl ? 'Lees onze blog' : 'Read our blog' }}
    >
      <ArticleStructuredData
        headline={p.title}
        description={p.description}
        url={`/${locale}/voor/${persona}`}
        datePublished="2026-05-01"
        dateModified="2026-05-15"
        authorName="CVeetje"
        inLanguage={nl ? 'nl-NL' : 'en-US'}
        keywords={p.keywords}
      />
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'Voor jou' : 'For you', url: `/${locale}/voor` },
          { name: p.title, url: `/${locale}/voor/${persona}` },
        ]}
      />

      <p className="lede" dangerouslySetInnerHTML={{ __html: p.hero }} />

      <p.Body />

      {related.length > 0 && (
        <>
          <hr />
          <h2>{nl ? 'Diepere stukken voor jou' : 'Deeper reads for you'}</h2>
          <ul className="not-prose grid gap-3 mt-4">
            {related.map((r) => (
              <li key={r.meta.slug}>
                <Link
                  href={`/blog/${r.meta.slug}`}
                  className="block p-4 rounded-lg border hover:border-foreground/30 transition-colors"
                >
                  <div className="font-semibold mb-1" dangerouslySetInnerHTML={{ __html: r.meta.title }} />
                  <div className="text-sm text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: r.meta.description }} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </ArticleLayout>
  );
}
