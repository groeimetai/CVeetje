import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH - Update feedback status/notes (admin)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, adminNotes } = body as { status?: string; adminNotes?: string };

    const db = getAdminDb();
    const feedbackRef = db.collection('feedback').doc(id);
    const feedbackDoc = await feedbackRef.get();

    if (!feedbackDoc.exists) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const validStatuses = ['new', 'in_review', 'planned', 'in_progress', 'resolved', 'declined'];
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    await feedbackRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}

// DELETE - Delete feedback (admin)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const feedbackRef = db.collection('feedback').doc(id);
    const feedbackDoc = await feedbackRef.get();

    if (!feedbackDoc.exists) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    await feedbackRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
