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

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pack_5',
    name: '5 Credits',
    credits: 5,
    price: '4.99',
    description: '5 CV downloads',
  },
  {
    id: 'pack_15',
    name: '15 Credits',
    credits: 15,
    price: '12.99',
    description: '15 CV downloads - Save 13%',
  },
  {
    id: 'pack_30',
    name: '30 Credits',
    credits: 30,
    price: '22.99',
    description: '30 CV downloads - Save 23%',
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
