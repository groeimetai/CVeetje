'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CVWizard } from '@/components/cv/cv-wizard';

export default function NewCVPage() {
  const t = useTranslations('cvNew');

  // Widen the dashboard content shell for the CV wizard — the preview step
  // needs A4-width room (~210mm) plus side rails for chat / dispute UI.
  // Other dashboard routes keep the default 1480px cap.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.dash-content');
    if (!el) return;
    el.classList.add('dash-content--wide');
    return () => el.classList.remove('dash-content--wide');
  }, []);

  return (
    <div className="w-full">
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
