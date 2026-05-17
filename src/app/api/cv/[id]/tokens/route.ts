/**
 * PATCH /api/cv/[id]/tokens
 *
 * Persist tweaked design tokens from the live tweaks-panel. No AI, no
 * credits — purely a Firestore update. The frontend debounces calls so
 * the live preview re-renders instantly while the network round-trip
 * happens in the background.
 *
 * Body: { designTokens: CVDesignTokens }
 *
 * The schema is intentionally loose (just shape-validated, not enum-locked)
 * because the AI may have produced experimental v4 fields the static enum
 * lists don't cover; we trust the frontend's controls to emit valid values
 * and rely on the renderer to fall back gracefully on unknown enum values.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { getEffectiveUserId } from '@/lib/auth/impersonation';
import type { CVDesignTokens } from '@/types/design-tokens';
import { CVStyleTokensV2Schema, type CVStyleTokensV2 } from '@/lib/cv-engine/tokens';

export const runtime = 'nodejs';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isValidHex(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);
}

type TokensValidationResult =
  | { ok: true; engine: 'v1'; tokens: CVDesignTokens }
  | { ok: true; engine: 'v2'; tokens: CVStyleTokensV2 }
  | { ok: false; error: string };

function validateTokens(raw: unknown): TokensValidationResult {
  if (!isPlainObject(raw)) return { ok: false, error: 'designTokens must be an object' };

  // Discriminate v2 by engineVersion === 'v2'. Falls through to legacy v1
  // validation otherwise so existing CVs keep working.
  if (raw.engineVersion === 'v2') {
    const parsed = CVStyleTokensV2Schema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: `v2 tokens invalid: ${parsed.error.issues[0]?.message ?? 'unknown'}` };
    }
    return { ok: true, engine: 'v2', tokens: parsed.data };
  }

  // Legacy v1 validation — colors object with 5 hex fields.
  const colors = raw.colors;
  if (!isPlainObject(colors)) return { ok: false, error: 'colors required' };
  for (const k of ['primary', 'secondary', 'accent', 'text', 'muted']) {
    if (!isValidHex(colors[k])) {
      return { ok: false, error: `colors.${k} must be #RRGGBB` };
    }
  }
  // fontPairing must be a string (renderer falls back on unknown values)
  if (typeof raw.fontPairing !== 'string') {
    return { ok: false, error: 'fontPairing must be a string' };
  }
  // sectionOrder must be an array of strings when present
  if ('sectionOrder' in raw && raw.sectionOrder !== undefined) {
    if (!Array.isArray(raw.sectionOrder) || raw.sectionOrder.some(s => typeof s !== 'string')) {
      return { ok: false, error: 'sectionOrder must be string[]' };
    }
  }
  return { ok: true, engine: 'v1', tokens: raw as unknown as CVDesignTokens };
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
  const validation = validateTokens(body.designTokens);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection('users').doc(effectiveUserId).collection('cvs').doc(cvId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    designTokens: validation.tokens,
    updatedAt: FieldValue.serverTimestamp(),
  };
  // Legacy colorScheme mirror only applies to v1 tokens — v2 derives colors
  // from the recipe and any paletteOverride, no flat hex equivalent.
  if (validation.engine === 'v1') {
    updates['colorScheme.primary'] = validation.tokens.colors.primary;
    updates['colorScheme.secondary'] = validation.tokens.colors.secondary;
    updates['colorScheme.accent'] = validation.tokens.colors.accent;
  }
  await ref.update(updates);

  return NextResponse.json({ ok: true });
}
