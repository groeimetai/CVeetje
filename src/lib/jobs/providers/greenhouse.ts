import type {
  ApplyCandidate,
  ApplyQuestion,
  ApplyResult,
  JobProvider,
  NormalizedJob,
} from './types';
import { buildSlug } from './types';

interface GreenhouseJob {
  id: number;
  internal_job_id?: number;
  title: string;
  updated_at?: string;
  requisition_id?: string;
  location?: { name?: string };
  absolute_url: string;
  company_name?: string;
  metadata?: unknown;
  departments?: Array<{ id: number; name: string }>;
  offices?: Array<{ id: number; name: string }>;
  content?: string; // HTML description, returned on single-job fetch
  questions?: GreenhouseQuestion[];
  compliance?: GreenhouseQuestion[];
}

interface GreenhouseQuestion {
  required?: boolean;
  private?: boolean;
  label?: string;
  description?: string;
  fields?: Array<{
    name: string;
    type: string;
    values?: Array<{ label: string; value: string | number }>;
  }>;
}

interface GreenhouseListResponse {
  jobs: GreenhouseJob[];
  meta?: { total?: number };
}

function stripTags(input: string | undefined): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function mapFieldType(type: string): ApplyQuestion['type'] {
  switch (type) {
    case 'textarea':
      return 'long_text';
    case 'multi_value_single_select':
      return 'select';
    case 'multi_value_multi_select':
      return 'multi_select';
    case 'input_file':
      return 'attachment';
    case 'yes_no':
      return 'boolean';
    default:
      return 'short_text';
  }
}

function extractQuestions(raw: GreenhouseQuestion[] | undefined): ApplyQuestion[] {
  if (!raw) return [];
  const out: ApplyQuestion[] = [];
  for (const q of raw) {
    if (!q.fields || q.fields.length === 0) continue;
    for (const field of q.fields) {
      if (field.type === 'input_file') continue; // handled separately (resume/cover)
      if (field.name === 'first_name' || field.name === 'last_name') continue;
      if (field.name === 'email') continue;
      if (field.name === 'phone') continue;
      if (field.name === 'resume_text') continue;
      if (field.name === 'cover_letter_text') continue;
      const options = field.values?.map((v) => v.label);
      const description = q.description ? stripTags(q.description) : undefined;
      out.push({
        id: field.name,
        label: q.label || field.name,
        required: q.required ?? false,
        type: mapFieldType(field.type),
        ...(options && options.length > 0 ? { options } : {}),
        ...(description ? { description } : {}),
      });
    }
  }
  return out;
}

function mapJob(
  companyKey: string,
  companyId: string,
  companyName: string,
  raw: GreenhouseJob,
): NormalizedJob {
  const description = raw.content ? stripTags(decodeHtml(raw.content)) : '';
  const applyQuestions = extractQuestions([...(raw.questions ?? []), ...(raw.compliance ?? [])]);

  return {
    sourceProvider: 'greenhouse',
    sourceId: String(raw.id),
    providerCompanyKey: companyKey,
    providerCompanyId: companyId,
    slug: buildSlug('gh', companyKey, String(raw.id), raw.title),
    title: raw.title,
    company: companyName,
    location: raw.location?.name ?? null,
    description,
    industry: raw.departments?.[0]?.name ?? null,
    employmentType: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    url: raw.absolute_url,
    postedAt: raw.updated_at ?? null,
    supportsInAppApply: true,
    applyQuestions,
  };
}

export class GreenhouseProvider implements JobProvider {
  readonly id = 'greenhouse' as const;
  readonly code = 'gh';

  constructor(private companyNames: Record<string, string> = {}) {}

  setCompanyName(companyKey: string, companyName: string) {
    this.companyNames[companyKey] = companyName;
  }

  async listForCompany(boardToken: string): Promise<NormalizedJob[]> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      throw new Error(`Greenhouse list failed for ${boardToken}: ${res.status}`);
    }
    const data = (await res.json()) as GreenhouseListResponse;
    const companyKey = boardToken.replace(/[^a-z0-9]/g, '');
    const companyName = this.companyNames[companyKey] || boardToken;
    return (data.jobs ?? []).map((job) =>
      mapJob(companyKey, boardToken, companyName, job),
    );
  }

  async fetchJob(boardToken: string, jobId: string): Promise<NormalizedJob | null> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?questions=true`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Greenhouse fetch failed: ${res.status}`);
    }
    const raw = (await res.json()) as GreenhouseJob;
    const companyKey = boardToken.replace(/[^a-z0-9]/g, '');
    const companyName = this.companyNames[companyKey] || boardToken;
    return mapJob(companyKey, boardToken, companyName, raw);
  }

  async apply(
    boardToken: string,
    job: NormalizedJob,
    candidate: ApplyCandidate,
  ): Promise<ApplyResult> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${job.sourceId}`;
    const form = new FormData();
    form.append('first_name', candidate.firstName);
    form.append('last_name', candidate.lastName);
    form.append('email', candidate.email);
    if (candidate.phone) form.append('phone', candidate.phone);
    form.append(
      'resume',
      new Blob([new Uint8Array(candidate.resumePdf)], { type: 'application/pdf' }),
      candidate.resumeFileName,
    );
    if (candidate.coverLetterPdf && candidate.coverLetterFileName) {
      form.append(
        'cover_letter',
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

    const auth = Buffer.from(`${boardToken}:`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        errors: [{ message: `Greenhouse apply failed (${res.status}): ${text.slice(0, 200)}` }],
      };
    }

    const data = await res.json().catch(() => null);
    const providerApplicationId = data?.id ? String(data.id) : undefined;
    return { ok: true, providerApplicationId };
  }
}

export const greenhouseProvider = new GreenhouseProvider();
