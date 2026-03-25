'use client';

import { useTranslations } from 'next-intl';
import { FeedbackSection } from '@/components/admin/feedback-section';

export default function AdminFeedbackPage() {
  const t = useTranslations('admin.feedback');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      <FeedbackSection />
    </div>
  );
}
