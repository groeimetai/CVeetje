'use client';

import { useTranslations } from 'next-intl';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resetCookieConsent } from '@/components/cookie-consent';

type Variant = 'link' | 'outline' | 'default';

export function CookieSettingsButton({
  variant = 'link',
  className,
  withIcon,
}: {
  variant?: Variant;
  className?: string;
  withIcon?: boolean;
}) {
  const t = useTranslations('cookieConsent');

  return (
    <Button
      type="button"
      variant={variant}
      size={variant === 'link' ? 'sm' : 'sm'}
      className={className}
      onClick={() => resetCookieConsent()}
    >
      {withIcon && <Cookie className="mr-2 h-4 w-4" />}
      {t('manageSettings')}
    </Button>
  );
}
