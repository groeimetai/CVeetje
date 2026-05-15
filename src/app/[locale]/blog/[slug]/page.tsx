import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ArticleLayout } from '@/components/content/article-layout';
import {
  ArticleStructuredData,
  BreadcrumbStructuredData,
  HowToStructuredData,
  FAQPageStructuredData,
  PersonStructuredData,
} from '@/components/seo/structured-data';
import { getArticle, listAllSlugs, relatedArticles } from '@/content/blog';
import { getAuthor } from '@/content/authors';
import type { Locale } from '@/content/types';

type Props = { params: Promise<{ locale: string; slug: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

export async function generateStaticParams() {
  return listAllSlugs().map((s) => ({ locale: s.locale, slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = getArticle(locale as Locale, slug);
  if (!article) return { title: 'Niet gevonden' };
  const { meta } = article;
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    authors: [{ name: getAuthor(meta.author).name }],
    alternates: { canonical: `/${locale}/blog/${slug}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: 'article',
      publishedTime: meta.publishedAt,
      modifiedTime: meta.updatedAt,
      authors: [getAuthor(meta.author).name],
      tags: meta.keywords,
      url: `${APP_URL}/${locale}/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = getArticle(locale as Locale, slug);
  if (!article) notFound();
  const { meta, Body } = article;
  const author = getAuthor(meta.author);
  const nl = locale === 'nl';
  const related = relatedArticles(locale as Locale, slug, 3);

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={meta.title}
      description={meta.description}
      publishedAt={meta.publishedAt}
      updatedAt={meta.updatedAt}
      readingMinutes={meta.readingMinutes}
      authorName={author.name}
      authorRole={author.role[locale === 'nl' ? 'nl' : 'en']}
      badges={meta.personas?.slice(0, 2)}
      backHref="/blog"
      backLabel={nl ? 'Terug naar alle stukken' : 'Back to all pieces'}
      ctaPrimary={{
        href: '/register',
        label: nl ? 'Probeer CVeetje gratis' : 'Try CVeetje for free',
      }}
      ctaSecondary={{
        href: '/blog',
        label: nl ? 'Meer lezen' : 'Read more',
      }}
    >
      <ArticleStructuredData
        headline={meta.title}
        description={meta.description}
        url={`/${locale}/blog/${slug}`}
        datePublished={meta.publishedAt}
        dateModified={meta.updatedAt}
        authorName={author.name}
        authorUrl={author.url}
        inLanguage={nl ? 'nl-NL' : 'en-US'}
        keywords={meta.keywords}
      />
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'Blog' : 'Blog', url: `/${locale}/blog` },
          { name: meta.title, url: `/${locale}/blog/${slug}` },
        ]}
      />
      <PersonStructuredData
        name={author.name}
        url={author.url}
        description={author.bio[locale === 'nl' ? 'nl' : 'en']}
        jobTitle={author.role[locale === 'nl' ? 'nl' : 'en']}
      />
      {meta.howTo && (
        <HowToStructuredData
          name={meta.howTo.name}
          description={meta.description}
          totalTimeMinutes={meta.howTo.totalTimeMinutes}
          steps={meta.howTo.steps}
          inLanguage={nl ? 'nl-NL' : 'en-US'}
        />
      )}
      {meta.faq && meta.faq.length > 0 && (
        <FAQPageStructuredData items={meta.faq} id={`${APP_URL}/${locale}/blog/${slug}#faq`} />
      )}

      <Body />

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
