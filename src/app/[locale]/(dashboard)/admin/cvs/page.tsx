'use client';

import { useTranslations } from 'next-intl';
import { CVsSection } from '@/components/admin/cvs-section';
import { PageHeader } from '@/components/brand/page-header';

export default function AdminCVsPage() {
  const t = useTranslations('admin');

  return (
    <>
      <PageHeader
        eyebrow={`§ ${t('description')}`}
        title={<>CV <em>archief</em></>}
      />
      <CVsSection />
    </>
  );
}
