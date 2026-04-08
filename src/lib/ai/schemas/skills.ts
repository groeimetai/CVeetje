/**
 * Gedeelde Zod-primitieven voor skill-objecten.
 *
 * Zie `experience.ts` voor het rationale: dit zijn primitieven voor nieuwe
 * tools, niet een replacement voor bestaande schemas in cv-generator,
 * job-parser, fit-analyzer.
 */

import { z } from 'zod';

/**
 * Standaard skill-categorisatie zoals die in cv-generator's output gebruikt wordt:
 * technical (hard skills) en soft (interpersonal/transferable skills).
 */
export const skillSetSchema = z.object({
  technical: z.array(z.string()).describe('Technical/hard skills relevant to the job, ordered by relevance'),
  soft: z.array(z.string()).describe('Soft skills relevant to the job'),
});

export type SkillSet = z.infer<typeof skillSetSchema>;

/**
 * Skill-match analyse zoals door fit-analyzer geproduceerd: welke skills uit
 * de vacature wel/niet/bonus aanwezig zijn in het profiel.
 */
export const skillMatchSchema = z.object({
  matched: z.array(z.string()).describe('Skills that match between profile and job'),
  missing: z.array(z.string()).describe('Required skills that the profile lacks'),
  bonus: z.array(z.string()).describe('Profile skills that are not required but add value'),
  matchPercentage: z.number().min(0).max(100).describe('Percentage of required skills covered'),
});

export type SkillMatch = z.infer<typeof skillMatchSchema>;
