import type {
  ApplyCandidate,
  ApplyQuestion,
  ApplyResult,
  JobProvider,
  NormalizedJob,
} from './types';
import { buildSlug } from './types';

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number; // ms epoch
  categories?: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
  };
  descriptionPlain?: string;
  description?: string; // HTML
  lists?: Array<{ text: string; content: string }>;
  additional?: string;
  additionalPlain?: string;
}

interface LeverPostingDetail extends LeverPosting {
  // The detail endpoint can return additional fields when ?mode=json is used.
  applicationFields?: Array<{
    text: string;
    type?: string; // 'text' | 'textarea' | 'multiple-select' | 'multiple-choice'
    options?: Array<{ text: string }>;
    required?: boolean;
  }>;
}

function stripTags(input: string | undefined): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapApplicationFieldType(type: string | undefined): ApplyQuestion['type'] {
  switch (type) {
    case 'textarea':
      return 'long_text';
    case 'multiple-choice':
      return 'select';
    case 'multiple-select':
      return 'multi_select';
    default:
      return 'short_text';
  }
}

function buildDescription(posting: LeverPosting): string {
  const parts: string[] = [];
  if (posting.descriptionPlain) {
    parts.push(posting.descriptionPlain);
  } else if (posting.description) {
    parts.push(stripTags(posting.description));
  }
  if (posting.lists?.length) {
    for (const list of posting.lists) {
      parts.push(`\n${list.text}\n${stripTags(list.content)}`);
    }
  }
  if (posting.additionalPlain) {
    parts.push(`\n${posting.additionalPlain}`);
  } else if (posting.additional) {
    parts.push(`\n${stripTags(posting.additional)}`);
  }
  return parts.join('\n').trim();
}

function mapPosting(
  companyKey: string,
  companyId: string,
  companyName: string,
  posting: LeverPosting,
): NormalizedJob {
  const description = buildDescription(posting);
  const detail = posting as LeverPostingDetail;
  const applyQuestions: ApplyQuestion[] = (detail.applicationFields ?? []).map(
    (field, idx) => ({
      id: `customQuestions[${idx}]`,
      label: field.text,
      required: field.required ?? false,
      type: mapApplicationFieldType(field.type),
      options: field.options?.map((o) => o.text),
    }),
  );

  return {
    sourceProvider: 'lever',
    sourceId: posting.id,
    providerCompanyKey: companyKey,
    providerCompanyId: companyId,
    slug: buildSlug('lv', companyKey, posting.id, posting.text),
    title: posting.text,
    company: companyName,
    location: posting.categories?.location ?? null,
    description,
    industry: posting.categories?.team ?? posting.categories?.department ?? null,
    employmentType: posting.categories?.commitment ?? null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    url: posting.applyUrl ?? posting.hostedUrl,
    postedAt: posting.createdAt ? new Date(posting.createdAt).toISOString() : null,
    supportsInAppApply: true,
    applyQuestions,
  };
}

export class LeverProvider implements JobProvider {
  readonly id = 'lever' as const;
  readonly code = 'lv';

  constructor(private companyNames: Record<string, string> = {}) {}

  setCompanyName(companyKey: string, companyName: string) {
    this.companyNames[companyKey] = companyName;
  }

  async listForCompany(site: string): Promise<NormalizedJob[]> {
    const url = `https://api.lever.co/v0/postings/${site}?mode=json`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      throw new Error(`Lever list failed for ${site}: ${res.status}`);
    }
    const data = (await res.json()) as LeverPosting[];
    const companyKey = site.replace(/[^a-z0-9]/g, '');
    const companyName = this.companyNames[companyKey] || site;
    return data.map((posting) => mapPosting(companyKey, site, companyName, posting));
  }

  async fetchJob(site: string, jobId: string): Promise<NormalizedJob | null> {
    const url = `https://api.lever.co/v0/postings/${site}/${jobId}?mode=json`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Lever fetch failed: ${res.status}`);
    }
    const posting = (await res.json()) as LeverPostingDetail;
    const companyKey = site.replace(/[^a-z0-9]/g, '');
    const companyName = this.companyNames[companyKey] || site;
    return mapPosting(companyKey, site, companyName, posting);
  }

  async apply(
    site: string,
    job: NormalizedJob,
    candidate: ApplyCandidate,
  ): Promise<ApplyResult> {
    const url = `https://api.lever.co/v0/postings/${site}/${job.sourceId}?mode=json`;
    const form = new FormData();
    form.append('name', `${candidate.firstName} ${candidate.lastName}`.trim());
    form.append('email', candidate.email);
    if (candidate.phone) form.append('phone', candidate.phone);
    if (candidate.linkedinUrl) form.append('urls[LinkedIn]', candidate.linkedinUrl);
    form.append(
      'resume',
      new Blob([new Uint8Array(candidate.resumePdf)], { type: 'application/pdf' }),
      candidate.resumeFileName,
    );
    if (candidate.coverLetterPdf && candidate.coverLetterFileName) {
      form.append(
        'coverLetter',
        new Blob([new Uint8Array(candidate.coverLetterPdf)], { type: 'application/pdf' }),
        candidate.coverLetterFileName,
      );
    }
    if (candidate.answers) {
      for (const [fieldName, answer] of Object.entries(candidate.answers)) {
        if (Array.isArray(answer)) {
          for (const a of answer) form.append(fieldName, String(a));
        } else {
          form.append(fieldName, String(answer));
        }
      }
    }
    if (candidate.fileAnswers) {
      for (const [fieldName, file] of Object.entries(candidate.fileAnswers)) {
        form.append(
          fieldName,
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
        errors: [{ message: `Lever apply failed (${res.status}): ${text.slice(0, 200)}` }],
      };
    }

    const data = await res.json().catch(() => null);
    const providerApplicationId = data?.id ? String(data.id) : undefined;
    return { ok: true, providerApplicationId };
  }
}

export const leverProvider = new LeverProvider();
