import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createFeedbackGitHubIssue, isOwnStorageUrl } from '@/lib/github/feedback-issue';
import { enforceRateLimit, PERSISTENT_RATE_LIMITS } from '@/lib/security/rate-limiter';

// GET - List user's own feedback
const FEEDBACK_FIELD_ALLOWLIST = [
  'description',
  'priority',
  'useCase',
  'expectedBehavior',
  'severity',
  'stepsToReproduce',
  'actualBehavior',
  'browserInfo',
  'category',
  'message',
] as const;

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
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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

    const rateLimited = await enforceRateLimit(userId, 'feedback-create', PERSISTENT_RATE_LIMITS.low);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { type, title, imageUrls } = body;
    // Security: allow-list i.p.v. `...fields` — voorheen kon de client
    // vertrouwde velden (userId, userEmail, status, githubIssueUrl) overschrijven
    // en zo ook de daglimiet omzeilen.
    const fields: Record<string, string> = {};
    for (const key of FEEDBACK_FIELD_ALLOWLIST) {
      const v = body[key];
      if (typeof v === 'string' && v.trim()) fields[key] = v.slice(0, 5000);
    }

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

    const safeImageUrls = Array.isArray(imageUrls) ? imageUrls.filter(isOwnStorageUrl).slice(0, 3) : [];
    const feedbackData = {
      ...fields,
      type,
      status: 'new',
      userId,
      userEmail,
      userDisplayName,
      title: String(title).trim().slice(0, 200),
      imageUrls: safeImageUrls,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('feedback').add(feedbackData);

    // Create GitHub issue (non-blocking — don't fail feedback if this fails;
    // admin can lazy-create later via the comments endpoint).
    const ghIssue = await createFeedbackGitHubIssue({
      type,
      title: title.trim(),
      fields,
      imageUrls: safeImageUrls,
      submitterId: userId,
    });

    if (ghIssue) {
      await docRef.update({
        githubIssueNumber: ghIssue.number,
        githubIssueUrl: ghIssue.url,
      });
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 });
  }
}
