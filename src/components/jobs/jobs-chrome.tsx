import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import '@/styles/dashboard.css';
import '@/styles/landing.css';

/**
 * Wrap public-but-could-be-logged-in pages (jobs board + job detail) in either
 * the dashboard chrome (when the firebase-token cookie is present) or a
 * minimal public header. Cookie presence is a hint — if the token is stale,
 * the dashboard chrome still renders and useAuth will resolve it client-side.
 */
export async function JobsChrome({ children, locale }: { children: React.ReactNode; locale: string }) {
  const cookieStore = await cookies();
  const hasAuth = !!cookieStore.get('firebase-token')?.value;
  const t = await getTranslations({ locale, namespace: 'navigation' });

  if (hasAuth) {
    return <DashboardShell noIndex={false}>{children}</DashboardShell>;
  }

  return (
    <div className="landing">
      <header className="land-topbar" role="banner">
        <div className="brand-container">
          <nav className="land-nav" aria-label="Hoofdnavigatie">
            <Link href="/" className="flex-shrink-0"><Logo size="sm" /></Link>
            <div className="land-nav__links">
              <Link href="/">{locale === 'nl' ? 'Hoe het werkt' : 'How it works'}</Link>
              <Link href="/jobs">{t('jobs')}</Link>
            </div>
            <div className="land-nav__right">
              <ThemeSwitcher />
              <LanguageSwitcher />
              <Link href="/login" className="brand-btn brand-btn--ghost brand-btn--sm">
                {locale === 'nl' ? 'Inloggen' : 'Sign in'}
              </Link>
              <Link href="/register" className="brand-btn brand-btn--primary brand-btn--sm">
                {locale === 'nl' ? 'Begin gratis' : 'Start free'}
              </Link>
            </div>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
