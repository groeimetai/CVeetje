import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { generatePDF } from '@/lib/pdf/generator';
import { FieldValue } from 'firebase-admin/firestore';
import type { CV, GeneratedCVContent, CVTemplate, CVColorScheme, CVStyleConfig } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cvId } = await params;

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

    const db = getAdminDb();

    // Check user credits
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData || userData.credits.balance < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits.' },
        { status: 402 }
      );
    }

    // Get CV document
    const cvDoc = await db
      .collection('users')
      .doc(userId)
      .collection('cvs')
      .doc(cvId)
      .get();

    if (!cvDoc.exists) {
      return NextResponse.json(
        { error: 'CV not found' },
        { status: 404 }
      );
    }

    const cvData = cvDoc.data() as CV;

    if (!cvData.generatedContent) {
      return NextResponse.json(
        { error: 'CV content not generated yet' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(
      cvData.generatedContent as GeneratedCVContent,
      cvData.template as CVTemplate,
      cvData.colorScheme as CVColorScheme,
      cvData.linkedInData.fullName,
      cvData.styleConfig as CVStyleConfig | null,
      cvData.avatarUrl as string | null,
      cvData.linkedInData.headline as string | null
    );

    // Deduct credit
    await db.collection('users').doc(userId).update({
      'credits.balance': FieldValue.increment(-1),
      updatedAt: new Date(),
    });

    // Log transaction
    await db.collection('users').doc(userId).collection('transactions').add({
      amount: -1,
      type: 'cv_generation',
      description: 'CV PDF download',
      molliePaymentId: null,
      cvId,
      createdAt: new Date(),
    });

    // Update CV status
    await db
      .collection('users')
      .doc(userId)
      .collection('cvs')
      .doc(cvId)
      .update({
        status: 'pdf_ready',
        updatedAt: new Date(),
      });

    // Return PDF (convert Buffer to Uint8Array for NextResponse compatibility)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cv-${cvData.linkedInData.fullName.toLowerCase().replace(/\s+/g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
