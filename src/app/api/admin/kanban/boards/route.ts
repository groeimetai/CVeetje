import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// GET - List all kanban boards
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const snapshot = await db.collection('kanban_boards').orderBy('createdAt', 'desc').get();

    const boards = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        columns: data.columns || [],
        tags: data.tags || [],
        cardCount: data.cardCount || 0,
        createdBy: data.createdBy,
        createdByName: data.createdByName || '',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    });

    return NextResponse.json({ success: true, boards });
  } catch (error) {
    console.error('Error fetching kanban boards:', error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

// POST - Create a new kanban board
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
    const { title, description } = body as { title?: string; description?: string };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userRecord = await auth.getUser(decodedToken.uid);

    const defaultColumns = [
      { id: `col_${Date.now()}_0`, title: 'Backlog', color: '#9CA3AF', order: 0 },
      { id: `col_${Date.now()}_1`, title: 'In uitvoering', color: '#3B82F6', order: 1 },
      { id: `col_${Date.now()}_2`, title: 'Review', color: '#EAB308', order: 2 },
      { id: `col_${Date.now()}_3`, title: 'Afgerond', color: '#5F6F4E', order: 3 },
    ];

    const db = getAdminDb();
    const boardData = {
      title: title.trim(),
      description: (description || '').trim(),
      columns: defaultColumns,
      tags: [],
      cardCount: 0,
      createdBy: decodedToken.uid,
      createdByName: userRecord.displayName || userRecord.email || '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('kanban_boards').add(boardData);

    return NextResponse.json({
      success: true,
      board: {
        id: docRef.id,
        ...boardData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error creating kanban board:', error);
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
