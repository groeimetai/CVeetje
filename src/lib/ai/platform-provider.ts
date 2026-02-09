/**
 * Platform provider resolution — central helper for all API routes.
 *
 * Replaces the repeated pattern of:
 *   1. Read user doc
 *   2. Check API key
 *   3. Decrypt key
 *   4. Create provider
 *
 * With a single call that also handles platform AI mode + credit deduction.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { decrypt } from '@/lib/encryption';
import { createAIProvider } from '@/lib/ai/providers';
import {
  PLATFORM_MODEL,
  PLATFORM_CREDIT_COSTS,
  type PlatformOperation,
} from '@/lib/ai/platform-config';
import type { LLMMode } from '@/types';
import { queueEmail } from '@/lib/email/send';
import { renderCreditsLowEmail } from '@/lib/email/templates/credits-low';

export class ProviderError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface ResolvedProvider {
  provider: ReturnType<typeof createAIProvider>;
  apiKey: string;
  providerName: string;
  model: string;
  mode: LLMMode;
  userId: string;
}

interface ResolveOptions {
  userId: string;
  /** The operation being performed (used for platform AI credit costs) */
  operation?: PlatformOperation;
  /** Skip credit deduction — for routes that already handle their own credits */
  skipCreditDeduction?: boolean;
}

/**
 * Resolve the AI provider for a user.
 *
 * - In 'own-key' mode: decrypts user's API key and creates provider
 * - In 'platform' mode: uses platform API key, deducts credits
 *
 * @throws ProviderError with appropriate HTTP status codes
 */
export async function resolveProvider(opts: ResolveOptions): Promise<ResolvedProvider> {
  const { userId, operation, skipCreditDeduction = false } = opts;
  const db = getAdminDb();

  // Read user document
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new ProviderError('User not found', 404);
  }

  const userData = userDoc.data()!;
  const mode: LLMMode = userData.llmMode || 'own-key';

  if (mode === 'platform') {
    return resolvePlatformProvider(userId, userData, operation, skipCreditDeduction);
  }

  return resolveOwnKeyProvider(userId, userData);
}

// ---------------------------------------------------------------------------
// Own-key mode
// ---------------------------------------------------------------------------

function resolveOwnKeyProvider(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userData: any,
): ResolvedProvider {
  if (!userData.apiKey) {
    throw new ProviderError(
      'API key niet geconfigureerd. Voeg je API key toe in Instellingen.',
      400,
    );
  }

  const apiKey = decrypt(userData.apiKey.encryptedKey);
  const providerName: string = userData.apiKey.provider;
  const model: string = userData.apiKey.model;
  const provider = createAIProvider(providerName, apiKey);

  return { provider, apiKey, providerName, model, mode: 'own-key', userId };
}

// ---------------------------------------------------------------------------
// Platform mode
// ---------------------------------------------------------------------------

async function resolvePlatformProvider(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userData: any,
  operation: PlatformOperation | undefined,
  skipCreditDeduction: boolean,
): Promise<ResolvedProvider> {
  const platformApiKey = process.env.ANTHROPIC_PLATFORM_API_KEY;
  if (!platformApiKey) {
    throw new ProviderError(
      'Platform AI is momenteel niet beschikbaar. Probeer het later opnieuw of gebruik je eigen API key.',
      503,
    );
  }

  // Deduct credits if needed
  if (!skipCreditDeduction && operation) {
    const cost = PLATFORM_CREDIT_COSTS[operation] ?? 1;
    await deductPlatformCredits(userId, userData, cost, operation);
  }

  const provider = createAIProvider(PLATFORM_MODEL.provider, platformApiKey);

  return {
    provider,
    apiKey: platformApiKey,
    providerName: PLATFORM_MODEL.provider,
    model: PLATFORM_MODEL.modelId,
    mode: 'platform',
    userId,
  };
}

// ---------------------------------------------------------------------------
// Credit management helpers
// ---------------------------------------------------------------------------

async function deductPlatformCredits(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userData: any,
  cost: number,
  operation: string,
): Promise<void> {
  const db = getAdminDb();
  const freeCredits: number = userData.credits?.free ?? 0;
  const purchasedCredits: number = userData.credits?.purchased ?? 0;
  const totalCredits = freeCredits + purchasedCredits;

  if (totalCredits < cost) {
    throw new ProviderError(
      `Onvoldoende credits. Je hebt ${totalCredits} credit(s), maar deze actie kost ${cost} credit(s). Koop meer credits of gebruik je eigen API key.`,
      402,
    );
  }

  // Deduct from free credits first, then purchased
  let remainingCost = cost;

  if (freeCredits > 0) {
    const fromFree = Math.min(freeCredits, remainingCost);
    await db.collection('users').doc(userId).update({
      'credits.free': FieldValue.increment(-fromFree),
      updatedAt: new Date(),
    });
    remainingCost -= fromFree;
  }

  if (remainingCost > 0) {
    await db.collection('users').doc(userId).update({
      'credits.purchased': FieldValue.increment(-remainingCost),
      updatedAt: new Date(),
    });
  }

  // Log transaction
  const creditSource = freeCredits >= cost ? 'free' : 'purchased';
  await db.collection('users').doc(userId).collection('transactions').add({
    amount: -cost,
    type: 'platform_ai',
    description: `Platform AI: ${operation} (${creditSource} credit)`,
    molliePaymentId: null,
    cvId: null,
    createdAt: new Date(),
  });

  // Send low credits warning when balance drops to 2 or below
  const remaining = totalCredits - cost;
  if (remaining <= 2 && remaining >= 0) {
    const userDoc = await db.collection('users').doc(userId).get();
    const email = userDoc.data()?.email;
    if (email) {
      const { subject, html } = renderCreditsLowEmail({
        displayName: userDoc.data()?.displayName || 'daar',
        remaining,
      });
      queueEmail(email, subject, html);
    }
  }
}

/**
 * Charge platform credits for a given cost.
 * Used by routes that manage their own credit logic (e.g. character-based chat billing).
 *
 * @throws ProviderError with 402 if insufficient credits
 */
export async function chargePlatformCredits(
  userId: string,
  cost: number,
  operation: string,
): Promise<void> {
  const db = getAdminDb();
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new ProviderError('User not found', 404);
  }
  const userData = userDoc.data()!;
  await deductPlatformCredits(userId, userData, cost, operation);
}

/**
 * Refund credits when a platform AI call fails.
 * Only call this when mode === 'platform'.
 */
export async function refundPlatformCredits(
  userId: string,
  operation: PlatformOperation,
): Promise<void> {
  const cost = PLATFORM_CREDIT_COSTS[operation] ?? 1;
  const db = getAdminDb();

  // Add credits back to free bucket (simplest approach)
  await db.collection('users').doc(userId).update({
    'credits.free': FieldValue.increment(cost),
    updatedAt: new Date(),
  });

  // Log refund transaction
  await db.collection('users').doc(userId).collection('transactions').add({
    amount: cost,
    type: 'platform_ai_refund',
    description: `Platform AI refund: ${operation}`,
    molliePaymentId: null,
    cvId: null,
    createdAt: new Date(),
  });
}
