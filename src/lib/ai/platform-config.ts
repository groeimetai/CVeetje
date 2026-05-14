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
 * Internal cost estimate per credit (EUR). Used for accounting / admin views.
 * NOT exposed to end-users (they see retail price per pack).
 */
export const INTERNAL_COST_PER_CREDIT_EUR = 0.10;
