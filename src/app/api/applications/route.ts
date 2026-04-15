import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { getEffectiveUserId } from '@/lib/auth/impersonation';
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
