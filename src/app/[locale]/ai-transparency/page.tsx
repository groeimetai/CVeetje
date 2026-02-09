import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BreadcrumbStructuredData } from '@/components/seo/structured-data';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.aiTransparency' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/ai-transparency`,
      languages: {
        'nl': '/nl/ai-transparency',
        'en': '/en/ai-transparency',
      },
    },
  };
}

// Helper component for rendering content with line breaks
function FormattedContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {content.split('\n\n').map((paragraph, idx) => (
        <p key={idx} className="mb-4 text-muted-foreground leading-relaxed whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export default async function AITransparencyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('aiTransparency');

  // Format date based on locale
  const lastUpdatedDate = new Date('2026-02-09').toLocaleDateString(
    locale === 'nl' ? 'nl-NL' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const sections = [
    'whatAiDoes',
    'whatAiDoesNot',
    'models',
    'dataFlow',
    'userResponsibility',
    'fitAnalysis',
    'classification',
    'rights',
    'contact',
  ] as const;

  return (
    <>
    <BreadcrumbStructuredData items={[
      { name: 'Home', url: `/${locale}` },
      { name: t('title'), url: `/${locale}/ai-transparency` },
    ]} />
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Link */}
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {locale === 'nl' ? 'Terug naar home' : 'Back to home'}
          </Link>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('title')}</h1>
            <p className="text-muted-foreground">{t('lastUpdated', { date: lastUpdatedDate })}</p>
          </div>

          {/* Intro */}
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">{t('intro')}</p>
            </CardContent>
          </Card>

          {/* Table of Contents */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-4">{locale === 'nl' ? 'Inhoudsopgave' : 'Table of Contents'}</h2>
              <nav>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  {sections.map((section) => (
                    <li key={section}>
                      <a
                        href={`#${section}`}
                        className="text-muted-foreground hover:text-primary hover:underline"
                      >
                        {t(`sections.${section}.title`).replace(/^\d+\.\s*/, '')}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </CardContent>
          </Card>

          {/* Sections */}
          <div className="space-y-12">
            {sections.map((sectionKey) => (
              <section key={sectionKey} id={sectionKey} className="scroll-mt-24">
                <h2 className="text-xl font-semibold mb-4">
                  {t(`sections.${sectionKey}.title`)}
                </h2>

                {/* Handle dataFlow section with subsections */}
                {sectionKey === 'dataFlow' && (
                  <>
                    <h3 className="text-lg font-medium mt-6 mb-3">{t('sections.dataFlow.subtitle1')}</h3>
                    <FormattedContent content={t('sections.dataFlow.content1')} />

                    <h3 className="text-lg font-medium mt-6 mb-3">{t('sections.dataFlow.subtitle2')}</h3>
                    <FormattedContent content={t('sections.dataFlow.content2')} />
                  </>
                )}

                {/* Regular sections with single content */}
                {sectionKey !== 'dataFlow' && (
                  <FormattedContent content={t(`sections.${sectionKey}.content`)} />
                )}

                {sectionKey !== sections[sections.length - 1] && (
                  <Separator className="mt-8" />
                )}
              </section>
            ))}
          </div>

          {/* Related Links */}
          <Card className="mt-12">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-4">
                {locale === 'nl' ? 'Gerelateerde pagina\'s' : 'Related pages'}
              </h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/privacy">
                  <Button variant="outline" size="sm">
                    {locale === 'nl' ? 'Privacybeleid' : 'Privacy Policy'}
                  </Button>
                </Link>
                <Link href="/terms">
                  <Button variant="outline" size="sm">
                    {locale === 'nl' ? 'Algemene Voorwaarden' : 'Terms of Service'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-4">
              {locale === 'nl'
                ? 'Heb je vragen over ons AI-gebruik?'
                : 'Have questions about our AI usage?'}
            </p>
            <Link href="mailto:info@groeimetai.io">
              <Button variant="outline">
                {locale === 'nl' ? 'Neem contact op' : 'Contact us'}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} CVeetje
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                {locale === 'nl' ? 'Privacy' : 'Privacy'}
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                {locale === 'nl' ? 'Voorwaarden' : 'Terms'}
              </Link>
              <Link href="/ai-transparency" className="hover:text-foreground font-medium text-foreground">
                {locale === 'nl' ? 'AI Transparantie' : 'AI Transparency'}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
