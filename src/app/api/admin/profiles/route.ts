import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, getAllProfiles } from '@/lib/firebase/admin-utils';

/**
 * GET /api/admin/profiles
 * Get list of all saved profiles across all users (admin only).
 * Query params: limit, userId
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const isAdmin = await verifyAdminRequest(token);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '200', 10);
    const userId = searchParams.get('userId') || undefined;

    const result = await getAllProfiles(limit, userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin API] Error fetching profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}
