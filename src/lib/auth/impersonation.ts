import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export const IMPERSONATE_COOKIE_NAME = 'impersonate-uid';

interface EffectiveUser {
  userId: string;
  isImpersonating: boolean;
  adminUserId?: string;
}

/**
 * Get the effective userId for a request. If an admin is impersonating
 * another user, returns the impersonated user's ID.
 */
export async function getEffectiveUserId(request: NextRequest): Promise<EffectiveUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get('firebase-token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Unauthorized');
  }

  const decodedToken = await getAdminAuth().verifyIdToken(token);
  const callerUid = decodedToken.uid;

  // Check for impersonation cookie
  const impersonateUid = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;

  if (impersonateUid && impersonateUid !== callerUid) {
    // Verify the caller is an admin
    const isAdmin = decodedToken.admin === true;
    if (!isAdmin) {
      // Fallback: check Firestore role
      const db = getAdminDb();
      const userDoc = await db.collection('users').doc(callerUid).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        // Not an admin — ignore the impersonation cookie
        return { userId: callerUid, isImpersonating: false };
      }
    }

    // Verify the target user exists
    const db = getAdminDb();
    const targetDoc = await db.collection('users').doc(impersonateUid).get();
    if (!targetDoc.exists) {
      // Target user doesn't exist — ignore
      return { userId: callerUid, isImpersonating: false };
    }

    return {
      userId: impersonateUid,
      isImpersonating: true,
      adminUserId: callerUid,
    };
  }

  return { userId: callerUid, isImpersonating: false };
}
