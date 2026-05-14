import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { generateMotivationLetter } from '@/lib/ai/motivation-generator';
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

    // Get CV document — validate before charging credits
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

    // Resolve AI provider — deducts motivation-letter credits (platform mode only)
    let resolved;
    try {
      resolved = await resolveProvider({ userId, operation: 'motivation-letter' });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    // Generate motivation letter — credits already deducted by resolveProvider above.
    // If this call throws, refund via refundPlatformCredits is handled below.
    let letter;
    let usage;
    try {
      const result = await generateMotivationLetter(
        cvData.linkedInData as ParsedLinkedIn,
        cvData.jobVacancy as JobVacancy,
        cvData.generatedContent as GeneratedCVContent,
        resolved.providerName,
        resolved.apiKey,
        resolved.model,
        language,
        personalMotivation
      );
      letter = result.letter;
      usage = result.usage;
    } catch (genErr) {
      // Refund credits on generator failure (platform mode only)
      if (resolved.mode === 'platform') {
        const { refundPlatformCredits } = await import('@/lib/ai/platform-provider');
        await refundPlatformCredits(userId, 'motivation-letter').catch(() => {});
      }
      throw genErr;
    }

    // Save the letter to the CV document
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
    const message = error instanceof Error && error.message
      ? error.message
      : 'Failed to generate motivation letter';
    return NextResponse.json(
      { error: message },
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
