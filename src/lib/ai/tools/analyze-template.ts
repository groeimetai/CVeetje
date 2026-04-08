/**
 * Tool: analyze_template
 *
 * Wrapt `analyzeTemplateBlueprint()`. Geen session reads — neemt templateMap
 * en profileCounts via inputSchema (de host-route levert deze meestal vanuit
 * een eerdere DOCX-upload-stap). Returnt een blueprint die fill_docx als
 * input gebruikt.
 *
 * profileCounts wordt afgeleid uit `ctx.session.linkedIn` als de LLM het
 * niet expliciet meegeeft (sane default).
 */

import { tool } from 'ai';
import { z } from 'zod';
import { analyzeTemplateBlueprint } from '@/lib/ai/template-analyzer';
import type { ToolContext } from './_context';

export function createAnalyzeTemplateTool(ctx: ToolContext) {
  return tool({
    description:
      'Analyze the structure of a DOCX template by identifying which segments belong to which CV section (personal_info, work_experience, education, skills, etc.) and which segments form repeating blocks. Returns a blueprint that fill_docx uses as input. Run this before fill_docx for any DOCX template flow.',
    inputSchema: z.object({
      templateMap: z
        .string()
        .describe('Textual representation of the DOCX template structure, as produced by template-filler.ts. Contains segment IDs (s0, s1, ...) and their context.'),
    }),
    execute: async ({ templateMap }) => {
      const profileCounts = {
        workExperience: ctx.session.linkedIn.experience.length,
        education: ctx.session.linkedIn.education.length,
      };
      const result = await analyzeTemplateBlueprint(
        templateMap,
        profileCounts,
        ctx.provider,
        ctx.apiKey,
        ctx.model,
      );
      return result;
    },
  });
}
