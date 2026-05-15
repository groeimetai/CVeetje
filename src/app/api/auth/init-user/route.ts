import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { queueEmail } from '@/lib/email/send';
import { renderWelcomeEmail } from '@/lib/email/templates/welcome';

/**
 * POST /api/auth/init-user
 * Creates the Firestore user document after successful Firebase Auth sign-in.
 * Uses Admin SDK to bypass Firestore security rules so we can safely set
 * credits, apiKey, and role fields that are blocked for client-side writes.
 */
export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Optional body: { ageConfirmed: boolean } — recorded on first registration
    // as audit trail for AVG art. 8 (verification of 16+ at consent time).
    let ageConfirmed = false;
    try {
      const body = await request.json();
      ageConfirmed = body?.ageConfirmed === true;
    } catch {
      // No body or invalid JSON — treat as not confirmed (OAuth flow today)
    }

    const db = getAdminDb();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // Document already exists — return current credits
      const data = userDoc.data();
      const credits = (data?.credits || {}) as {
        free?: number;
        purchased?: number;
      };
      return NextResponse.json({
        success: true,
        created: false,
        credits: {
          free: credits.free ?? 0,
          purchased: credits.purchased ?? 0,
        },
      });
    }

    // Fetch full Auth user record for reliable profile data
    const authUser = await auth.getUser(uid);

    await userRef.set({
      email: authUser.email || '',
      displayName: authUser.displayName || null,
      photoURL: authUser.photoURL || null,
      apiKey: null,
      llmMode: 'platform',
      credits: {
        free: 10,
        purchased: 0,
        lastFreeReset: Timestamp.now(),
      },
      role: 'user',
      ageConfirmed,
      ageConfirmedAt: ageConfirmed ? FieldValue.serverTimestamp() : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Send welcome email (fire-and-forget)
    if (authUser.email) {
      const { subject, html } = renderWelcomeEmail({
        displayName: authUser.displayName || 'daar',
      });
      queueEmail(authUser.email, subject, html);
    }

    return NextResponse.json({
      success: true,
      created: true,
      credits: { free: 10, purchased: 0 },
    });
  } catch (error) {
    console.error('[Auth Init] Failed to init user document:', error);
    return NextResponse.json(
      { error: 'Failed to initialize user' },
      { status: 500 }
    );
  }
}
