import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb, getAdminStorage } from '@/lib/firebase/admin';
import { extractDocxText } from '@/lib/docx/smart-template-filler';
import type { GlobalTemplate } from '@/types';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// GET - List all global templates
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
    const snapshot = await db.collection('globalTemplates').orderBy('uploadedAt', 'desc').get();

    const templates: GlobalTemplate[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        fileName: data.fileName,
        storagePath: data.storagePath,
        storageUrl: data.storageUrl,
        uploadedBy: data.uploadedBy,
        uploadedAt: data.uploadedAt?.toDate?.() || new Date(),
        fileSize: data.fileSize || 0,
      };
    });

    // Count assignments per template
    const usersSnapshot = await db.collection('users')
      .where('assignedTemplates', '!=', null)
      .get();

    const assignmentCounts: Record<string, number> = {};
    usersSnapshot.docs.forEach(doc => {
      const assigned: string[] = doc.data().assignedTemplates || [];
      assigned.forEach(tid => {
        assignmentCounts[tid] = (assignmentCounts[tid] || 0) + 1;
      });
    });

    return NextResponse.json({
      success: true,
      templates,
      assignmentCounts,
    });
  } catch (error) {
    console.error('Error fetching global templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST - Upload a new global template
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 });
    }

    // Only DOCX for global templates
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isPdf = file.type === 'application/pdf';
    if (!isDocx && !isPdf) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    // Validate DOCX
    if (isDocx) {
      try {
        await extractDocxText(fileBuffer);
      } catch {
        return NextResponse.json({ error: 'Invalid DOCX file' }, { status: 400 });
      }
    }

    // Upload to storage
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const storagePath = `global-templates/${Date.now()}-${file.name}`;
    const fileRef = bucket.file(storagePath);

    await fileRef.save(Buffer.from(fileBytes), {
      metadata: { contentType: file.type },
    });

    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '2099-01-01',
    });

    // Get admin user ID
    const { getAdminAuth } = await import('@/lib/firebase/admin');
    const decodedToken = await getAdminAuth().verifyIdToken(token);

    const db = getAdminDb();
    const now = new Date();
    const templateData = {
      name,
      fileName: file.name,
      storagePath,
      storageUrl: signedUrl,
      uploadedBy: decodedToken.uid,
      uploadedAt: now,
      fileSize: file.size,
    };

    const docRef = await db.collection('globalTemplates').add(templateData);

    return NextResponse.json({
      success: true,
      template: { id: docRef.id, ...templateData },
    });
  } catch (error) {
    console.error('Error uploading global template:', error);
    return NextResponse.json({ error: 'Failed to upload template' }, { status: 500 });
  }
}
