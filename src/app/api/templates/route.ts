import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb, getAdminStorage } from '@/lib/firebase/admin';
import { getPDFPageCount } from '@/lib/pdf/template-filler';
import { analyzeTemplate } from '@/lib/docx/smart-template-filler';
import type { PDFTemplateSummary, PDFTemplate, TemplateFileType } from '@/types';

const MAX_TEMPLATES_PER_USER = 10;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Supported file types
const SUPPORTED_TYPES: Record<string, TemplateFileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

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
        fileType: data.fileType || 'pdf', // Default to pdf for backwards compatibility
        pageCount: data.pageCount,
        fieldCount: data.fields?.length || 0,
        placeholderCount: data.placeholders?.length || 0,
        autoAnalyzed: data.autoAnalyzed || false,
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
    const fileType = SUPPORTED_TYPES[file.type];
    if (!fileType) {
      // Check if it's an old .doc file
      if (file.type === 'application/msword' || file.name.toLowerCase().endsWith('.doc')) {
        return NextResponse.json(
          { error: 'Old Word format (.doc) is not supported. Please convert to .docx (Word 2007+) first.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Only PDF and DOCX files are allowed' },
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

    // Get page count and analyze template
    let pageCount: number;
    let detectedPatternsCount = 0;
    let autoAnalyzed = false;

    try {
      if (fileType === 'pdf') {
        pageCount = await getPDFPageCount(fileBytes);
      } else {
        // DOCX file - analyze structure
        const docxBuffer = fileBuffer;

        // Auto-analyze DOCX template
        try {
          const analysis = await analyzeTemplate(docxBuffer);
          // Estimate page count based on text length (~3000 chars per page)
          pageCount = Math.max(1, Math.ceil(analysis.text.length / 3000));
          detectedPatternsCount = analysis.detectedPatterns.length;
          autoAnalyzed = detectedPatternsCount > 0;
        } catch (analysisError) {
          console.error('Failed to auto-analyze DOCX template:', analysisError);
          console.error('File name:', file.name, 'File type:', file.type, 'File size:', file.size);
          return NextResponse.json(
            { error: `Invalid DOCX file: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}` },
            { status: 400 }
          );
        }
      }
    } catch {
      return NextResponse.json(
        { error: `Invalid ${fileType.toUpperCase()} file` },
        { status: 400 }
      );
    }

    // Upload to Firebase Storage
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const storagePath = `templates/${userId}/${Date.now()}-${file.name}`;
    const fileRef = bucket.file(storagePath);

    await fileRef.save(Buffer.from(fileBytes), {
      metadata: {
        contentType: file.type,
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
      fileType,
      storageUrl: signedUrl,
      pageCount,
      fields: [], // Fields will be added later via configuration (for PDFs)
      placeholders: [], // Legacy field - smart filler detects patterns dynamically
      autoAnalyzed,
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
