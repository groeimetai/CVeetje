import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';
import { CookieSettingsButton } from '@/components/cookie-settings-button';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'nl' ? 'Cookiebeleid — CVeetje' : 'Cookie Policy — CVeetje',
    description:
      locale === 'nl'
        ? 'Welke cookies en lokale opslag CVeetje gebruikt, waarvoor, en hoe je je toestemming kunt intrekken.'
        : 'Which cookies and local storage CVeetje uses, for what purpose, and how to withdraw consent.',
    alternates: {
      canonical: `/${locale}/cookies`,
      languages: { nl: '/nl/cookies', en: '/en/cookies' },
    },
  };
}

type Row = {
  name: string;
  type: 'essential' | 'analytics';
  purpose: { nl: string; en: string };
  storage: 'cookie' | 'localStorage';
  duration: { nl: string; en: string };
  party: 'first' | 'third';
};

const rows: Row[] = [
  {
    name: 'firebase-token',
    type: 'essential',
    purpose: {
      nl: 'Firebase ID-token voor server-side authenticatie van API-verzoeken.',
      en: 'Firebase ID token for server-side authentication of API requests.',
    },
    storage: 'cookie',
    duration: { nl: 'Sessie / max. 1 uur (auto-refresh)', en: 'Session / max 1 hour (auto-refresh)' },
    party: 'first',
  },
  {
    name: '__Secure-firebase-auth*',
    type: 'essential',
    purpose: {
      nl: 'Firebase Authentication state (Google/Apple/email sign-in).',
      en: 'Firebase Authentication state (Google/Apple/email sign-in).',
    },
    storage: 'cookie',
    duration: { nl: 'Tot uitloggen', en: 'Until sign-out' },
    party: 'third',
  },
  {
    name: 'NEXT_LOCALE',
    type: 'essential',
    purpose: {
      nl: 'Onthoudt of je nl of en als taal gekozen hebt.',
      en: 'Remembers whether you selected nl or en as language.',
    },
    storage: 'cookie',
    duration: { nl: '1 jaar', en: '1 year' },
    party: 'first',
  },
  {
    name: 'cveetje-cookie-consent',
    type: 'essential',
    purpose: {
      nl: 'Slaat je keuze (accepteren/weigeren) van de cookie-banner op.',
      en: 'Stores your accept/decline choice from the cookie banner.',
    },
    storage: 'localStorage',
    duration: { nl: 'Onbeperkt totdat je localStorage wist', en: 'Indefinite until you clear localStorage' },
    party: 'first',
  },
  {
    name: 'theme',
    type: 'essential',
    purpose: {
      nl: 'Onthoudt je gekozen light/dark mode.',
      en: 'Remembers your chosen light/dark theme.',
    },
    storage: 'localStorage',
    duration: { nl: 'Onbeperkt totdat je localStorage wist', en: 'Indefinite until you clear localStorage' },
    party: 'first',
  },
  {
    name: '_ga, _ga_<id>',
    type: 'analytics',
    purpose: {
      nl: 'Google Analytics 4 — anonieme gebruiksstatistieken. Alleen geladen na expliciete toestemming. IP-adres wordt gemaskeerd (anonymize_ip).',
      en: 'Google Analytics 4 — anonymous usage statistics. Only loaded after explicit consent. IP is masked (anonymize_ip).',
    },
    storage: 'cookie',
    duration: { nl: '13 maanden', en: '13 months' },
    party: 'third',
  },
];

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale === 'nl' ? 'nl' : 'en';

  const title = locale === 'nl' ? 'Cookiebeleid' : 'Cookie Policy';
  const lastUpdated = new Date('2026-05-15').toLocaleDateString(
    locale === 'nl' ? 'nl-NL' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <>
      <BreadcrumbStructuredData items={[{ name: 'Home', url: `/${locale}` }, { name: title, url: `/${locale}/cookies` }]} />
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
          <div className="container mx-auto px-4 max-w-4xl">
            <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {locale === 'nl' ? 'Terug naar home' : 'Back to home'}
            </Link>

            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
              <p className="text-muted-foreground">
                {locale === 'nl' ? 'Laatst bijgewerkt' : 'Last updated'}: {lastUpdated}
              </p>
            </div>

            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardContent className="pt-6 flex items-start gap-3">
                <Cookie className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {locale === 'nl'
                    ? 'CVeetje gebruikt zo min mogelijk cookies. Essentiële cookies zijn vereist om de dienst te laten werken (Telecommunicatiewet art. 11.7a lid 3 sub a en b — geen toestemming nodig). Niet-essentiële cookies (analytics) worden alleen geladen nadat je actief toestemming geeft via de cookie-banner.'
                    : 'CVeetje uses as few cookies as possible. Essential cookies are required for the service to function (Dutch Telecom Act art. 11.7a(3)(a)(b) / ePrivacy Directive — no consent required). Non-essential cookies (analytics) are only loaded after you give active consent via the cookie banner.'}
                </p>
              </CardContent>
            </Card>

            <h2 className="text-xl font-semibold mb-4">
              {locale === 'nl' ? 'Overzicht van cookies en opslag' : 'List of cookies and storage'}
            </h2>

            <div className="overflow-x-auto mb-12">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3 font-medium">{locale === 'nl' ? 'Naam' : 'Name'}</th>
                    <th className="text-left py-2 pr-3 font-medium">{locale === 'nl' ? 'Categorie' : 'Category'}</th>
                    <th className="text-left py-2 pr-3 font-medium">{locale === 'nl' ? 'Doel' : 'Purpose'}</th>
                    <th className="text-left py-2 pr-3 font-medium">{locale === 'nl' ? 'Opslag' : 'Storage'}</th>
                    <th className="text-left py-2 pr-3 font-medium">{locale === 'nl' ? 'Bewaar­termijn' : 'Retention'}</th>
                    <th className="text-left py-2 pr-3 font-medium">{locale === 'nl' ? 'Partij' : 'Party'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.name} className="border-b align-top">
                      <td className="py-3 pr-3 font-mono text-xs">{r.name}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={
                            r.type === 'essential'
                              ? 'inline-block px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'inline-block px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          }
                        >
                          {r.type === 'essential'
                            ? locale === 'nl'
                              ? 'Essentieel'
                              : 'Essential'
                            : 'Analytics'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{r.purpose[L]}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{r.storage}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{r.duration[L]}</td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {r.party === 'first'
                          ? locale === 'nl'
                            ? 'CVeetje'
                            : 'CVeetje'
                          : locale === 'nl'
                            ? 'Derde partij'
                            : 'Third party'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Card className="mb-6">
              <CardContent className="pt-6">
                <h2 className="font-semibold mb-3">
                  {locale === 'nl' ? 'Toestemming intrekken of wijzigen' : 'Withdraw or change consent'}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {locale === 'nl'
                    ? 'Onder AVG art. 7 lid 3 moet intrekken van toestemming net zo makkelijk zijn als het geven ervan. Klik op de knop hieronder om de cookie-banner opnieuw te openen en je keuze te wijzigen.'
                    : 'Under GDPR art. 7(3), withdrawing consent must be as easy as giving it. Click the button below to reopen the cookie banner and change your choice.'}
                </p>
                <CookieSettingsButton variant="outline" withIcon />
                <p className="text-sm text-muted-foreground mt-4">
                  {locale === 'nl'
                    ? 'Daarnaast kun je via je browserinstellingen alle of specifieke cookies blokkeren. Houd er rekening mee dat essentiële cookies blokkeren kan betekenen dat inloggen of taalkeuze niet meer werkt.'
                    : 'You can also block all or specific cookies via your browser settings. Note that blocking essential cookies may break sign-in or language preference.'}
                </p>
              </CardContent>
            </Card>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">
                {locale === 'nl' ? 'Vragen over cookies?' : 'Questions about cookies?'}
              </p>
              <Link href="mailto:info@groeimetai.io">
                <Button variant="outline">{locale === 'nl' ? 'Neem contact op' : 'Contact us'}</Button>
              </Link>
            </div>
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
                <Link href="/cookies" className="hover:text-foreground font-medium text-foreground">{locale === 'nl' ? 'Cookies' : 'Cookies'}</Link>
                <Link href="/ai-transparency" className="hover:text-foreground">{locale === 'nl' ? 'AI Transparantie' : 'AI Transparency'}</Link>
                <Link href="/sub-processors" className="hover:text-foreground">{locale === 'nl' ? 'Subverwerkers' : 'Sub-processors'}</Link>
                <Link href="/compliance" className="hover:text-foreground">Compliance</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
