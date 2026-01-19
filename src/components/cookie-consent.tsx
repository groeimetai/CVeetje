'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cveetje-cookie-consent';

type ConsentStatus = 'accepted' | 'declined' | null;

export function CookieConsent() {
  const t = useTranslations('cookieConsent');
  const locale = useLocale();
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check localStorage for existing consent
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (savedConsent === 'accepted' || savedConsent === 'declined') {
      setConsentStatus(savedConsent as ConsentStatus);
      // If accepted, load analytics
      if (savedConsent === 'accepted') {
        loadAnalytics();
      }
    } else {
      // No consent yet, show banner
      setIsVisible(true);
    }
  }, []);

  const loadAnalytics = () => {
    // Only load if not already loaded
    if (typeof window !== 'undefined' && !window.gtag) {
      // Replace GA_MEASUREMENT_ID with actual Google Analytics ID
      const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

      if (GA_MEASUREMENT_ID) {
        // Load gtag.js
        const script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.async = true;
        document.head.appendChild(script);

        // Initialize gtag
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() {
          // eslint-disable-next-line prefer-rest-params
          window.dataLayer.push(arguments);
        };
        window.gtag('js', new Date());
        window.gtag('config', GA_MEASUREMENT_ID, {
          page_path: window.location.pathname,
          anonymize_ip: true,
        });
      }
    }
  };

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setConsentStatus('accepted');
    setIsVisible(false);
    loadAnalytics();
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setConsentStatus('declined');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="relative rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 md:p-6 shadow-lg">
          <button
            onClick={handleDecline}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-sm">{t('title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('description')}{' '}
                  <Link href="/privacy" className="underline hover:text-foreground">
                    {t('learnMore')}
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
              >
                {t('decline')}
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
              >
                {t('accept')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Extend Window interface for gtag
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
