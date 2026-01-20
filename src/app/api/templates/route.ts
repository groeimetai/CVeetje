import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb, getAdminStorage } from '@/lib/firebase/admin';
import { getPDFPageCount } from '@/lib/pdf/template-filler';
import type { PDFTemplateSummary, PDFTemplate } from '@/types';

const MAX_TEMPLATES_PER_USER = 10;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// GET - List all templates for the user
export async function GET(request: NextRequest) {
  try {
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

    // Get all templates for the user
    const templatesSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('templates')
      .orderBy('updatedAt', 'desc')
      .get();

    const templates: PDFTemplateSummary[] = templatesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        fileName: data.fileName,
        pageCount: data.pageCount,
        fieldCount: data.fields?.length || 0,
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : data.updatedAt?.toDate?.() || new Date(),
      };
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Upload a new template
export async function POST(request: NextRequest) {
  try {
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

    // Check template limit
    const existingTemplates = await db
      .collection('users')
      .doc(userId)
      .collection('templates')
      .count()
      .get();

    if (existingTemplates.data().count >= MAX_TEMPLATES_PER_USER) {
      return NextResponse.json(
        { error: `Maximum ${MAX_TEMPLATES_PER_USER} templates allowed` },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;

    if (!file || !name) {
      return NextResponse.json(
        { error: 'File and name are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // Read file bytes
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    // Get page count
    let pageCount: number;
    try {
      pageCount = await getPDFPageCount(fileBytes);
    } catch {
      return NextResponse.json(
        { error: 'Invalid PDF file' },
        { status: 400 }
      );
    }

    // Upload to Firebase Storage
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const fileName = `templates/${userId}/${Date.now()}-${file.name}`;
    const fileRef = bucket.file(fileName);

    await fileRef.save(Buffer.from(fileBytes), {
      metadata: {
        contentType: 'application/pdf',
      },
    });

    // Get download URL
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '2099-01-01', // Long-lived URL
    });

    // Create template document
    const now = new Date();
    const templateData: Omit<PDFTemplate, 'id'> = {
      name,
      fileName: file.name,
      storageUrl: signedUrl,
      pageCount,
      fields: [], // Fields will be added later via configuration
      createdAt: now,
      updatedAt: now,
      userId,
    };

    const docRef = await db
      .collection('users')
      .doc(userId)
      .collection('templates')
      .add(templateData);

    return NextResponse.json({
      success: true,
      template: {
        id: docRef.id,
        ...templateData,
      },
    });
  } catch (error) {
    console.error('Error uploading template:', error);
    return NextResponse.json(
      { error: 'Failed to upload template' },
      { status: 500 }
    );
  }
}
