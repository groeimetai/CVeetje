'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/logo';
import { CookieSettingsButton } from '@/components/cookie-settings-button';

interface FooterProps {
  minimal?: boolean;
}

export function Footer({ minimal = false }: FooterProps) {
  const locale = useLocale();
  const t = useTranslations('footer');

  const currentYear = new Date().getFullYear();

  if (minimal) {
    return (
      <footer className="border-t py-4 mt-auto bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <span>© {currentYear} CVeetje</span>
              <span className="hidden sm:inline">|</span>
              <span>GroeimetAI</span>
              <span className="hidden sm:inline">|</span>
              <span>KvK: 90102304</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/privacy" className="hover:text-foreground">
                {t('privacy')}
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                {t('terms')}
              </Link>
              <Link href="/cookies" className="hover:text-foreground">
                {locale === 'nl' ? 'Cookies' : 'Cookies'}
              </Link>
              <Link href="/ai-transparency" className="hover:text-foreground">
                {t('aiTransparency')}
              </Link>
              <Link href="/sub-processors" className="hover:text-foreground">
                {locale === 'nl' ? 'Subverwerkers' : 'Sub-processors'}
              </Link>
              <Link href="/compliance" className="hover:text-foreground">
                Compliance
              </Link>
              <CookieSettingsButton variant="link" className="!px-0 !py-0 h-auto text-xs text-muted-foreground hover:text-foreground" />
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t py-8 mt-auto bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & Description */}
          <div className="space-y-3">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              {locale === 'nl'
                ? 'AI-ondersteunde CV generator voor professionele sollicitaties.'
                : 'AI-powered CV generator for professional job applications.'}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">
              {locale === 'nl' ? 'Juridisch & Compliance' : 'Legal & Compliance'}
            </h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                {t('privacy')}
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                {t('terms')}
              </Link>
              <Link href="/cookies" className="hover:text-foreground">
                {locale === 'nl' ? 'Cookiebeleid' : 'Cookie Policy'}
              </Link>
              <Link href="/ai-transparency" className="hover:text-foreground">
                {t('aiTransparency')}
              </Link>
              <Link href="/sub-processors" className="hover:text-foreground">
                {locale === 'nl' ? 'Subverwerkers' : 'Sub-processors'}
              </Link>
              <Link href="/compliance" className="hover:text-foreground">
                {locale === 'nl' ? 'Compliance (AVG + AI Act)' : 'Compliance (GDPR + AI Act)'}
              </Link>
              <CookieSettingsButton variant="link" className="!px-0 !py-0 h-auto justify-start text-sm text-muted-foreground hover:text-foreground" />
              <a href="mailto:info@groeimetai.io" className="hover:text-foreground">
                {locale === 'nl' ? 'Contact' : 'Contact'}
              </a>
            </div>
          </div>

          {/* Business Info */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">GroeimetAI</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Fabriekstraat 20</p>
              <p>7311GP Apeldoorn</p>
              <p>{locale === 'nl' ? 'Nederland' : 'The Netherlands'}</p>
              <p className="pt-2">KvK: 90102304</p>
              <p>BTW: NL004787305B79</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground space-y-1">
          <p>
            © {currentYear} CVeetje - {locale === 'nl' ? 'Een dienst van' : 'A service by'} GroeimetAI
          </p>
          <p>
            {locale === 'nl'
              ? 'Data opgeslagen in Nederland (europe-west4) · AVG-compliant · EU AI Act beperkt risico'
              : 'Data stored in the Netherlands (europe-west4) · GDPR-compliant · EU AI Act limited risk'}
          </p>
        </div>
      </div>
    </footer>
  );
}
