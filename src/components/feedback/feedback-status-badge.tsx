'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { FeedbackStatus } from '@/types';

const STATUS_VARIANTS: Record<FeedbackStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'secondary',
  in_review: 'outline',
  planned: 'default',
  in_progress: 'default',
  resolved: 'default',
  declined: 'destructive',
};

interface FeedbackStatusBadgeProps {
  status: FeedbackStatus;
}

export function FeedbackStatusBadge({ status }: FeedbackStatusBadgeProps) {
  const t = useTranslations('feedback.status');

  return (
    <Badge variant={STATUS_VARIANTS[status] || 'secondary'}>
      {t(status)}
    </Badge>
  );
}
