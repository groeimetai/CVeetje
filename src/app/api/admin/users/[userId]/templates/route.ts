import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb } from '@/lib/firebase/admin';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET - Get user's assigned templates
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const assignedTemplates: string[] = userDoc.data()?.assignedTemplates || [];

    return NextResponse.json({
      success: true,
      assignedTemplates,
    });
  } catch (error) {
    console.error('Error fetching user templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// PUT - Replace user's assigned templates
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { assignedTemplates } = body as { assignedTemplates: string[] };

    if (!Array.isArray(assignedTemplates)) {
      return NextResponse.json({ error: 'assignedTemplates must be an array' }, { status: 400 });
    }

    const db = getAdminDb();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await userRef.update({ assignedTemplates });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user templates:', error);
    return NextResponse.json({ error: 'Failed to update templates' }, { status: 500 });
  }
}
