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
import { getPlatformModelFor } from '@/lib/ai/platform-config-reader';
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

  // Per-operation model from Firestore config (`config/platform`), with a
  // 5-min in-process cache. Falls back to PLATFORM_MODEL.modelId when the
  // doc is missing or the operation hasn't been overridden.
  const modelId = operation
    ? await getPlatformModelFor(operation)
    : PLATFORM_MODEL.modelId;

  const provider = createAIProvider(PLATFORM_MODEL.provider, platformApiKey);

  return {
    provider,
    apiKey: platformApiKey,
    providerName: PLATFORM_MODEL.provider,
    model: modelId,
    mode: 'platform',
    userId,
  };
}

// ---------------------------------------------------------------------------
// Credit management helpers
// ---------------------------------------------------------------------------

// Laatste afschrijving per user+operatie, zodat een refund in hetzelfde
// request terug kan naar de juiste bucket (free vs purchased). Refunds
// gebeuren altijd in dezelfde request/instance als de afschrijving.
const lastCharges = new Map<string, { fromFree: number; fromPurchased: number }>();

/**
 * Trek credits atomisch af in één Firestore-transactie.
 *
 * Security: voorheen was dit check-then-deduct op een stale snapshot, waardoor
 * N parallelle requests met 1 credit allemaal slaagden en het saldo negatief
 * werd (wat de maandelijkse reset vervolgens kwijtschold). Nu wordt het saldo
 * binnen de transactie vers gelezen, gecheckt en nooit onder 0 gezet.
 */
async function deductPlatformCredits(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  _staleUserData: any,
  cost: number,
  operation: string,
): Promise<void> {
  if (!Number.isFinite(cost) || cost <= 0) return;
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new ProviderError('User not found', 404);
    }
    const data = snap.data()!;
    const freeCredits = Math.max(0, Number(data.credits?.free ?? 0));
    const purchasedCredits = Math.max(0, Number(data.credits?.purchased ?? 0));
    const totalCredits = freeCredits + purchasedCredits;

    if (totalCredits < cost) {
      throw new ProviderError(
        `Onvoldoende credits. Je hebt ${totalCredits} credit(s), maar deze actie kost ${cost} credit(s). Koop meer credits of gebruik je eigen API key.`,
        402,
      );
    }

    // Free credits eerst, dan purchased
    const fromFree = Math.min(freeCredits, cost);
    const fromPurchased = cost - fromFree;

    tx.update(userRef, {
      'credits.free': freeCredits - fromFree,
      'credits.purchased': purchasedCredits - fromPurchased,
      updatedAt: new Date(),
    });

    const txRef = userRef.collection('transactions').doc();
    tx.set(txRef, {
      amount: -cost,
      type: 'platform_ai',
      operation,
      fromFree,
      fromPurchased,
      description: `Platform AI: ${operation} (${fromPurchased > 0 ? 'purchased' : 'free'} credit)`,
      molliePaymentId: null,
      cvId: null,
      createdAt: new Date(),
    });

    return {
      fromFree,
      fromPurchased,
      remaining: totalCredits - cost,
      email: data.email as string | undefined,
      displayName: data.displayName as string | undefined,
    };
  });

  lastCharges.set(`${userId}:${operation}`, {
    fromFree: result.fromFree,
    fromPurchased: result.fromPurchased,
  });

  // Send low credits warning when balance drops to 2 or below
  if (result.remaining <= 2 && result.remaining >= 0 && result.email) {
    const { subject, html } = renderCreditsLowEmail({
      displayName: result.displayName || 'daar',
      remaining: result.remaining,
    });
    queueEmail(result.email, subject, html);
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
  await deductPlatformCredits(userId, null, cost, operation);
}

/**
 * Refund credits when a platform AI call fails.
 * Only call this when mode === 'platform'.
 */
export async function refundPlatformCredits(
  userId: string,
  operation: PlatformOperation | string,
): Promise<void> {
  const db = getAdminDb();
  const key = `${userId}:${operation}`;
  const last = lastCharges.get(key);
  lastCharges.delete(key);
  // Terug naar de bucket waaruit afgeschreven is; zonder bekende afschrijving
  // (andere instance) valt het terug op de free bucket.
  const fromFree = last
    ? last.fromFree
    : PLATFORM_CREDIT_COSTS[operation as PlatformOperation] ?? 1;
  const fromPurchased = last ? last.fromPurchased : 0;
  const cost = fromFree + fromPurchased;
  if (cost <= 0) return;

  await db.collection('users').doc(userId).update({
    ...(fromFree > 0 ? { 'credits.free': FieldValue.increment(fromFree) } : {}),
    ...(fromPurchased > 0 ? { 'credits.purchased': FieldValue.increment(fromPurchased) } : {}),
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
