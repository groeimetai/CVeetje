import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RouteParams {
  params: Promise<{ cardId: string }>;
}

// PATCH - Update a card
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { cardId } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, tagIds, columnId, order } = body as {
      title?: string;
      description?: string;
      tagIds?: string[];
      columnId?: string;
      order?: number;
    };

    const db = getAdminDb();
    const cardRef = db.collection('kanban_cards').doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (tagIds !== undefined) updateData.tagIds = tagIds;
    if (columnId !== undefined) updateData.columnId = columnId;
    if (order !== undefined) updateData.order = order;

    await cardRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating kanban card:', error);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

// DELETE - Delete a card
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { cardId } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const cardRef = db.collection('kanban_cards').doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const cardData = cardDoc.data()!;
    const boardId = cardData.boardId;

    await cardRef.delete();

    // Decrement card count on board
    if (boardId) {
      await db.collection('kanban_boards').doc(boardId).update({
        cardCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting kanban card:', error);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
