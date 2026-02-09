'use client';

import { useTranslations } from 'next-intl';
import { GlobalTemplatesSection } from '@/components/admin/global-templates-section';

export default function AdminTemplatesPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      <GlobalTemplatesSection />
    </div>
  );
}
