import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { downloadTemplateFile } from '@/lib/firebase/storage-files';

/**
 * GET /api/templates/[id]/file
 *
 * Levert het template-bestand (DOCX/PDF) server-side uit voor de preview.
 * Vervangt het client-side `fetch(storageUrl)` op een lang-geldige signed URL:
 * toegang wordt nu per request gecontroleerd (eigen template of toegewezen
 * global template) en het werkt ook tegen de Storage-emulator.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('firebase-token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let userId: string;
  try {
    userId = (await getAdminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const db = getAdminDb();
  let doc = await db.collection('users').doc(userId).collection('templates').doc(id).get();
  if (!doc.exists) {
    const userDoc = await db.collection('users').doc(userId).get();
    const assigned: string[] = userDoc.data()?.assignedTemplates || [];
    if (assigned.includes(id)) {
      doc = await db.collection('globalTemplates').doc(id).get();
    }
  }
  if (!doc.exists) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const data = doc.data() ?? {};
  try {
    const file = await downloadTemplateFile({ storagePath: data.storagePath, storageUrl: data.storageUrl });
    const fileName: string = data.fileName || 'template';
    const isPdf = fileName.toLowerCase().endsWith('.pdf') || data.fileType === 'pdf';
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': isPdf
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[templates/file] download failed:', err);
    return NextResponse.json({ error: 'Failed to fetch template file' }, { status: 500 });
  }
}
