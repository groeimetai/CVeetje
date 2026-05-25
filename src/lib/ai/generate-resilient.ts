/**
 * Resilient generateObject wrapper.
 *
 * Claude Opus 4.7 under structured output occasionally returns `{}` or wraps
 * the payload in `{data: ...}`, causing "response did not match schema" /
 * empty-content failures. That error is intermittent, not deterministic —
 * a fresh request with the same prompt often succeeds. For Anthropic
 * specifically we also keep Opus 4.6 as a last-ditch fallback, since its
 * structured-output is more stable while staying in the same model family.
 *
 * This helper tries a sequence of attempts and considers an attempt
 * "successful" only when the normalize function accepts the result. The
 * normalize function is the generator's own validator (e.g. normalizeCVContent)
 * and is responsible for throwing when the output is empty/insufficient.
 */
import { generateObject } from 'ai';
import type { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import type { LLMProvider, TokenUsage } from '@/types';

const ANTHROPIC_FALLBACK_MODEL = 'claude-opus-4-6';

export interface ResilientGenerateOptions<TSchema extends z.ZodTypeAny, TResult> {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  schema: TSchema;
  prompt: string;
  system?: string;
  temperature?: number;
  /** Turn the raw LLM object into the final shape. MUST throw on insufficient output. */
  normalize: (raw: unknown) => TResult;
  /** Log-tag used in console output, e.g. "CV Gen" or "Job Parser". */
  logTag: string;
}

export interface ResilientGenerateResult<TResult> {
  value: TResult;
  usage: TokenUsage;
  attemptsUsed: number;
  modelUsed: string;
}

/**
 * Returns true for errors we should retry / fall back on — empty responses,
 * schema mismatches, type validation, invalid JSON, Anthropic schema-too-
 * complex / grammar-compilation-timeout (pre-flight validation, Opus 4.7-
 * specific), plus capacity errors (HTTP 529 Overloaded, 503, rate-limit)
 * where Anthropic itself signals `x-should-retry: true`. Does NOT retry auth
 * errors.
 */
function isRecoverableStructuredError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  if (/401|403|unauthorized|forbidden|invalid api key/i.test(message)) return false;
  return /did not match schema|type validation|no object generated|invalid json|response did not|leeg antwoord|schema is too complex|grammar compilation|overloaded|529|503|too many requests|429|service unavailable/i.test(
    message,
  );
}

/**
 * Capacity-side errors (Anthropic overloaded, rate-limited, briefly
 * unavailable). These benefit from a short delay before retrying — hammering
 * immediately just hits the same overloaded queue.
 */
function isCapacityError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /overloaded|529|503|too many requests|429|service unavailable/i.test(message);
}

/** Anthropic Opus 4.7 sometimes 400's on schemas that 4.6 accepts — either
 *  "Schema is too complex" (pre-flight rejection) or "Grammar compilation
 *  timed out" (the constrained-decoding grammar is too large to compile
 *  within Anthropic's budget). Both are deterministic for a given
 *  model+schema, so a same-model retry just burns time on an identical
 *  request. When we see either on the primary attempts, skip the duplicate-
 *  retry and jump straight to the 4.6 fallback — same as we do for empty
 *  responses. */
function isSchemaTooComplexError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /schema is too complex|grammar compilation/i.test(message);
}

/**
 * Distinguishes "model returned an empty payload" from "model returned a
 * malformed payload". An empty-payload failure on Anthropic Opus 4.7 is
 * deterministic — the same prompt + schema produces the same `{}` again,
 * so retrying the same model just burns ~1.5 minutes for nothing. When we
 * see this we skip the duplicate-model retry and go straight to the
 * Anthropic 4.6 fallback in the chain.
 *
 * Malformed-payload failures (schema mismatch, invalid JSON) ARE flaky
 * and worth retrying on the same model — leave those alone.
 */
function isEmptyResponseError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /leeg antwoord|no object generated/i.test(message);
}

