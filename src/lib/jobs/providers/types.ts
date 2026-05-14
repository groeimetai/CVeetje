import type { JobVacancy } from '@/types';

export type JobSourceProvider = 'recruitee' | 'greenhouse' | 'lever' | 'adzuna';

export type ApplyQuestionType =
  | 'short_text'
  | 'long_text'
  | 'select'
  | 'multi_select'
  | 'boolean'
  | 'attachment';

export interface ApplyQuestion {
  id: string;
  label: string;
  required: boolean;
  type: ApplyQuestionType;
  options?: string[];
  description?: string;
}

export interface NormalizedJob {
  sourceProvider: JobSourceProvider;
  sourceId: string;
  providerCompanyKey: string | null; // alphanumeric short key used in slug
  providerCompanyId: string | null; // raw subdomain/board_token
  slug: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  industry: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  url: string;
  postedAt: string | null;
  supportsInAppApply: boolean;
  applyQuestions: ApplyQuestion[];
}

export type JobSortOption = 'recent' | 'salary' | 'relevance';

export interface JobSearchParams {
  q?: string;
  location?: string;
  page?: number;
  resultsPerPage?: number;
  employmentType?: string;
  remote?: boolean;
  salaryMin?: number;
  inAppOnly?: boolean;
  sort?: JobSortOption;
}

export interface JobSearchResult {
  results: NormalizedJob[];
  totalResults: number;
  totalPages: number;
  currentPage: number;
}

export interface ApplyCandidate {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  resumePdf: Buffer;
  resumeFileName: string;
  coverLetterPdf?: Buffer;
  coverLetterFileName?: string;
  answers?: Record<string, string | boolean | string[]>;
  fileAnswers?: Record<string, { buffer: Buffer; fileName: string; mimeType: string }>;
}

export interface ApplyResult {
  ok: boolean;
  providerApplicationId?: string;
  errors?: Array<{ field?: string; message: string }>;
}

export interface JobProvider {
  readonly id: JobSourceProvider;
  /** 2-letter URL code used inside slugs: `rt`, `gh`, `az` */
  readonly code: string;
  listForCompany(companyId: string): Promise<NormalizedJob[]>;
  fetchJob(companyId: string, jobId: string): Promise<NormalizedJob | null>;
  apply(
    companyId: string,
    job: NormalizedJob,
    candidate: ApplyCandidate,
  ): Promise<ApplyResult>;
}

export function normalizedJobToJobVacancy(job: NormalizedJob): JobVacancy {
  return {
    title: job.title,
    company: job.company,
    description: job.description,
    requirements: [],
    keywords: [],
    industry: job.industry || undefined,
    location: job.location || undefined,
    employmentType: job.employmentType || undefined,
    rawText: job.description,
    compensation:
      job.salaryMin || job.salaryMax
        ? {
            salaryMin: job.salaryMin ?? undefined,
            salaryMax: job.salaryMax ?? undefined,
            salaryCurrency: job.salaryCurrency ?? 'EUR',
            salaryPeriod: 'yearly',
          }
        : undefined,
  };
}

export function buildSlug(
  providerCode: string,
  companyKey: string,
  jobId: string,
  title: string,
): string {
  const titleSlug = slugifyForUrl(title).slice(0, 60);
  const companyClean = companyKey.replace(/[^a-z0-9]/g, '');
  const jobIdClean = jobId.replace(/[^a-zA-Z0-9]/g, '');
  return [titleSlug, providerCode.toLowerCase(), companyClean, jobIdClean]
    .filter(Boolean)
    .join('-');
}

export function parseSlug(
  slug: string,
): { providerCode: string; companyKey: string; jobId: string } | null {
  // title-XX-company-jobId  — company and jobId are alphanumeric only
  const match = slug.match(/^(?:.+-)?([a-z]{2})-([a-z0-9]+)-([a-zA-Z0-9]+)$/);
  if (!match) return null;
  const [, providerCode, companyKey, jobId] = match;
  return { providerCode, companyKey, jobId };
}

export function slugifyForUrl(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
