import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import type { DisputeStatus } from '@/types';
import type { Timestamp } from 'firebase-admin/firestore';

export interface AdminDisputeSummary {
  disputeId: string;
  cvId: string;
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  reason: string;
  previousLevel: string;
  requestedLevel: string;
  status: DisputeStatus;
  attempt: number;
  aiVerdict?: 'approved' | 'rejected';
  aiRationale?: string;
  adminVerdict?: 'approved' | 'rejected';
  adminRationale?: string;
  createdAt: string;
  resolvedAt?: string;
}

/**
 * GET /api/admin/disputes
 * Lists all disputes across all users. Default filter: status=needs-human.
 * Query: ?status=needs-human|approved|rejected|all (default: needs-human)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = (searchParams.get('status') || 'needs-human') as DisputeStatus | 'all';

    const db = getAdminDb();
    const auth = getAdminAuth();

    // Scan every user's disputes subcollection. This is O(users) — acceptable
    // at admin-scale, and Firestore doesn't support cross-user collection-
    // group queries here without composite indexes.
    const usersSnap = await db.collection('users').get();
    const results: AdminDisputeSummary[] = [];

    // Batch-fetch emails for display
    const uids = usersSnap.docs.map(d => d.id);
    const authInfo = new Map<string, { email: string | null; displayName: string | null }>();
    for (let i = 0; i < uids.length; i += 100) {
      const batch = uids.slice(i, i + 100);
      try {
        const resp = await auth.getUsers(batch.map(uid => ({ uid })));
        for (const u of resp.users) {
          authInfo.set(u.uid, { email: u.email || null, displayName: u.displayName || null });
        }
      } catch {
        // Fall back individually
        for (const uid of batch) {
          try {
            const u = await auth.getUser(uid);
            authInfo.set(uid, { email: u.email || null, displayName: u.displayName || null });
          } catch {
            authInfo.set(uid, { email: null, displayName: null });
          }
        }
      }
    }

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const cvsSnap = await db.collection('users').doc(uid).collection('cvs').get();
      for (const cvDoc of cvsSnap.docs) {
        const disputesSnap = await cvDoc.ref.collection('disputes').get();
        for (const dDoc of disputesSnap.docs) {
          const d = dDoc.data();
          if (statusFilter !== 'all' && d.status !== statusFilter) continue;

          const info = authInfo.get(uid) || { email: null, displayName: null };
          results.push({
            disputeId: dDoc.id,
            cvId: cvDoc.id,
            userId: uid,
            userEmail: info.email,
            userDisplayName: info.displayName,
            reason: d.reason || '',
            previousLevel: d.previousLevel || '',
            requestedLevel: d.requestedLevel || '',
            status: d.status,
            attempt: d.attempt || 1,
            aiVerdict: d.aiVerdict,
            aiRationale: d.aiRationale,
            adminVerdict: d.adminVerdict,
            adminRationale: d.adminRationale,
            createdAt: (d.createdAt as Timestamp | undefined)?.toDate?.().toISOString() || new Date().toISOString(),
            resolvedAt: (d.resolvedAt as Timestamp | undefined)?.toDate?.().toISOString(),
          });
        }
      }
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ disputes: results, total: results.length });
  } catch (error) {
    console.error('[Admin Disputes] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
