import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { ArticleLayout } from '@/components/content/article-layout';
import { BreadcrumbStructuredData, HowToStructuredData } from '@/components/seo/structured-data';

type Props = { params: Promise<{ locale: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const nl = locale === 'nl';
  const title = nl
    ? 'CV op maat maken voor élke vacature — in 2 minuten'
    : 'Tailor your CV to any job ad — in 2 minutes';
  const description = nl
    ? 'Plak een vacature, krijg een gericht CV. Keywords overgenomen, ervaring herordend, motivatiebrief erbij. Vijf stijlen, 9 talen, ATS-vriendelijk PDF.'
    : 'Paste a job ad, get a tailored CV. Keywords matched, experience reordered, cover letter optional. Five styles, 9 languages, ATS-friendly PDF.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/cv-op-maat-maken`,
      languages: { nl: '/nl/cv-op-maat-maken', en: '/en/cv-op-maat-maken' },
    },
    openGraph: { title, description, url: `${APP_URL}/${locale}/cv-op-maat-maken`, type: 'website' },
  };
}

export default async function CvOpMaatMakenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const nl = locale === 'nl';

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={nl ? 'CV op maat maken voor élke vacature' : 'Tailor your CV to any job'}
      description={
        nl
          ? 'Een CV per vacature in twee minuten — zonder uren in Word te klooien. Concreet wat de tool doet en wat het niet doet.'
          : 'A tailored CV per job in two minutes — without fighting Word for hours. What the tool does, and what it doesn\'t.'
      }
      backHref="/"
      backLabel={nl ? 'Terug naar home' : 'Back to home'}
      ctaPrimary={{ href: '/register', label: nl ? 'Start gratis' : 'Start free' }}
      ctaSecondary={{ href: '/blog/cv-op-maat-in-2-minuten', label: nl ? 'Lees de gids' : 'Read the guide' }}
    >
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'CV op maat maken' : 'Tailor your CV', url: `/${locale}/cv-op-maat-maken` },
        ]}
      />
      <HowToStructuredData
        name={nl ? 'CV op maat maken in 2 minuten' : 'Tailor a CV in 2 minutes'}
        description={nl ? 'Plak een vacature en krijg een gericht CV.' : 'Paste a job ad and get a tailored CV.'}
        totalTimeMinutes={5}
        inLanguage={nl ? 'nl-NL' : 'en-US'}
        steps={[
          { name: nl ? 'Profiel inrichten (eenmalig)' : 'Set up profile (once)', text: nl ? 'Upload je LinkedIn-PDF of vul handmatig in. 10 minuten.' : 'Upload your LinkedIn PDF or fill in manually. 10 minutes.' },
          { name: nl ? 'Vacature plakken' : 'Paste job ad', text: nl ? 'Plak de vacaturetekst in het wizard-veld.' : 'Paste the job description in the wizard field.' },
          { name: nl ? 'Stijl kiezen' : 'Pick style', text: nl ? 'Conservative, Balanced, Creative, Experimental of Editorial.' : 'Conservative, Balanced, Creative, Experimental, or Editorial.' },
          { name: nl ? 'Genereer + lees' : 'Generate + read', text: nl ? 'Output in 20–60 seconden. Lees, finetune, download als PDF.' : 'Output in 20–60 seconds. Read, finetune, download as PDF.' },
        ]}
      />

      <p className="lede">
        {nl
          ? 'De meeste mensen maken één algemeen CV en gebruiken dat voor twintig vacatures. Recruiters lezen het op zes seconden en sturen het door of niet. Een gericht CV vergroot je kans niet door beter te zijn — door beter te passen.'
          : 'Most people make one generic CV and use it for twenty jobs. Recruiters read it in six seconds and pass it on or skip. A tailored CV raises your odds not by being better — by being a better fit.'}
      </p>

      <h2>{nl ? 'Wat de tool doet' : 'What the tool does'}</h2>
      <ul>
        <li>{nl ? 'Leest de vacaturetekst — harde eisen, nice-to-haves, repeated terminologie.' : 'Reads the job ad — must-haves, nice-to-haves, repeated terminology.'}</li>
        <li>{nl ? 'Herordent je werkervaring zodat relevante stukken bovenaan komen.' : 'Reorders your experience so relevant parts surface first.'}</li>
        <li>{nl ? 'Herschrijft bullets met de juiste accenten — geen verzonnen feiten.' : 'Rewrites bullets with the right angle — no fabrication.'}</li>
        <li>{nl ? 'Genereert in een gekozen stijl (5 opties) en output als ATS-vriendelijke PDF.' : 'Renders in your chosen style (5 options) as an ATS-friendly PDF.'}</li>
        <li>{nl ? 'Optioneel: motivatiebrief met humanizer-pass.' : 'Optionally: cover letter with humanizer pass.'}</li>
      </ul>

      <h2>{nl ? 'Wat het niet doet' : 'What it does not do'}</h2>
      <ul>
        <li>{nl ? 'Werkervaring of skills verzinnen die je niet hebt. Eerlijkheidsregels in de prompt.' : 'Invent experience or skills you don\'t have. Honesty rules in the prompt.'}</li>
        <li>{nl ? 'Claims opkloppen bij regeneratie. De gatekeeper-stap vraagt om bewijs.' : 'Inflate claims on regeneration. The gatekeeper step asks for evidence.'}</li>
        <li>{nl ? 'Voor jou solliciteren of je inbox beheren. Het is een schrijftool.' : 'Apply for you or manage your inbox. It\'s a writing tool.'}</li>
      </ul>

      <h2>{nl ? 'Stijlen op een rij' : 'The five styles'}</h2>
      <ul>
        <li>{nl ? 'Conservative — bank, overheid, zorg, advocatuur.' : 'Conservative — banks, government, healthcare, law.'}</li>
        <li>{nl ? 'Balanced — default; warm en eigentijds zonder overdaad.' : 'Balanced — default; warm and modern without excess.'}</li>
        <li>{nl ? 'Creative — marketing, communicatie, design-georiënteerde sectoren.' : 'Creative — marketing, communications, design-leaning sectors.'}</li>
        <li>{nl ? 'Experimental — design-studios, brand-werk.' : 'Experimental — design studios, brand work.'}</li>
        <li>{nl ? 'Editorial — portfolio-rollen, tijdschriftachtige uitstraling.' : 'Editorial — portfolio roles, magazine-like aesthetic.'}</li>
      </ul>

      <h2>{nl ? 'Prijs' : 'Pricing'}</h2>
      <p>
        {nl
          ? 'Gratis: 15 credits/maand (1 volledig CV). Starter €4,99 (30 credits, ~€1,66/CV). Popular €12,99 (100 credits, ~€1,30/CV). Pro €29,99 (300 credits). Power €59,99 (600 credits, ~€1,00/CV). BYOK: 0 credits voor AI, 1 credit per PDF-download. Credits verlopen niet.'
          : 'Free: 15 credits/month (1 full CV). Starter €4.99 (30 credits, ~€1.66/CV). Popular €12.99 (100 credits, ~€1.30/CV). Pro €29.99 (300 credits). Power €59.99 (600 credits, ~€1.00/CV). BYOK: 0 credits for AI, 1 credit per PDF download. Credits never expire.'}
      </p>
    </ArticleLayout>
  );
}
