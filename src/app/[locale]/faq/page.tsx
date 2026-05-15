import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { ArticleLayout } from '@/components/content/article-layout';
import {
  BreadcrumbStructuredData,
  FAQPageStructuredData,
} from '@/components/seo/structured-data';
import { FAQ_GROUPS } from '@/content/faq';

type Props = { params: Promise<{ locale: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const nl = locale === 'nl';
  const title = nl
    ? 'Veelgestelde vragen — CVeetje'
    : 'Frequently asked questions — CVeetje';
  const description = nl
    ? 'Wat doet CVeetje precies, wat kost het, waar staat mijn data, hoe werkt BYOK, en wat doet de AI wel en niet. Uitgebreide antwoorden in begrijpelijke taal.'
    : 'What CVeetje does, what it costs, where data lives, how BYOK works, and what the AI does and doesn&apos;t do. Detailed answers in plain language.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/faq`,
      languages: { nl: '/nl/faq', en: '/en/faq' },
    },
    openGraph: { title, description, url: `${APP_URL}/${locale}/faq`, type: 'website' },
  };
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const nl = locale === 'nl';

  const allItems = FAQ_GROUPS.flatMap((g) =>
    g.items.map((i) => ({
      q: nl ? i.q.nl : i.q.en,
      a: nl ? i.a.nl : i.a.en,
    })),
  );

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={nl ? 'Veelgestelde vragen' : 'Frequently asked questions'}
      description={
        nl
          ? 'Antwoorden op de vragen die we het vaakst krijgen. Mis je iets? Mail naar info@groeimetai.io.'
          : 'Answers to the questions we hear most often. Missing something? Email info@groeimetai.io.'
      }
      backHref="/"
      backLabel={nl ? 'Terug naar home' : 'Back to home'}
      ctaPrimary={{ href: '/register', label: nl ? 'Probeer CVeetje gratis' : 'Try CVeetje free' }}
    >
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'Veelgestelde vragen' : 'FAQ', url: `/${locale}/faq` },
        ]}
      />
      <FAQPageStructuredData items={allItems} id={`${APP_URL}/${locale}/faq`} />

      {FAQ_GROUPS.map((group, idx) => (
        <section key={idx}>
          <h2>{nl ? group.title.nl : group.title.en}</h2>
          {group.items.map((item, i) => (
            <details key={i}>
              <summary>{nl ? item.q.nl : item.q.en}</summary>
              <div>
                <p dangerouslySetInnerHTML={{ __html: nl ? item.a.nl : item.a.en }} />
              </div>
            </details>
          ))}
        </section>
      ))}
    </ArticleLayout>
  );
}
