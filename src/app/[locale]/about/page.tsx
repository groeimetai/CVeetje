import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { ArticleLayout } from '@/components/content/article-layout';
import {
  BreadcrumbStructuredData,
  OrganizationStructuredData,
  PersonStructuredData,
} from '@/components/seo/structured-data';

type Props = { params: Promise<{ locale: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const nl = locale === 'nl';
  const title = nl
    ? 'Over CVeetje — waarom we het bouwen, en hoe'
    : 'About CVeetje — why we built it, and how';
  const description = nl
    ? 'Wie zit er achter CVeetje, waar staan we voor, en waarom we bewust géén abonnement aanbieden. Een eerlijk verhaal vanuit Apeldoorn.'
    : 'Who is behind CVeetje, what we stand for, and why we deliberately offer no subscription. An honest story from Apeldoorn.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/about`,
      languages: { nl: '/nl/about', en: '/en/about' },
    },
    openGraph: { title, description, url: `${APP_URL}/${locale}/about`, type: 'website' },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const nl = locale === 'nl';

  return (
    <ArticleLayout
      locale={locale as 'nl' | 'en'}
      title={nl ? 'Over CVeetje' : 'About CVeetje'}
      description={
        nl
          ? 'Een Nederlands AI-CV-tool gebouwd vanuit eigen sollicitatie-frustratie. Door GroeimetAI in Apeldoorn. Eerlijk, getypeerd, en bewust zonder abonnement.'
          : 'A Dutch AI CV tool built out of personal job-hunt frustration. By GroeimetAI in Apeldoorn. Honest, typed, and deliberately subscription-free.'
      }
      backHref="/"
      backLabel={nl ? 'Terug naar home' : 'Back to home'}
      ctaPrimary={{ href: '/register', label: nl ? 'Probeer CVeetje gratis' : 'Try CVeetje for free' }}
      ctaSecondary={{ href: '/blog', label: nl ? 'Lees onze blog' : 'Read our blog' }}
    >
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: `/${locale}` },
          { name: nl ? 'Over CVeetje' : 'About CVeetje', url: `/${locale}/about` },
        ]}
      />
      <OrganizationStructuredData />
      <PersonStructuredData
        name="Niels van der Werf"
        url={APP_URL}
        description={
          nl
            ? 'Oprichter van CVeetje en GroeimetAI. Bouwt AI-producten in Apeldoorn met focus op transparantie en eerlijke prijsmodellen.'
            : 'Founder of CVeetje and GroeimetAI. Builds AI products in Apeldoorn with a focus on transparency and fair pricing.'
        }
        jobTitle={nl ? 'Oprichter, CVeetje' : 'Founder, CVeetje'}
      />

      <p className="lede">
        {nl
          ? 'CVeetje is in 2025 ontstaan uit een persoonlijke frustratie: élke vacature vroeg om een ander CV, en élke keer was dat veertig minuten in Word zitten klooien. Er bestonden tools — duur, met maandelijks abonnement, en met output die direct als AI-gegenereerd herkenbaar was. Dus bouwden we onze eigen.'
          : 'CVeetje was built in 2025 out of personal frustration: every job ad demanded a different CV, and every time that meant forty minutes wrestling with Word. Tools existed — expensive, subscription-based, with output instantly recognisable as AI-generated. So we built our own.'}
      </p>

      <h2>{nl ? 'Wie bouwt dit' : 'Who builds this'}</h2>
      <p>
        {nl
          ? 'CVeetje is een product van GroeimetAI, een klein AI-product-team in Apeldoorn. Niels van der Werf — software-engineer en oprichter — schrijft de code. Het team werkt vanuit Fabriekstraat 20 en is ingeschreven bij de KvK onder nummer 90102304.'
          : 'CVeetje is a product of GroeimetAI, a small AI product team in Apeldoorn, the Netherlands. Niels van der Werf — software engineer and founder — writes the code. The team works from Fabriekstraat 20 and is registered with the Dutch Chamber of Commerce under number 90102304.'}
      </p>
      <p>
        {nl
          ? 'We zijn niet door VC-geld gefinancierd. Het product wordt betaald door gebruikers — en bewust niet door reclame, dataverkoop of door API-aanbieders die advertentie-budget achter onze rug om sturen.'
          : 'We aren\'t VC-funded. The product is paid for by users — deliberately not by ads, data sales, or API providers steering ad budgets behind our back.'}
      </p>

      <h2>{nl ? 'Wat we anders doen' : 'What we do differently'}</h2>

      <h3>{nl ? 'Geen abonnement' : 'No subscription'}</h3>
      <p>
        {nl
          ? 'Een CV maak je in bursts — een paar weken intensief, dan stil. Een €19-per-maand abonnement past niet bij dat ritme. We hebben gekozen voor credits zonder vervaldatum: koop wat je nodig hebt, gebruik het wanneer je wilt, niets wordt onbedoeld van je rekening afgeschreven. Een gegenereerd CV kost tussen €1,00 en €1,66 afhankelijk van je pack. De gratis tier (15 credits per maand) dekt één volledig CV voor wie incidenteel solliciteert.'
          : 'You build CVs in bursts — a few intense weeks, then quiet. A €19/month subscription doesn\'t fit that rhythm. We chose credits that never expire: buy what you need, use it when you want, nothing accidentally drains your account. A generated CV costs €1.00–€1.66 depending on pack. The free tier (15 credits/month) covers one full CV for occasional applicants.'}
      </p>

      <h3>{nl ? 'Eerlijkheid in de prompts' : 'Honesty in the prompts'}</h3>
      <p>
        {nl
          ? 'De AI mag herordenen, framen en herwoorden — maar niet erbij verzinnen. Eerlijkheidsregels zitten ingebakken in elke prompt. Bij regeneratie-verzoeken die een claim opkloppen vraagt een aparte gatekeeper-AI om bewijs voor er een herziening wordt gemaakt. Dit is geen veiligheidstoneel; het houdt je CV verdedigbaar in een sollicitatiegesprek.'
          : 'The AI may reorder, reframe, and reword — but never invent. Honesty rules are baked into every prompt. Regeneration requests that inflate a claim trigger a separate gatekeeper AI that asks for evidence before revising. Not security theatre; what keeps your CV defensible in an interview.'}
      </p>

      <h3>{nl ? 'BYOK — je eigen API-key, geen lock-in' : 'BYOK — your own API key, no lock-in'}</h3>
      <p>
        {nl
          ? 'Voor wie een eigen Claude- of OpenAI-key heeft: gebruik die. We slaan &apos;m AES-256-versleuteld op, alle AI-stappen kosten je nul platform-credits, en je betaalt direct aan de provider. Voor zware gebruikers (loopbaancoaches, bureaus, zzp\'ers met actieve acquisitie) is dit meestal het goedkoopste model. Wij verdienen er minder aan — maar dat is het juiste compromis.'
          : 'If you already have a Claude or OpenAI key, use it. We store it AES-256 encrypted, all AI steps cost zero platform credits, and you pay your provider directly. For heavy users (career coaches, agencies, freelancers in active outreach), this is usually the cheapest model. We earn less from it — but that\'s the right trade-off.'}
      </p>

      <h3>{nl ? 'Geen verborgen watermerk in PDF\'s' : 'No hidden watermark in PDFs'}</h3>
      <p>
        {nl
          ? 'We hadden er een kunnen bouwen — een onzichtbaar AI-fingerprint dat hiring managers zou helpen door AI gegenereerde CV\'s te detecteren. We hebben er bewust van afgezien. Een hiring manager hoort gelijk speelveld te hebben, niet een verborgen detector op de rug van kandidaten. Als je een CVeetje-CV indient, weet alleen jij hoe je het hebt gemaakt.'
          : 'We could have built one — an invisible AI fingerprint helping hiring managers detect AI-generated CVs. We deliberately decided against it. Hiring managers deserve a level playing field, not a hidden detector on candidates\' backs. When you submit a CVeetje CV, only you know how you made it.'}
      </p>

      <h3>{nl ? 'Data in Nederland, AVG en EU AI Act vanaf dag één' : 'Data in the Netherlands, GDPR and EU AI Act from day one'}</h3>
      <p>
        {nl
          ? 'Alle data — je profiel, je gegenereerde CV\'s, je versleutelde API-keys — staat op Firebase in europe-west4 (Eemshaven). Niets in de VS, niets bij subverwerkers buiten de EU zonder expliciete vermelding. We hebben een volledig AVG-dossier (RoPA, DPIA, retentie-policy, DSR-procedure) en classificeren ons als EU AI Act &quot;beperkt risico&quot; met passende transparantie-eisen.'
          : 'All data — your profile, generated CVs, encrypted API keys — lives on Firebase in europe-west4 (Eemshaven, NL). Nothing in the US, nothing with non-EU sub-processors without explicit listing. We maintain a complete GDPR file (RoPA, DPIA, retention policy, DSR procedure) and classify ourselves as EU AI Act "limited risk" with the corresponding transparency obligations.'}
      </p>

      <h2>{nl ? 'Wat we niet doen' : 'What we don\'t do'}</h2>
      <ul>
        <li>
          {nl
            ? 'We trainen geen AI-modellen op gebruikersdata.'
            : 'We don\'t train AI models on user data.'}
        </li>
        <li>
          {nl
            ? 'We verkopen geen data, geen e-mails, geen profielen. Aan niemand. Nooit.'
            : 'We don\'t sell data, emails, or profiles. To anyone. Ever.'}
        </li>
        <li>
          {nl
            ? 'We tracken niet door derde partijen. Geen Google Analytics, geen Meta Pixel, geen Hotjar. Wel onze eigen lichte event-logging voor product-verbetering, opt-out via cookies-banner.'
            : 'We don\'t use third-party tracking. No Google Analytics, no Meta Pixel, no Hotjar. We do log light first-party events for product improvement, opt-out via cookie banner.'}
        </li>
        <li>
          {nl
            ? 'We adverteren niet op Facebook, Instagram, TikTok of Google Search. Groei moet komen uit het werk dat we hier doen — content, eerlijke prijzen, mond-tot-mond.'
            : 'We don\'t advertise on Facebook, Instagram, TikTok, or Google Search. Growth has to come from the work itself — content, fair prices, word of mouth.'}
        </li>
      </ul>

      <h2>{nl ? 'Hoe we bouwen' : 'How we build'}</h2>
      <p>
        {nl
          ? 'CVeetje is gebouwd in Next.js 16, React 19, TypeScript en Tailwind v4. We gebruiken Anthropic Claude (Opus + Sonnet) als primair model in platform-modus, met BYOK-fallback naar OpenAI of Google. PDF-generatie via Puppeteer op Cloud Run. Firebase voor auth, Firestore, en Storage — alles in europe-west4. Deploys gaan via Cloud Build trigger op push naar main.'
          : 'CVeetje is built in Next.js 16, React 19, TypeScript, and Tailwind v4. We use Anthropic Claude (Opus + Sonnet) as the primary model in platform mode, with BYOK fallback to OpenAI or Google. PDF generation via Puppeteer on Cloud Run. Firebase for auth, Firestore, and Storage — all in europe-west4. Deploys go via Cloud Build trigger on push to main.'}
      </p>
      <p>
        {nl
          ? 'We bouwen open in de zin van: feedback komt direct in onze publieke GitHub-issues (groeimetai/CVeetje), de tech-stack is verifieerbaar, en de prijzen veranderen niet zonder dat we erover schrijven. Als wat we hier zeggen niet overeenkomt met wat je in de praktijk ziet — mail info@groeimetai.io, dan corrigeren we.'
          : 'We build openly in the sense that: feedback lands directly in our public GitHub issues (groeimetai/CVeetje), the tech stack is verifiable, and prices don\'t change without us writing about it. If what we say here doesn\'t match what you see in practice — email info@groeimetai.io and we\'ll correct it.'}
      </p>

      <h2>{nl ? 'Waarom Apeldoorn' : 'Why Apeldoorn'}</h2>
      <p>
        {nl
          ? 'Niet uit branding-keuze. Daar wonen we. GroeimetAI begon hier, en CVeetje ook. Het bevalt — kortere lijnen dan in Amsterdam, technisch sterke gemeenschap rond Wageningen / Enschede / Apeldoorn, en een arbeidsmarkt die we van binnenuit kennen. Veel van wat in onze content over recruitment staat, komt uit gesprekken die hier in onze regio gevoerd zijn.'
          : 'Not a branding choice. We live here. GroeimetAI started here, and so did CVeetje. It works — shorter communication lines than Amsterdam, a technically strong community around Wageningen / Enschede / Apeldoorn, and a job market we know from the inside. Much of what we write about recruitment comes from conversations had here in our region.'}
      </p>

      <h2>{nl ? 'Vragen of feedback' : 'Questions or feedback'}</h2>
      <p>
        {nl ? (
          <>
            Mail <a href="mailto:info@groeimetai.io">info@groeimetai.io</a>. We lezen alles. Voor bug-reports en feature-verzoeken kun je ook gewoon een issue openen op{' '}
            <a href="https://github.com/groeimetai/CVeetje/issues" target="_blank" rel="noopener">GitHub</a>
            {' '}— elke ingestuurde feedback via de app komt daar automatisch terecht.
          </>
        ) : (
          <>
            Email <a href="mailto:info@groeimetai.io">info@groeimetai.io</a>. We read everything. For bug reports and feature requests, open an issue directly on{' '}
            <a href="https://github.com/groeimetai/CVeetje/issues" target="_blank" rel="noopener">GitHub</a>
            {' '}— every piece of feedback submitted via the app lands there automatically.
          </>
        )}
      </p>

      <div className="callout">
        <div className="callout-title">{nl ? 'Tot slot' : 'In closing'}</div>
        <p>
          {nl
            ? 'CVeetje is geen tech-bedrijf met een exit-strategie. Het is een tool die wij zelf gebruiken en aan andere mensen beschikbaar stellen tegen een redelijke prijs. Zolang dat werkt, blijft het bestaan. Geen lock-in, geen verrassingen, geen abonnement.'
            : 'CVeetje isn\'t a tech company with an exit strategy. It\'s a tool we use ourselves and make available to others at a fair price. As long as that works, it stays. No lock-in, no surprises, no subscription.'}
        </p>
      </div>
    </ArticleLayout>
  );
}
