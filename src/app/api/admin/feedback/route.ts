import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb } from '@/lib/firebase/admin';

// GET - List all feedback (admin)
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

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const statusFilter = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const db = getAdminDb();
    let query = db.collection('feedback').orderBy('createdAt', 'desc').limit(limit);

    if (typeFilter && typeFilter !== 'all') {
      query = query.where('type', '==', typeFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      query = query.where('status', '==', statusFilter);
    }

    const snapshot = await query.get();

    const feedback = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    });

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('Error fetching admin feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
