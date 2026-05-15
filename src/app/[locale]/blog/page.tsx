import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { ArticleLayout } from '@/components/content/article-layout';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';
import { listArticles } from '@/content/blog';
import type { Locale, ArticleCategory } from '@/content/types';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const nl = locale === 'nl';
  const title = nl
    ? 'Blog — CV-tips, recruiter-perspectief en AI in sollicitaties'
    : 'Blog — CV tips, recruiter perspective, and AI in job applications';
  const description = nl
    ? 'Eerlijke artikelen over CV&apos;s, motivatiebrieven en AI-tools. Vanuit werkzoekenden, recruiters, product owners, loopbaancoaches en zij-instromers.'
    : 'Honest articles about CVs, cover letters, and AI tools. Written from the perspective of job seekers, recruiters, product owners, career coaches, and switchers.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/blog`,
      languages: { nl: '/nl/blog', en: '/en/blog' },
    },
    openGraph: { title, description, url: `${APP_URL}/${locale}/blog`, type: 'website' },
  };
}

const CAT_LABELS: Record<ArticleCategory, { nl: string; en: string }> = {
  'how-to': { nl: 'How-to', en: 'How-to' },
  guide: { nl: 'Gids', en: 'Guide' },
  perspective: { nl: 'Perspectief', en: 'Perspective' },
  comparison: { nl: 'Vergelijking', en: 'Comparison' },
  opinion: { nl: 'Opinie', en: 'Opinion' },
  'case-study': { nl: 'Case', en: 'Case study' },
  'deep-dive': { nl: 'Verdieping', en: 'Deep dive' },
};

export default async function BlogIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const _t = await getTranslations({ locale });
  const nl = locale === 'nl';
  const articles = listArticles(locale as Locale);

  const grouped: Record<ArticleCategory, typeof articles> = {} as never;
  for (const a of articles) {
    grouped[a.meta.category] ??= [];
    grouped[a.meta.category].push(a);
  }

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={nl ? 'Blog' : 'Blog'}
      description={
        nl
          ? 'Onze stukken over CV&apos;s, motivatiebrieven en wat AI hier wel — en niet — voor je kan doen. Vanuit verschillende kanten van de tafel geschreven.'
          : 'Our pieces on CVs, cover letters, and what AI can — and cannot — do for you. Written from different sides of the table.'
      }
      backHref="/"
      backLabel={nl ? 'Terug naar home' : 'Back to home'}
    >
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'Blog' : 'Blog', url: `/${locale}/blog` },
        ]}
      />

      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat} className="not-prose">
          <h2 className="text-xl font-semibold mt-12 mb-6 flex items-center gap-3">
            <span>{CAT_LABELS[cat as ArticleCategory]?.[nl ? 'nl' : 'en'] ?? cat}</span>
            <span className="text-sm text-muted-foreground font-normal">
              {items.length} {nl ? 'stukken' : 'pieces'}
            </span>
          </h2>
          <div className="grid gap-4">
            {items.map((a) => (
              <Link
                key={a.meta.slug}
                href={`/blog/${a.meta.slug}`}
                className="block p-5 rounded-xl border hover:border-foreground/30 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  {a.meta.personas?.slice(0, 2).map((p) => (
                    <Badge key={p} variant="outline" className="text-[10px] uppercase tracking-wide">
                      {p}
                    </Badge>
                  ))}
                </div>
                <h3 className="text-lg font-semibold mb-1 group-hover:underline" dangerouslySetInnerHTML={{ __html: a.meta.title }} />
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2" dangerouslySetInnerHTML={{ __html: a.meta.description }} />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    {new Date(a.meta.publishedAt).toLocaleDateString(nl ? 'nl-NL' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {a.meta.readingMinutes} {nl ? 'min' : 'min'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </ArticleLayout>
  );
}
