import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { ArticleLayout } from '@/components/content/article-layout';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

type Props = { params: Promise<{ locale: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const nl = locale === 'nl';
  const title = nl
    ? 'Motivatiebrief generator — AI die niet als AI klinkt'
    : 'Cover letter generator — AI that doesn\'t sound like AI';
  const description = nl
    ? 'Een motivatiebrief schrijven met AI zonder de standaard AI-tells. Humanizer-pass, vacature-specifieke framing, en eerlijke claims.'
    : 'Generate a cover letter with AI without standard AI tells. Humanizer pass, job-specific framing, and honest claims.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/motivatiebrief-generator`,
      languages: { nl: '/nl/motivatiebrief-generator', en: '/en/motivatiebrief-generator' },
    },
    openGraph: { title, description, url: `${APP_URL}/${locale}/motivatiebrief-generator`, type: 'website' },
  };
}

export default async function MotivatiebriefGeneratorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const nl = locale === 'nl';

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={nl ? 'Motivatiebrief generator' : 'Cover letter generator'}
      description={
        nl
          ? 'Een motivatiebrief schrijven met AI zonder dat het klinkt als AI. Specifiek voor de vacature, herkenbaar als mens.'
          : 'A cover letter generator that doesn\'t produce AI-flavoured paragraphs. Specific to the job, recognisable as human.'
      }
      backHref="/"
      backLabel={nl ? 'Terug naar home' : 'Back to home'}
      ctaPrimary={{ href: '/register', label: nl ? 'Probeer gratis' : 'Try for free' }}
      ctaSecondary={{ href: '/blog/motivatiebrief-zonder-ai-tells', label: nl ? 'Lees de uitleg' : 'Read the explanation' }}
    >
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'Motivatiebrief generator' : 'Cover letter generator', url: `/${locale}/motivatiebrief-generator` },
        ]}
      />

      <p className="lede">
        {nl
          ? 'Een AI-gegenereerde motivatiebrief is meestal direct herkenbaar. "Met veel enthousiasme reageer ik op deze vacature..." doet niemand meer iets. CVeetje voegt een tweede pass toe die actief op AI-tells let.'
          : 'An AI-generated cover letter is usually instantly recognisable. "With great enthusiasm I am applying for this position..." moves nobody. CVeetje adds a second pass that actively scans for AI tells.'}
      </p>

      <h2>{nl ? 'Wat het doet' : 'What it does'}</h2>
      <ul>
        <li>{nl ? 'Eerste pass schrijft een vacature-specifieke brief op basis van je profiel.' : 'First pass writes a job-specific letter from your profile.'}</li>
        <li>{nl ? 'Tweede pass (humanizer) zoekt actief naar AI-patronen: drieslagen, lege bijvoeglijke naamwoorden, em-dash overgebruik, "leverage / robuust / naadloos"-vocabulaire.' : 'Second pass (humanizer) actively looks for AI patterns: rule-of-three, empty adjectives, em-dash overuse, "leverage / robust / seamless" vocabulary.'}</li>
        <li>{nl ? 'Output in 9 talen: NL, EN, DE, FR, ES, IT, PT, PL, RO.' : 'Output in 9 languages: NL, EN, DE, FR, ES, IT, PT, PL, RO.'}</li>
        <li>{nl ? 'Lengte 250–450 woorden — meestal precies één pagina.' : 'Length 250–450 words — typically one page.'}</li>
      </ul>

      <h2>{nl ? 'Wat het niet doet' : 'What it does not do'}</h2>
      <ul>
        <li>{nl ? 'Geen ervaring of motivatie verzinnen die je niet hebt.' : 'Doesn\'t invent experience or motivation you don\'t have.'}</li>
        <li>{nl ? 'Geen claim opkloppen om je sterker te laten klinken — de eerlijkheidsregels zitten in de prompt.' : 'Doesn\'t inflate claims to make you sound stronger — honesty rules are in the prompt.'}</li>
        <li>{nl ? 'Geen "perfecte" brief leveren die je niet hoeft te lezen. Je leest \'m, je voegt één persoonlijk detail toe, je verstuurt.' : 'Doesn\'t deliver a "perfect" letter you can ship without reading. You read it, add one personal detail, then send.'}</li>
      </ul>

      <h2>{nl ? 'De prijs' : 'Pricing'}</h2>
      <p>
        {nl
          ? 'Een motivatiebrief-generatie kost ongeveer 3 platform-credits (€0,30 – €0,50 afhankelijk van je pack). Of 0 credits met BYOK (eigen API-key). Op de gratis tier: 15 credits/maand — dat is 5 brieven of 1 volledig CV.'
          : 'A cover letter generation costs about 3 platform credits (€0.30 – €0.50 depending on your pack). Or 0 credits with BYOK (own API key). On the free tier: 15 credits/month — that\'s 5 letters or 1 full CV.'}
      </p>

      <h2>{nl ? 'Verder lezen' : 'Read more'}</h2>
      <ul>
        <li>
          <a href={`/${locale}/blog/motivatiebrief-zonder-ai-tells`}>
            {nl ? 'Een motivatiebrief schrijven met AI zonder AI-tells (uitgebreide gids)' : 'Writing a cover letter with AI without AI tells (full guide)'}
          </a>
        </li>
        <li>
          <a href={`/${locale}/blog/chatgpt-vs-cveetje`}>
            {nl ? 'ChatGPT vs CVeetje voor motivatiebrieven' : 'ChatGPT vs CVeetje for cover letters'}
          </a>
        </li>
      </ul>
    </ArticleLayout>
  );
}
