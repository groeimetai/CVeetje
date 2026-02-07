import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb, getAdminStorage } from '@/lib/firebase/admin';
import type { PDFTemplate, PDFTemplateField } from '@/types';

// GET - Get a specific template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = getAdminDb();

    // Get the template - first try personal collection
    let templateDoc = await db
      .collection('users')
      .doc(userId)
      .collection('templates')
      .doc(id)
      .get();

    let isGlobal = false;

    // If not found in personal, check globalTemplates (if user has it assigned)
    if (!templateDoc.exists) {
      const userDoc = await db.collection('users').doc(userId).get();
      const assignedTemplates: string[] = userDoc.data()?.assignedTemplates || [];

      if (assignedTemplates.includes(id)) {
        templateDoc = await db.collection('globalTemplates').doc(id).get();
        isGlobal = true;
      }

      if (!templateDoc.exists) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
    }

    const data = templateDoc.data();

    if (isGlobal) {
      // Return global template with adapted shape
      const fileName = data?.fileName || '';
      const fileType = fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
      const template: PDFTemplate = {
        id: templateDoc.id,
        name: data?.name,
        fileName,
        fileType: fileType as 'pdf' | 'docx',
        storageUrl: data?.storageUrl,
        pageCount: 1,
        fields: [],
        placeholders: [],
        autoAnalyzed: true,
        createdAt: data?.uploadedAt instanceof Date ? data.uploadedAt : data?.uploadedAt?.toDate?.() || new Date(),
        updatedAt: data?.uploadedAt instanceof Date ? data.uploadedAt : data?.uploadedAt?.toDate?.() || new Date(),
        userId: data?.uploadedBy,
      };

      return NextResponse.json({
        success: true,
        template,
        isGlobal: true,
      });
    }

    const template: PDFTemplate = {
      id: templateDoc.id,
      name: data?.name,
      fileName: data?.fileName,
      fileType: data?.fileType || 'pdf', // Default to pdf for backwards compatibility
      storageUrl: data?.storageUrl,
      pageCount: data?.pageCount,
      fields: data?.fields || [],
      placeholders: data?.placeholders || [],
      autoAnalyzed: data?.autoAnalyzed || false,
      createdAt: data?.createdAt instanceof Date ? data.createdAt : data?.createdAt?.toDate?.() || new Date(),
      updatedAt: data?.updatedAt instanceof Date ? data.updatedAt : data?.updatedAt?.toDate?.() || new Date(),
      userId: data?.userId,
    };

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PATCH - Update template (name or fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = getAdminDb();
    const body = await request.json();
    const { name, fields } = body as { name?: string; fields?: PDFTemplateField[] };

    // Check if this is a global template (block modification)
    const globalDoc = await db.collection('globalTemplates').doc(id).get();
    if (globalDoc.exists) {
      return NextResponse.json({ error: 'Cannot modify a global template' }, { status: 403 });
    }

    // Get the template to verify ownership
    const templateRef = db
      .collection('users')
      .doc(userId)
      .collection('templates')
      .doc(id);

    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }

    if (fields !== undefined) {
      // Validate fields
      if (!Array.isArray(fields)) {
        return NextResponse.json({ error: 'Fields must be an array' }, { status: 400 });
      }
      updateData.fields = fields;
    }

    // Update the template
    await templateRef.update(updateData);

    // Get the updated template
    const updatedDoc = await templateRef.get();
    const data = updatedDoc.data();

    return NextResponse.json({
      success: true,
      template: {
        id: updatedDoc.id,
        ...data,
        createdAt: data?.createdAt instanceof Date ? data.createdAt : data?.createdAt?.toDate?.() || new Date(),
        updatedAt: data?.updatedAt instanceof Date ? data.updatedAt : data?.updatedAt?.toDate?.() || new Date(),
      },
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = getAdminDb();

    // Check if this is a global template (block deletion via user API)
    const globalDoc = await db.collection('globalTemplates').doc(id).get();
    if (globalDoc.exists) {
      return NextResponse.json({ error: 'Cannot delete a global template' }, { status: 403 });
    }

    // Get the template to verify ownership and get storage URL
    const templateRef = db
      .collection('users')
      .doc(userId)
      .collection('templates')
      .doc(id);

    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const data = templateDoc.data();

    // Delete from storage if URL exists
    if (data?.storageUrl) {
      try {
        const storage = getAdminStorage();
        const bucket = storage.bucket();

        // Extract file path from URL
        const urlPattern = /templates\/[^/]+\/[^?]+/;
        const match = data.storageUrl.match(urlPattern);
        if (match) {
          const filePath = decodeURIComponent(match[0]);
          await bucket.file(filePath).delete();
        }
      } catch (storageError) {
        console.warn('Failed to delete template file from storage:', storageError);
        // Continue with document deletion even if storage deletion fails
      }
    }

    // Delete the template document
    await templateRef.delete();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
