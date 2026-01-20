import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { fillPDFTemplateAuto, fillPDFTemplate, hasFormFields } from '@/lib/pdf/template-filler';
import type { PDFTemplate, ParsedLinkedIn } from '@/types';

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
      storageUrl: templateData?.storageUrl,
      pageCount: templateData?.pageCount,
      fields: templateData?.fields || [],
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

    // Check if PDF has form fields (AcroForm)
    const hasFields = await hasFormFields(templateBytes);

    let filledPdfBytes: Uint8Array;
    let fillMethod: 'form' | 'coordinates' | 'none' = 'none';
    let filledFields: string[] = [];

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
    const methodDescription = fillMethod === 'form'
      ? `(auto-filled ${filledFields.length} form fields)`
      : '(coordinate-based)';
    await db.collection('users').doc(userId).collection('transactions').add({
      amount: -1,
      type: 'cv_generation',
      description: `Template filled: ${template.name} ${methodDescription}`,
      molliePaymentId: null,
      cvId: null,
      createdAt: new Date(),
    });

    // Return the filled PDF as binary
    return new NextResponse(Buffer.from(filledPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="filled-${template.fileName}"`,
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
