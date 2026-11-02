import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { queueEmail } from '@/lib/email/send';
import { renderWelcomeEmail } from '@/lib/email/templates/welcome';
import { requireRecaptcha } from '@/lib/recaptcha/server';
import { enforceRateLimit, PERSISTENT_RATE_LIMITS } from '@/lib/security/rate-limiter';

const STARTER_FREE_CREDITS = 10;

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

    const rateLimited = await enforceRateLimit(uid, 'init-user', PERSISTENT_RATE_LIMITS.low);
    if (rateLimited) return rateLimited;

    // Optional body: { ageConfirmed: boolean } — recorded on first registration
    // as audit trail for AVG art. 8 (verification of 16+ at consent time).
    let ageConfirmed = false;
    let captchaToken: string | null = null;
    try {
      const body = await request.json();
      ageConfirmed = body?.ageConfirmed === true;
      captchaToken = typeof body?.captchaToken === 'string' ? body.captchaToken : null;
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

    // Security: starter-credits alleen bij een geslaagde server-side
    // reCAPTCHA-check. Voorheen kon een bot onbeperkt accounts aanmaken (de
    // captcha was puur client-side advies) en zo gratis platform-AI farmen.
    // Zonder geldige token wordt het account wél aangemaakt maar met 0 free
    // credits; de maandelijkse reset kent ze later alsnog toe.
    const captcha = await requireRecaptcha(captchaToken, 'init_user', 0.5);
    const starterCredits = captcha.valid ? STARTER_FREE_CREDITS : 0;
    if (!captcha.valid) {
      console.warn(`[Auth Init] captcha failed for ${uid} (score=${captcha.score ?? 'n/a'}) — no starter credits`);
    }

    await userRef.set({
      email: authUser.email || '',
      displayName: authUser.displayName || null,
      photoURL: authUser.photoURL || null,
      apiKey: null,
      llmMode: 'platform',
      credits: {
        free: starterCredits,
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
      credits: { free: starterCredits, purchased: 0 },
    });
  } catch (error) {
    console.error('[Auth Init] Failed to init user document:', error);
    return NextResponse.json(
      { error: 'Failed to initialize user' },
      { status: 500 }
    );
  }
}
