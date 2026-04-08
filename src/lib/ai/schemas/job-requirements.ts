/**
 * Gedeelde Zod-primitieven voor job-requirement-objecten.
 *
 * Zie `experience.ts` voor het rationale: primitieven voor nieuwe tools,
 * niet een replacement voor bestaande schemas in job-parser.
 */

import { z } from 'zod';

/**
 * Splitsing tussen must-have en nice-to-have skills uit een vacature.
 * Door beide expliciet te benoemen kan een agent later beslissen welke
 * vereisten écht critical zijn voor de kandidaat-fit.
 */
export const skillRequirementsSchema = z.object({
  mustHave: z.array(z.string()).describe('Skills explicitly required by the job posting'),
  niceToHave: z.array(z.string()).describe('Skills mentioned as preferred but not required'),
});

export type SkillRequirements = z.infer<typeof skillRequirementsSchema>;

/**
 * Experience-vereisten uit een vacature: jaren ervaring, level, eventueel
 * specifieke domein-ervaring.
 */
export const experienceRequirementsSchema = z.object({
  yearsRequired: z.number().nullable().describe('Minimum years of relevant experience required, null if not specified'),
  level: z.enum(['junior', 'medior', 'senior', 'lead', 'principal', 'unspecified']).describe('Career level required'),
  domains: z.array(z.string()).describe('Specific industries or domains the candidate should have experience in'),
});

export type ExperienceRequirements = z.infer<typeof experienceRequirementsSchema>;
