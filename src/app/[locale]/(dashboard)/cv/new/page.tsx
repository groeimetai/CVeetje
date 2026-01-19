'use client';

import { useTranslations } from 'next-intl';
import { CVWizard } from '@/components/cv/cv-wizard';

export default function NewCVPage() {
  const t = useTranslations('cvNew');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <CVWizard />
    </div>
  );
}
