import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { generateCV } from '@/lib/ai/cv-generator';
import {
  checkRateLimit,
  RATE_LIMITS,
  getRequestIdentifier,
} from '@/lib/security/rate-limiter';
import { resolveProvider, refundPlatformCredits, ProviderError } from '@/lib/ai/platform-provider';
import type {
  ParsedLinkedIn,
  JobVacancy,
  CVStyleConfig,
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

    // Resolve AI provider (handles own-key vs platform mode + credit deduction)
    let resolved;
    try {
      resolved = await resolveProvider({ userId, operation: 'cv-generate' });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    // Generate CV content using AI
    let content;
    let usage;
    try {
      const result = await generateCV(
        linkedInData,
        jobVacancy,
        resolved.providerName,
        resolved.apiKey,
        resolved.model,
        styleConfig,
        language,
        designTokens?.experienceDescriptionFormat || 'bullets'
      );
      content = result.content;
      usage = result.usage;
    } catch (err) {
      if (resolved.mode === 'platform') {
        await refundPlatformCredits(userId, 'cv-generate');
      }
      throw err;
    }

    // Create CV document in Firestore
    const db = getAdminDb();
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
      llmProvider: resolved.providerName,
      llmModel: resolved.model,
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
