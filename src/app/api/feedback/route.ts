import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// GET - List user's own feedback
export async function GET(request: NextRequest) {
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

    const db = getAdminDb();
    const snapshot = await db
      .collection('feedback')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

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
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

// POST - Create new feedback
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth = getAdminAuth();
    let userId: string;
    let userEmail: string;
    let userDisplayName: string | null;
    try {
      const decodedToken = await auth.verifyIdToken(token);
      userId = decodedToken.uid;
      const userRecord = await auth.getUser(userId);
      userEmail = userRecord.email || '';
      userDisplayName = userRecord.displayName || null;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, imageUrls, ...fields } = body;

    // Basic validation
    if (!type || !['feature_request', 'bug_report', 'general_feedback'].includes(type)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Rate limiting: max 10 per user per day
    const db = getAdminDb();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await db
      .collection('feedback')
      .where('userId', '==', userId)
      .where('createdAt', '>', dayAgo)
      .count()
      .get();

    if (recentCount.data().count >= 10) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 10 submissions per day.' }, { status: 429 });
    }

    const feedbackData = {
      type,
      status: 'new',
      userId,
      userEmail,
      userDisplayName,
      title: title.trim(),
      imageUrls: Array.isArray(imageUrls) ? imageUrls.slice(0, 3) : [],
      ...fields,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('feedback').add(feedbackData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 });
  }
}
