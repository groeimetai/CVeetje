/**
 * Tool: fill_docx
 *
 * Wrapt `fillStructuredSegments()`. Leest profile/jobVacancy/fitAnalysis uit
 * session, neemt templateMap + blueprint via inputSchema (van een eerdere
 * `analyze_template` aanroep). Volgt HONESTY RULES — vult geen verzonnen
 * content in.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { fillStructuredSegments } from '@/lib/ai/docx-content-replacer';
import type { ExperienceDescriptionFormat } from '@/types/design-tokens';
import type { ToolContext } from './_context';

export function createFillDocxTool(ctx: ToolContext) {
  return tool({
    description:
      "Fill a DOCX template's segments with candidate content based on a previously generated blueprint from analyze_template. Uses the loaded profile and (if available) job vacancy and fit analysis from session. Returns segment-ID → value mappings plus warnings for segments that couldn't be filled. Follows honesty rules — no fabricated content.",
    inputSchema: z.object({
      templateMap: z.string().describe('Same templateMap as passed to analyze_template.'),
      blueprint: z
        .any()
        .nullable()
        .describe('Blueprint object from a previous analyze_template call, or null to let the function re-derive it.'),
      customInstructions: z.string().optional().describe('Optional user instructions for the fill (e.g. tone, focus areas).'),
      descriptionFormat: z.enum(['bullets', 'paragraph']).optional().describe('Experience description format. Default: bullets.'),
    }),
    execute: async ({ templateMap, blueprint, customInstructions, descriptionFormat }) => {
      const result = await fillStructuredSegments(
        templateMap,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blueprint as any,
        ctx.session.linkedIn,
        ctx.provider,
        ctx.apiKey,
        ctx.model,
        ctx.session.jobVacancy ?? undefined,
        ctx.session.language,
        ctx.session.fitAnalysis ?? undefined,
        customInstructions,
        (descriptionFormat ?? 'bullets') as ExperienceDescriptionFormat,
        undefined as Record<string, string> | undefined,
      );
      return result;
    },
  });
}
