import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, getUserIdFromToken } from '@/lib/firebase/admin-utils';
import {
  getPlatformConfig,
  updatePlatformConfig,
  PLATFORM_OPERATIONS,
  type UpdatePlatformConfigInput,
} from '@/lib/ai/platform-config-reader';
import type { PlatformOperation } from '@/lib/ai/platform-config';

function getToken(request: NextRequest): string | null {
  return (
    request.cookies.get('firebase-token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '') ||
    null
  );
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await verifyAdminRequest(token);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const config = await getPlatformConfig();
  return NextResponse.json({ config });
}

export async function PATCH(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await verifyAdminRequest(token);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input: UpdatePlatformConfigInput = {};

  if (
    body &&
    typeof body === 'object' &&
    'models' in body &&
    body.models &&
    typeof body.models === 'object'
  ) {
    const submitted = body.models as Record<string, unknown>;
    const models: Partial<Record<PlatformOperation, string>> = {};

    for (const [op, value] of Object.entries(submitted)) {
      if (!PLATFORM_OPERATIONS.includes(op as PlatformOperation)) {
        return NextResponse.json(
          { error: `Unknown operation: ${op}` },
          { status: 400 },
        );
      }
      if (typeof value !== 'string' || value.trim().length === 0) {
        return NextResponse.json(
          { error: `Model for "${op}" must be a non-empty string` },
          { status: 400 },
        );
      }
      models[op as PlatformOperation] = value.trim();
    }

    input.models = models;
  }

  if (!input.models || Object.keys(input.models).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 },
    );
  }

  const config = await updatePlatformConfig(input, userId);
  return NextResponse.json({ config });
}
