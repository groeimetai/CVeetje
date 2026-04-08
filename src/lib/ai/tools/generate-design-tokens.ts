/**
 * Tool: generate_design_tokens
 *
 * Wrapt `generateDesignTokens()`. Bouwt de LinkedIn-summary uit `ctx.session.linkedIn`
 * via `createLinkedInSummaryV2()` en geeft die door aan de generator. Leest
 * optioneel `ctx.session.jobVacancy` voor industrie-afhankelijke styling.
 *
 * Schrijft het resultaat naar `ctx.session.designTokens`.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateDesignTokens, createLinkedInSummaryV2 } from '@/lib/ai/style-generator-v2';
import type { CVDesignTokens, StyleCreativityLevel } from '@/types';
import type { ToolContext } from './_context';

export function createGenerateDesignTokensTool(ctx: ToolContext) {
  return tool({
    description:
      'Generate visual design tokens (theme, colors, fonts, header variant, spacing, section style) for the CV. Reads the loaded profile from session and tailors the style to the job vacancy if loaded. Use creativityLevel "conservative" for finance/legal, "balanced" for tech/general, "creative" or "experimental" for design/marketing roles. Stores the tokens in session.',
    inputSchema: z.object({
      userPreferences: z
        .string()
        .optional()
        .describe('Optional user-stated preferences ("classic", "modern with green", "minimal").'),
      creativityLevel: z
        .enum(['conservative', 'balanced', 'creative', 'experimental'])
        .optional()
        .describe('How adventurous the design should be. Default: balanced.'),
      hasPhoto: z
        .boolean()
        .optional()
        .describe('Whether the user has a profile photo. Affects header layout. Default: false.'),
    }),
    execute: async ({ userPreferences, creativityLevel, hasPhoto }) => {
      const summary = createLinkedInSummaryV2({
        fullName: ctx.session.linkedIn.fullName,
        headline: ctx.session.linkedIn.headline,
        location: ctx.session.linkedIn.location,
        about: ctx.session.linkedIn.about,
        experience: ctx.session.linkedIn.experience.map((e) => ({
          title: e.title,
          company: e.company,
          isCurrentRole: !e.endDate,
        })),
        education: ctx.session.linkedIn.education.map((e) => ({
          school: e.school,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy,
        })),
        skills: ctx.session.linkedIn.skills.map((s) => ({ name: s.name })),
      });

      const result = await generateDesignTokens(
        summary,
        ctx.session.jobVacancy,
        ctx.provider,
        ctx.apiKey,
        ctx.model,
        userPreferences,
        (creativityLevel ?? 'balanced') as StyleCreativityLevel,
        hasPhoto ?? false,
        undefined as CVDesignTokens[] | undefined,
      );
      ctx.session.designTokens = result.tokens;
      return result;
    },
  });
}
