/**
 * Style Generator v2 — orchestrator.
 *
 * The heavy lifting per creativity level lives in src/lib/ai/style-experts/
 * (one file per expert). This orchestrator just looks up the expert, builds
 * the prompt, calls the LLM via generateObjectResilient, and lets the expert
 * normalize the result. If everything fails, we fall back to the expert's
 * static tokens — same industry-aware shape, no crash.
 *
 * The public API (generateDesignTokens + createLinkedInSummaryV2) is
 * unchanged; callers don't need to know about the expert architecture.
 */

import { getModelId } from './providers';
import { resolveTemperature } from './temperature';
import { generateObjectResilient } from './generate-resilient';
import type {
  JobVacancy,
  LLMProvider,
  TokenUsage,
  StyleCreativityLevel,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { getStyleExpert } from './style-experts/registry';
import type { PromptContext } from './style-experts/types';

// Re-export so existing callers (cv-generate, dispute routes) keep working.
export { createLinkedInSummaryV2 } from './style-experts/shared/linkedin-summary';

export interface StyleGenerationV2Result {
  tokens: CVDesignTokens;
  usage: TokenUsage;
}

export async function generateDesignTokens(
  linkedInSummary: string,
  jobVacancy: JobVacancy | null,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  userPreferences?: string,
  creativityLevel: StyleCreativityLevel = 'balanced',
  hasPhoto: boolean = false,
  styleHistory?: CVDesignTokens[],
): Promise<StyleGenerationV2Result> {
  const expert = getStyleExpert(creativityLevel);
  const ctx: PromptContext = {
    linkedInSummary,
    jobVacancy,
    userPreferences,
    hasPhoto,
    styleHistory,
  };

  const { system, user } = expert.buildPrompt(ctx);
  const modelId = getModelId(provider, model);
  const temperature = resolveTemperature(provider, modelId, expert.preferredTemperature);

  console.log(`[Style Gen] level=${creativityLevel}, hasPhoto=${hasPhoto}, temp=${temperature ?? 'unset'}`);

  try {
    const { value, usage } = await generateObjectResilient({
      provider,
      apiKey,
      model,
      schema: expert.schema,
      prompt: user,
      system,
      temperature,
      normalize: (raw) => expert.normalize(raw, ctx),
      logTag: `Style Gen [${creativityLevel}]`,
    });

    console.log(
      `[Style Gen] level=${creativityLevel}, theme=${value.themeBase}, font=${value.fontPairing}, primary=${value.colors.primary}, ` +
        (value.editorial ? `editorial.headerLayout=${value.editorial.headerLayout}, ` : '') +
        (value.bold ? `bold.headerLayout=${value.bold.headerLayout}, bold.sidebarStyle=${value.bold.sidebarStyle}` : ''),
    );

    return { tokens: value, usage };
  } catch (error) {
    console.error(`[Style Gen] All attempts failed for level=${creativityLevel}, using static fallback.`, error);
    return {
      tokens: expert.getFallback(jobVacancy?.industry),
      usage: { promptTokens: 0, completionTokens: 0 },
    };
  }
}
