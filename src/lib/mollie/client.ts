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
 * Credit packages. IDs are preserved for Mollie/transaction DB compatibility.
 *
 * Pricing logic (1 full "CV with vacancy" = 9 credits):
 *  - pack_5  → 15 credits / €4.99  (€0.333/credit)  ≈ 1.6 CVs
 *  - pack_15 → 50 credits / €14.99 (€0.300/credit)  ≈ 5.5 CVs — best balance
 *  - pack_30 → 120 credits / €29.99 (€0.250/credit) ≈ 13 CVs — power users
 *
 * Internal cost per credit is ≈ €0.10, so net margins range 53%–65% per CV.
 */
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pack_5',
    name: '15 Credits',
    credits: 15,
    price: '4.99',
    description: 'Starter — ongeveer 1 CV met vacaturematch',
  },
  {
    id: 'pack_15',
    name: '50 Credits',
    credits: 50,
    price: '14.99',
    description: 'Populair — ongeveer 5 CVs, bespaar 10%',
  },
  {
    id: 'pack_30',
    name: '120 Credits',
    credits: 120,
    price: '29.99',
    description: 'Pro — ongeveer 13 CVs, bespaar 25%',
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
