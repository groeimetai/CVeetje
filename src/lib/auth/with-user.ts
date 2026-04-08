/**
 * `withUser()` — gedeelde auth-helper voor API-routes.
 *
 * Vervangt de 8-liner Firebase token-check die in ~51 routes letterlijk
 * gedupliceerd is, plus de twee aparte admin-check codepaths in
 * `admin-utils.verifyAdminRequest()` en `impersonation.getEffectiveUserId()`.
 *
 * Eén handler-signature met expliciete context:
 *   - `uid` — de daadwerkelijk ingelogde user
 *   - `effectiveUserId` — uid waarop data-operaties moeten gebeuren
 *     (gelijk aan uid, tenzij een admin een user impersonate via de
 *     `impersonate-uid` cookie)
 *   - `isImpersonating` — true als een admin een andere user impersonate
 *   - `isAdmin` — true als de ingelogde user admin-claim of -role heeft
 *   - `decodedToken` — volledige Firebase decoded token
 *
 * Routes met `requireAdmin: true` retourneren 403 als de user geen admin is.
 * Routes met `allowImpersonation: false` negeren de impersonate-cookie
 * (voor admin-only paden waar impersonation niet logisch is).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export const IMPERSONATE_COOKIE_NAME = 'impersonate-uid';

export interface AuthContext {
  /** UID van de daadwerkelijk ingelogde user (de "caller"). */
  uid: string;
  /**
   * UID waarop data-operaties moeten gebeuren. Gelijk aan `uid` tenzij
   * een admin een user impersonate via de `impersonate-uid` cookie.
   */
  effectiveUserId: string;
  /** True als de caller een admin is die een andere user impersonate. */
  isImpersonating: boolean;
  /** True als de caller admin-privileges heeft (custom claim of Firestore role). */
  isAdmin: boolean;
  /** Volledige decoded Firebase token voor geavanceerde routes. */
  decodedToken: DecodedIdToken;
}

export interface WithUserOptions {
  /** Vereis admin role. Routes zonder admin krijgen 403. Default: false. */
  requireAdmin?: boolean;
  /** Honor de impersonate-cookie als die aanwezig is. Default: true. */
  allowImpersonation?: boolean;
}

type HandlerFn = (request: NextRequest, ctx: AuthContext) => Promise<NextResponse>;

/**
 * Wrap een API-route handler met auth-resolutie.
 *
 * Gebruik:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   return withUser(request, async (req, { effectiveUserId }) => {
 *     const data = await fetchUserData(effectiveUserId);
 *     return NextResponse.json({ data });
 *   });
 * }
 * ```
 *
 * Met admin-check:
 * ```ts
 * return withUser(request, async (req, { uid, isAdmin }) => {
 *   // ...
 * }, { requireAdmin: true });
 * ```
 *
 * **Geen generics op de handler-return-type** — TypeScript zou anders het
 * generic infereren op het eerste `NextResponse.json()` dat hij ziet en
 * vervolgens andere response-types in dezelfde handler afkeuren. De
 * routes zijn zelf verantwoordelijk voor hun response types.
 */
export async function withUser(
  request: NextRequest,
  handler: HandlerFn,
  options: WithUserOptions = {},
): Promise<NextResponse> {
  const { requireAdmin = false, allowImpersonation = true } = options;

  // ---------- Token extraction ----------
  const cookieStore = await cookies();
  const token =
    cookieStore.get('firebase-token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---------- Token verification ----------
  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await getAdminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const callerUid = decodedToken.uid;

  // ---------- Admin resolution ----------
  // Custom claim wins (fastest), Firestore role is fallback. We only do the
  // Firestore lookup when needed (admin required, or impersonation requested).
  let isAdmin = decodedToken.admin === true;
  const needsAdminLookup = !isAdmin && (requireAdmin || (allowImpersonation && cookieStore.get(IMPERSONATE_COOKIE_NAME)));
  if (needsAdminLookup) {
    try {
      const userDoc = await getAdminDb().collection('users').doc(callerUid).get();
      if (userDoc.exists && userDoc.data()?.role === 'admin') {
        isAdmin = true;
      }
    } catch (err) {
      console.error('[withUser] Firestore admin lookup failed:', err);
    }
  }

  if (requireAdmin && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden — admin required' }, { status: 403 });
  }

  // ---------- Impersonation resolution ----------
  let effectiveUserId = callerUid;
  let isImpersonating = false;

  if (allowImpersonation && isAdmin) {
    const impersonateUid = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;
    if (impersonateUid && impersonateUid !== callerUid) {
      // Verify the target user exists before honoring the cookie
      try {
        const targetDoc = await getAdminDb().collection('users').doc(impersonateUid).get();
        if (targetDoc.exists) {
          effectiveUserId = impersonateUid;
          isImpersonating = true;
        }
      } catch (err) {
        console.error('[withUser] Impersonation target lookup failed:', err);
      }
    }
  }

  // ---------- Run handler ----------
  return handler(request, {
    uid: callerUid,
    effectiveUserId,
    isImpersonating,
    isAdmin,
    decodedToken,
  });
}
