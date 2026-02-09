import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { parseJobVacancy } from '@/lib/ai/job-parser';
import { resolveProvider, refundPlatformCredits, ProviderError } from '@/lib/ai/platform-provider';

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
    const { rawText } = body as { rawText: string };

    // Validate input
    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Plak een volledige vacaturetekst (minimaal 50 tekens)' },
        { status: 400 }
      );
    }

    // Resolve AI provider (handles own-key vs platform mode + credit deduction)
    let resolved;
    try {
      resolved = await resolveProvider({ userId, operation: 'job-parse' });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    // Parse job vacancy using AI
    let vacancy;
    let usage;
    try {
      const result = await parseJobVacancy(
        rawText,
        resolved.providerName,
        resolved.apiKey,
        resolved.model
      );
      vacancy = result.vacancy;
      usage = result.usage;
    } catch (err) {
      if (resolved.mode === 'platform') {
        await refundPlatformCredits(userId, 'job-parse');
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      data: vacancy,
      usage,
    });
  } catch (error) {
    console.error('Job parsing error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Kon vacature niet analyseren';

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

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
