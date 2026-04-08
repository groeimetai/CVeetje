/**
 * Gedeelde Zod-primitieven voor experience-objecten.
 *
 * Status v1: dit is een **fundament** voor toekomstige tools en agent-runtime.
 * De bestaande generators (`cv-generator.ts`, `fit-analyzer.ts`,
 * `docx-content-replacer.ts`) gebruiken nog hun eigen schemas — die zijn shaped
 * verschillend per use case en zijn niet veilig om te consolideren zonder
 * risico op breken van de wizard.
 *
 * Nieuwe tools in `src/lib/ai/tools/` mogen deze primitieven gebruiken om
 * consistente input/output schemas op te bouwen. Bestaande generators
 * migreren we pas wanneer we kunnen verifiëren dat de output identiek blijft.
 */

import { z } from 'zod';

/**
 * Datum-range string in CV-formaat: "Month Year - Month Year" of "Month Year - Present".
 * Format-validatie laten we soepel — de LLM levert vrije strings, we vertrouwen
 * op de prompt om het formaat consistent te houden.
 */
export const periodSchema = z.string().describe(
  'Date range: "Month Year - Month Year" or "Month Year - Present"'
);

/**
 * Relevance-score voor een experience-entry, gebruikt om sortering en
 * verbosity te bepalen op basis van fit met de target job.
 *
 * 5 = highly relevant (4-5 bullets), 1 = minimally relevant (consider omitting).
 */
export const relevanceScoreSchema = z.number().min(1).max(5).describe(
  'Relevance to target job: 5=highly relevant, 1=minimally relevant'
);

/**
 * Basis experience-entry. Tools mogen dit extenden met `.extend()` voor
 * use-case-specifieke velden (zoals `relevanceScore` voor CV-generation,
 * of `gapAnalysis` voor fit-checking).
 */
export const baseExperienceSchema = z.object({
  title: z.string().describe('Job title (may be reframed within honesty rules)'),
  company: z.string(),
  location: z.string().nullable(),
  period: periodSchema,
});

export type BaseExperience = z.infer<typeof baseExperienceSchema>;
