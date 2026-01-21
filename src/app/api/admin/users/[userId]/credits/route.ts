import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminRequest,
  getUserById,
  updateUserCredits,
} from '@/lib/firebase/admin-utils';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * PATCH /api/admin/users/[userId]/credits
 * Update user credits (admin only)
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
    const { free, purchased, addFree, addPurchased } = body as {
      free?: number;
      purchased?: number;
      addFree?: number;
      addPurchased?: number;
    };

    // Get current user data
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate new values
    let newFree = user.credits.free;
    let newPurchased = user.credits.purchased;

    // If absolute values provided, use them
    if (free !== undefined) {
      if (free < 0) {
        return NextResponse.json(
          { error: 'Credits cannot be negative' },
          { status: 400 }
        );
      }
      newFree = free;
    }

    if (purchased !== undefined) {
      if (purchased < 0) {
        return NextResponse.json(
          { error: 'Credits cannot be negative' },
          { status: 400 }
        );
      }
      newPurchased = purchased;
    }

    // If relative values provided, add them
    if (addFree !== undefined) {
      newFree = Math.max(0, newFree + addFree);
    }

    if (addPurchased !== undefined) {
      newPurchased = Math.max(0, newPurchased + addPurchased);
    }

    // Update credits
    await updateUserCredits(userId, newFree, newPurchased);

    return NextResponse.json({
      success: true,
      credits: {
        free: newFree,
        purchased: newPurchased,
        total: newFree + newPurchased,
      },
    });
  } catch (error) {
    console.error('[Admin API] Error updating credits:', error);
    return NextResponse.json(
      { error: 'Failed to update credits' },
      { status: 500 }
    );
  }
}
