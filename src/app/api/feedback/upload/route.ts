import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getAdminAuth, getAdminStorage } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be smaller than 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExtension = file.type.split('/')[1] || 'jpg';
    const filename = `feedback/${userId}/${randomUUID()}.${fileExtension}`;

    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const fileRef = bucket.file(filename);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('Feedback image upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
