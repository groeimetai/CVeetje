'use client';

/**
 * Auth-aware shell for `/jobs/*` pages.
 *
 * The jobs board is public (SEO + ISR), but logged-in users should see the
 * same dashboard chrome they get everywhere else. This shell renders the
 * dashboard chrome (sidebar + topbar) when authenticated, and a minimal
 * public header otherwise.
 */

import { useLocale } from 'next-intl';
import { useAuth } from '@/components/auth/auth-context';
import { Sidebar, MobileHeader } from '@/components/dashboard/sidebar';
import { DashTopbar } from '@/components/dashboard/topbar';
import { ImpersonationBanner } from '@/components/admin/impersonation-banner';
import { Logo } from '@/components/ui/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export function JobsShell({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const locale = useLocale();

  // During auth resolution: render content without chrome to avoid layout
  // shift. The flash is short (< 500ms) and content stays visible.
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  if (firebaseUser) {
    return (
      <>
        <ImpersonationBanner />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          Skip to main content
        </a>
        <div className="dash">
          <Sidebar />
          <div className="dash-main">
            <MobileHeader />
            <DashTopbar />
            <main id="main-content" className="dash-content">
              {children}
            </main>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button asChild variant="outline" size="sm">
              <Link href="/login">{locale === 'nl' ? 'Inloggen' : 'Sign in'}</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
