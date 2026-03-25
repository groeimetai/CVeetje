import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE - Delete own feedback (only if status is 'new')
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = getAdminDb();
    const feedbackRef = db.collection('feedback').doc(id);
    const feedbackDoc = await feedbackRef.get();

    if (!feedbackDoc.exists) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const data = feedbackDoc.data()!;

    // Only owner can delete
    if (data.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only delete if status is still 'new'
    if (data.status !== 'new') {
      return NextResponse.json({ error: 'Cannot delete feedback that is already being reviewed' }, { status: 400 });
    }

    await feedbackRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
