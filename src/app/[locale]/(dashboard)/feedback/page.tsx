'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FeedbackForm } from '@/components/feedback/feedback-form';
import { FeedbackList } from '@/components/feedback/feedback-list';

export default function FeedbackPage() {
  const t = useTranslations('feedback');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <FeedbackForm onSuccess={() => setRefreshKey(k => k + 1)} />
        <FeedbackList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
