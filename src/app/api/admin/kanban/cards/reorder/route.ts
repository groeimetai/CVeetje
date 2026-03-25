import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST - Batch reorder cards after drag-and-drop
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
    const { updates } = body as {
      updates: { cardId: string; columnId: string; order: number }[];
    };

    if (!updates?.length) {
      return NextResponse.json({ error: 'Updates array is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const batch = db.batch();

    for (const update of updates) {
      const cardRef = db.collection('kanban_cards').doc(update.cardId);
      batch.update(cardRef, {
        columnId: update.columnId,
        order: update.order,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering kanban cards:', error);
    return NextResponse.json({ error: 'Failed to reorder cards' }, { status: 500 });
  }
}
