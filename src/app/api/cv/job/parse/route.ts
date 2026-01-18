import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/encryption';
import { parseJobVacancy } from '@/lib/ai/job-parser';
import type { LLMProvider } from '@/types';

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
        { error: 'API key niet geconfigureerd. Voeg je API key toe in Instellingen.' },
        { status: 400 }
      );
    }

    // Decrypt API key
    const apiKey = decrypt(userData.apiKey.encryptedKey);
    const provider = userData.apiKey.provider as LLMProvider;
    const model = userData.apiKey.model;

    // Parse job vacancy using AI
    const { vacancy, usage } = await parseJobVacancy(
      rawText,
      provider,
      apiKey,
      model
    );

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
