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
    ? 'CV stijlen — vijf opties, één werkmodus per sector'
    : 'CV styles — five options, one mode per sector';
  const description = nl
    ? 'Conservative, Balanced, Creative, Experimental of Editorial. Welke stijl past bij welke werkgever, en waarom dat ertoe doet.'
    : 'Conservative, Balanced, Creative, Experimental, or Editorial. Which style fits which employer, and why it matters.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/cv-stijlen`,
      languages: { nl: '/nl/cv-stijlen', en: '/en/cv-stijlen' },
    },
    openGraph: { title, description, url: `${APP_URL}/${locale}/cv-stijlen`, type: 'website' },
  };
}

export default async function CvStijlenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const nl = locale === 'nl';

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={nl ? 'CV stijlen' : 'CV styles'}
      description={
        nl
          ? 'Vijf stijlen, één werkmodus per sector. Welke stijl past bij welk type werkgever.'
          : 'Five styles, one mode per sector. Which style fits which kind of employer.'
      }
      backHref="/"
      backLabel={nl ? 'Terug naar home' : 'Back to home'}
      ctaPrimary={{ href: '/register', label: nl ? 'Probeer een stijl' : 'Try a style' }}
      ctaSecondary={{ href: '/blog/welke-stijl-kies-je', label: nl ? 'Volledige stijlgids' : 'Full style guide' }}
    >
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'CV stijlen' : 'CV styles', url: `/${locale}/cv-stijlen` },
        ]}
      />

      <p className="lede">
        {nl
          ? 'Stijl is geen smaak — het is signaalkeuze. Een grafisch sprankelend CV bij een advocatenkantoor verzwakt je. Een nuchter typeerd CV bij een design-studio mist gemiste kans. Hier is hoe je het juiste signaal kiest.'
          : 'Style isn\'t taste — it\'s signal choice. A flashy CV at a law firm weakens you. A plain CV at a design studio misses an opportunity. Here\'s how to pick the right signal.'}
      </p>

      <h2>Conservative</h2>
      <p>
        {nl
          ? 'Eén kolom, klassieke typografie, getemperde accentkleur. Voor bank, verzekeraar, accountancy, advocatuur, overheid, onderwijs, zorg. Veilig in elke context — een rustige stijl is nooit verkeerd.'
          : 'Single column, classic typography, muted accent colour. For banks, insurers, accounting, law, government, education, healthcare. Safe in any context.'}
      </p>

      <h2>Balanced</h2>
      <p>
        {nl
          ? 'De default. Conservative met meer adem en een iets warmere kleurkeuze. Voor de meeste tech-werkgevers, MKB, consultancy, scale-ups. Als je geen specifieke reden hebt om een andere stijl te kiezen, kies deze.'
          : 'The default. Conservative with more breathing room and a slightly warmer palette. For most tech employers, SMEs, consulting, scale-ups. If you have no specific reason to choose another style, pick this one.'}
      </p>

      <h2>Creative</h2>
      <p>
        {nl
          ? 'Twee-koloms grid (in display; tekstlaag blijft lineair voor ATS), sterkere typografische hi&euml;rarchie, kleur mag een rol spelen. Voor marketing, communicatie, content, design-georiënteerde rollen.'
          : 'Two-column grid (in display; text layer remains linear for ATS), stronger typographic hierarchy, colour plays a role. For marketing, communications, content, design-leaning roles.'}
      </p>

      <h2>Experimental</h2>
      <p>
        {nl
          ? 'Eigentijdse typografie, ruimtelijk gebruik, soms onverwacht witregel-ritme. Voor design-studios, art-direction, brand-rollen. Niet voor elke werkgever — onvergetelijk waar &apos;m past.'
          : 'Modern typography, spacious, sometimes unexpected whitespace rhythm. For design studios, art direction, brand roles. Not for everyone — unforgettable where it fits.'}
      </p>

      <h2>Editorial</h2>
      <p>
        {nl
          ? 'Een "papieren tijdschrift"-stijl. Lange-lees-typografie, redactionele layout. Voor zeer specifieke contexten — portfolio-rollen, journalistiek, brand-georiënteerd werk.'
          : 'A magazine-paper aesthetic. Long-read typography, editorial layout. For very specific contexts — portfolio roles, journalism, brand-led work.'}
      </p>

      <h2>{nl ? 'Twijfel? Kies de meer ingetogen.' : 'In doubt? Pick the more restrained.'}</h2>
      <p>
        {nl
          ? 'Conservative en Balanced winnen bijna altijd van Experimental of Editorial bij twijfel. Een stijl die past bij iets formelers verzwakt je in een formele setting niet. Een stijl die past bij iets creatievers kan in een formele setting wel verkeerd vallen.'
          : 'Conservative and Balanced almost always beat Experimental or Editorial in case of doubt. A style fit for something formal doesn\'t weaken you in a formal setting. A style fit for something creative may land wrong in a formal setting.'}
      </p>
    </ArticleLayout>
  );
}
