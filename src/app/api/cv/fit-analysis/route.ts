import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { analyzeFit } from '@/lib/ai/fit-analyzer';
import { resolveProvider, refundPlatformCredits, ProviderError } from '@/lib/ai/platform-provider';
import type { ParsedLinkedIn, JobVacancy, FitAnalysisResponse } from '@/types';

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
    const { linkedInData, jobVacancy } = body as {
      linkedInData: ParsedLinkedIn;
      jobVacancy: JobVacancy;
    };

    // Validate input
    if (!linkedInData || !linkedInData.fullName) {
      return NextResponse.json(
        { error: 'Profielgegevens ontbreken' },
        { status: 400 }
      );
    }

    if (!jobVacancy || !jobVacancy.title) {
      return NextResponse.json(
        { error: 'Vacaturegegevens ontbreken' },
        { status: 400 }
      );
    }

    // Resolve AI provider (handles own-key vs platform mode + credit deduction)
    let resolved;
    try {
      resolved = await resolveProvider({ userId, operation: 'fit-analysis' });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    // Analyze fit using AI
    let analysis;
    let usage;
    try {
      const result = await analyzeFit(
        linkedInData,
        jobVacancy,
        resolved.providerName,
        resolved.apiKey,
        resolved.model
      );
      analysis = result.analysis;
      usage = result.usage;
    } catch (err) {
      if (resolved.mode === 'platform') {
        await refundPlatformCredits(userId, 'fit-analysis');
      }
      throw err;
    }

    const response: FitAnalysisResponse = {
      success: true,
      analysis,
      usage,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Fit analysis error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Kon fit-analyse niet uitvoeren';

    // Check for specific API errors
    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { error: 'Ongeldige API key. Controleer je instellingen.' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      return NextResponse.json(
        { error: 'API limiet bereikt. Probeer het later opnieuw.' },
        { status: 429 }
      );
    }

    const response: FitAnalysisResponse = {
      success: false,
      error: errorMessage,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
