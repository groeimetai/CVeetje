import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ShieldCheck, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'nl' ? 'Subverwerkers — CVeetje' : 'Sub-processors — CVeetje',
    description:
      locale === 'nl'
        ? 'Volledig overzicht van alle subverwerkers die CVeetje inschakelt, inclusief vestigingsland, doel van de verwerking en juridische waarborgen.'
        : 'Full list of all sub-processors CVeetje engages, including jurisdiction, purpose of processing and legal safeguards.',
    alternates: {
      canonical: `/${locale}/sub-processors`,
      languages: { nl: '/nl/sub-processors', en: '/en/sub-processors' },
    },
  };
}

type Processor = {
  name: string;
  purpose: { nl: string; en: string };
  data: { nl: string; en: string };
  location: string;
  safeguard: { nl: string; en: string };
  website: string;
};

const processors: Processor[] = [
  {
    name: 'Google Cloud Platform (Firebase Auth, Firestore, Cloud Storage, Cloud Run)',
    purpose: {
      nl: 'Authenticatie, opslag van profielen/CV\'s/transacties, bestandsopslag, hosting van de applicatie.',
      en: 'Authentication, storage of profiles/CVs/transactions, file storage, application hosting.',
    },
    data: {
      nl: 'Account- en profielgegevens, CV-content, uploads, sessiecookies, server-side logs.',
      en: 'Account & profile data, CV content, uploads, session cookies, server-side logs.',
    },
    location: 'europe-west4 (Eemshaven, Nederland)',
    safeguard: {
      nl: 'Data Processing Addendum (Google Cloud DPA), EU SCC\'s voor eventuele intra-Group transfers, EU-US Data Privacy Framework certificering.',
      en: 'Google Cloud DPA, EU SCCs for any intra-group transfers, EU-US Data Privacy Framework certification.',
    },
    website: 'https://cloud.google.com/terms/data-processing-addendum',
  },
  {
    name: 'Anthropic, PBC',
    purpose: {
      nl: 'Platform-AI (Claude Opus 4.7) voor het genereren van CV-content, motivatiebrieven, fit-analyse en stijl.',
      en: 'Platform AI (Claude Opus 4.7) for generating CV content, cover letters, fit analysis and style.',
    },
    data: {
      nl: 'Inhoud van prompts: profielsamenvatting, vacaturetekst, gebruikersinstructies. Géén inloggegevens of betaalgegevens.',
      en: 'Prompt content: profile summary, job description, user instructions. No login or payment data.',
    },
    location: 'Verenigde Staten',
    safeguard: {
      nl: 'Commercial Terms of Service + Data Processing Addendum, EU SCC\'s (module 2), zero data retention waar mogelijk, géén training op API-input (Anthropic commercial terms).',
      en: 'Commercial Terms of Service + DPA, EU SCCs (module 2), zero data retention where available, no training on API inputs (Anthropic commercial terms).',
    },
    website: 'https://www.anthropic.com/legal/dpa',
  },
  {
    name: 'Mollie B.V.',
    purpose: {
      nl: 'Verwerken van credit-aankopen (iDEAL, creditcard, etc.).',
      en: 'Processing of credit purchases (iDEAL, credit card, etc.).',
    },
    data: {
      nl: 'E-mailadres, naam, betaalmethode, transactiebedrag. Volledige betaalgegevens (PAN) blijven bij Mollie.',
      en: 'Email, name, payment method, transaction amount. Full payment data (PAN) stays with Mollie.',
    },
    location: 'Amsterdam, Nederland',
    safeguard: {
      nl: 'PSD2-gereguleerde betaalinstelling, eigen verwerker onder de AVG. Mollie DPA van toepassing.',
      en: 'PSD2-regulated payment institution, separate controller/processor under GDPR. Mollie DPA applies.',
    },
    website: 'https://www.mollie.com/privacy',
  },
  {
    name: 'Adzuna Ltd.',
    purpose: {
      nl: 'Aggregatie van publieke vacatures voor de jobs board.',
      en: 'Aggregation of public job postings for the jobs board.',
    },
    data: {
      nl: 'Geen persoonsgegevens van gebruikers. Alleen anonieme zoekopdrachten (locatie, keywords) worden naar Adzuna gestuurd.',
      en: 'No personal user data. Only anonymous search queries (location, keywords) are sent to Adzuna.',
    },
    location: 'Verenigd Koninkrijk',
    safeguard: {
      nl: 'UK adequacy decision (EU Commissie, juni 2021). Geen persoonsgegevens in transit.',
      en: 'UK adequacy decision (EU Commission, June 2021). No personal data in transit.',
    },
    website: 'https://www.adzuna.com/privacy.html',
  },
  {
    name: 'GitHub, Inc. (Microsoft)',
    purpose: {
      nl: 'Aanmaken van issues op basis van gebruikersfeedback in een privé-repository.',
      en: 'Creating issues based on user feedback in a private repository.',
    },
    data: {
      nl: 'Inhoud van de feedback (vrije tekst), categorie, optionele schermafbeelding. E-mailadres alleen indien expliciet aangeleverd.',
      en: 'Feedback body (free text), category, optional screenshot. Email only if explicitly supplied.',
    },
    location: 'Verenigde Staten',
    safeguard: {
      nl: 'Microsoft Products and Services DPA, EU SCC\'s, EU-US Data Privacy Framework certificering.',
      en: 'Microsoft Products & Services DPA, EU SCCs, EU-US Data Privacy Framework certification.',
    },
    website: 'https://github.com/customer-terms/github-data-protection-agreement',
  },
  {
    name: 'Google reCAPTCHA v3 (Google Ireland Ltd.)',
    purpose: {
      nl: 'Misbruikdetectie bij registratie en login, ter bescherming tegen geautomatiseerde aanvallen.',
      en: 'Abuse detection on registration and login, protecting against automated attacks.',
    },
    data: {
      nl: 'IP-adres, browseromgeving, muis-/touch-gedrag. Score wordt teruggegeven aan CVeetje, geen persoonsgegevens worden opgeslagen aan onze kant.',
      en: 'IP address, browser environment, mouse/touch behavior. Score is returned to CVeetje; no personal data stored on our side.',
    },
    location: 'EU + Verenigde Staten',
    safeguard: {
      nl: 'Google Cloud DPA, EU-US Data Privacy Framework. Inzet uitsluitend op basis van gerechtvaardigd belang (art. 6 lid 1 sub f AVG).',
      en: 'Google Cloud DPA, EU-US Data Privacy Framework. Used solely on the basis of legitimate interest (art. 6(1)(f) GDPR).',
    },
    website: 'https://policies.google.com/privacy',
  },
  {
    name: 'Firebase Trigger Email extension (Google LLC)',
    purpose: {
      nl: 'Wachtrij voor transactionele e-mails (verificatie, kennisgevingen). De extensie draait als Cloud Run service.',
      en: 'Queue for transactional emails (verification, notifications). The extension runs as a Cloud Run service.',
    },
    data: {
      nl: 'E-mailadres ontvanger, onderwerp, e-mailinhoud (HTML).',
      en: 'Recipient email address, subject, email body (HTML).',
    },
    location: 'us-central1 (Verenigde Staten) — bron-data staat in EU Firestore',
    safeguard: {
      nl: 'Onderdeel van Google Cloud DPA + EU SCC\'s. Wij onderzoeken migratie naar een EU-only SMTP-verwerker.',
      en: 'Covered by Google Cloud DPA + EU SCCs. We are evaluating migration to an EU-only SMTP processor.',
    },
    website: 'https://firebase.google.com/products/extensions',
  },
  {
    name: 'Google Analytics 4 (Google Ireland Ltd.) — optioneel',
    purpose: {
      nl: 'Anonieme gebruiksstatistieken, uitsluitend na expliciete toestemming via de cookie-banner.',
      en: 'Anonymous usage statistics, only after explicit consent via the cookie banner.',
    },
    data: {
      nl: 'Geanonimiseerd IP-adres, paginaweergaven, klikgedrag, apparaat- en browserinformatie.',
      en: 'Anonymized IP address, page views, click behavior, device and browser information.',
    },
    location: 'EU + Verenigde Staten',
    safeguard: {
      nl: 'Google Cloud DPA, EU-US Data Privacy Framework, `anonymize_ip` ingeschakeld, geen advertising features.',
      en: 'Google Cloud DPA, EU-US Data Privacy Framework, `anonymize_ip` enabled, no advertising features.',
    },
    website: 'https://policies.google.com/privacy',
  },
];

