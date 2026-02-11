import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { generateMotivationLetter } from '@/lib/ai/motivation-generator';
import { FieldValue } from 'firebase-admin/firestore';
import { resolveProvider, ProviderError } from '@/lib/ai/platform-provider';
import type {
  CV,
  GeneratedCVContent,
  ParsedLinkedIn,
  JobVacancy,
  OutputLanguage,
  GeneratedMotivationLetter,
} from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cvId } = await params;

    // Parse request body
    const body = await request.json();
    const personalMotivation = body.personalMotivation as string | undefined;
    const language = (body.language as OutputLanguage) || 'nl';

    // Get auth token from cookie or header
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const db = getAdminDb();

    // Check user credits (motivation letter costs 1 credit)
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const freeCredits = userData?.credits?.free ?? 0;
    const purchasedCredits = userData?.credits?.purchased ?? 0;
    const totalCredits = freeCredits + purchasedCredits;

    if (!userData || totalCredits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits.' },
        { status: 402 }
      );
    }

    // Resolve AI provider (skipCreditDeduction — this route handles its own credits)
    let resolved;
    try {
      resolved = await resolveProvider({ userId, skipCreditDeduction: true });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    // Get CV document
    const cvDoc = await db
      .collection('users')
      .doc(userId)
      .collection('cvs')
      .doc(cvId)
      .get();

    if (!cvDoc.exists) {
      return NextResponse.json(
        { error: 'CV not found' },
        { status: 404 }
      );
    }

    const cvData = cvDoc.data() as CV;

    if (!cvData.generatedContent) {
      return NextResponse.json(
        { error: 'CV content not generated yet. Generate CV first.' },
        { status: 400 }
      );
    }

    if (!cvData.jobVacancy) {
      return NextResponse.json(
        { error: 'No job vacancy linked to this CV. A motivation letter requires a target job.' },
        { status: 400 }
      );
    }

    // Generate motivation letter
    const { letter, usage } = await generateMotivationLetter(
      cvData.linkedInData as ParsedLinkedIn,
      cvData.jobVacancy as JobVacancy,
      cvData.generatedContent as GeneratedCVContent,
      resolved.providerName,
      resolved.apiKey,
      resolved.model,
      language,
      personalMotivation
    );

    // Deduct credit (use free credits first, then purchased)
    if (freeCredits >= 1) {
      await db.collection('users').doc(userId).update({
        'credits.free': FieldValue.increment(-1),
        updatedAt: new Date(),
      });
    } else {
      await db.collection('users').doc(userId).update({
        'credits.purchased': FieldValue.increment(-1),
        updatedAt: new Date(),
      });
    }

    // Log transaction
    const creditSource = freeCredits >= 1 ? 'free' : 'purchased';
    await db.collection('users').doc(userId).collection('transactions').add({
      amount: -1,
      type: 'motivation_letter',
      description: `Motivation letter generation (${creditSource} credit)`,
      molliePaymentId: null,
      cvId,
      createdAt: new Date(),
    });

    // Optionally save the letter to the CV document
    await db
      .collection('users')
      .doc(userId)
      .collection('cvs')
      .doc(cvId)
      .update({
        motivationLetter: letter,
        updatedAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      letter,
      usage,
    });
  } catch (error) {
    console.error('Motivation letter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate motivation letter' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve saved motivation letter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cvId } = await params;

    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const db = getAdminDb();

    // Get CV document
    const cvDoc = await db
      .collection('users')
      .doc(userId)
      .collection('cvs')
      .doc(cvId)
      .get();

    if (!cvDoc.exists) {
      return NextResponse.json(
        { error: 'CV not found' },
        { status: 404 }
      );
    }

    const cvData = cvDoc.data() as CV & { motivationLetter?: GeneratedMotivationLetter };

    if (!cvData.motivationLetter) {
      return NextResponse.json({
        success: true,
        letter: null,
      });
    }

    return NextResponse.json({
      success: true,
      letter: cvData.motivationLetter,
    });
  } catch (error) {
    console.error('Get motivation letter error:', error);
    return NextResponse.json(
      { error: 'Failed to get motivation letter' },
      { status: 500 }
    );
  }
}
