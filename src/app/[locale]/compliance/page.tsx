import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Cookie,
  Sparkles,
  Server,
  FileText,
  Scale,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'nl' ? 'Compliance — AVG & EU AI Act — CVeetje' : 'Compliance — GDPR & EU AI Act — CVeetje',
    description:
      locale === 'nl'
        ? 'Hoe CVeetje voldoet aan de AVG en de EU AI-verordening: dataopslag in Nederland, beperkte AI-risicoclassificatie, transparantie en jouw rechten.'
        : 'How CVeetje complies with GDPR and the EU AI Act: data storage in the Netherlands, limited-risk AI classification, transparency and your rights.',
    alternates: {
      canonical: `/${locale}/compliance`,
      languages: { nl: '/nl/compliance', en: '/en/compliance' },
    },
  };
}

export default async function CompliancePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isNL = locale === 'nl';

  const title = isNL ? 'Compliance & Wetgeving' : 'Compliance & Regulation';
  const lastUpdated = new Date('2026-05-15').toLocaleDateString(isNL ? 'nl-NL' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const pillars = [
    {
      icon: Server,
      title: isNL ? 'Data blijft in Nederland' : 'Data stays in the Netherlands',
      body: isNL
        ? 'Account-, profiel- en CV-data wordt opgeslagen op Google Cloud in europe-west4 (Eemshaven). Geen primaire dataopslag buiten de EU.'
        : 'Account, profile and CV data is stored on Google Cloud in europe-west4 (Eemshaven). No primary data storage outside the EU.',
    },
    {
      icon: Lock,
      title: isNL ? 'Versleuteling op alle lagen' : 'Encryption at every layer',
      body: isNL
        ? 'TLS in transit, Google-managed encryption at rest, AES-256 voor opgeslagen API-sleutels. Wij hebben zelf geen toegang tot je wachtwoord of plaintext API-sleutels.'
        : 'TLS in transit, Google-managed encryption at rest, AES-256 for stored API keys. We never have access to your password or plaintext API keys.',
    },
    {
      icon: Sparkles,
      title: isNL ? 'AI met menselijk toezicht' : 'AI with human oversight',
      body: isNL
        ? 'CVeetje is een AI-systeem met beperkt risico onder de EU AI-verordening. Je controleert altijd zelf de gegenereerde tekst voordat je hem gebruikt.'
        : 'CVeetje is a limited-risk AI system under the EU AI Act. You always review generated content yourself before using it.',
    },
    {
      icon: ShieldCheck,
      title: isNL ? 'Volledige transparantie' : 'Full transparency',
      body: isNL
        ? 'Welke modellen we inzetten, waar data heen gaat, welke subverwerkers we hebben — alles staat publiek op deze site, inclusief dit overzicht.'
        : 'Which models we use, where data flows, which sub-processors we engage — all of it is public on this site, including this overview.',
    },
  ];

  const docs = [
    {
      icon: FileText,
      title: isNL ? 'Privacybeleid' : 'Privacy Policy',
      desc: isNL
        ? 'AVG art. 13: doelen, rechtsgrond, bewaartermijnen, jouw rechten.'
        : 'GDPR art. 13: purposes, legal basis, retention, your rights.',
      href: '/privacy',
    },
    {
      icon: Scale,
      title: isNL ? 'Algemene Voorwaarden' : 'Terms of Service',
      desc: isNL
        ? 'Credits, BYOK, aansprakelijkheid, herroeping.'
        : 'Credits, BYOK, liability, right of withdrawal.',
      href: '/terms',
    },
    {
      icon: Sparkles,
      title: isNL ? 'AI Transparantie' : 'AI Transparency',
      desc: isNL
        ? 'EU AI Act art. 50 — modellen, doelen, beperkingen.'
        : 'EU AI Act art. 50 — models, purposes, limitations.',
      href: '/ai-transparency',
    },
    {
      icon: Server,
      title: isNL ? 'Subverwerkers' : 'Sub-processors',
      desc: isNL
        ? 'Publieke lijst van alle ingeschakelde subverwerkers (art. 28 AVG).'
        : 'Public list of all engaged sub-processors (art. 28 GDPR).',
      href: '/sub-processors',
    },
    {
      icon: Cookie,
      title: isNL ? 'Cookiebeleid' : 'Cookie Policy',
      desc: isNL
        ? 'Welke cookies wij gebruiken en hoe je toestemming intrekt.'
        : 'Which cookies we use and how to withdraw consent.',
      href: '/cookies',
    },
  ];

  return (
    <>
      <BreadcrumbStructuredData items={[{ name: 'Home', url: `/${locale}` }, { name: title, url: `/${locale}/compliance` }]} />
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
              {isNL ? 'Terug naar home' : 'Back to home'}
            </Link>

            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
              <p className="text-muted-foreground">
                {isNL ? 'Laatst bijgewerkt' : 'Last updated'}: {lastUpdated}
              </p>
            </div>

            <Card className="mb-12 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h2 className="font-semibold">
                      {isNL
                        ? 'CVeetje voldoet aan de AVG en de EU AI-verordening'
                        : 'CVeetje complies with the GDPR and the EU AI Act'}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {isNL
                        ? 'CVeetje is een dienst van GroeimetAI (KvK 90102304, Apeldoorn). Wij verwerken persoonsgegevens primair op infrastructuur in Nederland (europe-west4), met versleuteling op alle lagen en strikte toegangsbeperking. De AI-functionaliteit is geclassificeerd als beperkt-risico onder Verordening (EU) 2024/1689 ("AI Act") en voldoet aan de transparantieverplichtingen van Artikel 50.'
                        : 'CVeetje is a service of GroeimetAI (Dutch Chamber of Commerce 90102304, Apeldoorn). We process personal data primarily on infrastructure in the Netherlands (europe-west4), with encryption at all layers and strict access control. The AI functionality is classified as limited-risk under Regulation (EU) 2024/1689 ("AI Act") and meets the transparency obligations of Article 50.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-xl font-semibold mb-4">
              {isNL ? 'Onze vier pijlers' : 'Our four pillars'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {pillars.map((p) => {
                const Icon = p.icon;
                return (
                  <Card key={p.title}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="rounded-md p-2 bg-primary/10 text-primary flex-shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{p.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <h2 className="text-xl font-semibold mb-4">
              {isNL ? 'AVG (GDPR) compliance' : 'GDPR compliance'}
            </h2>
            <Card className="mb-12">
              <CardContent className="pt-6">
                <ul className="space-y-3 text-sm">
                  {[
                    isNL
                      ? 'Verwerkingsverantwoordelijke: GroeimetAI, Fabriekstraat 20, 7311GP Apeldoorn.'
                      : 'Controller: GroeimetAI, Fabriekstraat 20, 7311GP Apeldoorn, Netherlands.',
                    isNL
                      ? 'Rechtsgrond: uitvoering overeenkomst (art. 6 lid 1 sub b) voor accountdata; toestemming (sub a) voor analytics; gerechtvaardigd belang (sub f) voor beveiliging en misbruikdetectie.'
                      : 'Legal basis: contract performance (art. 6(1)(b)) for account data; consent (a) for analytics; legitimate interest (f) for security and abuse detection.',
                    isNL
                      ? 'Dataresidentie: primaire opslag in Nederland (europe-west4). Internationale doorgifte aan Anthropic (VS) onder SCC\'s + TIA.'
                      : 'Data residency: primary storage in the Netherlands (europe-west4). International transfer to Anthropic (USA) under SCCs + TIA.',
                    isNL
                      ? 'Bewaartermijnen: accountdata zolang account actief, daarna max. 30 dagen tot definitieve verwijdering; betaalbewijzen 7 jaar (fiscale plicht).'
                      : 'Retention: account data while active, then up to 30 days until final deletion; payment records 7 years (tax obligation).',
                    isNL
                      ? 'Recht op inzage, rectificatie, verwijdering, beperking, bezwaar en dataportabiliteit — uit te oefenen via instellingen of via info@groeimetai.io.'
                      : 'Right to access, rectification, erasure, restriction, objection and data portability — exercisable via settings or info@groeimetai.io.',
                    isNL
                      ? 'Dataportabiliteit: in-app data-export als gestructureerde JSON (AVG art. 20).'
                      : 'Data portability: in-app data export as structured JSON (GDPR art. 20).',
                    isNL
                      ? 'Account-verwijdering: zelfservice via Instellingen → Account → Account verwijderen. Verwijdert Auth, Firestore en Storage.'
                      : 'Account deletion: self-service via Settings → Account → Delete account. Removes Auth, Firestore and Storage.',
                    isNL
                      ? 'Datalekken: meldplicht binnen 72 uur bij de Autoriteit Persoonsgegevens en, waar nodig, aan betrokkenen.'
                      : 'Data breaches: notification within 72 hours to the Dutch DPA and, where required, to data subjects.',
                    isNL
                      ? 'Toezichthouder: Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).'
                      : 'Supervisory authority: Dutch Data Protection Authority (autoriteitpersoonsgegevens.nl).',
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <h2 className="text-xl font-semibold mb-4">
              {isNL ? 'EU AI Act compliance' : 'EU AI Act compliance'}
            </h2>
            <Card className="mb-12">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {isNL
                    ? 'CVeetje is geen high-risk AI-systeem in de zin van Annex III. Wij beoordelen, screenen of selecteren géén kandidaten namens werkgevers — CVeetje is uitsluitend een schrijfhulp voor de gebruiker zelf. Op grond van Artikel 6 lid 3 onder b vallen wij buiten high-risk omdat de AI bedoeld is voor het verbeteren van het resultaat van een eerder voltooide menselijke activiteit (jouw eigen werkervaring, opleiding, vaardigheden).'
                    : 'CVeetje is not a high-risk AI system within the meaning of Annex III. We do not evaluate, screen or select candidates on behalf of employers — CVeetje is purely a writing aid for the user themselves. Under Article 6(3)(b) we fall outside high-risk because the AI is intended to improve the result of a previously completed human activity (your own work experience, education, skills).'}
                </p>
                <ul className="space-y-3 text-sm">
                  {[
                    isNL
                      ? 'Risicoclassificatie: beperkt risico (limited risk). Documentatie beschikbaar voor toezichthouders.'
                      : 'Risk classification: limited risk. Documentation available for supervisors.',
                    isNL
                      ? 'Art. 50 transparantie: bij iedere AI-actie zie je vooraf welk model wordt ingezet (Platform AI of jouw eigen sleutel).'
                      : 'Art. 50 transparency: before every AI action you see which model will be used (Platform AI or your own key).',
                    isNL
                      ? 'AI-output is duidelijk gelabeld als gegenereerd door AI. De gebruiker controleert en bewerkt de output altijd zelf.'
                      : 'AI output is clearly labelled as AI-generated. The user always reviews and edits the output themselves.',
                    isNL
                      ? 'AI-geletterdheid (art. 4): deze pagina, /ai-transparency en in-app uitleg dragen bij aan begrip van wat AI wel/niet doet.'
                      : 'AI literacy (art. 4): this page, /ai-transparency and in-app explanations contribute to understanding what AI does and does not do.',
                    isNL
                      ? 'Geen verboden praktijken (art. 5): geen subliminale beïnvloeding, geen social scoring, geen exploitatie van kwetsbare groepen.'
                      : 'No prohibited practices (art. 5): no subliminal manipulation, no social scoring, no exploitation of vulnerable groups.',
                    isNL
                      ? 'GPAI-deployer: wij gebruiken Anthropic Claude (een general purpose AI model) als afnemer; eigen logging van inputs/outputs voor incident-onderzoek.'
                      : 'GPAI deployer: we consume Anthropic Claude (a general purpose AI model); own logging of inputs/outputs for incident review.',
                    isNL
                      ? 'Strenge anti-hallucinatie-regels in prompts: AI mag geen ervaring, opleiding of vaardigheden verzinnen die niet in jouw profiel staan.'
                      : 'Strict anti-hallucination rules in prompts: AI must not invent experience, education or skills that are not in your profile.',
                    isNL
                      ? 'Disputes-flow: als de AI iets fouts genereert, kun je dat melden; een gatekeeper-LLM beoordeelt het bezwaar en regenereert correct.'
                      : 'Disputes flow: if the AI generates something wrong, you can report it; a gatekeeper LLM reviews the objection and regenerates correctly.',
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <h2 className="text-xl font-semibold mb-4">
              {isNL ? 'Documenten en pagina\'s' : 'Documents and pages'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {docs.map((d) => {
                const Icon = d.icon;
                return (
                  <Link key={d.href} href={d.href}>
                    <Card className="h-full hover:border-primary/40 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="rounded-md p-2 bg-muted text-foreground flex-shrink-0">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">{d.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            <Card>
              <CardContent className="pt-6">
                <h2 className="font-semibold mb-3">
                  {isNL ? 'Contact en klachten' : 'Contact and complaints'}
                </h2>
                <p className="text-sm text-muted-foreground mb-2">
                  {isNL ? 'Privacy- of AI-vragen, DPA-verzoek, of een datalek melden?' : 'Privacy or AI questions, DPA request, or report a data breach?'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  <a href="mailto:info@groeimetai.io" className="text-primary hover:underline">info@groeimetai.io</a>
                  {' · '}
                  GroeimetAI · Fabriekstraat 20 · 7311GP Apeldoorn
                </p>
                <p className="text-xs text-muted-foreground">
                  {isNL
                    ? 'Je hebt altijd het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).'
                    : 'You always have the right to lodge a complaint with the Dutch Data Protection Authority (autoriteitpersoonsgegevens.nl).'}
                </p>
                <div className="mt-4">
                  <Link href="mailto:info@groeimetai.io">
                    <Button variant="outline" size="sm">{isNL ? 'Mail ons' : 'Email us'}</Button>
                  </Link>
                </div>
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
                <Link href="/terms" className="hover:text-foreground">{isNL ? 'Voorwaarden' : 'Terms'}</Link>
                <Link href="/cookies" className="hover:text-foreground">{isNL ? 'Cookies' : 'Cookies'}</Link>
                <Link href="/ai-transparency" className="hover:text-foreground">{isNL ? 'AI Transparantie' : 'AI Transparency'}</Link>
                <Link href="/sub-processors" className="hover:text-foreground">{isNL ? 'Subverwerkers' : 'Sub-processors'}</Link>
                <Link href="/compliance" className="hover:text-foreground font-medium text-foreground">Compliance</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
