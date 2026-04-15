import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { resolveJobBySlug } from '@/lib/jobs/resolve';
import { getProvider } from '@/lib/jobs/providers/registry';
import type { ApplyCandidate } from '@/lib/jobs/providers/types';
import type { ApplicationRecord } from '@/types/application';

export const runtime = 'nodejs';

async function verifyUser(request: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get('firebase-token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const userId = await verifyUser(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const firstName = String(form.get('firstName') ?? '').trim();
  const lastName = String(form.get('lastName') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const phone = (form.get('phone') as string | null)?.trim() || undefined;
  const linkedinUrl = (form.get('linkedinUrl') as string | null)?.trim() || undefined;
  const cvId = (form.get('cvId') as string | null)?.trim() || null;
  const rawAnswers = form.get('answers');

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: 'firstName, lastName, email required' }, { status: 400 });
  }

  const cvFile = form.get('cv');
  if (!(cvFile instanceof Blob)) {
    return NextResponse.json({ error: 'CV file (PDF) required' }, { status: 400 });
  }

  const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
  const cvFileName =
    ('name' in cvFile && typeof (cvFile as unknown as File).name === 'string'
      ? (cvFile as unknown as File).name
      : null) || `cv-${firstName}-${lastName}.pdf`;

  let coverLetterBuffer: Buffer | undefined;
  let coverLetterFileName: string | undefined;
  const coverLetterFile = form.get('coverLetter');
  if (coverLetterFile instanceof Blob) {
    coverLetterBuffer = Buffer.from(await coverLetterFile.arrayBuffer());
    coverLetterFileName =
      ('name' in coverLetterFile && typeof (coverLetterFile as unknown as File).name === 'string'
        ? (coverLetterFile as unknown as File).name
        : null) || `cover-letter-${firstName}-${lastName}.pdf`;
  }

  let answers: Record<string, string | string[] | boolean> | undefined;
  if (typeof rawAnswers === 'string' && rawAnswers.length > 0) {
    try {
      answers = JSON.parse(rawAnswers) as typeof answers;
    } catch {
      return NextResponse.json({ error: 'answers must be valid JSON' }, { status: 400 });
    }
  }

  // Extract file:<questionId> entries (custom ATS attachment questions)
  const fileAnswers: Record<string, { buffer: Buffer; fileName: string; mimeType: string }> = {};
  for (const [key, value] of form.entries()) {
    if (!key.startsWith('file:') || !(value instanceof Blob)) continue;
    const questionId = key.slice('file:'.length);
    if (!questionId) continue;
    const buffer = Buffer.from(await value.arrayBuffer());
    const fileName =
      ('name' in value && typeof (value as unknown as File).name === 'string'
        ? (value as unknown as File).name
        : null) || `${questionId}.bin`;
    fileAnswers[questionId] = {
      buffer,
      fileName,
      mimeType: value.type || 'application/octet-stream',
    };
  }

  const job = await resolveJobBySlug(slug).catch(() => null);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  if (!job.supportsInAppApply) {
    return NextResponse.json(
      { error: 'This job does not support in-app apply' },
      { status: 400 },
    );
  }
  if (!job.providerCompanyId) {
    return NextResponse.json(
      { error: 'Missing provider company configuration' },
      { status: 500 },
    );
  }

  const provider = getProvider(job.sourceProvider);
  if (!provider) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 500 });
  }

  const candidate: ApplyCandidate = {
    firstName,
    lastName,
    email,
    phone,
    linkedinUrl,
    resumePdf: cvBuffer,
    resumeFileName: cvFileName,
    coverLetterPdf: coverLetterBuffer,
    coverLetterFileName,
    answers,
    fileAnswers: Object.keys(fileAnswers).length > 0 ? fileAnswers : undefined,
  };

  const providerResult = await provider
    .apply(job.providerCompanyId, job, candidate)
    .catch((err) => {
      console.error('[apply]', err);
      return {
        ok: false as const,
        errors: [{ message: err instanceof Error ? err.message : 'Unknown error' }],
      };
    });

  if (!providerResult.ok) {
    return NextResponse.json(
      { error: 'Application rejected by provider', details: providerResult.errors },
      { status: 502 },
    );
  }

  const db = getAdminDb();
  const appRef = db.collection('users').doc(userId).collection('applications').doc();
  const now = new Date().toISOString();

  const record: Omit<ApplicationRecord, 'id'> = {
    userId,
    jobSlug: job.slug,
    jobTitle: job.title,
    jobCompany: job.company,
    jobLocation: job.location,
    jobUrl: job.url,
    provider: job.sourceProvider,
    providerCompanyId: job.providerCompanyId,
    providerApplicationId: providerResult.providerApplicationId ?? null,
    cvId,
    status: 'applied',
    appliedAt: now,
    updatedAt: now,
  };

  await appRef.set({
    ...record,
    appliedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    applicationId: appRef.id,
    providerApplicationId: providerResult.providerApplicationId ?? null,
  });
}
