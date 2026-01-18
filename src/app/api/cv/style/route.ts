import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/encryption';
import { generateCVStyle, createLinkedInSummary } from '@/lib/ai/style-generator';
import type {
  ParsedLinkedIn,
  JobVacancy,
  LLMProvider,
  StyleCreativityLevel,
} from '@/types';

// Allow longer execution time for AI generation
export const maxDuration = 120; // seconds

export async function POST(request: NextRequest) {
  try {
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

    // Get request body
    const body = await request.json();
    const {
      linkedInData,
      jobVacancy,
      userPreferences,
      creativityLevel,
    } = body as {
      linkedInData: ParsedLinkedIn;
      jobVacancy: JobVacancy | null;
      userPreferences?: string;
      creativityLevel?: StyleCreativityLevel;
    };

    // Validate input
    if (!linkedInData || !linkedInData.fullName) {
      return NextResponse.json(
        { error: 'LinkedIn data is required' },
        { status: 400 }
      );
    }

    // Get user data with API key
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (!userData?.apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please add your API key in Settings.' },
        { status: 400 }
      );
    }

    // Decrypt API key
    const apiKey = decrypt(userData.apiKey.encryptedKey);
    const provider = userData.apiKey.provider as LLMProvider;
    const model = userData.apiKey.model;

    // Create a summary of LinkedIn data for style generation
    const linkedInSummary = createLinkedInSummary(linkedInData);

    // Generate style configuration using AI
    const { styleConfig, usage } = await generateCVStyle(
      linkedInSummary,
      jobVacancy,
      provider,
      apiKey,
      model,
      userPreferences,
      creativityLevel
    );

    return NextResponse.json({
      success: true,
      styleConfig,
      usage,
    });
  } catch (error) {
    console.error('Style generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate style';

    // Check for specific API errors
    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your settings.' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      return NextResponse.json(
        { error: 'API rate limit reached. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
