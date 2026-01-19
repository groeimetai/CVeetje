import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { generateMotivationLetterPDF, generateMotivationLetterDOCX } from '@/lib/pdf/motivation-letter-generator';
import { styleConfigToTokens } from '@/lib/cv/templates/adapter';
import { getDefaultTokens } from '@/lib/cv/html-generator';
import type { CVDesignTokens } from '@/types/design-tokens';
import type { CV, CVStyleConfig, GeneratedMotivationLetter } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: cvId } = await context.params;

    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { format, letter } = body as {
      format: 'pdf' | 'docx' | 'txt';
      letter: GeneratedMotivationLetter;
    };

    if (!format || !letter) {
      return NextResponse.json(
        { error: 'Format and letter are required' },
        { status: 400 }
      );
    }

    // Get CV data from Firestore for design tokens and user info
    const db = getAdminDb();
    const cvDoc = await db
      .collection('users')
      .doc(userId)
      .collection('cvs')
      .doc(cvId)
      .get();

    if (!cvDoc.exists) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cvData = cvDoc.data() as CV & { tokens?: CVDesignTokens };

    // Get tokens - prefer stored tokens, then convert from styleConfig, then use defaults
    let tokens: CVDesignTokens;
    if (cvData.tokens) {
      tokens = cvData.tokens;
    } else if (cvData.styleConfig) {
      tokens = styleConfigToTokens(cvData.styleConfig as CVStyleConfig);
    } else {
      tokens = getDefaultTokens();
    }

    // Prepare letter data - get name from linkedInData
    const letterData = {
      fullText: letter.fullText,
      senderName: cvData.linkedInData?.fullName || 'Sollicitant',
      senderEmail: cvData.linkedInData?.email,
      senderPhone: cvData.linkedInData?.phone,
      senderLocation: cvData.linkedInData?.location || undefined,
      recipientCompany: cvData.jobVacancy?.company || undefined,
    };

    // Generate file based on format
    if (format === 'txt') {
      // TXT format
      const blob = new Blob([letter.fullText], { type: 'text/plain;charset=utf-8' });
      const arrayBuffer = await blob.arrayBuffer();

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="motivatiebrief-${new Date().toISOString().split('T')[0]}.txt"`,
        },
      });
    }

    if (format === 'pdf') {
      // PDF format with CV styling
      const pdfBuffer = await generateMotivationLetterPDF(letterData, tokens);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="motivatiebrief-${new Date().toISOString().split('T')[0]}.pdf"`,
        },
      });
    }

    if (format === 'docx') {
      // DOCX format
      const docxBuffer = await generateMotivationLetterDOCX(letterData, tokens);

      return new NextResponse(new Uint8Array(docxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="motivatiebrief-${new Date().toISOString().split('T')[0]}.docx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

  } catch (error) {
    console.error('Error generating motivation letter download:', error);
    return NextResponse.json(
      { error: 'Failed to generate download' },
      { status: 500 }
    );
  }
}
