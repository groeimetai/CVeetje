import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { fillPDFTemplateAuto, fillPDFTemplate, hasFormFields } from '@/lib/pdf/template-filler';
import { fillDocxTemplateAuto, fillDocxTemplate, analyzeDocxTemplate } from '@/lib/docx/template-filler';
import { convertFilledTemplateToPdf } from '@/lib/docx/docx-to-pdf';
import type { PDFTemplate, ParsedLinkedIn, DocxPlaceholder } from '@/types';

// POST - Fill a template with profile data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const db = getAdminDb();

    // Get the template
    const templateDoc = await db
      .collection('users')
      .doc(userId)
      .collection('templates')
      .doc(id)
      .get();

    if (!templateDoc.exists) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const templateData = templateDoc.data();
    const template: PDFTemplate = {
      id: templateDoc.id,
      name: templateData?.name,
      fileName: templateData?.fileName,
      fileType: templateData?.fileType || 'pdf', // Default to pdf for backwards compatibility
      storageUrl: templateData?.storageUrl,
      pageCount: templateData?.pageCount,
      fields: templateData?.fields || [],
      placeholders: templateData?.placeholders || [],
      autoAnalyzed: templateData?.autoAnalyzed || false,
      createdAt: templateData?.createdAt,
      updatedAt: templateData?.updatedAt,
      userId: templateData?.userId,
    };

    // Parse request body
    const body = await request.json();
    const { profileData, customValues } = body as {
      profileData: ParsedLinkedIn;
      customValues?: Record<string, string>;
    };

    if (!profileData) {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      );
    }

    // Check user credits
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const freeCredits = userData?.credits?.free || 0;
    const purchasedCredits = userData?.credits?.purchased || 0;
    const totalCredits = freeCredits + purchasedCredits;

    if (totalCredits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits. You need at least 1 credit to fill a template.' },
        { status: 402 }
      );
    }

    // Download the template PDF
    const templateResponse = await fetch(template.storageUrl);
    if (!templateResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch template file' },
        { status: 500 }
      );
    }

    const templateBuffer = await templateResponse.arrayBuffer();
    const templateBytes = new Uint8Array(templateBuffer);

    let filledPdfBytes: Uint8Array;
    let fillMethod: 'form' | 'coordinates' | 'docx-placeholders' | 'none' = 'none';
    let filledFields: string[] = [];
    let filledCount = 0;

    if (template.fileType === 'docx') {
      // DOCX template flow
      const docxBuffer = templateBuffer;

      // Get placeholders - use stored ones or re-analyze
      let placeholders: DocxPlaceholder[] = template.placeholders || [];
      if (placeholders.length === 0) {
        // No stored placeholders - try to auto-detect
        try {
          const analysis = await analyzeDocxTemplate(docxBuffer);
          placeholders = analysis.placeholders;
        } catch (e) {
          console.warn('Failed to analyze DOCX template:', e);
        }
      }

      if (placeholders.length === 0) {
        return NextResponse.json(
          { error: 'No placeholders detected in DOCX template. The template may not have any recognizable placeholder patterns.' },
          { status: 400 }
        );
      }

      // Fill the DOCX template
      const filledDocx = await fillDocxTemplate(
        docxBuffer,
        placeholders,
        profileData,
        customValues
      );

      // Convert filled DOCX to PDF
      const pdfBuffer = await convertFilledTemplateToPdf(filledDocx);
      filledPdfBytes = new Uint8Array(pdfBuffer);
      fillMethod = 'docx-placeholders';
      filledCount = placeholders.length;
      filledFields = placeholders.map(p => p.originalText);
    } else {
      // PDF template flow (existing logic)
      const hasFields = await hasFormFields(templateBytes);

      if (hasFields) {
        // Try auto-filling form fields first
        const autoResult = await fillPDFTemplateAuto(
          templateBytes,
          profileData,
          customValues
        );
        filledPdfBytes = autoResult.pdfBytes;
        fillMethod = autoResult.method;
        filledFields = autoResult.filledFields || [];
      } else if (template.fields && template.fields.length > 0) {
        // Fall back to coordinate-based filling if template has configured fields
        filledPdfBytes = await fillPDFTemplate(
          templateBytes,
          template,
          profileData,
          customValues
        );
        fillMethod = 'coordinates';
      } else {
        // No form fields and no configured coordinates
        return NextResponse.json(
          { error: 'Template has no fillable form fields and no coordinate fields configured.' },
          { status: 400 }
        );
      }
    }

    // Deduct credit (deduct from free first, then purchased)
    if (freeCredits > 0) {
      await db.collection('users').doc(userId).update({
        'credits.free': freeCredits - 1,
      });
    } else {
      await db.collection('users').doc(userId).update({
        'credits.purchased': purchasedCredits - 1,
      });
    }

    // Record transaction
    let methodDescription: string;
    switch (fillMethod) {
      case 'form':
        methodDescription = `(auto-filled ${filledFields.length} form fields)`;
        break;
      case 'docx-placeholders':
        methodDescription = `(DOCX, ${filledCount} placeholders)`;
        break;
      case 'coordinates':
        methodDescription = '(coordinate-based)';
        break;
      default:
        methodDescription = '';
    }
    await db.collection('users').doc(userId).collection('transactions').add({
      amount: -1,
      type: 'cv_generation',
      description: `Template filled: ${template.name} ${methodDescription}`,
      molliePaymentId: null,
      cvId: null,
      createdAt: new Date(),
    });

    // Return the filled PDF as binary
    // For DOCX templates, the output is always PDF (after conversion)
    const outputFileName = template.fileType === 'docx'
      ? `filled-${template.fileName.replace(/\.docx$/i, '.pdf')}`
      : `filled-${template.fileName}`;

    return new NextResponse(Buffer.from(filledPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
      },
    });
  } catch (error) {
    console.error('Error filling template:', error);
    return NextResponse.json(
      { error: 'Failed to fill template' },
      { status: 500 }
    );
  }
}
