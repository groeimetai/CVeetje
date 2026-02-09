import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/encryption';
import { generateCV } from '@/lib/ai/cv-generator';
import {
  checkRateLimit,
  RATE_LIMITS,
  getRequestIdentifier,
} from '@/lib/security/rate-limiter';
import type {
  ParsedLinkedIn,
  JobVacancy,
  CVStyleConfig,
  LLMProvider,
  OutputLanguage,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';

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

    // Rate limiting for AI generation (expensive operation)
    const rateLimitResult = checkRateLimit(
      getRequestIdentifier(userId),
      'cv-generation',
      RATE_LIMITS.aiGeneration
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    // Get request body
    const body = await request.json();
    const {
      linkedInData,
      jobVacancy,
      styleConfig,
      designTokens,
      avatarUrl,
      language = 'nl',
    } = body as {
      linkedInData: ParsedLinkedIn;
      jobVacancy: JobVacancy | null;
      styleConfig: CVStyleConfig;
      designTokens?: CVDesignTokens;
      avatarUrl?: string | null;
      language?: OutputLanguage;
    };

    // Validate input
    if (!linkedInData || !linkedInData.fullName) {
      return NextResponse.json(
        { error: 'LinkedIn data is required' },
        { status: 400 }
      );
    }

    if (!styleConfig) {
      return NextResponse.json(
        { error: 'Style configuration is required' },
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

    // Generate CV content using AI
    const { content, usage } = await generateCV(
      linkedInData,
      jobVacancy,
      provider,
      apiKey,
      model,
      styleConfig,
      language,
      designTokens?.experienceDescriptionFormat || 'bullets'
    );

    // Create CV document in Firestore
    const cvRef = await db.collection('users').doc(userId).collection('cvs').add({
      linkedInData,
      jobVacancy,
      template: 'dynamic',  // Mark as dynamic style CV
      colorScheme: {        // Extract basic colors for compatibility
        primary: styleConfig.colors.primary,
        secondary: styleConfig.colors.secondary,
        accent: styleConfig.colors.accent,
      },
      brandStyle: null,
      styleConfig,
      designTokens: designTokens || null,
      avatarUrl: avatarUrl || null,
      generatedContent: content,
      pdfUrl: null,
      status: 'generated',
      llmProvider: provider,
      llmModel: model,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      cvId: cvRef.id,
      content,
      usage,
    });
  } catch (error) {
    console.error('CV generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate CV';

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
