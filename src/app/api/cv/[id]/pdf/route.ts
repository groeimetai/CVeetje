import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { generatePDF } from '@/lib/pdf/generator';
import { FieldValue } from 'firebase-admin/firestore';
import { styleConfigToTokens } from '@/lib/cv/templates/adapter';
import type { CV, GeneratedCVContent, CVStyleConfig, CVContactInfo, CVElementOverrides, ElementOverride, EditableElementType } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cvId } = await params;

    // Parse request body for optional edited content, header, element colors, and page mode
    let editedContent: GeneratedCVContent | null = null;
    let editedTokens: CVDesignTokens | null = null;
    let editedHeader: {
      fullName: string;
      headline?: string | null;
      contactInfo?: CVContactInfo | null;
    } | null = null;
    let elementColors: Record<string, string | undefined> | null = null;
    let pageMode: 'multi-page' | 'single-page' = 'multi-page';
    try {
      const body = await request.json();
      if (body.content) {
        editedContent = body.content as GeneratedCVContent;
      }
      if (body.tokens) {
        editedTokens = body.tokens as CVDesignTokens;
      }
      if (body.header) {
        editedHeader = body.header;
      }
      if (body.elementColors) {
        elementColors = body.elementColors;
      }
      if (body.pageMode === 'single-page') {
        pageMode = 'single-page';
      }
    } catch {
      // No body or invalid JSON - proceed with stored content
    }

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

    const cvData = cvDoc.data() as CV & { tokens?: CVDesignTokens };

    if (!cvData.generatedContent) {
      return NextResponse.json(
        { error: 'CV content not generated yet' },
        { status: 400 }
      );
    }

    // Get tokens - prefer edited tokens, then stored tokens, then convert from styleConfig
    let tokens: CVDesignTokens | null = null;
    if (editedTokens) {
      tokens = editedTokens;
    } else if (cvData.tokens) {
      tokens = cvData.tokens;
    } else if (cvData.styleConfig) {
      tokens = styleConfigToTokens(cvData.styleConfig as CVStyleConfig);
    }

    // Build contact info - prefer edited header, then fall back to LinkedIn data
    const contactInfo: CVContactInfo = editedHeader?.contactInfo ?? {
      email: cvData.linkedInData.email || undefined,
      phone: cvData.linkedInData.phone || undefined,
      location: cvData.linkedInData.location || undefined,
      linkedinUrl: cvData.linkedInData.linkedinUrl || undefined,
      website: cvData.linkedInData.website || undefined,
      github: cvData.linkedInData.github || undefined,
    };

    // Use edited values - prefer edited header/content, then fall back to stored data
    const contentToRender = editedContent || (cvData.generatedContent as GeneratedCVContent);
    const fullName = editedHeader?.fullName ?? cvData.linkedInData.fullName;
    // Use edited headline, then generated headline, then LinkedIn headline as fallback
    const headline = editedHeader?.headline ?? contentToRender.headline ?? cvData.linkedInData.headline;

    // Build element overrides from elementColors
    let effectiveOverrides: CVElementOverrides | null = cvData.elementOverrides || null;
    if (elementColors && Object.keys(elementColors).length > 0) {
      const colorOverrides: ElementOverride[] = Object.entries(elementColors)
        .filter(([, color]) => color !== undefined)
        .map(([elementId, color]) => ({
          elementId,
          elementType: 'text' as EditableElementType,
          hidden: false,
          colorOverride: color,
        }));

      // Merge with existing overrides
      const existingOverrides = effectiveOverrides?.overrides || [];
      const existingIds = new Set(colorOverrides.map(o => o.elementId));
      const mergedOverrides = [
        ...colorOverrides,
        ...existingOverrides.filter(o => !existingIds.has(o.elementId)),
      ];

      effectiveOverrides = {
        overrides: mergedOverrides,
        lastModified: new Date(),
      };
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(
      contentToRender,
      fullName,
      tokens,
      cvData.avatarUrl as string | null,
      headline as string | null,
      effectiveOverrides,
      contactInfo,
      pageMode
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
        'Content-Disposition': `attachment; filename="cv-${fullName.toLowerCase().replace(/\s+/g, '-')}.pdf"`,
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
