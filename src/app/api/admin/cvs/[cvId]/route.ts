import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, deleteAdminCV } from '@/lib/firebase/admin-utils';

/**
 * DELETE /api/admin/cvs/[cvId]
 * Delete a specific CV (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cvId: string }> }
) {
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

    const { cvId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    await deleteAdminCV(userId, cvId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin API] Error deleting CV:', error);
    return NextResponse.json(
      { error: 'Failed to delete CV' },
      { status: 500 }
    );
  }
}
