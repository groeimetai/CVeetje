/**
 * PATCH /api/cv/[id]/content
 *
 * Persist inline content edits from the click-to-edit-on-preview flow.
 * No AI, no credits — purely a Firestore update. The frontend debounces
 * calls so the live preview re-renders instantly while the network
 * round-trip happens in the background.
 *
 * Body: { generatedContent: GeneratedCVContent }
 *
 * The validation is shape-only — the editor only writes string fields
 * (titles, descriptions, bullets) and never touches the structural shape,
 * so we just sanity-check the top-level fields exist as the right types.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { getEffectiveUserId } from '@/lib/auth/impersonation';
import type { GeneratedCVContent } from '@/types';

export const runtime = 'nodejs';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateContent(raw: unknown): { ok: true; content: GeneratedCVContent } | { ok: false; error: string } {
  if (!isPlainObject(raw)) return { ok: false, error: 'generatedContent must be an object' };
  if (typeof raw.headline !== 'string') return { ok: false, error: 'headline must be a string' };
  if (typeof raw.summary !== 'string') return { ok: false, error: 'summary must be a string' };
  if (!Array.isArray(raw.experience)) return { ok: false, error: 'experience must be an array' };
  if (!Array.isArray(raw.education)) return { ok: false, error: 'education must be an array' };
  if (!isPlainObject(raw.skills)) return { ok: false, error: 'skills must be an object' };
  return { ok: true, content: raw as unknown as GeneratedCVContent };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: cvId } = await context.params;

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
  const validation = validateContent(body.generatedContent);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection('users').doc(effectiveUserId).collection('cvs').doc(cvId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await ref.update({
    generatedContent: validation.content,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
