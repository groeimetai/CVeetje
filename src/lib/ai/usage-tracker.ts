/**
 * Per-CV AI usage telemetry.
 *
 * Every platform AI call captures `usage.inputTokens` + `usage.outputTokens`
 * from the Vercel AI SDK response. This module persists those numbers so we
 * can later answer questions like:
 *
 *   - "What did CV X actually cost us in tokens?"
 *   - "Is our `cv-generate` credit cost (3) still right after we see 500
 *      real generations?"
 *   - "Which user is consuming most tokens per credit?"
 *
 * Two write paths per call:
 *
 *   1. Audit log entry on `users/{uid}/transactions` with type='usage_log'
 *      (amount=0, paired with the credit-deduction transaction)
 *   2. CV-level rollup on `users/{uid}/cvs/{cvId}` — appends to `aiUsage[]`
 *      and increments `aiUsageTotals.*` (when cvId is known)
 *
 * Failures are swallowed and logged — telemetry must never break the user
 * flow.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  MODEL_PRICING_USD_PER_MTOK,
  DEFAULT_MODEL_PRICING,
  type PlatformOperation,
} from '@/lib/ai/platform-config';

export interface OperationUsage {
  inputTokens: number;
  outputTokens: number;
  /** Reserved for future use — cache hits are cheaper, but the SDK doesn't surface them yet. */
  cachedInputTokens?: number;
}

/** Cost in USD for a given (usage × model) pair. Uses fallback when model is unknown. */
export function computeUsageCostUsd(usage: OperationUsage, modelId: string): number {
  const rates =
    MODEL_PRICING_USD_PER_MTOK[modelId] ??
    MODEL_PRICING_USD_PER_MTOK[modelId.replace(/-1m$/, '')] ??
    DEFAULT_MODEL_PRICING;

  const inputCost = ((usage.inputTokens - (usage.cachedInputTokens ?? 0)) * rates.input) / 1_000_000;
  const cacheCost = ((usage.cachedInputTokens ?? 0) * rates.cacheHit) / 1_000_000;
  const outputCost = (usage.outputTokens * rates.output) / 1_000_000;

  return inputCost + cacheCost + outputCost;
}

/**
 * Record a single AI operation: audit log + (optionally) per-CV rollup.
 *
 * Call this AFTER the AI call returns. Pass `cvId=null` for operations not
 * tied to a CV (profile-parse, job-parse before a CV exists).
 */
export async function recordOperationUsage(args: {
  userId: string;
  cvId: string | null;
  operation: PlatformOperation | string;
  usage: OperationUsage;
  modelId: string;
}): Promise<void> {
  const { userId, cvId, operation, usage, modelId } = args;

  // Defensive: 0-token usage isn't worth a write.
  if (!usage.inputTokens && !usage.outputTokens) return;

  const costUsd = computeUsageCostUsd(usage, modelId);
  const db = getAdminDb();

  try {
    // 1. Audit log on transactions (always)
    await db.collection('users').doc(userId).collection('transactions').add({
      amount: 0,
      type: 'usage_log',
      description: `Usage: ${operation} — ${usage.inputTokens} in / ${usage.outputTokens} out`,
      molliePaymentId: null,
      cvId: cvId ?? null,
      operation,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd,
      modelId,
      createdAt: new Date(),
    });

    // 2. Per-CV rollup (when applicable)
    if (cvId) {
      const cvRef = db.collection('users').doc(userId).collection('cvs').doc(cvId);
      await cvRef.update({
        aiUsage: FieldValue.arrayUnion({
          operation,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          costUsd,
          modelId,
          timestamp: new Date(),
        }),
        'aiUsageTotals.inputTokens': FieldValue.increment(usage.inputTokens),
        'aiUsageTotals.outputTokens': FieldValue.increment(usage.outputTokens),
        'aiUsageTotals.costUsd': FieldValue.increment(costUsd),
        updatedAt: new Date(),
      });
    }
  } catch (err) {
    // Telemetry must never break the user flow.
    console.error('[usage-tracker] recordOperationUsage failed:', err);
  }
}
