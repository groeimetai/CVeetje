import type {
  ApplyCandidate,
  ApplyQuestion,
  ApplyResult,
  JobProvider,
  NormalizedJob,
} from './types';
import { buildSlug } from './types';

interface RecruiteeOffer {
  id: number;
  slug: string;
  title: string;
  description: string;
  requirements?: string;
  city?: string;
  country?: string;
  location?: string;
  employment_type_code?: string;
  category_code?: string;
  department?: string;
  salary?: { min?: number; max?: number; currency?: string };
  created_at?: string;
  published_at?: string;
  careers_url?: string;
  mailbox_email?: string;
  open_questions?: Array<{
    id: number;
    body: string;
    kind?: string; // 'single_line' | 'multi_line' | 'yes_no' | 'single_choice' | 'multi_choice'
    options?: string[];
    required?: boolean;
  }>;
}

interface RecruiteeListResponse {
  offers?: RecruiteeOffer[];
}

function mapQuestionType(kind?: string): ApplyQuestion['type'] {
  switch (kind) {
    case 'multi_line':
      return 'long_text';
    case 'yes_no':
      return 'boolean';
    case 'single_choice':
      return 'select';
    case 'multi_choice':
      return 'multi_select';
    default:
      return 'short_text';
  }
}

function stripTags(input: string | undefined): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapOffer(
  companyKey: string,
  companyId: string,
  companyName: string,
  offer: RecruiteeOffer,
): NormalizedJob {
  const description = [offer.description, offer.requirements]
    .filter(Boolean)
    .map(stripTags)
    .join('\n\n');

  const applyQuestions: ApplyQuestion[] = (offer.open_questions ?? []).map((q) => ({
    id: String(q.id),
    label: stripTags(q.body) || 'Question',
    required: q.required ?? false,
    type: mapQuestionType(q.kind),
    ...(q.options && q.options.length > 0 ? { options: q.options } : {}),
  }));

  return {
    sourceProvider: 'recruitee',
    sourceId: String(offer.id),
    providerCompanyKey: companyKey,
    providerCompanyId: companyId,
    slug: buildSlug('rt', companyKey, String(offer.id), offer.title),
    title: offer.title,
    company: companyName,
    location: offer.location || [offer.city, offer.country].filter(Boolean).join(', ') || null,
    description,
    industry: offer.department || null,
    employmentType: offer.employment_type_code || null,
    salaryMin: offer.salary?.min ?? null,
    salaryMax: offer.salary?.max ?? null,
    salaryCurrency: offer.salary?.currency ?? 'EUR',
    url: offer.careers_url || `https://${companyId}.recruitee.com/o/${offer.slug}`,
    postedAt: offer.published_at || offer.created_at || null,
    supportsInAppApply: true,
    applyQuestions,
  };
}

export class RecruiteeProvider implements JobProvider {
  readonly id = 'recruitee' as const;
  readonly code = 'rt';

  constructor(private companyNames: Record<string, string> = {}) {}

  setCompanyName(companyKey: string, companyName: string) {
    this.companyNames[companyKey] = companyName;
  }

  async listForCompany(companyId: string): Promise<NormalizedJob[]> {
    const url = `https://${companyId}.recruitee.com/api/offers/`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      throw new Error(`Recruitee list failed for ${companyId}: ${res.status}`);
    }
    const data = (await res.json()) as RecruiteeListResponse;
    const companyKey = companyId.replace(/[^a-z0-9]/g, '');
    const companyName = this.companyNames[companyKey] || companyId;
    return (data.offers ?? []).map((offer) =>
      mapOffer(companyKey, companyId, companyName, offer),
    );
  }

  async fetchJob(companyId: string, jobId: string): Promise<NormalizedJob | null> {
    // Recruitee does not have a public single-offer by ID; fetch the offers list once
    // and map locally. `jobId` may be the numeric offer ID or the offer slug.
    const url = `https://${companyId}.recruitee.com/api/offers/`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as RecruiteeListResponse;
    const offer = (data.offers ?? []).find(
      (o) => String(o.id) === jobId || o.slug === jobId,
    );
    if (!offer) return null;
    const companyKey = companyId.replace(/[^a-z0-9]/g, '');
    const companyName = this.companyNames[companyKey] || companyId;
    return mapOffer(companyKey, companyId, companyName, offer);
  }

  async apply(
    companyId: string,
    job: NormalizedJob,
    candidate: ApplyCandidate,
  ): Promise<ApplyResult> {
    const url = `https://${companyId}.recruitee.com/api/offers/${job.sourceId}/candidates/`;
    const form = new FormData();
    const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();

    form.append('candidate[name]', fullName);
    form.append('candidate[emails][]', candidate.email);
    if (candidate.phone) form.append('candidate[phones][]', candidate.phone);
    if (candidate.linkedinUrl) {
      form.append('candidate[social_links][]', candidate.linkedinUrl);
    }
    form.append(
      'candidate[cv]',
      new Blob([new Uint8Array(candidate.resumePdf)], { type: 'application/pdf' }),
      candidate.resumeFileName,
    );
    if (candidate.coverLetterPdf && candidate.coverLetterFileName) {
      form.append(
        'candidate[cover_letter]',
        new Blob([new Uint8Array(candidate.coverLetterPdf)], { type: 'application/pdf' }),
        candidate.coverLetterFileName,
      );
    }

    if (candidate.answers) {
      for (const [questionId, answer] of Object.entries(candidate.answers)) {
        const value = Array.isArray(answer) ? answer.join(', ') : String(answer);
        form.append(
          `candidate[open_question_answers_attributes][][open_question_id]`,
          questionId,
        );
        form.append(
          `candidate[open_question_answers_attributes][][content]`,
          value,
        );
      }
    }
    // Recruitee's open question API does not accept binary attachments per question.
    // Fold attachment-type answers into a single multi-attachment field so the
    // recruiter still receives the file alongside the candidate record.
    if (candidate.fileAnswers) {
      for (const [, file] of Object.entries(candidate.fileAnswers)) {
        form.append(
          'candidate[attachments][]',
          new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }),
          file.fileName,
        );
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        errors: [{ message: `Recruitee apply failed (${res.status}): ${text.slice(0, 200)}` }],
      };
    }

    const data = await res.json().catch(() => null);
    const providerApplicationId = data?.candidate?.id
      ? String(data.candidate.id)
      : undefined;
    return { ok: true, providerApplicationId };
  }
}

export const recruiteeProvider = new RecruiteeProvider();
