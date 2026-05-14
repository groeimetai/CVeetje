'use client';

import { useTranslations } from 'next-intl';
import { FeedbackSection } from '@/components/admin/feedback-section';
import { PageHeader } from '@/components/brand/page-header';

export default function AdminFeedbackPage() {
  const t = useTranslations('admin.feedback');

  return (
    <>
      <PageHeader
        eyebrow="§ User-feedback"
        title={<>Feedback <em>inbox</em></>}
        subtitle={t('description')}
      />
      <FeedbackSection />
    </>
  );
}
