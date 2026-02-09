import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import type { LLMMode } from '@/types';

const VALID_MODES: LLMMode[] = ['own-key', 'platform'];

export async function PATCH(request: NextRequest) {
  try {
    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { mode } = body as { mode: string };

    if (!mode || !VALID_MODES.includes(mode as LLMMode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` },
        { status: 400 }
      );
    }

    // Update user document
    const db = getAdminDb();
    await db.collection('users').doc(userId).update({
      llmMode: mode,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, mode });
  } catch (error) {
    console.error('LLM mode update error:', error);
    return NextResponse.json(
      { error: 'Failed to update LLM mode' },
      { status: 500 }
    );
  }
}
