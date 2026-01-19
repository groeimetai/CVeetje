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
  Mail,
  Save,
  Eye,
  Linkedin,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
import { WebsiteStructuredData, FAQStructuredData } from '@/components/seo/structured-data';

export const metadata: Metadata = {
  title: 'CVeetje - CV Automatisch Gefit op Elke Vacature | Stop het Priegelwerk',
  description: 'Stop met urenlang CV\'s aanpassen. CVeetje analyseert vacatures en past je CV automatisch aan. Sla je profiel op en genereer met één klik een perfect gefit CV. Start gratis.',
  keywords: [
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
            <Link href="/">
              <Logo size="sm" />
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
                <Target className="mr-1 h-3 w-3" />
                Automatisch gefit op elke vacature
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Stop het Priegelwerk
                <br />
                <span className="text-primary">Start met Solliciteren</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Geen urenlang CV&apos;s aanpassen meer. Sla je profiel één keer op, plak een vacature,
                en ontvang een CV dat <strong>automatisch is geoptimaliseerd</strong> voor die specifieke baan.
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

          {/* Value Props */}
          <section className="py-12 border-b">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Save className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Eén keer invoeren</h3>
                  <p className="text-sm text-muted-foreground">
                    Sla je profiel op en hergebruik het voor elke sollicitatie
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Automatisch gefit</h3>
                  <p className="text-sm text-muted-foreground">
                    AI analyseert de vacature en optimaliseert je CV
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Klaar in minuten</h3>
                  <p className="text-sm text-muted-foreground">
                    Van vacature naar sollicitatie-klaar CV in een paar klikken
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works - Simplified */}
          <section id="hoe-het-werkt" className="py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Zo Simpel Werkt Het</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Van LinkedIn naar een perfect gefit CV in 3 stappen
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">Stap 1 - Eenmalig</div>
                  <h3 className="font-semibold mb-2">Sla Je Profiel Op</h3>
                  <p className="text-sm text-muted-foreground">
                    Plak je LinkedIn, upload screenshots van een oud CV, of voer handmatig in.
                    <strong className="text-foreground"> Je hoeft dit maar één keer te doen.</strong>
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">Stap 2 - Per Sollicitatie</div>
                  <h3 className="font-semibold mb-2">Plak de Vacature</h3>
                  <p className="text-sm text-muted-foreground">
                    Copy-paste de vacaturetekst. AI analyseert de functie-eisen en
                    <strong className="text-foreground"> past je CV automatisch aan.</strong>
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Download className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary mb-1">Stap 3</div>
                  <h3 className="font-semibold mb-2">Download & Solliciteer</h3>
                  <p className="text-sm text-muted-foreground">
                    Download je CV als PDF. Voeg optioneel een
                    <strong className="text-foreground"> AI-gegenereerde motivatiebrief</strong> toe.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Key Features - Reordered by importance */}
          <section className="py-20 bg-accent/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Waarom CVeetje?</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Alles om sneller en beter te solliciteren
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* #1 - Job Targeting (MAIN FEATURE) */}
                <Card className="border-2 border-primary hover:border-primary transition-colors">
                  <CardHeader>
                    <Badge className="w-fit mb-2">Belangrijkste feature</Badge>
                    <Target className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Automatisch Gefit op Vacatures</CardTitle>
                    <CardDescription>
                      AI leest de vacature en optimaliseert je CV
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Relevante keywords automatisch verwerkt
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Ervaring geprioriteerd op functie-eisen
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Skills die matchen komen bovenaan
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ATS-vriendelijk voor recruiter software
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* #2 - Profile Management */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Save className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Profielen Opslaan & Hergebruiken</CardTitle>
                    <CardDescription>
                      Nooit meer opnieuw beginnen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        Importeer vanuit LinkedIn tekst
                      </li>
                      <li className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary flex-shrink-0" />
                        Upload screenshots van oud CV
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Meerdere profielen voor verschillende rollen
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Profielfoto wordt mee opgeslagen
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* #3 - Motivation Letter */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Mail className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Motivatiebrief Erbij</CardTitle>
                    <CardDescription>
                      Gebaseerd op je CV én de vacature
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Sluit aan op je gegenereerde CV
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Voeg je eigen motivatie toe
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Download als PDF of Word
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Kost slechts 1 extra credit
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* #4 - Live Preview */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Eye className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Preview & Aanpassen</CardTitle>
                    <CardDescription>
                      Altijd de laatste controle
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Live preview voordat je download
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Klik op tekst om aan te passen
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Kleuren aanpassen aan je smaak
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Wat je ziet is wat je krijgt
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* #5 - Styling (moved down) */}
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <Sparkles className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Professionele Opmaak</CardTitle>
                    <CardDescription>
                      Stijl passend bij jouw industrie
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        AI kiest kleuren passend bij je vakgebied
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Meerdere layouts beschikbaar
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Profielfoto ondersteuning
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Genereer onbeperkt nieuwe stijlen
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* #6 - Your API Key */}
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
                        Betaal alleen AI-kosten die je maakt
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Versleuteld opgeslagen
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        Volledig in jouw controle
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Stats Section - Focused on time saving */}
          <section className="py-20 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-90" />
                  <p className="text-4xl font-bold mb-2">2 uur → 2 min</p>
                  <p className="opacity-90">Tijd bespaard per sollicitatie</p>
                </div>
                <div>
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-90" />
                  <p className="text-4xl font-bold mb-2">100%</p>
                  <p className="opacity-90">Gefit op de vacature</p>
                </div>
                <div>
                  <Save className="h-12 w-12 mx-auto mb-4 opacity-90" />
                  <p className="text-4xl font-bold mb-2">1x invoeren</p>
                  <p className="opacity-90">Onbeperkt hergebruiken</p>
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
                  Betaal alleen voor downloads. Geen abonnementen.
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {/* Free Tier */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gratis</CardTitle>
                    <CardDescription>Elke maand opnieuw</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold mb-2">5</p>
                    <p className="text-muted-foreground mb-4">credits/maand</p>
                    <ul className="space-y-2 text-sm mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        CV downloads
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        Vacature targeting
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        Motivatiebrieven
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        Onbeperkt profielen
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
                Klaar met Priegelwerk?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Sla je profiel op, plak een vacature, en download je perfect gefitte CV.
                Zo simpel is het.
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
              <Logo size="sm" />
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
