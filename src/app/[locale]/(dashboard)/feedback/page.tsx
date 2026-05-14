'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FeedbackForm } from '@/components/feedback/feedback-form';
import { FeedbackList } from '@/components/feedback/feedback-list';
import { PageHeader } from '@/components/brand/page-header';

export default function FeedbackPage() {
  const t = useTranslations('feedback');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <PageHeader
        eyebrow="§ Bug? Suggestie?"
        title={<>{t('title').replace(/\s+\S+$/, '')} <em>{t('title').split(/\s+/).slice(-1)[0]}</em></>}
        subtitle={t('description')}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <FeedbackForm onSuccess={() => setRefreshKey((k) => k + 1)} />
        <FeedbackList refreshKey={refreshKey} />
      </div>
    </>
  );
}
