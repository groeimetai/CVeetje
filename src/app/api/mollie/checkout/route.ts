import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { createPayment, CREDIT_PACKAGES } from '@/lib/mollie/client';

export async function POST(request: NextRequest) {
  try {
    // Get auth token
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

    // Get package ID from request
    const { packageId } = await request.json();

    if (!packageId || !CREDIT_PACKAGES.find((p) => p.id === packageId)) {
      return NextResponse.json(
        { error: 'Invalid package selected' },
        { status: 400 }
      );
    }

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/credits?status=complete`;
    const webhookUrl = `${baseUrl}/api/mollie/webhook`;

    // Create Mollie payment
    const { checkoutUrl, paymentId } = await createPayment(
      packageId,
      userId,
      redirectUrl,
      webhookUrl
    );

    return NextResponse.json({
      success: true,
      checkoutUrl,
      paymentId,
    });
  } catch (error) {
    console.error('Mollie checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
