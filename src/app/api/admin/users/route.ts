import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, getAllUsers } from '@/lib/firebase/admin-utils';

/**
 * GET /api/admin/users
 * Get paginated list of all users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie
    const token = request.cookies.get('firebase-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    // Verify admin access
    const isAdmin = await verifyAdminRequest(token);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const pageToken = searchParams.get('pageToken') || undefined;

    // Get users
    const result = await getAllUsers(limit, pageToken);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin API] Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
