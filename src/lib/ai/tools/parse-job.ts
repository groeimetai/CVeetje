/**
 * Tool: parse_job
 *
 * Wrapt `parseJobVacancy()`. Neemt ruwe vacature-tekst en retourneert een
 * gestructureerde `JobVacancy`. Schrijft het resultaat naar `ctx.session.jobVacancy`
 * zodat opvolgende tools (analyze_fit, generate_cv_content, generate_motivation)
 * het kunnen lezen zonder dat de LLM het door moet geven.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { parseJobVacancy } from '@/lib/ai/job-parser';
import type { ToolContext } from './_context';

export function createParseJobTool(ctx: ToolContext) {
  return tool({
    description:
      'Parse raw vacancy text into a structured JobVacancy with title, company, requirements, keywords, salary estimate, must-have/nice-to-have skills, and experience requirements. Stores the result in session for later tools. Use this as the first step when the user provides a job posting.',
    inputSchema: z.object({
      rawText: z
        .string()
        .min(20)
        .describe('Raw job posting text. Can include HTML, line breaks, or unstructured paste from a careers page.'),
    }),
    execute: async ({ rawText }) => {
      const result = await parseJobVacancy(rawText, ctx.provider, ctx.apiKey, ctx.model);
      ctx.session.jobVacancy = result.vacancy;
      return result;
    },
  });
}
