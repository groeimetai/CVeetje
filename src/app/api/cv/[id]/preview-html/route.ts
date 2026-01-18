import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import type { CV, GeneratedCVContent, CVStyleConfig } from '@/types';

// Debug endpoint to see the HTML that would be generated for PDF
export async function GET(
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

    // Return debug info about what would be used for PDF generation
    return NextResponse.json({
      cvId,
      hasStyleConfig: !!cvData.styleConfig,
      styleConfig: cvData.styleConfig || null,
      template: cvData.template,
      colorScheme: cvData.colorScheme,
      hasGeneratedContent: !!cvData.generatedContent,
      contentSummary: cvData.generatedContent ? {
        summaryLength: (cvData.generatedContent as GeneratedCVContent).summary?.length || 0,
        experienceCount: (cvData.generatedContent as GeneratedCVContent).experience?.length || 0,
        educationCount: (cvData.generatedContent as GeneratedCVContent).education?.length || 0,
      } : null,
    });
  } catch (error) {
    console.error('Preview HTML error:', error);
    return NextResponse.json(
      { error: 'Failed to get preview' },
      { status: 500 }
    );
  }
}
