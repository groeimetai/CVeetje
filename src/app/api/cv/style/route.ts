import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { generateDesignTokens, createLinkedInSummaryV2 } from '@/lib/ai/style-generator-v2';
import { tokensToStyleConfig } from '@/lib/cv/templates/adapter';
import { resolveProvider, refundPlatformCredits, ProviderError } from '@/lib/ai/platform-provider';
import type {
  ParsedLinkedIn,
  JobVacancy,
  StyleCreativityLevel,
  CVDesignTokens,
} from '@/types';

// Reduced from 120s since we only make 1 API call now (was 12+)
export const maxDuration = 60; // seconds

export async function POST(request: NextRequest) {
  try {
    // Check if client wants streaming response (for backward compatibility)
    const acceptsStream = request.headers.get('Accept')?.includes('text/event-stream');

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
      creativityLevel = 'balanced',
      avatarUrl,
    } = body as {
      linkedInData: ParsedLinkedIn;
      jobVacancy: JobVacancy | null;
      userPreferences?: string;
      creativityLevel?: StyleCreativityLevel;
      avatarUrl?: string | null;
    };

    // Check if user has uploaded a photo
    const hasPhoto = !!avatarUrl;

    // Validate input
    if (!linkedInData || !linkedInData.fullName) {
      return NextResponse.json(
        { error: 'LinkedIn data is required' },
        { status: 400 }
      );
    }

    // Resolve AI provider (handles own-key vs platform mode + credit deduction)
    let resolved;
    try {
      resolved = await resolveProvider({ userId, operation: 'style-generate' });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    const db = getAdminDb();

    // Fetch recent style history for variety rotation (creative/experimental)
    let styleHistory: CVDesignTokens[] = [];
    if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
      try {
        const recentCvs = await db.collection('users').doc(userId).collection('cvs')
          .orderBy('createdAt', 'desc')
          .limit(10)
          .select('designTokens')
          .get();

        styleHistory = recentCvs.docs
          .map(doc => doc.data()?.designTokens)
          .filter(Boolean) as CVDesignTokens[];
        console.log(`[Style Gen v2] Loaded ${styleHistory.length} style history entries for variety rotation`);
      } catch (e) {
        console.warn('[Style Gen v2] Could not fetch style history, continuing without:', e);
      }
    }

    // Create a summary of LinkedIn data for style generation (v2)
    const linkedInSummary = createLinkedInSummaryV2(linkedInData);

    // If streaming is requested, use Server-Sent Events (simplified for v2)
    if (acceptsStream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial progress (v2 only has 1 step)
            const startProgress = JSON.stringify({
              type: 'progress',
              step: 1,
              totalSteps: 1,
              stepName: 'Generating style tokens',
              message: 'AI analyseert je profiel en genereert een gepersonaliseerde stijl...',
            });
            controller.enqueue(encoder.encode(`data: ${startProgress}\n\n`));

            // Generate design tokens with single LLM call
            console.log(`[Style Gen v2] Generating tokens: creativity=${creativityLevel}, hasPhoto=${hasPhoto}`);
            const { tokens, usage } = await generateDesignTokens(
              linkedInSummary,
              jobVacancy,
              resolved.providerName,
              resolved.apiKey,
              resolved.model,
              userPreferences,
              creativityLevel,
              hasPhoto,
              styleHistory
            );
            console.log(`[Style Gen v2] Complete: theme=${tokens.themeBase}, style="${tokens.styleName}", showPhoto=${tokens.showPhoto}`);

            // Convert to legacy CVStyleConfig for backward compatibility
            const styleConfig = tokensToStyleConfig(tokens);

            // Send final result
            const result = JSON.stringify({
              type: 'complete',
              success: true,
              styleConfig,
              tokens, // Also include new tokens
              usage,
            });
            controller.enqueue(encoder.encode(`data: ${result}\n\n`));
            controller.close();
          } catch (error) {
            console.error('[Style Gen v2] Error:', error);
            if (resolved.mode === 'platform') {
              await refundPlatformCredits(userId, 'style-generate');
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate style';
            const errorResult = JSON.stringify({
              type: 'error',
              error: errorMessage,
            });
            controller.enqueue(encoder.encode(`data: ${errorResult}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response
    console.log(`[Style Gen v2] Generating tokens: creativity=${creativityLevel}, hasPhoto=${hasPhoto}`);
    let tokens;
    let usage;
    try {
      const result = await generateDesignTokens(
        linkedInSummary,
        jobVacancy,
        resolved.providerName,
        resolved.apiKey,
        resolved.model,
        userPreferences,
        creativityLevel,
        hasPhoto,
        styleHistory
      );
      tokens = result.tokens;
      usage = result.usage;
    } catch (err) {
      if (resolved.mode === 'platform') {
        await refundPlatformCredits(userId, 'style-generate');
      }
      throw err;
    }
    console.log(`[Style Gen v2] Complete: theme=${tokens.themeBase}, style="${tokens.styleName}", showPhoto=${tokens.showPhoto}`);

    // Convert to legacy CVStyleConfig for backward compatibility
    const styleConfig = tokensToStyleConfig(tokens);

    return NextResponse.json({
      success: true,
      styleConfig,
      tokens, // Also include new tokens
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
