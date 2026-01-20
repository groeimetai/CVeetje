import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { fillPDFTemplate } from '@/lib/pdf/template-filler';
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

    // Check if template has fields configured
    if (!template.fields || template.fields.length === 0) {
      return NextResponse.json(
        { error: 'Template has no fields configured. Please configure fields first.' },
        { status: 400 }
      );
    }

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

    // Fill the template
    const filledPdfBytes = await fillPDFTemplate(
      templateBytes,
      template,
      profileData,
      customValues
    );

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
    await db.collection('users').doc(userId).collection('transactions').add({
      amount: -1,
      type: 'cv_generation',
      description: `Template filled: ${template.name}`,
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
