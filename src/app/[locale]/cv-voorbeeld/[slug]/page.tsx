import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ArticleLayout } from '@/components/content/article-layout';
import {
  ArticleStructuredData,
  BreadcrumbStructuredData,
} from '@/components/seo/structured-data';
import { getRolePage, allRolePageSlugs } from '@/content/role-pages';
import { getArticle } from '@/content/blog';
import type { Locale } from '@/content/types';

type Props = { params: Promise<{ locale: string; slug: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

export async function generateStaticParams() {
  return allRolePageSlugs()
    .filter((s) => s.kind === 'voorbeeld')
    .map((s) => ({ locale: s.locale, slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = getRolePage(locale as Locale, 'voorbeeld', slug);
  if (!p) return { title: 'Niet gevonden' };
  return {
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    alternates: { canonical: `/${locale}/cv-voorbeeld/${slug}` },
    openGraph: {
      title: p.title,
      description: p.description,
      type: 'article',
      url: `${APP_URL}/${locale}/cv-voorbeeld/${slug}`,
    },
  };
}

export default async function CvVoorbeeldPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = getRolePage(locale as Locale, 'voorbeeld', slug);
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
      backHref="/cv-voorbeeld"
      backLabel={nl ? 'Alle CV-voorbeelden' : 'All CV examples'}
      ctaPrimary={{ href: '/register', label: nl ? 'Maak je eigen CV' : 'Build your CV' }}
      ctaSecondary={{ href: '/cv-voorbeeld', label: nl ? 'Bekijk andere beroepen' : 'See other roles' }}
    >
      <ArticleStructuredData
        headline={p.title}
        description={p.description}
        url={`/${locale}/cv-voorbeeld/${slug}`}
        datePublished="2026-05-01"
        dateModified="2026-05-16"
        authorName="CVeetje"
        inLanguage={nl ? 'nl-NL' : 'en-US'}
        keywords={p.keywords}
      />
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'CV-voorbeelden' : 'CV examples', url: `/${locale}/cv-voorbeeld` },
          { name: p.title, url: `/${locale}/cv-voorbeeld/${slug}` },
        ]}
      />

      <p className="lede" dangerouslySetInnerHTML={{ __html: p.hero }} />

      {p.blocks.map((b, i) => (
        <section key={i}>
          <h2>{b.heading}</h2>
          {b.body.split('\n\n').map((para, j) => (
            <p key={j} dangerouslySetInnerHTML={{ __html: para }} />
          ))}
        </section>
      ))}

      <h2>{nl ? 'Concrete voorbeeld-bullets' : 'Concrete example bullets'}</h2>
      <ul>
        {p.exampleBullets.map((bul, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: bul }} />
        ))}
      </ul>

      <h2>{nl ? 'Valkuilen voor deze rol' : 'Pitfalls for this role'}</h2>
      <ul>
        {p.pitfalls.map((pf, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: pf }} />
        ))}
      </ul>

      <div className="callout">
        <div className="callout-title">
          {nl ? `Aanbevolen stijl: ${p.recommendedStyle.style}` : `Recommended style: ${p.recommendedStyle.style}`}
        </div>
        <p>{p.recommendedStyle.reason}</p>
      </div>

      {p.context && (
        <div className="callout">
          <div className="callout-title">{nl ? 'Marktcontext' : 'Market context'}</div>
          <p>{p.context}</p>
        </div>
      )}

      {related.length > 0 && (
        <>
          <hr />
          <h2>{nl ? 'Verder lezen' : 'Read next'}</h2>
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
