import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminRequest,
  getUserById,
  getUserIdFromToken,
  setUserRole,
  disableUser,
  enableUser,
  deleteUser,
} from '@/lib/firebase/admin-utils';
import { logAdminAction, extractRequestContext } from '@/lib/admin/audit-log';
import type { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/admin/users/[userId]
 * Get a single user by ID (admin only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
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

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('[Admin API] Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[userId]
 * Update user (role, disabled status) (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
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

    const body = await request.json();
    const { role, disabled, disabledReason } = body as {
      role?: UserRole;
      disabled?: boolean;
      disabledReason?: string;
    };

    const adminUid = await getUserIdFromToken(token);
    const ctx = extractRequestContext(request);

    // Update role if provided
    if (role !== undefined) {
      if (role !== 'user' && role !== 'admin') {
        return NextResponse.json(
          { error: 'Invalid role. Must be "user" or "admin"' },
          { status: 400 }
        );
      }
      await setUserRole(userId, role);
      if (adminUid) {
        logAdminAction({
          adminUid,
          action: 'user.role.update',
          targetUid: userId,
          metadata: { role },
          ...ctx,
        });
      }
    }

    // Update disabled status if provided
    if (disabled !== undefined) {
      if (disabled) {
        await disableUser(userId, disabledReason);
        if (adminUid) {
          logAdminAction({
            adminUid,
            action: 'user.disable',
            targetUid: userId,
            metadata: { reason: disabledReason ?? null },
            ...ctx,
          });
        }
      } else {
        await enableUser(userId);
        if (adminUid) {
          logAdminAction({
            adminUid,
            action: 'user.enable',
            targetUid: userId,
            ...ctx,
          });
        }
      }
    }

    // Fetch and return updated user
    const updatedUser = await getUserById(userId);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('[Admin API] Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Delete a user completely (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
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

    // Confirm deletion is intentional via header
    const confirmHeader = request.headers.get('x-confirm-delete');
    if (confirmHeader !== 'true') {
      return NextResponse.json(
        { error: 'Missing confirmation header. Set x-confirm-delete: true to confirm.' },
        { status: 400 }
      );
    }

    const adminUid = await getUserIdFromToken(token);
    await deleteUser(userId);

    if (adminUid) {
      logAdminAction({
        adminUid,
        action: 'user.delete',
        targetUid: userId,
        ...extractRequestContext(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('[Admin API] Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
