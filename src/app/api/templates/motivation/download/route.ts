import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { generateMotivationLetterPDF, generateMotivationLetterDOCX } from '@/lib/pdf/motivation-letter-generator';
import { getDefaultTokens } from '@/lib/cv/html-generator';
import type { GeneratedMotivationLetter, ParsedLinkedIn, JobVacancy } from '@/types';

/**
 * POST /api/templates/motivation/download
 *
 * Download a generated motivation letter for template-based CV fills.
 * Unlike the CV-based download, this endpoint takes sender info directly
 * since there's no stored CV document.
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    try {
      await getAdminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      format,
      letter,
      linkedInData,
      jobVacancy
    } = body as {
      format: 'pdf' | 'docx' | 'txt';
      letter: GeneratedMotivationLetter;
      linkedInData?: ParsedLinkedIn;
      jobVacancy?: JobVacancy;
    };

    if (!format || !letter) {
      return NextResponse.json(
        { error: 'Format and letter are required' },
        { status: 400 }
      );
    }

    // Use default tokens since we don't have CV-specific styling
    const tokens = getDefaultTokens();

    // Prepare letter data from provided linkedInData or extract from letter
    const letterData = {
      fullText: letter.fullText,
      senderName: linkedInData?.fullName || 'Sollicitant',
      senderEmail: linkedInData?.email,
      senderPhone: linkedInData?.phone,
      senderLocation: linkedInData?.location || undefined,
      recipientCompany: jobVacancy?.company || undefined,
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
      // PDF format with default styling
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
    console.error('Error generating template motivation letter download:', error);
    return NextResponse.json(
      { error: 'Failed to generate download' },
      { status: 500 }
    );
  }
}
