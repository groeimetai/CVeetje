'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CVWizard } from '@/components/cv/cv-wizard';
import { PageHeader } from '@/components/brand/page-header';

export default function NewCVPage() {
  const t = useTranslations('cvNew');
  const tHeaders = useTranslations('pageHeaders');

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
      <PageHeader
        eyebrow={tHeaders('cvNew.eyebrow')}
        title={tHeaders.rich('cvNew.title', { em: (chunks) => <em>{chunks}</em> })}
        subtitle={t('subtitle')}
      />

      <CVWizard />
    </div>
  );
}
