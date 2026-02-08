/**
 * Retry utility with exponential backoff for AI API calls.
 *
 * Retries on transient errors (rate limits, server errors, timeouts)
 * but NOT on client errors (auth, validation, schema mismatch).
 */

interface RetryOptions {
  maxRetries?: number;   // default: 2 (max 3 attempts total)
  baseDelayMs?: number;  // default: 1000
  maxDelayMs?: number;   // default: 10000
}

const RETRYABLE_PATTERNS = [
  /rate.?limit/i,
  /too many requests/i,
  /quota/i,
  /timeout/i,
  /timed?\s*out/i,
  /ECONNRESET/,
  /ECONNREFUSED/,
  /ENOTFOUND/,
  /socket hang up/i,
  /network/i,
  /503/,
  /529/,
  /500/,
  /502/,
  /overloaded/i,
  /unavailable/i,
  /capacity/i,
];

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  // Never retry auth or validation errors
  if (/401|403|unauthorized|forbidden/i.test(message)) return false;
  if (/400|invalid|validation|schema/i.test(message) && !/timeout/i.test(message)) return false;

  return RETRYABLE_PATTERNS.some(pattern => pattern.test(message));
}

function getDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponentialDelay, maxDelayMs);
  // Add ±20% jitter
  const jitter = capped * (0.8 + Math.random() * 0.4);
  return Math.round(jitter);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 10000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = getDelay(attempt, baseDelayMs, maxDelayMs);
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[AI Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${message.slice(0, 120)}. Retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Shouldn't reach here, but just in case
  throw lastError;
}