const byokProviders: Processor[] = [
  {
    name: 'OpenAI, OpenAI Ireland Ltd.',
    purpose: { nl: 'BYOK: AI-generatie via gebruiker\'s eigen sleutel.', en: 'BYOK: AI generation via user\'s own key.' },
    data: { nl: 'Prompt-inhoud direct vanuit jouw browser/CVeetje naar OpenAI.', en: 'Prompt content from your browser/CVeetje directly to OpenAI.' },
    location: 'Verenigde Staten / Ierland',
    safeguard: {
      nl: 'Onder jouw eigen overeenkomst met OpenAI. CVeetje is in deze modus geen verwerker — de relatie is rechtstreeks tussen jou en OpenAI.',
      en: 'Under your own agreement with OpenAI. In this mode CVeetje is not a processor — the relationship is directly between you and OpenAI.',
    },
    website: 'https://openai.com/policies/eu-privacy-policy',
  },
  {
    name: 'Google AI (Gemini) / Google Vertex AI',
    purpose: { nl: 'BYOK: AI-generatie via gebruiker\'s eigen sleutel.', en: 'BYOK: AI generation via user\'s own key.' },
    data: { nl: 'Prompt-inhoud direct vanuit CVeetje naar Google.', en: 'Prompt content directly to Google.' },
    location: 'EU + Verenigde Staten',
    safeguard: { nl: 'Onder jouw eigen Google Cloud / AI Studio overeenkomst.', en: 'Under your own Google Cloud / AI Studio agreement.' },
    website: 'https://cloud.google.com/terms/data-processing-addendum',
  },
  {
    name: 'Overige BYOK-providers (Mistral, Groq, DeepSeek, Together, Fireworks, Azure, Cohere, etc.)',
    purpose: { nl: 'BYOK: AI-generatie via gebruiker\'s eigen sleutel.', en: 'BYOK: AI generation via user\'s own key.' },
    data: { nl: 'Prompt-inhoud direct vanuit CVeetje naar de provider.', en: 'Prompt content directly to the provider.' },
    location: 'Variabel (EU/VS/UK afhankelijk van provider)',
    safeguard: {
      nl: 'Onder jouw eigen overeenkomst met de provider. Wij raden aan zelf de DPA / privacy-policy van de gekozen provider te raadplegen.',
      en: 'Under your own agreement with the provider. We recommend reviewing the chosen provider\'s DPA / privacy policy.',
    },
    website: 'https://models.dev',
  },
];

