import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, getAllCVs } from '@/lib/firebase/admin-utils';

/**
 * GET /api/admin/cvs
 * Get list of all CVs across all users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-token')?.value;

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
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const userId = searchParams.get('userId') || undefined;
    const status = searchParams.get('status') || undefined;

    const result = await getAllCVs(limit, userId, status);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin API] Error fetching CVs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CVs' },
      { status: 500 }
    );
  }
}
