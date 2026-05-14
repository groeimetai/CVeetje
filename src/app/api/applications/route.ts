import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { getEffectiveUserId } from '@/lib/auth/impersonation';
import { resolveJobBySlug } from '@/lib/jobs/resolve';
import type { ApplicationRecord, ApplicationStatus } from '@/types/application';

export const runtime = 'nodejs';

function serializeDate(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

function toApplicationRecord(
  id: string,
  data: Record<string, unknown>,
): ApplicationRecord {
  return {
    id,
    userId: String(data.userId ?? ''),
    jobSlug: String(data.jobSlug ?? ''),
    jobTitle: String(data.jobTitle ?? ''),
    jobCompany: (data.jobCompany as string | null) ?? null,
    jobLocation: (data.jobLocation as string | null) ?? null,
    jobUrl: String(data.jobUrl ?? ''),
    provider: (data.provider as ApplicationRecord['provider']) ?? 'recruitee',
    providerCompanyId: (data.providerCompanyId as string | null) ?? null,
    providerApplicationId: (data.providerApplicationId as string | null) ?? null,
    cvId: (data.cvId as string | null) ?? null,
    status: (data.status as ApplicationStatus) ?? 'applied',
    notes: (data.notes as string | undefined) ?? undefined,
    appliedAt: serializeDate(data.appliedAt),
    updatedAt: serializeDate(data.updatedAt),
  };
}

export async function GET(request: NextRequest) {
  let effectiveUserId: string;
  try {
    const effective = await getEffectiveUserId(request);
    effectiveUserId = effective.userId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const snap = await db
    .collection('users')
    .doc(effectiveUserId)
    .collection('applications')
    .orderBy('appliedAt', 'desc')
    .limit(100)
    .get();

  const applications = snap.docs.map((doc) =>
    toApplicationRecord(doc.id, doc.data() as Record<string, unknown>),
  );

  return NextResponse.json({ applications });
}

/**
 * Record a manually-tracked application (jobs without 1-click apply support, e.g.
 * Adzuna redirects). Distinct from `/api/jobs/[slug]/apply` which actually submits
 * the candidate via the ATS — here we only create the tracker row.
 */
export async function POST(request: NextRequest) {
  let effectiveUserId: string;
  try {
    const effective = await getEffectiveUserId(request);
    effectiveUserId = effective.userId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const jobSlug = String(body.jobSlug ?? '').trim();
  if (!jobSlug) {
    return NextResponse.json({ error: 'jobSlug required' }, { status: 400 });
  }

  const cvId = typeof body.cvId === 'string' && body.cvId ? body.cvId : null;
  const notes = typeof body.notes === 'string' ? body.notes : undefined;

  const job = await resolveJobBySlug(jobSlug).catch(() => null);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const db = getAdminDb();
  const appsCol = db
    .collection('users')
    .doc(effectiveUserId)
    .collection('applications');

  // Prevent duplicate manual entries for the same job.
  const existing = await appsCol.where('jobSlug', '==', jobSlug).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json(
      {
        ok: true,
        applicationId: existing.docs[0].id,
        duplicate: true,
      },
      { status: 200 },
    );
  }

  const appRef = appsCol.doc();
  const record: Omit<ApplicationRecord, 'id' | 'appliedAt' | 'updatedAt'> & {
    notes?: string;
  } = {
    userId: effectiveUserId,
    jobSlug: job.slug,
    jobTitle: job.title,
    jobCompany: job.company,
    jobLocation: job.location,
    jobUrl: job.url,
    provider: job.sourceProvider,
    providerCompanyId: job.providerCompanyId,
    providerApplicationId: null,
    cvId,
    status: 'applied',
    ...(notes ? { notes } : {}),
  };

  await appRef.set({
    ...record,
    appliedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, applicationId: appRef.id });
}
