import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { isPaymentPaid, getPaymentMetadata } from '@/lib/mollie/client';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // Mollie sends payment ID in form data
    const formData = await request.formData();
    const paymentId = formData.get('id') as string;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID required' },
        { status: 400 }
      );
    }

    // Check payment status
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

    // Check if this payment was already processed
    const existingTx = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('molliePaymentId', '==', paymentId)
      .get();

    if (!existingTx.empty) {
      // Payment already processed
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
