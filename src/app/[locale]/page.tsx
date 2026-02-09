import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import {
  Sparkles,
  Zap,
  Shield,
  CreditCard,
  ArrowRight,
  Check,
  User,
  Target,
  Download,
  Mail,
  Save,
  Eye,
  Linkedin,
  Upload,
  Key,
  Cpu,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
import { WebsiteStructuredData, FAQStructuredData, OrganizationStructuredData } from '@/components/seo/structured-data';
import { CVShowcase, ProfileSelectionMockup, JobAnalysisMockup, StyleGeneratorMockup, LinkedInExportMockup } from '@/components/landing/cv-showcase';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: locale === 'nl' ? [
      'CV maken',
      'CV op maat',
      'CV aanpassen vacature',
      'AI CV generator',
      'LinkedIn CV',
      'professioneel CV',
      'sollicitatie automatiseren',
      'CV targeting',
      'ATS CV',
      'gratis CV maker',
      'motivatiebrief generator',
    ] : [
      'CV builder',
      'resume builder',
      'AI CV',
      'LinkedIn CV',
      'professional CV',
      'CV generator',
      'job application',
      'CV targeting',
      'ATS CV',
      'free CV maker',
      'cover letter generator',
    ],
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'nl': '/nl',
        'en': '/en',
      },
    },
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');

  return (
    <>
      <WebsiteStructuredData />
      <FAQStructuredData />
      <OrganizationStructuredData />
      <div className="min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          {locale === 'nl' ? 'Ga naar hoofdinhoud' : 'Skip to main content'}
        </a>

        {/* Header */}
        <header role="banner" className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-full overflow-x-hidden">
            <Link href="/" className="flex-shrink-0">
              <Logo size="sm" />
            </Link>
            <nav aria-label={locale === 'nl' ? 'Hoofdnavigatie' : 'Main navigation'} className="flex items-center gap-1 sm:gap-2">
              <ThemeSwitcher />
              <LanguageSwitcher />
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">{locale === 'nl' ? 'Inloggen' : 'Sign In'}</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="text-xs sm:text-sm whitespace-nowrap">{t('ctaStart')}</Button>
              </Link>
            </nav>
          </div>
        </header>

        <main id="main-content" className="flex-1">
          {/* Hero Section */}
          <section aria-labelledby="hero-heading" className="py-20 md:py-32 bg-gradient-to-b from-primary/5 to-background">
            <div className="container mx-auto px-4 text-center">
              <Badge className="mb-4" variant="secondary">
                <Target className="mr-1 h-3 w-3" />
                {t('heroBadge')}
              </Badge>
              <h1 id="hero-heading" className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                {t('heroTitle')}
                <br />
                <span className="text-primary">{t('heroTitleHighlight')}</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                {t('heroDescription')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    {t('ctaStart')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#hoe-het-werkt">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    {t('ctaHowItWorks')}
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {t('freeNote')}
              </p>
            </div>
          </section>

          {/* Value Props */}
          <section className="py-12 border-b">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Save className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{t('valueProps.enterOnce')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('valueProps.enterOnceDesc')}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{t('valueProps.autoFit')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('valueProps.autoFitDesc')}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{t('valueProps.readyInMinutes')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('valueProps.readyInMinutesDesc')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="hoe-het-werkt" aria-labelledby="how-it-works-heading" className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 id="how-it-works-heading" className="text-3xl font-bold mb-4">{t('howItWorks.title')}</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  {t('howItWorks.subtitle')}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">{t('howItWorks.step1Label')}</div>
                  <h3 className="font-semibold mb-2">{t('howItWorks.step1Title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('howItWorks.step1Desc')}
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">{t('howItWorks.step2Label')}</div>
                  <h3 className="font-semibold mb-2">{t('howItWorks.step2Title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('howItWorks.step2Desc')}
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Download className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">{t('howItWorks.step3Label')}</div>
                  <h3 className="font-semibold mb-2">{t('howItWorks.step3Title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('howItWorks.step3Desc')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CV Preview Showcase */}
          <section aria-labelledby="preview-heading" className="py-20 bg-accent/30 overflow-hidden">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <Badge className="mb-4" variant="secondary">
                    {t('preview.badge')}
                  </Badge>
                  <h2 id="preview-heading" className="text-3xl font-bold mb-4">
                    {t('preview.title')}
                    <br />
                    <span className="text-primary">{t('preview.titleHighlight')}</span>
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t('preview.description')}
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('preview.keywordsProcessed')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('preview.experiencePrioritized')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('preview.industryStyle')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('preview.readyDownload')}</span>
                    </li>
                  </ul>
                </div>
                <div className="lg:pl-8">
                  <CVShowcase />
                </div>
              </div>
            </div>
          </section>

          {/* Profile Selection Feature */}
          <section aria-labelledby="profiles-heading" className="py-20">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="order-2 lg:order-1 lg:pr-8">
                  <ProfileSelectionMockup />
                </div>
                <div className="order-1 lg:order-2">
                  <Badge className="mb-4" variant="secondary">
                    {t('profiles.badge')}
                  </Badge>
                  <h2 id="profiles-heading" className="text-3xl font-bold mb-4">
                    {t('profiles.title')}
                    <br />
                    <span className="text-primary">{t('profiles.titleHighlight')}</span>
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t('profiles.description')}
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('profiles.multipleProfiles')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('profiles.uploadOptions')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('profiles.photoSaved')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('profiles.quickSwitch')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Job Analysis Feature */}
          <section aria-labelledby="job-analysis-heading" className="py-20 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <Badge className="mb-4" variant="secondary">
                    {t('jobAnalysis.badge')}
                  </Badge>
                  <h2 id="job-analysis-heading" className="text-3xl font-bold mb-4">
                    {t('jobAnalysis.title')}
                    <br />
                    <span className="text-primary">{t('jobAnalysis.titleHighlight')}</span>
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t('jobAnalysis.description')}
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('jobAnalysis.keywordExtraction')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('jobAnalysis.requirementsOverview')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('jobAnalysis.salaryEstimate')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('jobAnalysis.marketInsights')}</span>
                    </li>
                  </ul>
                </div>
                <div className="lg:pl-8">
                  <JobAnalysisMockup />
                </div>
              </div>
            </div>
          </section>

          {/* Style Generator Feature */}
          <section aria-labelledby="style-generator-heading" className="py-20">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="order-2 lg:order-1 lg:pr-8">
                  <StyleGeneratorMockup />
                </div>
                <div className="order-1 lg:order-2">
                  <Badge className="mb-4" variant="secondary">
                    {t('styleGenerator.badge')}
                  </Badge>
                  <h2 id="style-generator-heading" className="text-3xl font-bold mb-4">
                    {t('styleGenerator.title')}
                    <br />
                    <span className="text-primary">{t('styleGenerator.titleHighlight')}</span>
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t('styleGenerator.description')}
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('styleGenerator.creativityLevels')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('styleGenerator.industryFit')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('styleGenerator.unlimitedRegenerate')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('styleGenerator.adjustColors')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* LinkedIn Export Feature */}
          <section aria-labelledby="linkedin-export-heading" className="py-20 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <Badge className="mb-4" variant="secondary">
                    <Linkedin className="mr-1 h-3 w-3" />
                    {t('linkedInExport.badge')}
                  </Badge>
                  <h2 id="linkedin-export-heading" className="text-3xl font-bold mb-4">
                    {t('linkedInExport.title')}
                    <br />
                    <span className="text-primary">{t('linkedInExport.titleHighlight')}</span>
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t('linkedInExport.description')}
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('linkedInExport.headline')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('linkedInExport.about')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('linkedInExport.experience')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{t('linkedInExport.tips')}</span>
                    </li>
                  </ul>
                </div>
                <div className="lg:pl-8">
                  <LinkedInExportMockup />
                </div>
              </div>
            </div>
          </section>

          {/* Key Features */}
          <section aria-labelledby="features-heading" className="py-20 bg-accent/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 id="features-heading" className="text-3xl font-bold mb-4">{t('features.title')}</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  {t('features.subtitle')}
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Auto Fit - Main Feature */}
                <Card className="border-2 border-primary hover:border-primary transition-colors">
                  <CardHeader>
                    <Badge className="w-fit mb-2">{t('features.mainFeatureBadge')}</Badge>
                    <Target className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>{t('features.autoFit.title')}</CardTitle>
                    <CardDescription>{t('features.autoFit.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.autoFit.keywords')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.autoFit.experience')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.autoFit.skills')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.autoFit.ats')}
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Profiles */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Save className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>{t('features.profiles.title')}</CardTitle>
                    <CardDescription>{t('features.profiles.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        {t('features.profiles.linkedin')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary flex-shrink-0" />
                        {t('features.profiles.screenshots')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.profiles.multipleProfiles')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.profiles.photo')}
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Motivation Letter */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Mail className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>{t('features.motivationLetter.title')}</CardTitle>
                    <CardDescription>{t('features.motivationLetter.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.motivationLetter.matchesCv')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.motivationLetter.addOwn')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.motivationLetter.downloadFormats')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.motivationLetter.extraCredit')}
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Eye className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>{t('features.preview.title')}</CardTitle>
                    <CardDescription>{t('features.preview.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.preview.livePreview')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.preview.clickToEdit')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.preview.adjustColors')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.preview.wysiwyg')}
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Styling */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Sparkles className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>{t('features.styling.title')}</CardTitle>
                    <CardDescription>{t('features.styling.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.styling.aiColors')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.styling.multipleLayouts')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.styling.photoSupport')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.styling.unlimitedStyles')}
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* API Key / AI Modes */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Shield className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>{t('features.apiKey.title')}</CardTitle>
                    <CardDescription>{t('features.apiKey.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary flex-shrink-0" />
                        {t('features.apiKey.platformAI')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary flex-shrink-0" />
                        {t('features.apiKey.ownKey')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.apiKey.encrypted')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.apiKey.transparent')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('features.apiKey.fullControl')}
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-20 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-90" />
                  <p className="text-4xl font-bold mb-2">{t('stats.timeSaved')}</p>
                  <p className="opacity-90">{t('stats.timeSavedLabel')}</p>
                </div>
                <div>
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-90" />
                  <p className="text-4xl font-bold mb-2">{t('stats.fitPercentage')}</p>
                  <p className="opacity-90">{t('stats.fitPercentageLabel')}</p>
                </div>
                <div>
                  <Save className="h-12 w-12 mx-auto mb-4 opacity-90" />
                  <p className="text-4xl font-bold mb-2">{t('stats.enterOnce')}</p>
                  <p className="opacity-90">{t('stats.enterOnceLabel')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* AI Modes Comparison */}
          <section aria-labelledby="ai-modes-heading" className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 id="ai-modes-heading" className="text-3xl font-bold mb-4">{t('aiModes.title')}</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  {t('aiModes.subtitle')}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
                {/* Platform AI */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Badge className="w-fit" variant="secondary">
                      <Cpu className="mr-1 h-3 w-3" />
                      {t('aiModes.platform.badge')}
                    </Badge>
                    <CardTitle className="text-xl">{t('aiModes.platform.title')}</CardTitle>
                    <CardDescription>{t('aiModes.platform.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                        {t('aiModes.platform.model')}
                      </li>
                      <li className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary flex-shrink-0" />
                        {t('aiModes.platform.creditCost')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('aiModes.platform.noSetup')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('aiModes.platform.freeCredits')}
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-4 italic">
                      {t('aiModes.platform.idealFor')}
                    </p>
                  </CardContent>
                </Card>

                {/* Own API Key */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Badge className="w-fit" variant="secondary">
                      <Key className="mr-1 h-3 w-3" />
                      {t('aiModes.ownKey.badge')}
                    </Badge>
                    <CardTitle className="text-xl">{t('aiModes.ownKey.title')}</CardTitle>
                    <CardDescription>{t('aiModes.ownKey.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('aiModes.ownKey.providers')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('aiModes.ownKey.noCreditCost')}
                      </li>
                      <li className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary flex-shrink-0" />
                        {t('aiModes.ownKey.onlyPdf')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {t('aiModes.ownKey.transparent')}
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-4 italic">
                      {t('aiModes.ownKey.idealFor')}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison Table */}
              <div className="max-w-2xl mx-auto">
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium">{t('aiModes.comparison.action')}</th>
                        <th className="text-center py-3 px-4 font-medium">{t('aiModes.comparison.platform')}</th>
                        <th className="text-center py-3 px-4 font-medium">{t('aiModes.comparison.ownKey')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['profileParse', 'jobParse', 'fitAnalysis', 'styleGenerate', 'cvGenerate'] as const).map((action) => (
                        <tr key={action} className="border-b">
                          <td className="py-2.5 px-4">{t(`aiModes.comparison.${action}`)}</td>
                          <td className="py-2.5 px-4 text-center">{t('aiModes.comparison.credit', { n: 1 })}</td>
                          <td className="py-2.5 px-4 text-center text-green-600 font-medium">{t('aiModes.comparison.free')}</td>
                        </tr>
                      ))}
                      <tr className="border-b">
                        <td className="py-2.5 px-4">{t('aiModes.comparison.pdfDownload')}</td>
                        <td className="py-2.5 px-4 text-center">{t('aiModes.comparison.credit', { n: 1 })}</td>
                        <td className="py-2.5 px-4 text-center">{t('aiModes.comparison.credit', { n: 1 })}</td>
                      </tr>
                      <tr className="bg-muted/50 font-medium">
                        <td className="py-2.5 px-4">{t('aiModes.comparison.total')}</td>
                        <td className="py-2.5 px-4 text-center">{t('aiModes.comparison.credit', { n: 6 })}</td>
                        <td className="py-2.5 px-4 text-center">{t('aiModes.comparison.credit', { n: 1 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section aria-labelledby="pricing-heading" className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 id="pricing-heading" className="text-3xl font-bold mb-4">{t('pricing.title')}</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  {t('pricing.subtitle')}
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {/* Free Tier */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('pricing.free.title')}</CardTitle>
                    <CardDescription>{t('pricing.free.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold mb-2">{t('pricing.free.amount')}</p>
                    <p className="text-muted-foreground mb-4">{t('pricing.free.unit')}</p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {t('pricing.free.cvDownloads')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {t('pricing.free.jobTargeting')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {t('pricing.free.motivationLetters')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {t('pricing.free.unlimitedProfiles')}
                      </li>
                    </ul>
                    <Link href="/register">
                      <Button variant="outline" className="w-full">
                        {t('pricing.free.cta')}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* 5 Credits */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('pricing.pack5.title')}</CardTitle>
                    <CardDescription>{t('pricing.pack5.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold mb-2">{t('pricing.pack5.price')}</p>
                    <p className="text-muted-foreground mb-4">{t('pricing.pack5.perDownload')}</p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {t('pricing.pack5.neverExpire')}
                      </li>
                    </ul>
                    <Link href="/register">
                      <Button variant="outline" className="w-full">
                        {t('pricing.pack5.cta')}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* 15 Credits - Popular */}
                <Card className="border-primary border-2 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>{t('pricing.pack15.badge')}</Badge>
                  </div>
                  <CardHeader>
                    <CardTitle>{t('pricing.pack15.title')}</CardTitle>
                    <CardDescription>{t('pricing.pack15.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold mb-2">{t('pricing.pack15.price')}</p>
                    <p className="text-muted-foreground mb-4">{t('pricing.pack15.perDownload')}</p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {t('pricing.pack15.save')}
                      </li>
                    </ul>
                    <Link href="/register">
                      <Button className="w-full">{t('pricing.pack15.cta')}</Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* 30 Credits */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('pricing.pack30.title')}</CardTitle>
                    <CardDescription>{t('pricing.pack30.description')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold mb-2">{t('pricing.pack30.price')}</p>
                    <p className="text-muted-foreground mb-4">{t('pricing.pack30.perDownload')}</p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {t('pricing.pack30.save')}
                      </li>
                    </ul>
                    <Link href="/register">
                      <Button variant="outline" className="w-full">
                        {t('pricing.pack30.cta')}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-8">
                <CreditCard className="inline h-4 w-4 mr-1" />
                {t('pricing.paymentMethods')}
              </p>
            </div>
          </section>

          {/* CTA */}
          <section aria-labelledby="cta-heading" className="py-20 bg-accent/30">
            <div className="container mx-auto px-4 text-center">
              <h2 id="cta-heading" className="text-3xl font-bold mb-4">
                {t('cta.title')}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                {t('cta.description')}
              </p>
              <Link href="/register">
                <Button size="lg">
                  {t('cta.button')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer role="contentinfo" className="border-t py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <Logo size="sm" />
              <p className="text-sm text-muted-foreground">
                {t('footer.copyright', { year: new Date().getFullYear() })}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Link href="/privacy" className="hover:text-foreground">
                  {t('footer.privacy')}
                </Link>
                <Link href="/terms" className="hover:text-foreground">
                  {t('footer.terms')}
                </Link>
                <Link href="/ai-transparency" className="hover:text-foreground">
                  {t('footer.aiTransparency')}
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
