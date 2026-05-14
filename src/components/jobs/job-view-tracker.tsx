'use client';

import { useEffect } from 'react';
import { trackJobView } from '@/lib/recent-jobs';

interface JobViewTrackerProps {
  slug: string;
  title: string;
  company: string | null;
}

/**
 * Fire-and-forget client tracker — saves a viewed job to localStorage so the
 * dashboard NextStep card can suggest 'Genereer CV voor X' on next visit.
 */
export function JobViewTracker({ slug, title, company }: JobViewTrackerProps) {
  useEffect(() => {
    trackJobView(slug, title, company);
  }, [slug, title, company]);
  return null;
}
