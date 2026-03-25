import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RouteParams {
  params: Promise<{ boardId: string }>;
}

// GET - Get board with all its cards
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const boardDoc = await db.collection('kanban_boards').doc(boardId).get();

    if (!boardDoc.exists) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const boardData = boardDoc.data()!;
    const board = {
      id: boardDoc.id,
      title: boardData.title,
      description: boardData.description,
      columns: boardData.columns || [],
      tags: boardData.tags || [],
      cardCount: boardData.cardCount || 0,
      createdBy: boardData.createdBy,
      createdByName: boardData.createdByName || '',
      createdAt: boardData.createdAt?.toDate?.() || new Date(),
      updatedAt: boardData.updatedAt?.toDate?.() || new Date(),
    };

    const cardsSnapshot = await db
      .collection('kanban_cards')
      .where('boardId', '==', boardId)
      .orderBy('order', 'asc')
      .get();

    const cards = cardsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        boardId: data.boardId,
        columnId: data.columnId,
        title: data.title,
        description: data.description || '',
        tagIds: data.tagIds || [],
        order: data.order,
        createdBy: data.createdBy,
        createdByName: data.createdByName || '',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    });

    return NextResponse.json({ success: true, board, cards });
  } catch (error) {
    console.error('Error fetching kanban board:', error);
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}

// PATCH - Update board (title, description, columns, tags)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, columns, tags } = body as {
      title?: string;
      description?: string;
      columns?: { id: string; title: string; color: string; order: number }[];
      tags?: { id: string; label: string; color: string }[];
    };

    const db = getAdminDb();
    const boardRef = db.collection('kanban_boards').doc(boardId);
    const boardDoc = await boardRef.get();

    if (!boardDoc.exists) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (tags !== undefined) updateData.tags = tags;

    // If columns changed, check for removed columns and cascade-delete their cards
    if (columns !== undefined) {
      const oldColumns = boardDoc.data()!.columns || [];
      const newColumnIds = new Set(columns.map(c => c.id));
      const removedColumnIds = oldColumns
        .map((c: { id: string }) => c.id)
        .filter((id: string) => !newColumnIds.has(id));

      if (removedColumnIds.length > 0) {
        // Delete cards in removed columns
        let deletedCount = 0;
        for (const columnId of removedColumnIds) {
          const cardsInColumn = await db
            .collection('kanban_cards')
            .where('boardId', '==', boardId)
            .where('columnId', '==', columnId)
            .get();

          if (!cardsInColumn.empty) {
            const batch = db.batch();
            cardsInColumn.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            deletedCount += cardsInColumn.size;
          }
        }

        if (deletedCount > 0) {
          updateData.cardCount = FieldValue.increment(-deletedCount);
        }
      }

      updateData.columns = columns;
    }

    await boardRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating kanban board:', error);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

// DELETE - Delete board and all its cards
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { boardId } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();

    // Delete all cards belonging to this board
    const cardsSnapshot = await db
      .collection('kanban_cards')
      .where('boardId', '==', boardId)
      .get();

    if (!cardsSnapshot.empty) {
      // Batch delete in chunks of 500 (Firestore limit)
      const chunks = [];
      for (let i = 0; i < cardsSnapshot.docs.length; i += 500) {
        chunks.push(cardsSnapshot.docs.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    // Delete the board itself
    await db.collection('kanban_boards').doc(boardId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting kanban board:', error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
