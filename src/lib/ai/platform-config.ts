/**
 * Platform AI configuration
 *
 * When users don't have their own API key, they can use the platform's
 * Claude Opus 4.6 model. Each AI operation costs credits.
 */

export const PLATFORM_MODEL = {
  provider: 'anthropic' as const,
  modelId: 'claude-opus-4-6',
  displayName: 'Claude Opus 4.6',
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
  | 'cv-chat';

export const PLATFORM_CREDIT_COSTS: Record<PlatformOperation, number> = {
  'cv-generate': 1,
  'profile-parse': 1,
  'job-parse': 1,
  'fit-analysis': 1,
  'style-generate': 1,
  'cv-chat': 1,
};

/** Monthly free credits for all users */
export const MONTHLY_FREE_CREDITS = 10;
