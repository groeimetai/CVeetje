'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Key } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function NoApiKeyAlert() {
  const t = useTranslations('cvWizard.noApiKey');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Alert>
        <Key className="h-4 w-4" />
        <div className="ml-2">
          <p className="font-medium">{t('title')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
          <Link href="/settings">
            <Button className="mt-3" size="sm">
              {t('button')}
            </Button>
          </Link>
        </div>
      </Alert>
    </div>
  );
}
