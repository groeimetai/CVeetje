/**
 * Tool: analyze_fit
 *
 * Wrapt `analyzeFit()`. Leest profiel + vacature uit `ctx.session` (beide
 * moeten aanwezig zijn) en retourneert fit-score, verdict, matched/missing
 * skills, experience-gap, advice. Schrijft het resultaat naar
 * `ctx.session.fitAnalysis` voor opvolgende tools.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { analyzeFit } from '@/lib/ai/fit-analyzer';
import type { ToolContext } from './_context';

export function createAnalyzeFitTool(ctx: ToolContext) {
  return tool({
    description:
      'Analyze how well the loaded candidate profile matches the parsed job vacancy. Both must be in session — call parse_job first if no jobVacancy is loaded. Returns a fit score 0-100, verdict (excellent/good/moderate/challenging/unlikely), matched skills, missing skills, experience gap analysis, and actionable advice.',
    inputSchema: z.object({}),
    execute: async () => {
      if (!ctx.session.jobVacancy) {
        return {
          error: 'No job vacancy in session. Call parse_job first to load a vacancy before analyzing fit.',
        };
      }
      const result = await analyzeFit(
        ctx.session.linkedIn,
        ctx.session.jobVacancy,
        ctx.provider,
        ctx.apiKey,
        ctx.model,
      );
      ctx.session.fitAnalysis = result.analysis;
      return result;
    },
  });
}
