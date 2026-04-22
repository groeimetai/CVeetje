/**
 * StyleExpert contract — each creativity level implements one of these.
 *
 * The orchestrator (`generateDesignTokens`) looks up an expert by level,
 * calls expert.buildPrompt(ctx) to get the system+user prompt, passes the
 * expert.schema to `generateObjectResilient`, and runs expert.normalize(raw)
 * on the result. If that throws or the whole LLM call fails, it falls back
 * to expert.getFallback(industry).
 *
 * Keeping this tight interface lets us add new experts (e.g. "minimalist",
 * "infographic") without touching the orchestrator.
 */

import type { z } from 'zod';
import type {
  JobVacancy,
  StyleCreativityLevel,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';

/** Inputs to prompt/normalize — not part of the LLM payload itself. */
export interface PromptContext {
  linkedInSummary: string;
  jobVacancy: JobVacancy | null;
  userPreferences?: string;
  hasPhoto: boolean;
  /** Prior tokens so the expert can rotate over-used values for variety. */
  styleHistory?: CVDesignTokens[];
}

export interface BuiltPrompt {
  system: string;
  user: string;
}

export interface StyleExpert {
  level: StyleCreativityLevel;

  /** Zod schema the AI output is parsed against. May extend base. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<any>;

  /**
   * Recommended temperature for this level. The orchestrator combines this
   * with `resolveTemperature()` so newer models that don't accept
   * temperature still work correctly.
   */
  preferredTemperature: number;

  /** Build the system + user prompt from the request context. */
  buildPrompt(ctx: PromptContext): BuiltPrompt;

  /**
   * Turn the raw LLM output into a fully-populated CVDesignTokens.
   * MUST throw on truly empty output so `generateObjectResilient` retries
   * rather than returning junk.
   */
  normalize(raw: unknown, ctx: PromptContext): CVDesignTokens;

  /**
   * Industry-aware static tokens used when the LLM call ultimately fails
   * after all retries.
   */
  getFallback(industry?: string): CVDesignTokens;
}
