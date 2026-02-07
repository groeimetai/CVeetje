import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb, getAdminStorage } from '@/lib/firebase/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single global template
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const doc = await db.collection('globalTemplates').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const data = doc.data();
    return NextResponse.json({
      success: true,
      template: {
        id: doc.id,
        ...data,
        uploadedAt: data?.uploadedAt?.toDate?.() || new Date(),
      },
    });
  } catch (error) {
    console.error('Error fetching global template:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

// PATCH - Rename a global template
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
    const { name } = body as { name?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection('globalTemplates').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await docRef.update({ name: name.trim() });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming global template:', error);
    return NextResponse.json({ error: 'Failed to rename template' }, { status: 500 });
  }
}

// DELETE - Delete a global template
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
    const docRef = db.collection('globalTemplates').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const data = doc.data();

    // Delete from storage
    if (data?.storagePath) {
      try {
        const storage = getAdminStorage();
        const bucket = storage.bucket();
        await bucket.file(data.storagePath).delete();
      } catch (storageError) {
        console.warn('Failed to delete template file from storage:', storageError);
      }
    }

    // Remove from all users' assignedTemplates
    const usersSnapshot = await db.collection('users')
      .where('assignedTemplates', 'array-contains', id)
      .get();

    const batch = db.batch();
    usersSnapshot.docs.forEach(userDoc => {
      const assigned: string[] = userDoc.data().assignedTemplates || [];
      batch.update(userDoc.ref, {
        assignedTemplates: assigned.filter(tid => tid !== id),
      });
    });

    // Delete the template document
    batch.delete(docRef);
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting global template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
