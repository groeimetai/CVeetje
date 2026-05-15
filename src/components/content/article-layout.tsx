import type { ReactNode } from 'react';
import '@/styles/content-prose.css';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Footer } from '@/components/footer';
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ArticleLayoutProps {
  locale: 'nl' | 'en';
  title: string;
  description?: string;
  publishedAt?: string;
  updatedAt?: string;
  readingMinutes?: number;
  authorName?: string;
  authorRole?: string;
  badges?: string[];
  backHref?: string;
  backLabel?: string;
  ctaPrimary?: { href: string; label: string };
  ctaSecondary?: { href: string; label: string };
  children: ReactNode;
}

export function ArticleLayout({
  locale,
  title,
  description,
  publishedAt,
  updatedAt,
  readingMinutes,
  authorName,
  authorRole,
  badges,
  backHref = '/',
  backLabel,
  ctaPrimary,
  ctaSecondary,
  children,
}: ArticleLayoutProps) {
  const nl = locale === 'nl';
  const backText = backLabel ?? (nl ? 'Terug naar home' : 'Back to home');

  const fmt = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString(nl ? 'nl-NL' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/blog" className="hover:text-foreground">
              {nl ? 'Blog' : 'Blog'}
            </Link>
            <Link href="/voor" className="hover:text-foreground">
              {nl ? 'Voor jou' : 'For you'}
            </Link>
            <Link href="/faq" className="hover:text-foreground">
              {nl ? 'Veelgestelde vragen' : 'FAQ'}
            </Link>
            <Link href="/jobs" className="hover:text-foreground">
              {nl ? 'Vacatures' : 'Jobs'}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            href={backHref}
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 text-sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backText}
          </Link>

          <div className="mb-10">
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {badges.map((b) => (
                  <Badge key={b} variant="outline" className="text-xs">
                    {b}
                  </Badge>
                ))}
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight tracking-tight">{title}</h1>
            {description && (
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">{description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {authorName && (
                <span>
                  {nl ? 'Door' : 'By'}{' '}
                  <span className="text-foreground font-medium">{authorName}</span>
                  {authorRole && <span className="hidden md:inline"> · {authorRole}</span>}
                </span>
              )}
              {publishedAt && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {fmt(updatedAt ?? publishedAt)}
                  {updatedAt && updatedAt !== publishedAt && (
                    <span className="ml-1 text-xs">({nl ? 'bijgewerkt' : 'updated'})</span>
                  )}
                </span>
              )}
              {readingMinutes && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {readingMinutes} {nl ? 'min lezen' : 'min read'}
                </span>
              )}
            </div>
          </div>

          <article className="cv-prose">{children}</article>

          {(ctaPrimary || ctaSecondary) && (
            <div className="mt-16 p-8 rounded-2xl border bg-muted/30">
              <h3 className="text-xl font-semibold mb-2">
                {nl ? 'Klaar om het zelf te proberen?' : 'Ready to try it yourself?'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {nl
                  ? 'Start gratis — 15 credits per maand, genoeg voor een volledig CV. Geen creditcard nodig.'
                  : 'Start free — 15 credits per month, enough for one full CV. No credit card required.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {ctaPrimary && (
                  <Link href={ctaPrimary.href}>
                    <Button size="lg">
                      {ctaPrimary.label} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
                {ctaSecondary && (
                  <Link href={ctaSecondary.href}>
                    <Button variant="outline" size="lg">
                      {ctaSecondary.label}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
