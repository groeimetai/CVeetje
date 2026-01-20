import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/encryption';
import { docxToImage, isValidDocx } from '@/lib/template/docx-to-image';
import { extractStyleFromTemplate, getTemplateStyleFallbackTokens } from '@/lib/ai/template-style-extractor';
import {
  checkRateLimit,
  RATE_LIMITS,
  getRequestIdentifier,
} from '@/lib/security/rate-limiter';
import type { LLMProvider } from '@/types';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
      'template-style',
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

    // Get form data with file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Only DOCX files are supported. Please upload a .docx file.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Validate DOCX format
    if (!isValidDocx(buffer)) {
      return NextResponse.json(
        { error: 'Invalid DOCX file. The file may be corrupted or not a valid Word document.' },
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

    // Check if model supports vision
    // Most modern models support vision, but we should ideally check
    // For now, we'll proceed and handle errors gracefully

    console.log(`[Style from Template] Converting DOCX to image...`);

    // Step 1: Convert DOCX to image
    const imageResult = await docxToImage(buffer);

    if (!imageResult.success || !imageResult.imageBase64) {
      return NextResponse.json(
        { error: imageResult.error || 'Failed to convert DOCX to image' },
        { status: 500 }
      );
    }

    console.log(`[Style from Template] DOCX converted, analyzing with AI Vision...`);

    // Step 2: Extract style using AI Vision
    const styleResult = await extractStyleFromTemplate(
      imageResult.imageBase64,
      provider,
      apiKey,
      model
    );

    if (!styleResult.success || !styleResult.tokens) {
      // If AI analysis fails, return fallback tokens with a warning
      console.warn('[Style from Template] AI analysis failed, using fallback tokens');

      return NextResponse.json({
        success: true,
        tokens: getTemplateStyleFallbackTokens(),
        templatePreview: imageResult.imageBase64,
        confidence: 'low',
        warning: styleResult.error || 'AI analysis failed, using default style. You can adjust the colors manually.',
        usage: { promptTokens: 0, completionTokens: 0 },
      });
    }

    console.log(`[Style from Template] Style extracted successfully. Confidence: ${styleResult.confidence}`);

    return NextResponse.json({
      success: true,
      tokens: styleResult.tokens,
      templatePreview: imageResult.imageBase64,
      confidence: styleResult.confidence,
      usage: styleResult.usage,
    });
  } catch (error) {
    console.error('[Style from Template] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to extract style from template';

    // Check for specific errors
    if (errorMessage.includes('API key') || errorMessage.includes('401')) {
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

    if (errorMessage.includes('vision') || errorMessage.includes('image')) {
      return NextResponse.json(
        { error: 'Your selected AI model may not support image analysis. Please try a vision-capable model like GPT-4o or Claude 3.5 Sonnet.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
