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
  Linkedin,
  Target,
  Download,
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
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CVeetje</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <Badge className="mb-4" variant="secondary">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Powered CV Builder
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Create Professional CVs
              <br />
              <span className="text-primary">in Minutes</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Transform your LinkedIn profile into a tailored, professional CV.
              Our AI analyzes job descriptions and optimizes your CV to stand out.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg">
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg">
                  See How It Works
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              5 free CV downloads per month. No credit card required.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-accent/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Create a professional CV in just 4 simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Linkedin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">1. Paste LinkedIn</h3>
                <p className="text-sm text-muted-foreground">
                  Copy and paste your LinkedIn profile text
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">2. Add Job (Optional)</h3>
                <p className="text-sm text-muted-foreground">
                  Paste a job description to tailor your CV
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">3. AI Generates</h3>
                <p className="text-sm text-muted-foreground">
                  AI creates a professional, tailored CV
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Download className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">4. Download PDF</h3>
                <p className="text-sm text-muted-foreground">
                  Download your print-ready CV
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why Choose CVeetje?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Everything you need to create standout CVs
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Zap className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Lightning Fast</CardTitle>
                  <CardDescription>
                    Generate a professional CV in under a minute
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Instant LinkedIn parsing
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      AI-powered content generation
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      One-click PDF export
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Target className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Job-Tailored</CardTitle>
                  <CardDescription>
                    CVs optimized for specific job descriptions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Keyword optimization
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Relevant skill highlighting
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Experience tailoring
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Your Data, Your Key</CardTitle>
                  <CardDescription>
                    Use your own AI API key for full control
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      OpenAI, Anthropic, or Google
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Pay only for what you use
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Encrypted API key storage
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 bg-accent/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Pay only for what you need. No subscriptions required.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {/* Free Tier */}
              <Card>
                <CardHeader>
                  <CardTitle>Free</CardTitle>
                  <CardDescription>Every month</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold mb-4">5</p>
                  <p className="text-muted-foreground mb-4">credits/month</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      5 CV downloads
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      All templates
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Job tailoring
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Credit Packages */}
              <Card>
                <CardHeader>
                  <CardTitle>5 Credits</CardTitle>
                  <CardDescription>One-time purchase</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold mb-4">&euro;4.99</p>
                  <p className="text-muted-foreground mb-4">&euro;1.00/CV</p>
                  <Link href="/register">
                    <Button variant="outline" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardHeader>
                  <Badge className="w-fit mb-2">Popular</Badge>
                  <CardTitle>15 Credits</CardTitle>
                  <CardDescription>One-time purchase</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold mb-4">&euro;12.99</p>
                  <p className="text-muted-foreground mb-4">&euro;0.87/CV - Save 13%</p>
                  <Link href="/register">
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>30 Credits</CardTitle>
                  <CardDescription>One-time purchase</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold mb-4">&euro;22.99</p>
                  <p className="text-muted-foreground mb-4">&euro;0.77/CV - Save 23%</p>
                  <Link href="/register">
                    <Button variant="outline" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              <CreditCard className="inline h-4 w-4 mr-1" />
              Secure payment via Mollie (iDEAL, Credit Card, and more)
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Create Your Perfect CV?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Join thousands of professionals who have landed their dream jobs
              with CVeetje.
            </p>
            <Link href="/register">
              <Button size="lg">
                Get Started Free
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
              &copy; {new Date().getFullYear()} CVeetje. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
