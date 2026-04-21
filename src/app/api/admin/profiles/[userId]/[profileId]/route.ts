import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, getAdminProfileFull } from '@/lib/firebase/admin-utils';

/**
 * GET /api/admin/profiles/[userId]/[profileId]
 * Returns the full SavedProfile document (including raw ParsedLinkedIn) so
 * admins can debug missing/incorrect fields.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; profileId: string }> }
) {
  try {
    const token = request.cookies.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { userId, profileId } = await params;
    const profile = await getAdminProfileFull(userId, profileId);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[Admin API] Error fetching profile detail:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
