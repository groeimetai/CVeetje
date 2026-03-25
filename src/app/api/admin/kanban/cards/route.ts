import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST - Create a new card
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { boardId, columnId, title, description, tagIds } = body as {
      boardId: string;
      columnId: string;
      title: string;
      description?: string;
      tagIds?: string[];
    };

    if (!boardId || !columnId || !title?.trim()) {
      return NextResponse.json({ error: 'boardId, columnId, and title are required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify board exists
    const boardRef = db.collection('kanban_boards').doc(boardId);
    const boardDoc = await boardRef.get();
    if (!boardDoc.exists) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userRecord = await auth.getUser(decodedToken.uid);

    const cardData = {
      boardId,
      columnId,
      title: title.trim(),
      description: (description || '').trim(),
      tagIds: tagIds || [],
      order: Date.now(),
      createdBy: decodedToken.uid,
      createdByName: userRecord.displayName || userRecord.email || '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('kanban_cards').add(cardData);

    // Increment card count on board
    await boardRef.update({
      cardCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      card: {
        id: docRef.id,
        ...cardData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error creating kanban card:', error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
