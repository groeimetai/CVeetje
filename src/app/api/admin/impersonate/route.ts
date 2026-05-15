import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { IMPERSONATE_COOKIE_NAME } from '@/lib/auth/impersonation';
import { logAdminAction, extractRequestContext } from '@/lib/admin/audit-log';

async function verifyAdmin(token: string): Promise<string | null> {
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);

    // Check custom claims first
    if (decodedToken.admin === true) {
      return decodedToken.uid;
    }

    // Fallback: check Firestore role
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists && userDoc.data()?.role === 'admin') {
      return decodedToken.uid;
    }

    return null;
  } catch {
    return null;
  }
}

// POST: Start impersonation
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('firebase-token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUid = await verifyAdmin(token);
  if (!adminUid) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { userId } = body;

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Cannot impersonate yourself
  if (userId === adminUid) {
    return NextResponse.json({ error: 'Cannot impersonate yourself' }, { status: 400 });
  }

  // Verify target user exists
  const db = getAdminDb();
  const targetDoc = await db.collection('users').doc(userId).get();
  if (!targetDoc.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const targetData = targetDoc.data();

  // Set impersonation cookie
  const response = NextResponse.json({
    success: true,
    impersonating: {
      userId,
      email: targetData?.email || null,
      displayName: targetData?.displayName || null,
    },
  });

  response.cookies.set(IMPERSONATE_COOKIE_NAME, userId, {
    path: '/',
    maxAge: 3600, // 1 hour
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  // AVG art. 32 — log toegang tot persoonsgegevens van een andere gebruiker
  logAdminAction({
    adminUid,
    action: 'impersonate.start',
    targetUid: userId,
    metadata: { targetEmail: targetData?.email || null },
    ...extractRequestContext(request),
  });

  return response;
}

// GET: Check current impersonation status
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('firebase-token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUid = await verifyAdmin(token);
  if (!adminUid) {
    return NextResponse.json({ impersonating: null });
  }

  const impersonateUid = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;
  if (!impersonateUid) {
    return NextResponse.json({ impersonating: null });
  }

  // Fetch impersonated user data
  const db = getAdminDb();
  const targetDoc = await db.collection('users').doc(impersonateUid).get();
  if (!targetDoc.exists) {
    // Target user no longer exists — clear cookie
    const response = NextResponse.json({ impersonating: null });
    response.cookies.delete(IMPERSONATE_COOKIE_NAME);
    return response;
  }

  const targetData = targetDoc.data();

  return NextResponse.json({
    impersonating: {
      userId: impersonateUid,
      email: targetData?.email || null,
      displayName: targetData?.displayName || null,
    },
  });
}

// DELETE: Stop impersonation
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('firebase-token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUid = await verifyAdmin(token);
  const impersonateUid = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;

  const response = NextResponse.json({ success: true });
  response.cookies.delete(IMPERSONATE_COOKIE_NAME);

  if (adminUid && impersonateUid) {
    logAdminAction({
      adminUid,
      action: 'impersonate.stop',
      targetUid: impersonateUid,
      ...extractRequestContext(request),
    });
  }

  return response;
}
