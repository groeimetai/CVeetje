/**
 * Platform AI configuration
 *
 * When users don't have their own API key, they can use the platform's
 * Claude Opus 4.7 model. Each AI operation costs credits.
 *
 * Credit costs are weighted by real token usage. Internal cost per credit:
 * approximately €0.10. Retail price ranges €0.25–€0.33 per credit depending
 * on the package — see `src/lib/mollie/client.ts`.
 *
 * A typical "CV with vacancy" flow consumes 9 credits
 * (profile-parse 2 + job-parse 1 + fit-analysis 2 + cv-generate 3 +
 *  style-generate 1). PDF download is free once the CV is generated.
 */

export const PLATFORM_MODEL = {
  provider: 'anthropic' as const,
  modelId: 'claude-opus-4-7',
  displayName: 'Claude Opus 4.7',
};

/**
 * Credit costs per platform AI operation.
 * Own-key users pay 0 credits for these operations.
 */
export type PlatformOperation =
  | 'cv-generate'
  | 'profile-parse'
  | 'job-parse'
  | 'fit-analysis'
  | 'style-generate'
  | 'motivation-letter'
  | 'template-fill'
  | 'dispute-regenerate'
  | 'cv-chat';

export const PLATFORM_CREDIT_COSTS: Record<PlatformOperation, number> = {
  'profile-parse': 2,       // ~$0.30 cost (5K in + 3K out, full structured profile)
  'job-parse': 1,           // ~$0.13 cost (3.6K in + 1K out)
  'fit-analysis': 2,        // ~$0.25 cost (9K in + 1.5K out)
  'cv-generate': 3,         // ~$0.32 cost (10K in + 2.25K out) — main value
  'style-generate': 1,      // ~$0.13 cost (5.8K in + 0.5K out)
  'motivation-letter': 3,   // ~$0.25 cost — uses 2 passes (generator + humanizer)
  'template-fill': 3,       // ~$0.21 cost (8K in + 1.25K out) — DOCX flow
  'dispute-regenerate': 0,  // Free when gatekeeper approves the dispute
  'cv-chat': 0,             // Handled manually in chat route (character-based billing)
};

/**
 * Characters per credit in CV chat.
 *
 * Chat is billed by cumulative conversation length (`messages` array). Each
 * turn re-sends the full conversation context to the model — cost grows
 * roughly quadratically with message count.
 *
 * 8_000 chars ≈ one back-and-forth round at typical context (~17K input
 * tokens ≈ $0.26 raw cost). Lower = safer margin, higher = more generous UX.
 */
export const CHAT_CHAR_LIMIT = 8_000;

/** Monthly free credits for all users — enough for one full CV (9 cr) + room for a regen/edit */
export const MONTHLY_FREE_CREDITS = 15;

/**
 * Anthropic pricing (USD per 1M tokens) — source of truth for cost calculations.
 *
 * Keep in sync with https://docs.anthropic.com/en/docs/about-claude/pricing
 *
 * Cache columns map to Anthropic's tiered cache product:
 *   - cache5m   = 5-minute ephemeral cache write
 *   - cache1h   = 1-hour ephemeral cache write
 *   - cacheHit  = read from any active cache (or refresh)
 */
export const MODEL_PRICING_USD_PER_MTOK: Record<
  string,
  { input: number; cache5m: number; cache1h: number; cacheHit: number; output: number }
> = {
  'claude-opus-4-7':       { input: 5,    cache5m: 6.25,  cache1h: 10,   cacheHit: 0.5,  output: 25 },
  'claude-opus-4-7-1m':    { input: 5,    cache5m: 6.25,  cache1h: 10,   cacheHit: 0.5,  output: 25 },
  'claude-opus-4-6':       { input: 15,   cache5m: 18.75, cache1h: 30,   cacheHit: 1.5,  output: 75 },
  'claude-opus-4-5':       { input: 15,   cache5m: 18.75, cache1h: 30,   cacheHit: 1.5,  output: 75 },
  'claude-sonnet-4-7':     { input: 3,    cache5m: 3.75,  cache1h: 6,    cacheHit: 0.3,  output: 15 },
  'claude-haiku-4-5':      { input: 1,    cache5m: 1.25,  cache1h: 2,    cacheHit: 0.1,  output: 5 },
};

/** Default fallback when a modelId is missing from the table */
export const DEFAULT_MODEL_PRICING = MODEL_PRICING_USD_PER_MTOK['claude-opus-4-7'];

/**
 * Internal cost estimate per credit (EUR). Empirically calibrated for Opus 4.7.
 * A 9-credit CV costs ~€0.35 in tokens → €0.039/credit.
 * Rounded up to €0.05 to cover overhead (Cloud Run, Mollie fees, Firestore writes).
 */
export const INTERNAL_COST_PER_CREDIT_EUR = 0.05;

/** USD → EUR conversion used in admin views. Update when FX drifts > 5%. */
export const USD_TO_EUR = 0.93;
