import createMollieClient, { PaymentStatus, MollieClient } from '@mollie/api-client';

let mollieClient: MollieClient | null = null;

function getMollieClient(): MollieClient {
  if (!mollieClient) {
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      throw new Error('MOLLIE_API_KEY environment variable is not set');
    }
    mollieClient = createMollieClient({ apiKey });
  }
  return mollieClient;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: string; // In EUR
  description: string;
}

/**
 * Credit packages — volume-first pricing (calibrated against telemetry).
 *
 * A complete CV (profile + job + fit + cv + style + motivation) consumes
 * 10 credits and costs ~€0.59 in real tokens. Pricing is set so the headline
 * lands at "vanaf €1 per CV" while keeping at least 25% net margin on every
 * tier (BTW + iDEAL fee already deducted).
 *
 *   pack_5    → 30 credits / €4.99   ≈ €1.66 per CV   (~3 CVs)
 *   pack_15   → 100 credits / €12.99 ≈ €1.30 per CV   (~10 CVs)
 *   pack_30   → 300 credits / €29.99 ≈ €1.00 per CV   (~30 CVs)
 *   pack_power → 600 credits / €59.99 ≈ €1.00 per CV  (~60 CVs)
 *
 * IDs are preserved for Mollie/transaction DB compatibility. Power tier is
 * a new ID. Credit cost per operation in `PLATFORM_CREDIT_COSTS` is
 * unchanged, so existing balances retain full value — no migration needed.
 */
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pack_5',
    name: '30 Credits',
    credits: 30,
    price: '4.99',
    description: 'Starter — ongeveer 3 CVs · €1,66 per CV',
  },
  {
    id: 'pack_15',
    name: '100 Credits',
    credits: 100,
    price: '12.99',
    description: 'Populair — ongeveer 10 CVs · €1,30 per CV',
  },
  {
    id: 'pack_30',
    name: '300 Credits',
    credits: 300,
    price: '29.99',
    description: 'Pro — ongeveer 30 CVs · €1,00 per CV',
  },
  {
    id: 'pack_power',
    name: '600 Credits',
    credits: 600,
    price: '59.99',
    description: 'Power — ongeveer 60 CVs · €1,00 per CV',
  },
];

export async function createPayment(
  packageId: string,
  userId: string,
  redirectUrl: string,
  webhookUrl: string
): Promise<{ checkoutUrl: string; paymentId: string }> {
  const creditPackage = CREDIT_PACKAGES.find((p) => p.id === packageId);

  if (!creditPackage) {
    throw new Error('Invalid package selected');
  }

  const client = getMollieClient();
  const payment = await client.payments.create({
    amount: {
      currency: 'EUR',
      value: creditPackage.price,
    },
    description: `CVeetje - ${creditPackage.name}`,
    redirectUrl,
    webhookUrl,
    metadata: {
      userId,
      packageId,
      credits: creditPackage.credits,
    },
  });

  if (!payment.getCheckoutUrl()) {
    throw new Error('Failed to create payment checkout URL');
  }

  return {
    checkoutUrl: payment.getCheckoutUrl()!,
    paymentId: payment.id,
  };
}

export async function getPayment(paymentId: string) {
  const client = getMollieClient();
  return client.payments.get(paymentId);
}

export async function isPaymentPaid(paymentId: string): Promise<boolean> {
  const payment = await getPayment(paymentId);
  return payment.status === PaymentStatus.paid;
}

interface PaymentMetadata {
  userId: string;
  packageId: string;
  credits: number;
}

export async function getPaymentMetadata(paymentId: string): Promise<PaymentMetadata | null> {
  const payment = await getPayment(paymentId);

  if (payment.metadata) {
    const metadata = payment.metadata as unknown as PaymentMetadata;
    return {
      userId: metadata.userId,
      packageId: metadata.packageId,
      credits: metadata.credits,
    };
  }

  return null;
}
