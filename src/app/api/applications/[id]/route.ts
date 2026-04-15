import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { getEffectiveUserId } from '@/lib/auth/impersonation';
import type { ApplicationStatus } from '@/types/application';

export const runtime = 'nodejs';

const VALID_STATUSES: ApplicationStatus[] = [
  'applied',
  'interview',
  'offer',
  'rejected',
  'accepted',
  'withdrawn',
];

async function effectiveId(request: NextRequest): Promise<string | null> {
  try {
    const effective = await getEffectiveUserId(request);
    return effective.userId;
  } catch {
    return null;
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const effectiveUserId = await effectiveId(request);
  if (!effectiveUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if ('status' in body) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    update.status = body.status;
  }
  if ('notes' in body) {
    update.notes = typeof body.notes === 'string' ? body.notes : '';
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });
  }

  update.updatedAt = FieldValue.serverTimestamp();

  const db = getAdminDb();
  const ref = db
    .collection('users')
    .doc(effectiveUserId)
    .collection('applications')
    .doc(id);

  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await ref.update(update);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const effectiveUserId = await effectiveId(request);
  if (!effectiveUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  await db
    .collection('users')
    .doc(effectiveUserId)
    .collection('applications')
    .doc(id)
    .delete();

  return NextResponse.json({ ok: true });
}