export async function generateObjectResilient<TSchema extends z.ZodTypeAny, TResult>(
  opts: ResilientGenerateOptions<TSchema, TResult>,
): Promise<ResilientGenerateResult<TResult>> {
  const { provider, apiKey, model, schema, prompt, system, temperature, normalize, logTag } = opts;

  const aiProvider = createAIProvider(provider, apiKey);
  const primaryModelId = getModelId(provider, model);

  // Build attempt chain. We always try the primary model twice (catches
  // genuine flakes). For Anthropic we add one Opus 4.6 attempt at the end
  // as a model-level escape hatch — 4.6 stays in the same family but has
  // less aggressive structured-output behavior than 4.7.
  const modelChain: string[] = [primaryModelId, primaryModelId];
  const fallbackModelId = getModelId('anthropic', ANTHROPIC_FALLBACK_MODEL);
  if (provider === 'anthropic' && primaryModelId !== fallbackModelId) {
    modelChain.push(fallbackModelId);
  }

  let lastError: unknown;
  for (let attemptIndex = 0; attemptIndex < modelChain.length; attemptIndex++) {
    const attemptModelId = modelChain[attemptIndex];
    const isFallbackModel = attemptModelId !== primaryModelId;

    try {
      console.log(
        `[${logTag}] Attempt ${attemptIndex + 1}/${modelChain.length} with ${attemptModelId}${isFallbackModel ? ' (FALLBACK)' : ''}`,
      );

      const { object, usage } = await generateObject({
        model: aiProvider(attemptModelId),
        schema,
        prompt,
        ...(system ? { system } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
      });

      // normalize() throws on empty / insufficient output — in that case we
      // fall through to the next attempt rather than returning junk.
      const value = normalize(object);

      return {
        value,
        usage: {
          promptTokens: usage?.inputTokens ?? 0,
          completionTokens: usage?.outputTokens ?? 0,
        },
        attemptsUsed: attemptIndex + 1,
        modelUsed: attemptModelId,
      };
    } catch (err) {
      lastError = err;
      const recoverable = isRecoverableStructuredError(err);
      const capacity = isCapacityError(err);
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[${logTag}] Attempt ${attemptIndex + 1} with ${attemptModelId} failed${recoverable ? capacity ? ' (capacity)' : ' (recoverable)' : ''}: ${msg.slice(0, 160)}`,
      );

      // Non-structural errors (auth, network etc.) bubble up immediately —
      // no point in burning through the fallback chain if our API key is bad.
      if (!recoverable) throw err;

      // Fast-fallback: if a non-fallback model returned an EMPTY payload,
      // skip the second attempt on the same model and jump straight to the
      // fallback. Empty-response failures on Opus 4.7 are deterministic for
      // a given prompt+schema (the model decides to under-fill), so a same-
      // model retry just burns ~1.5 minutes for the same result. We still
      // retry on schema/JSON failures, which ARE genuinely flaky.
      const nextAttemptModelId = modelChain[attemptIndex + 1];
      if (
        !isFallbackModel &&
        (isEmptyResponseError(err) || isSchemaTooComplexError(err)) &&
        nextAttemptModelId === attemptModelId
      ) {
        const reason = isSchemaTooComplexError(err)
          ? (/grammar compilation/i.test(err instanceof Error ? err.message : String(err))
              ? 'grammar-compilation-timeout'
              : 'schema-too-complex')
          : 'empty payload';
        console.warn(
          `[${logTag}] ${reason} on ${attemptModelId} — skipping duplicate retry, jumping to fallback`,
        );
        attemptIndex++; // skip the duplicate-model attempt
      }

      // Capacity errors get a short backoff before the next attempt —
      // hammering an overloaded queue just hits the same wall. Anthropic
      // itself sets `x-should-retry: true` on 529 responses. Skip the wait
      // if we've already exhausted the chain (the throw below handles it).
      if (capacity && attemptIndex < modelChain.length - 1) {
        const delayMs = 2000 * Math.pow(2, attemptIndex); // 2s, 4s, 8s
        console.warn(`[${logTag}] Capacity error — waiting ${delayMs}ms before next attempt`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(`[${logTag}] All ${modelChain.length} attempts exhausted. Last error:`, lastError);
  throw new Error(
    'Het AI-model kon na meerdere pogingen geen geldig antwoord genereren. Probeer het over enkele minuten opnieuw — je credit is niet afgeschreven.',
  );
}
