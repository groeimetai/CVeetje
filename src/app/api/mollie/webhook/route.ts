import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import { isPaymentPaid, getPaymentMetadata } from '@/lib/mollie/client';
import { FieldValue } from 'firebase-admin/firestore';
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIP,
} from '@/lib/security/rate-limiter';

/**
 * Verify Mollie webhook signature
 * Mollie signs webhooks with HMAC-SHA256 using your webhook secret
 *
 * @see https://docs.mollie.com/docs/webhooks#validating-webhook-signatures
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return false;

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request.headers);
    const rateLimitResult = checkRateLimit(
      clientIP || 'unknown',
      'mollie-webhook',
      RATE_LIMITS.webhook
    );

    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for Mollie webhook from IP: ${clientIP}`);
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    // Get raw body for signature verification
    const bodyText = await request.text();

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-mollie-signature');

      if (!verifyWebhookSignature(bodyText, signature, webhookSecret)) {
        console.error('Invalid Mollie webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      // Log warning if signature verification is not configured
      // In production, this should be set up for security
      console.warn('MOLLIE_WEBHOOK_SECRET not configured - signature verification skipped');
    }

    // Parse form data from body text
    const params = new URLSearchParams(bodyText);
    const paymentId = params.get('id');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID required' },
        { status: 400 }
      );
    }

    // Check payment status via Mollie API (additional verification)
    // This ensures the payment ID is real and comes from Mollie
    const isPaid = await isPaymentPaid(paymentId);

    if (!isPaid) {
      // Payment not completed yet, Mollie will retry
      return NextResponse.json({ received: true });
    }

    // Get payment metadata
    const metadata = await getPaymentMetadata(paymentId);

    if (!metadata) {
      console.error('No metadata found for payment:', paymentId);
      return NextResponse.json({ received: true });
    }

    const { userId, credits } = metadata;

    const db = getAdminDb();

    // Check if this payment was already processed (idempotency)
    const existingTx = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('molliePaymentId', '==', paymentId)
      .get();

    if (!existingTx.empty) {
      // Payment already processed
      console.log(`Payment ${paymentId} already processed`);
      return NextResponse.json({ received: true });
    }

    // Add credits to user's purchased bucket (separate from free monthly credits)
    await db.collection('users').doc(userId).update({
      'credits.purchased': FieldValue.increment(credits),
      updatedAt: new Date(),
    });

    // Log transaction
    await db.collection('users').doc(userId).collection('transactions').add({
      amount: credits,
      type: 'purchase',
      description: `Purchased ${credits} credits`,
      molliePaymentId: paymentId,
      cvId: null,
      createdAt: new Date(),
    });

    console.log(`Added ${credits} credits to user ${userId} from payment ${paymentId}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Mollie webhook error:', error);
    // Return 200 to prevent Mollie from retrying on application errors
    return NextResponse.json({ received: true });
  }
}
