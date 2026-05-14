import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import {
  ArrowRight,
  Briefcase,
  Check,
  Edit3,
  FileText,
  Linkedin,
  Send,
  Shield,
  Target,
  Upload,
  Users,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/logo';
import { WebsiteStructuredData, FAQStructuredData, OrganizationStructuredData } from '@/components/seo/structured-data';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { CvShowcaseRotate } from '@/components/landing/cv-showcase-rotate';
import '@/styles/landing.css';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });
  return {
    title: t('title'),
    description: t('description'),
    keywords: locale === 'nl'
      ? ['CV maken', 'CV op maat', 'CV aanpassen vacature', 'AI CV generator', 'LinkedIn CV', 'professioneel CV', 'sollicitatie automatiseren', 'CV targeting', 'ATS CV', 'gratis CV maker', 'motivatiebrief generator']
      : ['CV builder', 'resume builder', 'AI CV', 'LinkedIn CV', 'professional CV', 'CV generator', 'job application', 'CV targeting', 'ATS CV', 'free CV maker', 'cover letter generator'],
    alternates: {
      canonical: `/${locale}`,
      languages: { nl: '/nl', en: '/en' },
    },
  };
}

const MARQUEE_NL = [
  'maakcveetje.nl — een CV op maat voor élke vacature',
  'nu gratis tot 5 downloads per maand',
  '9 talen ondersteund',
  'jouw data blijft van jou',
  'ATS-vriendelijk, recruiter-proof',
  'BYO API-key of platform credits — jij kiest',
];
const MARQUEE_EN = [
  'maakcveetje.nl — a CV tailored to every job',
  'now free up to 5 downloads per month',
  '9 languages supported',
  'your data stays yours',
  'ATS-friendly, recruiter-proof',
  'BYO API key or platform credits — your call',
];

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');

  const nl = locale === 'nl';
  const marquee = nl ? MARQUEE_NL : MARQUEE_EN;

  return (
    <>
      <WebsiteStructuredData />
      <FAQStructuredData />
      <OrganizationStructuredData />

      <div className="landing">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          {nl ? 'Ga naar hoofdinhoud' : 'Skip to main content'}
        </a>

        <header className="land-topbar" role="banner">
          <div className="land-topbar__strip" aria-hidden="true">
            <div className="land-topbar__strip-inner">
              {[...marquee, ...marquee].map((m, i) => <span key={i}>{m}</span>)}
            </div>
          </div>
          <div className="brand-container">
            <nav className="land-nav" aria-label={nl ? 'Hoofdnavigatie' : 'Main navigation'}>
              <Link href="/" className="flex-shrink-0"><Logo size="sm" /></Link>
              <div className="land-nav__links">
                <a href="#hoe">{nl ? 'Hoe het werkt' : 'How it works'}</a>
                <a href="#stijlen">{nl ? 'Stijlen' : 'Styles'}</a>
                <a href="#features">Features</a>
                <a href="#prijzen">{nl ? 'Prijzen' : 'Pricing'}</a>
                <Link href="/jobs">{nl ? 'Vacatures' : 'Jobs'}</Link>
              </div>
              <div className="land-nav__right">
                <ThemeSwitcher />
                <LanguageSwitcher />
                <Link href="/login" className="brand-btn brand-btn--ghost brand-btn--sm">
                  {nl ? 'Inloggen' : 'Sign in'}
                </Link>
                <Link href="/register" className="brand-btn brand-btn--primary brand-btn--sm">
                  {t('ctaStart')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </nav>
          </div>
        </header>

        <main id="main-content">
          {/* HERO */}
          <section className="hero" aria-labelledby="hero-heading">
            <div className="brand-container hero__inner">
              <div className="hero__left">
                <div className="hero__eyebrow">№ 001 — {nl ? 'CV-targeting' : 'CV targeting'}</div>
                <h1 id="hero-heading" className="hero__title">
                  {nl ? <>Eén CV<br />voor elke <em>vacature</em>.<br /><span className="hero__title-underline">Klaar in 2 minuten.</span></> :
                       <>One CV<br />for every <em>job</em>.<br /><span className="hero__title-underline">Done in 2 minutes.</span></>}
                </h1>
                <p className="hero__sub">
                  {nl ? <>Plak een vacature, kies een stijl, krijg een <strong>CV op maat</strong> — geschreven naar de keywords, gericht op de juiste ervaring, klaar voor ATS-systemen. Geen sjablonen, geen geknoei in Word.</> :
                       <>Paste a job posting, pick a style, get a <strong>tailored CV</strong> — written to the keywords, focused on the right experience, ready for ATS systems. No templates, no fiddling in Word.</>}
                </p>
                <div className="hero__cta">
                  <Link href="/register" className="brand-btn brand-btn--primary brand-btn--lg">
                    {nl ? 'Probeer gratis' : 'Try for free'} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a href="#hoe" className="brand-btn brand-btn--ghost brand-btn--lg">
                    {nl ? 'Zie hoe het werkt' : 'See how it works'}
                  </a>
                </div>
                <div className="hero__trust">
                  <div className="hero__trust-avatars" aria-hidden="true">
                    <div>JD</div>
                    <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>RS</div>
                    <div style={{ background: 'var(--primary-soft)' }}>MV</div>
                    <div style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>EK</div>
                  </div>
                  <span>{nl ? '1.247 sollicitaties verstuurd deze maand' : '1,247 applications sent this month'}</span>
                </div>
              </div>

              <div className="hero__right">
                <div className="builder" aria-hidden="true">
                  <div className="builder__bg" />

                  <div className="builder__chip builder__chip--vac">
                    <Briefcase style={{ color: 'var(--accent)', flexShrink: 0, width: 16, height: 16 }} />
                    <div>
                      <div className="builder__chip-title">Senior Product Designer</div>
                      <div className="builder__chip-sub">Adyen · Amsterdam</div>
                    </div>
                  </div>

                  <div className="builder__chip builder__chip--skill">
                    <span>+ Figma</span>
                  </div>

                  <div className="builder__chip builder__chip--match">
                    <div className="pct">92<span style={{ fontSize: 16, opacity: 0.7 }}>%</span></div>
                    <div className="label">{nl ? 'match · klaar' : 'match · done'}</div>
                  </div>

                  <div className="builder__chip builder__chip--lang">
                    <div className="flag" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em' }}>NL→EN</span>
                  </div>

                  <div className="builder__cv">
                    <div className="builder__cv-name">Niels van<br />der Werf</div>
                    <div className="builder__cv-role">Senior Product Designer</div>
                    <div className="builder__rule" />
                    <h4>{nl ? 'Profiel' : 'Profile'}</h4>
                    <div className="builder__bar" />
                    <div className="builder__bar builder__bar--short" />
                    <h4>{nl ? 'Ervaring' : 'Experience'}</h4>
                    <div className="builder__row">
                      <span className="builder__row-bold">Lead Designer</span>
                      <span>Mollie</span>
                      <span className="builder__row-date">2022 — {nl ? 'nu' : 'now'}</span>
                    </div>
                    <div className="builder__bar" />
                    <div className="builder__bar builder__bar--short" />
                    <div className="builder__row">
                      <span className="builder__row-bold">Designer</span>
                      <span>bunq</span>
                      <span className="builder__row-date">2019 — 22</span>
                    </div>
                    <div className="builder__bar builder__bar--short" />
                    <h4>Skills</h4>
                    <div className="builder__bar builder__bar--xshort" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* STAT TICKER */}
          <section aria-hidden="true">
            <div className="stat-ticker">
              <div className="stat-ticker__item">
                <span className="stat-ticker__label">{nl ? 'Tijd per CV' : 'Time per CV'}</span>
                <span className="stat-ticker__value"><em>2</em> min</span>
                <span className="stat-ticker__hint">{nl ? 'Plak. Klik. Download.' : 'Paste. Click. Download.'}</span>
              </div>
              <div className="stat-ticker__item">
                <span className="stat-ticker__label">{nl ? 'Match score' : 'Match score'}</span>
                <span className="stat-ticker__value">92<em>%</em></span>
                <span className="stat-ticker__hint">{nl ? 'Gemiddelde fit met vacature' : 'Average fit with the job'}</span>
              </div>
              <div className="stat-ticker__item">
                <span className="stat-ticker__label">{nl ? 'Talen' : 'Languages'}</span>
                <span className="stat-ticker__value">9</span>
                <span className="stat-ticker__hint">{nl ? 'Nederlands, Engels, Duits, …' : 'Dutch, English, German, …'}</span>
              </div>
              <div className="stat-ticker__item">
                <span className="stat-ticker__label">{nl ? 'Prijs voor proberen' : 'Cost to try'}</span>
                <span className="stat-ticker__value">€ <em>0</em></span>
                <span className="stat-ticker__hint">{nl ? '5 gratis downloads / maand' : '5 free downloads / month'}</span>
              </div>
            </div>
          </section>

          {/* SHOWCASE */}
          <section id="stijlen" className="land-section land-section--alt" aria-labelledby="showcase-heading">
            <div className="brand-container showcase">
              <div className="showcase__left">
                <span className="section-header__eyebrow">§ {nl ? 'Stijl-generator' : 'Style generator'}</span>
                <h2 id="showcase-heading" className="section-header__title">
                  {nl ? <>Een stijl<br />die past bij <em>de baan</em>.</> : <>A style<br />that fits <em>the role</em>.</>}
                </h2>
                <p className="section-header__sub">
                  {nl ? 'Solliciteer je bij een advocatenkantoor of een design studio? Cveetje genereert per vacature een passende stijl — kleur, layout, typografie — of kiest uit een collectie editorial templates.' :
                       "Applying at a law firm or a design studio? Cveetje generates a fitting style per role — color, layout, type — or picks from a collection of editorial templates."}
                </p>
                <div className="showcase__features">
                  <div className="showcase__feat">
                    <span className="showcase__feat-num">01</span>
                    <div className="showcase__feat-text">
                      <strong>{nl ? 'Vijf creativiteits-niveaus' : 'Five creativity levels'}</strong>
                      <span>{nl ? 'Van zakelijk-conservatief tot uitgesproken editorial.' : 'From conservative business to outspoken editorial.'}</span>
                    </div>
                  </div>
                  <div className="showcase__feat">
                    <span className="showcase__feat-num">02</span>
                    <div className="showcase__feat-text">
                      <strong>{nl ? 'Onbeperkt regenereren' : 'Unlimited regenerate'}</strong>
                      <span>{nl ? 'Niet tevreden? Klik opnieuw — andere kleuren, ander grid.' : "Not happy? Click again — new colors, new grid."}</span>
                    </div>
                  </div>
                  <div className="showcase__feat">
                    <span className="showcase__feat-num">03</span>
                    <div className="showcase__feat-text">
                      <strong>{nl ? 'Eigen DOCX-template' : 'Your own DOCX template'}</strong>
                      <span>{nl ? 'Upload je bedrijfssjabloon — Cveetje vult het netjes in.' : 'Upload your company template — Cveetje fills it in neatly.'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <CvShowcaseRotate />
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="hoe" className="land-section" aria-labelledby="how-it-works-heading">
            <div className="brand-container">
              <div className="section-header">
                <span className="section-header__eyebrow">§ {nl ? 'Hoe het werkt' : 'How it works'}</span>
                <h2 id="how-it-works-heading" className="section-header__title">
                  {nl ? <>Drie stappen.<br /><em>Nul gedoe.</em></> : <>Three steps.<br /><em>Zero hassle.</em></>}
                </h2>
                <p className="section-header__sub">
                  {nl ? 'Je hoeft niet meer voor elke vacature je CV bij te schaven in Word. Cveetje doet het zwaardere denkwerk, jij houdt de regie.' :
                       "You no longer need to tweak your CV in Word for every job. Cveetje handles the heavy thinking; you stay in control."}
                </p>
              </div>

              <div className="howit">
                <article className="howit__step">
                  <span className="num-marker">01 · {nl ? 'Stap' : 'Step'}</span>
                  <h3>{nl ? <>Profiel een keer<br />invullen</> : <>Fill in your profile<br />once</>}</h3>
                  <p>{nl ? 'Plak je LinkedIn-link, upload een screenshot of laat een PDF inlezen. Cveetje haalt er een gestructureerd profiel uit dat blijft staan.' :
                         "Paste your LinkedIn URL, upload a screenshot, or drop in a PDF. Cveetje extracts a structured profile that sticks around."}</p>
                  <div className="howit__step-mock">
                    <div className="mock-step1">
                      <div className="mock-step1__url">
                        <Linkedin style={{ color: '#0a66c2', width: 14, height: 14 }} />
                        <span className="mono">linkedin.com/in/</span>
                        <span className="mock-step1__url-text">niels-van-der-werf</span>
                      </div>
                      <div className="mock-step1__row">
                        <div className="mock-step1__chip"><Upload className="h-3.5 w-3.5" />Screenshot</div>
                        <div className="mock-step1__chip"><FileText className="h-3.5 w-3.5" />PDF</div>
                      </div>
                      <div className="mock-step1__chip" style={{ background: 'var(--success-soft)', borderColor: 'color-mix(in oklch, var(--success) 25%, transparent)', color: 'var(--success)' }}>
                        <Check className="h-3.5 w-3.5" />{nl ? 'Profiel opgeslagen' : 'Profile saved'}
                      </div>
                    </div>
                  </div>
                </article>

                <article className="howit__step">
                  <span className="num-marker">02 · {nl ? 'Stap' : 'Step'}</span>
                  <h3>{nl ? <>Plak een<br />vacature</> : <>Paste a<br />job posting</>}</h3>
                  <p>{nl ? 'De AI vist de keywords eruit, weegt eisen mee, schat de match in. Je ziet meteen waar je sterk staat en wat je moet benadrukken.' :
                         "The AI pulls out keywords, weighs requirements, estimates the match. You instantly see where you're strong and what to emphasize."}</p>
                  <div className="howit__step-mock">
                    <div className="mock-step2">
                      <div className="mock-step2__kw">
                        <span>Figma</span><span>Design Systems</span><span>Fintech</span><span>B2B SaaS</span><span>Leadership</span><span>+4</span>
                      </div>
                      <div style={{ height: 10 }} />
                      <div className="mock-step2__match">
                        <span>{nl ? 'Match score' : 'Match score'}</span>
                        <strong>91%</strong>
                      </div>
                      <div className="mock-step2__bar" />
                    </div>
                  </div>
                </article>

                <article className="howit__step">
                  <span className="num-marker">03 · {nl ? 'Stap' : 'Step'}</span>
                  <h3>{nl ? <>Download je<br />CV op maat</> : <>Download your<br />tailored CV</>}</h3>
                  <p>{nl ? 'Kies een stijl die past bij de branche. PDF voor de sollicitatie, DOCX om handmatig bij te schaven, motivatiebrief als bonus.' :
                         "Pick a style that fits the industry. PDF for applying, DOCX to tweak by hand, motivation letter on the side."}</p>
                  <div className="howit__step-mock">
                    <div className="mock-step3">
                      <div className="mock-step3__doc">
                        <div className="mock-step3__doc-line" />
                        <div className="mock-step3__doc-line" />
                        <div className="mock-step3__doc-line" style={{ width: '70%' }} />
                        <div className="mock-step3__doc-line" />
                        <div className="mock-step3__doc-line" style={{ width: '50%' }} />
                        <div className="mock-step3__doc-line" />
                        <div className="mock-step3__doc-line" style={{ width: '60%' }} />
                      </div>
                      <div className="mock-step3__formats">
                        <span>PDF</span><span>DOCX</span><span>+ {nl ? 'Brief' : 'Letter'}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* FEATURES */}
          <section id="features" className="land-section land-section--alt" aria-labelledby="features-heading">
            <div className="brand-container">
              <div className="section-header">
                <span className="section-header__eyebrow">§ Features</span>
                <h2 id="features-heading" className="section-header__title">
                  {nl ? <>Alles wat je nodig hebt.<br /><em>Niets meer.</em></> : <>Everything you need.<br /><em>Nothing more.</em></>}
                </h2>
                <p className="section-header__sub">
                  {nl ? 'Een tool waar je écht naar terugkomt: niet één keer een CV maken, maar de hele sollicitatieflow ondersteunen.' :
                       'A tool you actually come back to: not a one-off CV builder, but support for the whole application flow.'}
                </p>
              </div>

              <div className="features-wall">
                <div className="feat-card feat-card--lead">
                  <span className="brand-badge brand-badge--accent">{nl ? 'Hoofdfeature' : 'Headline feature'}</span>
                  <div className="feat-card__icon"><Target className="h-5 w-5" /></div>
                  <h3>{nl ? <>Je CV past zich aan<br />élke vacature aan.</> : <>Your CV adapts to<br />every job posting.</>}</h3>
                  <p>{nl ? 'Keywords uit de vacature komen netjes terug in je profiel, relevante ervaring schuift naar boven, irrelevant werk schuift naar de achtergrond. Geen verzinsels — alleen herordening en framing.' :
                         "Keywords from the job land naturally in your profile, relevant experience rises to the top, irrelevant work fades. No fabrication — just reordering and framing."}</p>
                  <ul className="feat-card__list">
                    <li><Check className="h-4 w-4" />{nl ? 'Keyword-matching die ATS-systemen begrijpen' : 'Keyword matching that ATS systems understand'}</li>
                    <li><Check className="h-4 w-4" />{nl ? 'Ervaring herordend naar relevantie' : 'Experience reordered by relevance'}</li>
                    <li><Check className="h-4 w-4" />{nl ? 'Skills automatisch aangevuld op basis van rol' : 'Skills auto-rounded by role'}</li>
                    <li><Check className="h-4 w-4" />{nl ? 'Eerlijkheidsregels — geen fabricage' : 'Honesty rules — no fabrication'}</li>
                  </ul>
                </div>

                <div className="feat-card feat-card--md">
                  <div className="feat-card__icon"><Users className="h-5 w-5" /></div>
                  <h3>{nl ? 'Meerdere profielen' : 'Multiple profiles'}</h3>
                  <p>{nl ? 'Jouw consultancy-profiel, je freelance-profiel, je side-project profiel — bewaar ze los en pak de juiste voor de klus.' :
                         "Your consultancy profile, freelance profile, side-project profile — keep them separate, grab the right one for the gig."}</p>
                  <ul className="feat-card__list">
                    <li><Check className="h-4 w-4" />LinkedIn {nl ? 'import' : 'import'}</li>
                    <li><Check className="h-4 w-4" />{nl ? 'Screenshots & PDF' : 'Screenshots & PDF'}</li>
                    <li><Check className="h-4 w-4" />{nl ? 'Profielfoto onthouden' : 'Profile photo remembered'}</li>
                  </ul>
                </div>

                <div className="feat-card feat-card--sm">
                  <div className="feat-card__icon"><Send className="h-5 w-5" /></div>
                  <h3>{nl ? 'Motivatiebrief erbij' : 'Motivation letter'}</h3>
                  <p>{nl ? 'Past bij je CV én de vacature. Humanizer-pass haalt AI-tells eruit.' : 'Matches your CV and the job. A humanizer pass removes AI tells.'}</p>
                </div>

                <div className="feat-card feat-card--sm">
                  <div className="feat-card__icon"><Briefcase className="h-5 w-5" /></div>
                  <h3>{nl ? 'Vacaturebank' : 'Jobs board'}</h3>
                  <p>{nl ? '4 ATS-providers in één feed. 1-klik solliciteren waar het kan.' : '4 ATS providers in one feed. 1-click apply where possible.'}</p>
                </div>

                <div className="feat-card feat-card--sm">
                  <div className="feat-card__icon"><Edit3 className="h-5 w-5" /></div>
                  <h3>{nl ? 'Live preview-editor' : 'Live preview editor'}</h3>
                  <p>{nl ? 'Klik op een zin, pas hem aan, zie het meteen — chat-edit via AI.' : 'Click a sentence, tweak it, see it instantly — chat-edit via AI.'}</p>
                </div>

                <div className="feat-card feat-card--md">
                  <div className="feat-card__icon"><Shield className="h-5 w-5" /></div>
                  <h3>{nl ? 'Jouw data, jouw keuze' : 'Your data, your call'}</h3>
                  <p>{nl ? 'Eigen API-key (encrypted), platform credits, of mengvorm. Geen lock-in, geen Big Tech-traceer.' :
                         "Your own API key (encrypted), platform credits, or a mix. No lock-in, no Big Tech tracing."}</p>
                  <ul className="feat-card__list">
                    <li><Check className="h-4 w-4" />AES-256 {nl ? 'encryptie' : 'encryption'}</li>
                    <li><Check className="h-4 w-4" />{nl ? '9 AI-providers ondersteund' : '9 AI providers supported'}</li>
                    <li><Check className="h-4 w-4" />{nl ? 'Volledige transparantie in credit-gebruik' : 'Full transparency in credit use'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* AI MODES */}
          <section className="land-section land-section--paper-deep" aria-labelledby="ai-modes-heading">
            <div className="brand-container">
              <div className="section-header" style={{ marginInline: 'auto', textAlign: 'center', alignItems: 'center' }}>
                <span className="section-header__eyebrow">§ AI-modes</span>
                <h2 id="ai-modes-heading" className="section-header__title" style={{ textAlign: 'center' }}>
                  {nl ? <>Twee paden.<br /><em>Allebei eerlijk.</em></> : <>Two paths.<br /><em>Both honest.</em></>}
                </h2>
                <p className="section-header__sub" style={{ textAlign: 'center' }}>
                  {nl ? 'Het platform draait op Claude Opus voor topkwaliteit, óf je gebruikt je eigen API-key bij een provider naar keuze. Je betaalt nooit voor iets dat je niet gebruikt.' :
                       "The platform runs on Claude Opus for top quality, or use your own API key at the provider of your choice. You never pay for what you don't use."}
                </p>
              </div>

              <div className="ai-modes">
                <div className="ai-mode">
                  <span className="brand-badge brand-badge--primary">Platform AI</span>
                  <h3>{nl ? 'Klaar om te gebruiken' : 'Ready to use'}</h3>
                  <div className="ai-mode__price">
                    <strong>1 credit</strong> {nl ? 'per AI-stap' : 'per AI step'}
                  </div>
                  <ul className="feat-card__list">
                    <li><Check className="h-4 w-4" />Claude Opus — {nl ? 'top-kwaliteit' : 'top quality'}</li>
                    <li><Check className="h-4 w-4" />{nl ? '5 gratis credits per maand' : '5 free credits per month'}</li>
                    <li><Check className="h-4 w-4" />{nl ? 'Geen API-key setup' : 'No API-key setup'}</li>
                    <li><Check className="h-4 w-4" />{nl ? 'Direct beginnen' : 'Start immediately'}</li>
                  </ul>
                  <Link href="/register" className="brand-btn brand-btn--outline brand-btn--block">
                    {nl ? 'Probeer platform mode' : 'Try platform mode'}
                  </Link>
                </div>

                <div className="ai-mode ai-mode--byo">
                  <span className="brand-badge brand-badge--accent">{nl ? 'Bring your own' : 'Bring your own'}</span>
                  <h3>{nl ? 'Eigen API-key' : 'Your own API key'}</h3>
                  <div className="ai-mode__price">
                    <strong>€ 0</strong> {nl ? 'per AI-stap, je betaalt provider direct' : 'per AI step, you pay your provider directly'}
                  </div>
                  <ul className="feat-card__list">
                    <li><Check className="h-4 w-4" />9 {nl ? 'providers' : 'providers'}: OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek, …</li>
                    <li><Check className="h-4 w-4" />{nl ? 'Geen credits voor AI-stappen' : 'No credits for AI steps'}</li>
                    <li><Check className="h-4 w-4" />{nl ? '1 credit alleen bij PDF download' : '1 credit only at PDF download'}</li>
                    <li><Check className="h-4 w-4" />{nl ? 'Volledige controle over kosten' : 'Full control over costs'}</li>
                  </ul>
                  <Link href="/settings" className="brand-btn brand-btn--accent brand-btn--block">
                    {nl ? 'Verbind je API-key' : 'Connect your API key'}
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section id="prijzen" className="land-section" aria-labelledby="pricing-heading">
            <div className="brand-container">
              <div className="section-header" style={{ marginInline: 'auto', textAlign: 'center', alignItems: 'center' }}>
                <span className="section-header__eyebrow">§ {nl ? 'Prijzen' : 'Pricing'}</span>
                <h2 id="pricing-heading" className="section-header__title" style={{ textAlign: 'center' }}>
                  {nl ? <>Eerlijk geprijsd.<br /><em>Geen abonnement.</em></> : <>Fairly priced.<br /><em>No subscription.</em></>}
                </h2>
                <p className="section-header__sub" style={{ textAlign: 'center' }}>
                  {nl ? 'Credits vervallen niet. Geen verborgen kosten. Geen "neem contact op met sales" tier.' : "Credits don't expire. No hidden fees. No 'contact sales' tier."}
                </p>
              </div>

              <div className="pricing-grid">
                {[
                  { title: t('pricing.free.title'), price: t('pricing.free.amount'), per: t('pricing.free.unit'), list: [t('pricing.free.cvDownloads'), t('pricing.free.jobTargeting'), t('pricing.free.motivationLetters'), t('pricing.free.unlimitedProfiles')], cta: t('pricing.free.cta'), variant: 'outline' as const },
                  { title: t('pricing.pack5.title'), price: t('pricing.pack5.price'), per: t('pricing.pack5.perDownload'), list: [t('pricing.pack5.neverExpire')], cta: t('pricing.pack5.cta'), variant: 'outline' as const },
                  { title: t('pricing.pack15.title'), price: t('pricing.pack15.price'), per: t('pricing.pack15.perDownload'), list: [t('pricing.pack15.save')], cta: t('pricing.pack15.cta'), variant: 'primary' as const, feat: true, badge: t('pricing.pack15.badge') },
                  { title: t('pricing.pack30.title'), price: t('pricing.pack30.price'), per: t('pricing.pack30.perDownload'), list: [t('pricing.pack30.save')], cta: t('pricing.pack30.cta'), variant: 'outline' as const },
                ].map((tier) => (
                  <div key={tier.title} className={`price-card${tier.feat ? ' price-card--feat' : ''}`}>
                    <div className="price-card__header">
                      <h3 className="price-card__title">{tier.title}</h3>
                      {tier.badge && <span className="brand-badge brand-badge--accent">{tier.badge}</span>}
                    </div>
                    <div>
                      <div className="price-card__price">{tier.price}</div>
                      <div className="price-card__per">{tier.per}</div>
                    </div>
                    <ul className="price-card__list">
                      {tier.list.map((it) => <li key={it}><Check className="h-4 w-4" />{it}</li>)}
                    </ul>
                    <div className="price-card__cta">
                      <Link
                        href="/register"
                        className={`brand-btn brand-btn--block ${tier.variant === 'primary' ? 'brand-btn--primary' : 'brand-btn--outline'}`}
                      >
                        {tier.cta}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ textAlign: 'center', marginTop: 32, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {t('pricing.paymentMethods')}
              </p>
            </div>
          </section>

          {/* BIG CTA */}
          <section className="cta-big" aria-labelledby="cta-heading">
            <div className="brand-container cta-big__inner">
              <h2 id="cta-heading" className="cta-big__title">
                {nl ? <>Stop met je CV<br />elke keer <em>opnieuw</em> typen.</> : <>Stop retyping your<br /><em>whole</em> CV every time.</>}
              </h2>
              <p className="cta-big__sub">
                {nl ? 'Maak in twee minuten een CV dat past bij de vacature. Eerste vijf gratis, geen creditcard nodig.' :
                     "Build a CV that fits the job in two minutes. First five free, no credit card needed."}
              </p>
              <div className="cta-big__cta">
                <Link href="/register" className="brand-btn brand-btn--lg" style={{ background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--paper)' }}>
                  {t('ctaStart')} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/jobs" className="brand-btn brand-btn--lg" style={{ color: 'var(--paper)', border: '1px solid color-mix(in oklch, var(--paper) 30%, transparent)' }}>
                  {nl ? 'Bekijk vacatures' : 'Browse jobs'}
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="foot" role="contentinfo">
          <div className="brand-container">
            <div className="foot__top">
              <div className="foot__brand">
                <Logo size="md" />
                <p>{nl ? 'Een CV op maat voor élke vacature. Gemaakt in Nederland, jouw data blijft bij Firebase in Europa.' :
                         "A CV tailored to every job. Built in the Netherlands; your data stays on Firebase in Europe."}</p>
              </div>
              <div className="foot__col">
                <h4>Product</h4>
                <a href="#hoe">{nl ? 'Hoe het werkt' : 'How it works'}</a>
                <a href="#stijlen">{nl ? 'Stijlen' : 'Styles'}</a>
                <Link href="/jobs">{nl ? 'Vacatures' : 'Jobs'}</Link>
                <a href="#prijzen">{nl ? 'Prijzen' : 'Pricing'}</a>
              </div>
              <div className="foot__col">
                <h4>Resources</h4>
                <Link href="/ai-transparency">{nl ? 'AI transparantie' : 'AI transparency'}</Link>
                <a href="#features">Features</a>
              </div>
              <div className="foot__col">
                <h4>{nl ? 'Juridisch' : 'Legal'}</h4>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">{nl ? 'Voorwaarden' : 'Terms'}</Link>
              </div>
            </div>
            <div className="foot__bottom">
              <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
              <span>maakcveetje.nl</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
