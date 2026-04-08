/**
 * Tool: generate_cv_content
 *
 * Wrapt `generateCV()`. Leest profiel + (optioneel) vacature uit `ctx.session`
 * en produceert de complete CV-content (headline, summary, experience,
 * education, skills, languages, certifications, projects). Volgt strikte
 * HONESTY RULES uit `prompts/honesty-rules.ts`.
 *
 * Schrijft het resultaat naar `ctx.session.cvContent` zodat
 * `generate_motivation` het direct kan gebruiken.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateCV } from '@/lib/ai/cv-generator';
import type { CVStyleConfig } from '@/types';
import type { ExperienceDescriptionFormat } from '@/types/design-tokens';
import type { ToolContext } from './_context';

export function createGenerateCvContentTool(ctx: ToolContext) {
  return tool({
    description:
      "Generate the complete tailored CV content (headline, summary, experience, education, skills, languages, certifications, projects) from the loaded profile and (optional) job vacancy. Follows strict honesty rules: no fabrication of experience or skills. Uses the language from session. Stores the result in session for use by generate_motivation.",
    inputSchema: z.object({
      descriptionFormat: z
        .enum(['bullets', 'paragraph'])
        .optional()
        .describe('Format for experience descriptions: bullets (default) or paragraph.'),
    }),
    execute: async ({ descriptionFormat }) => {
      const result = await generateCV(
        ctx.session.linkedIn,
        ctx.session.jobVacancy,
        ctx.provider,
        ctx.apiKey,
        ctx.model,
        undefined as CVStyleConfig | undefined,
        ctx.session.language,
        (descriptionFormat ?? 'bullets') as ExperienceDescriptionFormat,
      );
      ctx.session.cvContent = result.content;
      return result;
    },
  });
}
