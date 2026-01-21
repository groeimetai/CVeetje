import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { setupInitialAdmin } from '@/lib/firebase/admin-utils';

/**
 * POST /api/admin/setup
 * One-time setup to configure the initial admin user
 * Requires the requesting user's email to match ADMIN_EMAIL env var
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    // Verify the token and get user email
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userEmail = decodedToken.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'No email associated with this account' },
        { status: 400 }
      );
    }

    // Setup the admin user
    const result = await setupInitialAdmin(userEmail);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('[Admin API] Error in admin setup:', error);
    return NextResponse.json(
      { error: 'Failed to setup admin' },
      { status: 500 }
    );
  }
}