export default async function SubProcessorsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const lastUpdatedDate = new Date('2026-05-15').toLocaleDateString(
    locale === 'nl' ? 'nl-NL' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const title = locale === 'nl' ? 'Subverwerkers' : 'Sub-processors';
  const intro =
    locale === 'nl'
      ? 'CVeetje schakelt onderstaande partijen in om de dienst te kunnen leveren. Deze pagina vormt onze publieke subverwerkers-lijst zoals bedoeld in art. 28 lid 2 AVG. Wij informeren je via e-mail of via deze pagina bij elke voorgenomen wijziging.'
      : 'CVeetje engages the following parties to deliver the service. This page is our public sub-processor list as referenced in art. 28(2) GDPR. We will notify you by email or via this page about any planned change.';

  const cveetjeAsProcessor =
    locale === 'nl'
      ? 'CVeetje is bewerker namens jou voor de inhoud die jij invoert (profielen, CV\'s). GroeimetAI is verwerkingsverantwoordelijke voor accountgegevens, betaalgegevens en logs.'
      : 'CVeetje acts as processor on your behalf for content you input (profiles, CVs). GroeimetAI is controller for account data, payment data and logs.';

  return (
    <>
      <BreadcrumbStructuredData items={[{ name: 'Home', url: `/${locale}` }, { name: title, url: `/${locale}/sub-processors` }]} />
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/"><Logo size="sm" /></Link>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 max-w-5xl">
            <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {locale === 'nl' ? 'Terug naar home' : 'Back to home'}
            </Link>

            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
              <p className="text-muted-foreground">
                {locale === 'nl' ? 'Laatst bijgewerkt' : 'Last updated'}: {lastUpdatedDate}
              </p>
            </div>

            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{intro}</p>
                </div>
                <div className="flex items-start gap-3">
                  <Globe2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{cveetjeAsProcessor}</p>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-xl font-semibold mb-4">
              {locale === 'nl' ? 'Actieve subverwerkers' : 'Active sub-processors'}
            </h2>
            <div className="space-y-4 mb-12">
              {processors.map((p) => (
                <ProcessorCard key={p.name} processor={p} locale={locale} />
              ))}
            </div>

            <h2 className="text-xl font-semibold mb-2">
              {locale === 'nl' ? 'BYOK-providers (eigen API-sleutel)' : 'BYOK providers (your own API key)'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {locale === 'nl'
                ? 'Als je in CVeetje een eigen API-sleutel instelt, zijn onderstaande partijen géén subverwerkers van CVeetje. Jij sluit zelf een overeenkomst met de provider en bent zelf verwerkingsverantwoordelijke voor die verwerking.'
                : 'When you configure your own API key in CVeetje, the parties below are not sub-processors of CVeetje. You enter into a direct agreement with the provider and are the controller for that processing.'}
            </p>
            <div className="space-y-4">
              {byokProviders.map((p) => (
                <ProcessorCard key={p.name} processor={p} locale={locale} byok />
              ))}
            </div>

            <Card className="mt-12">
              <CardContent className="pt-6">
                <h2 className="font-semibold mb-3">
                  {locale === 'nl' ? 'Vragen of bezwaar?' : 'Questions or objection?'}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {locale === 'nl'
                    ? 'Wil je bezwaar maken tegen het inschakelen van een specifieke subverwerker of onze DPA opvragen? Mail info@groeimetai.io.'
                    : 'Want to object to a specific sub-processor or request our DPA? Email info@groeimetai.io.'}
                </p>
                <Link href="mailto:info@groeimetai.io">
                  <Button variant="outline" size="sm">
                    {locale === 'nl' ? 'Neem contact op' : 'Contact us'}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>

        <footer className="border-t py-8 mt-auto">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <Logo size="sm" />
              <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} CVeetje</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
                <Link href="/terms" className="hover:text-foreground">{locale === 'nl' ? 'Voorwaarden' : 'Terms'}</Link>
                <Link href="/cookies" className="hover:text-foreground">{locale === 'nl' ? 'Cookies' : 'Cookies'}</Link>
                <Link href="/ai-transparency" className="hover:text-foreground">{locale === 'nl' ? 'AI Transparantie' : 'AI Transparency'}</Link>
                <Link href="/sub-processors" className="hover:text-foreground font-medium text-foreground">{title}</Link>
                <Link href="/compliance" className="hover:text-foreground">Compliance</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function ProcessorCard({ processor, locale, byok }: { processor: Processor; locale: string; byok?: boolean }) {
  const L = locale === 'nl' ? 'nl' : 'en';
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h3 className="font-semibold">{processor.name}</h3>
          {byok && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">BYOK</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              {locale === 'nl' ? 'Doel' : 'Purpose'}
            </p>
            <p className="text-muted-foreground">{processor.purpose[L]}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              {locale === 'nl' ? 'Verwerkte data' : 'Data processed'}
            </p>
            <p className="text-muted-foreground">{processor.data[L]}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              {locale === 'nl' ? 'Locatie' : 'Location'}
            </p>
            <p className="text-muted-foreground">{processor.location}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              {locale === 'nl' ? 'Waarborg' : 'Safeguard'}
            </p>
            <p className="text-muted-foreground">{processor.safeguard[L]}</p>
          </div>
        </div>
        <a
          href={processor.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-xs text-primary hover:underline"
        >
          {locale === 'nl' ? 'Privacy/DPA →' : 'Privacy/DPA →'}
        </a>
      </CardContent>
    </Card>
  );
}
