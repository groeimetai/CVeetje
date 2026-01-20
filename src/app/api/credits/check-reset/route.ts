import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

const MONTHLY_FREE_CREDITS = 5;
const RESET_DAY_OF_MONTH = 1;

/**
 * POST /api/credits/check-reset
 * 
 * Checks if user is eligible for monthly credit reset and performs reset if needed.
 * This must be done server-side to prevent credit manipulation.
 */
export async function POST(request: NextRequest) {
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

    const db = getAdminDb();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if credits need to be reset
    const credits = userData.credits;
    const now = new Date();

    // If credits not initialized, reset them
    if (!credits || !credits.lastFreeReset) {
      await performReset(userRef, 0);
      return NextResponse.json({ 
        success: true, 
        reset: true, 
        message: 'Credits initialized' 
      });
    }

    // Get last reset date
    let lastResetDate: Date;
    if (credits.lastFreeReset && typeof credits.lastFreeReset.toDate === 'function') {
      lastResetDate = credits.lastFreeReset.toDate();
    } else if (credits.lastFreeReset instanceof Date) {
      lastResetDate = credits.lastFreeReset;
    } else {
      // Invalid date, reset credits
      await performReset(userRef, credits.free ?? 0);
      return NextResponse.json({ 
        success: true, 
        reset: true, 
        message: 'Credits reset (invalid date)' 
      });
    }

    // Check if we're in a new month since last reset
    const isNewMonth =
      now.getMonth() !== lastResetDate.getMonth() ||
      now.getFullYear() !== lastResetDate.getFullYear();

    // Only reset if it's a new month and we're past the reset day
    if (isNewMonth && now.getDate() >= RESET_DAY_OF_MONTH) {
      await performReset(userRef, credits.free ?? 0);
      return NextResponse.json({ 
        success: true, 
        reset: true, 
        message: 'Monthly credits reset' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      reset: false, 
      message: 'No reset needed' 
    });

  } catch (error) {
    console.error('Credit reset check error:', error);
    return NextResponse.json(
      { error: 'Failed to check/reset credits' },
      { status: 500 }
    );
  }
}

async function performReset(
  userRef: FirebaseFirestore.DocumentReference,
  currentFree: number
) {
  // Reset free credits to 5 (separate bucket from purchased)
  await userRef.update({
    'credits.free': MONTHLY_FREE_CREDITS,
    'credits.lastFreeReset': new Date(),
    updatedAt: new Date(),
  });

  // Log transaction if credits were actually added
  const creditsAdded = MONTHLY_FREE_CREDITS - currentFree;
  if (creditsAdded > 0) {
    await userRef.collection('transactions').add({
      amount: creditsAdded,
      type: 'monthly_free',
      description: `Monthly free credits reset (${currentFree} → ${MONTHLY_FREE_CREDITS})`,
      molliePaymentId: null,
      cvId: null,
      createdAt: new Date(),
    });
  }
}
