import Link from 'next/link';
import type { Metadata } from 'next';
import {
  FileText,
  Sparkles,
  Zap,
  Shield,
  CreditCard,
  ArrowRight,
  Check,
  User,
  Target,
  Download,
  Palette,
  Mail,
  Save,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WebsiteStructuredData, FAQStructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'CVeetje - Maak Professionele CVs met AI | LinkedIn naar CV in Minuten',
  description: 'Transformeer je LinkedIn profiel naar een professioneel CV met AI. CVeetje analyseert vacatures en optimaliseert je CV automatisch. Start gratis met 5 credits per maand.',
  keywords: [
    'CV maken',
    'CV builder',
    'AI CV generator',
    'LinkedIn CV',
    'professioneel CV',
    'CV template',
    'sollicitatie',
    'resume builder',
    'Nederlands CV',
    'gratis CV maker',
    'motivatiebrief generator',
    'sollicitatiebrief',
  ],
  alternates: {
    canonical: '/',
  },
};

export default function LandingPage() {
  return (
    <>
      <WebsiteStructuredData />
      <FAQStructuredData />
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">CVeetje</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Inloggen</Button>
              </Link>
              <Link href="/register">
                <Button>Aan de slag</Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-20 md:py-32 bg-gradient-to-b from-primary/5 to-background">
            <div className="container mx-auto px-4 text-center">
              <Badge className="mb-4" variant="secondary">
                <Sparkles className="mr-1 h-3 w-3" />
                AI-Powered CV & Motivatiebrief Generator
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Jouw Perfecte CV
                <br />
                <span className="text-primary">in Minuten</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Transformeer je LinkedIn profiel naar een professioneel CV én motivatiebrief.
                Onze AI analyseert vacatures en optimaliseert je sollicitatie om op te vallen.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Gratis Starten
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#hoe-het-werkt">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Bekijk Hoe Het Werkt
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                5 gratis downloads per maand. Geen creditcard nodig.
              </p>
            </div>
          </section>

          {/* How It Works */}
          <section id="hoe-het-werkt" className="py-20 bg-accent/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Hoe Het Werkt</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Maak een professioneel CV in slechts 5 simpele stappen
                </p>
              </div>

              <div className="grid md:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">Stap 1</div>
                  <h3 className="font-semibold mb-2">Voer Profiel In</h3>
                  <p className="text-sm text-muted-foreground">
                    Plak je LinkedIn tekst of upload screenshots
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Target className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">Stap 2</div>
                  <h3 className="font-semibold mb-2">Voeg Vacature Toe</h3>
                  <p className="text-sm text-muted-foreground">
                    Plak de vacaturetekst om je CV te targeten
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Palette className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">Stap 3</div>
                  <h3 className="font-semibold mb-2">Kies Je Stijl</h3>
                  <p className="text-sm text-muted-foreground">
                    AI genereert een unieke stijl voor jouw industrie
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">Stap 4</div>
                  <h3 className="font-semibold mb-2">AI Genereert</h3>
                  <p className="text-sm text-muted-foreground">
                    Je CV wordt gegenereerd en geoptimaliseerd
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Download className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">Stap 5</div>
                  <h3 className="font-semibold mb-2">Download PDF</h3>
                  <p className="text-sm text-muted-foreground">
                    Download je print-ready CV direct
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Main Features */}
          <section className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Alles Wat Je Nodig Hebt</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Van CV tot motivatiebrief - wij hebben het geregeld
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* CV Generation */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <FileText className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Slimme CV Generatie</CardTitle>
                    <CardDescription>
                      AI-geoptimaliseerd voor elke vacature
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Automatische keyword optimalisatie
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Relevante ervaring highlighting
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ATS-vriendelijke opmaak
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Motivation Letter */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Mail className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Motivatiebrief Generator</CardTitle>
                    <CardDescription>
                      Persoonlijke brieven in seconden
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Gebaseerd op je CV en vacature
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Voeg persoonlijke motivatie toe
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Download als PDF of Word
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Dynamic Styling */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Palette className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Dynamische Stijlen</CardTitle>
                    <CardDescription>
                      Uniek design voor elke industrie
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        AI-gegenereerde kleurpaletten
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Meerdere header stijlen
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Profielfoto ondersteuning
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Profile Management */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Save className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Profiel Beheer</CardTitle>
                    <CardDescription>
                      Sla profielen op en hergebruik ze
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Meerdere profielen opslaan
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Snel wisselen tussen profielen
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Profielfoto meteen opgeslagen
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Live Preview */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Eye className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Live Preview & Editor</CardTitle>
                    <CardDescription>
                      Bewerk en bekijk direct het resultaat
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        WYSIWYG preview
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Tekst direct aanpassen
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Kleuren personaliseren
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Security */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Shield className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Jouw Data, Jouw Key</CardTitle>
                    <CardDescription>
                      Gebruik je eigen AI API key
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        OpenAI, Anthropic of Google
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Betaal alleen wat je gebruikt
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Versleutelde opslag
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Speed Section */}
          <section className="py-20 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-90" />
                  <p className="text-4xl font-bold mb-2">&lt; 1 min</p>
                  <p className="opacity-90">LinkedIn naar CV</p>
                </div>
                <div>
                  <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-90" />
                  <p className="text-4xl font-bold mb-2">Onbeperkt</p>
                  <p className="opacity-90">Stijlen genereren</p>
                </div>
                <div>
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-90" />
                  <p className="text-4xl font-bold mb-2">PDF + DOCX</p>
                  <p className="opacity-90">Export formaten</p>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Simpele Prijzen</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Betaal alleen voor wat je nodig hebt. Geen abonnementen.
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {/* Free Tier */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gratis</CardTitle>
                    <CardDescription>Elke maand</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold mb-2">5</p>
                    <p className="text-muted-foreground mb-4">credits/maand</p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        5 CV downloads
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        Alle stijlen
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        Motivatiebrieven
                      </li>
                    </ul>
                    <Link href="/register">
                      <Button variant="outline" className="w-full">
                        Gratis Starten
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* 5 Credits */}
                <Card>
                  <CardHeader>
                    <CardTitle>5 Credits</CardTitle>
                    <CardDescription>Eenmalige aankoop</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold mb-2">&euro;4,99</p>
                    <p className="text-muted-foreground mb-4">&euro;1,00/download</p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        Nooit verlopen
                      </li>
                    </ul>
                    <Link href="/register">
                      <Button variant="outline" className="w-full">
                        Kopen
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* 15 Credits - Popular */}
                <Card className="border-primary border-2 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Populair</Badge>
                  </div>
                  <CardHeader>
                    <CardTitle>15 Credits</CardTitle>
                    <CardDescription>Eenmalige aankoop</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold mb-2">&euro;12,99</p>
                    <p className="text-muted-foreground mb-4">&euro;0,87/download</p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        Bespaar 13%
                      </li>
                    </ul>
                    <Link href="/register">
                      <Button className="w-full">Kopen</Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* 30 Credits */}
                <Card>
                  <CardHeader>
                    <CardTitle>30 Credits</CardTitle>
                    <CardDescription>Eenmalige aankoop</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold mb-2">&euro;22,99</p>
                    <p className="text-muted-foreground mb-4">&euro;0,77/download</p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        Bespaar 23%
                      </li>
                    </ul>
                    <Link href="/register">
                      <Button variant="outline" className="w-full">
                        Kopen
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-8">
                <CreditCard className="inline h-4 w-4 mr-1" />
                Veilig betalen via Mollie (iDEAL, Creditcard en meer)
              </p>
            </div>
          </section>

          {/* CTA */}
          <section className="py-20 bg-accent/30">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Klaar om Je Perfecte CV te Maken?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Sluit je aan bij professionals die hun droombaan hebben gevonden met CVeetje.
              </p>
              <Link href="/register">
                <Button size="lg">
                  Gratis Beginnen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-semibold">CVeetje</span>
              </div>
              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} CVeetje. Alle rechten voorbehouden.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-foreground">
                  Voorwaarden
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
