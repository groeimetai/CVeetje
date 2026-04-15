import type { JobSourceProvider } from '@/lib/jobs/providers/types';

export type ApplicationStatus =
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'accepted'
  | 'withdrawn';

export interface ApplicationRecord {
  id: string;
  userId: string;
  jobSlug: string;
  jobTitle: string;
  jobCompany: string | null;
  jobLocation: string | null;
  jobUrl: string;
  provider: JobSourceProvider;
  providerCompanyId: string | null;
  providerApplicationId: string | null;
  cvId: string | null;
  status: ApplicationStatus;
  notes?: string;
  appliedAt: string; // ISO
  updatedAt: string; // ISO
}
