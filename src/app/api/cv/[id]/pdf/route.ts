import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { generatePDF } from '@/lib/pdf/generator';
import { FieldValue } from 'firebase-admin/firestore';
import { styleConfigToTokens } from '@/lib/cv/templates/adapter';
import {
  checkRateLimit,
  RATE_LIMITS,
  getRequestIdentifier,
} from '@/lib/security/rate-limiter';
import { validateAvatarURL } from '@/lib/security/url-validator';
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

    // Rate limiting for PDF generation (resource-intensive)
    const rateLimitResult = checkRateLimit(
      getRequestIdentifier(userId),
      'pdf-generation',
      RATE_LIMITS.pdfGeneration
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many PDF requests. Please wait and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    const db = getAdminDb();

    // Get CV document first to check if PDF was already downloaded
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

    // If PDF was already downloaded (paid for), skip credit check
    const alreadyPaid = cvData.status === 'pdf_ready';

    // Check user credits (free + purchased) — only if not already paid
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const freeCredits = userData?.credits?.free ?? 0;
    const purchasedCredits = userData?.credits?.purchased ?? 0;
    const totalCredits = freeCredits + purchasedCredits;

    if (!alreadyPaid && (!userData || totalCredits < 1)) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits.' },
        { status: 402 }
      );
    }

    if (!cvData.generatedContent) {
      return NextResponse.json(
        { error: 'CV content not generated yet' },
        { status: 400 }
      );
    }

    // Validate avatar URL to prevent SSRF attacks
    let safeAvatarUrl: string | null = null;
    if (cvData.avatarUrl) {
      const urlValidation = validateAvatarURL(cvData.avatarUrl);
      if (urlValidation.valid) {
        safeAvatarUrl = urlValidation.sanitizedUrl || null;
      } else {
        console.warn(`Blocked unsafe avatar URL for CV ${cvId}: ${urlValidation.error}`);
        // Continue without avatar rather than failing
      }
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

    // Generate PDF with validated avatar URL
    const pdfBuffer = await generatePDF(
      contentToRender,
      fullName,
      tokens,
      safeAvatarUrl,
      headline as string | null,
      effectiveOverrides,
      contactInfo,
      pageMode
    );

    // Deduct credit only if not already paid
    if (!alreadyPaid) {
      if (freeCredits >= 1) {
        await db.collection('users').doc(userId).update({
          'credits.free': FieldValue.increment(-1),
          updatedAt: new Date(),
        });
      } else {
        await db.collection('users').doc(userId).update({
          'credits.purchased': FieldValue.increment(-1),
          updatedAt: new Date(),
        });
      }

      // Log transaction
      const creditSource = freeCredits >= 1 ? 'free' : 'purchased';
      await db.collection('users').doc(userId).collection('transactions').add({
        amount: -1,
        type: 'cv_generation',
        description: `CV PDF download (${creditSource} credit)`,
        molliePaymentId: null,
        cvId,
        createdAt: new Date(),
      });

      // Update CV status to mark as paid
      await db
        .collection('users')
        .doc(userId)
        .collection('cvs')
        .doc(cvId)
        .update({
          status: 'pdf_ready',
          updatedAt: new Date(),
        });
    }

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
