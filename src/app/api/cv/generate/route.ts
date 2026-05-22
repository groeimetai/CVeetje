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
import { recordOperationUsage } from '@/lib/ai/usage-tracker';
import type {
  ParsedLinkedIn,
  JobVacancy,
  OutputLanguage,
  FitAnalysis,
  StyleCreativityLevel,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import type { RequiredItemsSelection } from '@/types/cv';

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
      designTokens,
      avatarUrl,
      language = 'nl',
      fitAnalysis,
      creativityLevel,
      includeInterests = false,
      requiredSelection,
    } = body as {
      linkedInData: ParsedLinkedIn;
      jobVacancy: JobVacancy | null;
      designTokens: CVDesignTokens;
      avatarUrl?: string | null;
      language?: OutputLanguage;
      fitAnalysis?: FitAnalysis | null;
      creativityLevel?: StyleCreativityLevel;
      includeInterests?: boolean;
      requiredSelection?: RequiredItemsSelection;
    };

    // Validate input
    if (!linkedInData || !linkedInData.fullName) {
      return NextResponse.json(
        { error: 'LinkedIn data is required' },
        { status: 400 }
      );
    }

    if (!designTokens) {
      return NextResponse.json(
        { error: 'Design tokens are required' },
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

    // Worker that does the actual generation + Firestore write. Returns the
    // payload that the JSON-response path would have returned. Both code paths
    // (SSE + plain JSON) call this so credit refunds and Firestore semantics
    // stay identical.
    const runGeneration = async () => {
      let content;
      let usage;
      try {
        const result = await generateCV(
          linkedInData,
          jobVacancy,
          resolved.providerName,
          resolved.apiKey,
          resolved.model,
          designTokens,
          language,
          designTokens.experienceDescriptionFormat || 'bullets',
          fitAnalysis,
          includeInterests,
          requiredSelection,
        );
        content = result.content;
        usage = result.usage;
      } catch (err) {
        if (resolved.mode === 'platform') {
          await refundPlatformCredits(userId, 'cv-generate');
        }
        throw err;
      }

      const db = getAdminDb();

      const initialUsage = {
        inputTokens: usage?.promptTokens ?? 0,
        outputTokens: usage?.completionTokens ?? 0,
      };

      const isV2Tokens = (designTokens as { engineVersion?: string })?.engineVersion === 'v2';
      const colorScheme = isV2Tokens
        ? null
        : {
            primary: designTokens.colors.primary,
            secondary: designTokens.colors.secondary,
            accent: designTokens.colors.accent,
          };

      const cvRef = await db.collection('users').doc(userId).collection('cvs').add({
        linkedInData,
        jobVacancy,
        template: 'dynamic',
        colorScheme,
        brandStyle: null,
        styleConfig: null,
        designTokens,
        originalDesignTokens: JSON.parse(JSON.stringify(designTokens)) as typeof designTokens,
        avatarUrl: avatarUrl || null,
        generatedContent: content,
        pdfUrl: null,
        status: 'generated',
        llmProvider: resolved.providerName,
        llmModel: resolved.model,
        fitAnalysis: fitAnalysis || null,
        language: language || 'nl',
        creativityLevel: creativityLevel || 'balanced',
        creativityLevelHistory: [creativityLevel || 'balanced'],
        disputeCount: 0,
        aiUsage: [],
        aiUsageTotals: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      void recordOperationUsage({
        userId,
        cvId: cvRef.id,
        operation: 'cv-generate',
        usage: initialUsage,
        modelId: resolved.model,
      });

      return {
        success: true as const,
        cvId: cvRef.id,
        content,
        usage,
      };
    };

    // SSE-streaming path. Mobile carriers + browser networking stacks
    // (notably WebKit on iOS) close idle HTTP connections after ~30–60s
    // with no bytes flowing, surfacing as a generic "Load failed" / network
    // error on the client even though the server is still working. The
    // periodic heartbeat (`: comment\n\n` is a valid SSE no-op) keeps the
    // TCP connection alive across the long AI call.
    const acceptsStream = request.headers.get('accept')?.includes('text/event-stream');
    if (acceptsStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let closed = false;
          const safeEnqueue = (chunk: string) => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(chunk));
            } catch {
              closed = true;
            }
          };

          const heartbeat = setInterval(() => {
            safeEnqueue(`: heartbeat\n\n`);
          }, 10_000);

          try {
            safeEnqueue(`data: ${JSON.stringify({ type: 'progress', message: 'AI genereert CV-content...' })}\n\n`);
            const payload = await runGeneration();
            safeEnqueue(`data: ${JSON.stringify({ type: 'complete', ...payload })}\n\n`);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate CV';
            console.error('CV generation error (stream):', err);
            safeEnqueue(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
          } finally {
            clearInterval(heartbeat);
            closed = true;
            try { controller.close(); } catch { /* already closed */ }
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Non-streaming (default) — preserves existing behaviour for callers
    // that don't opt into SSE.
    const payload = await runGeneration();
    return NextResponse.json(payload);
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
