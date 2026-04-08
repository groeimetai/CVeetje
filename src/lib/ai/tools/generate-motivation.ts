/**
 * Tool: generate_motivation
 *
 * Wrapt `generateMotivationLetter()`. Vereist dat profile + jobVacancy +
 * cvContent allemaal in session zijn (zo niet: foutboodschap met
 * suggestie welke tool eerst te draaien). Optioneel personalMotivation
 * van de gebruiker.
 *
 * Geen mutatie van session — motivatiebrief is een eindresultaat,
 * geen tussenstap voor andere tools.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateMotivationLetter } from '@/lib/ai/motivation-generator';
import type { ToolContext } from './_context';

export function createGenerateMotivationTool(ctx: ToolContext) {
  return tool({
    description:
      "Generate a structured motivation letter (cover letter) using the loaded profile, job vacancy, and previously generated CV content. Returns opening, whyCompany, whyMe, motivation, closing. Requires generate_cv_content to have been run first so the framing matches the CV. Optionally accepts a personalMotivation string the user provided in their own words.",
    inputSchema: z.object({
      personalMotivation: z
        .string()
        .optional()
        .describe("Optional personal motivation text in the user's own words, to be woven into the letter."),
    }),
    execute: async ({ personalMotivation }) => {
      if (!ctx.session.jobVacancy) {
        return { error: 'No job vacancy in session. Call parse_job first.' };
      }
      if (!ctx.session.cvContent) {
        return { error: 'No CV content in session. Call generate_cv_content first.' };
      }
      const result = await generateMotivationLetter(
        ctx.session.linkedIn,
        ctx.session.jobVacancy,
        ctx.session.cvContent,
        ctx.provider,
        ctx.apiKey,
        ctx.model,
        ctx.session.language,
        personalMotivation,
      );
      return result;
    },
  });
}
