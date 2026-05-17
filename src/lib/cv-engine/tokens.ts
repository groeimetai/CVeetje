/**
 * CVStyleTokensV2 — The AI output schema for the new style engine.
 *
 * Tiny — 6 top-level fields versus the legacy CVDesignTokens' ~30. The AI
 * picks a `recipeId` and optionally tweaks within `recipe.palette.range` /
 * `recipe.allowedFontPairings`. Content-driven `emphasis` lets the AI
 * elevate specific lines/words/letters from the candidate's profile so two
 * CVs with the same recipe still differ.
 *
 * Persisted on Firestore CV docs under `designTokens`, identified by
 * `engineVersion: 'v2'`. Docs without `engineVersion` are legacy (v1) and
 * keep rendering via src/lib/cv/html-generator.ts.
 */

import { z } from 'zod';
import { FontPairingIdSchema, OklchValueSchema } from './spec';

// ============ Emphasis (content-driven primitives) ============

export const EmphasisSchema = z.object({
  /** The actual pull-quote text the renderer should use. */
  pullQuoteText: z.string().max(240).optional(),
  /** Cite line below the pull quote — e.g. "— Senior Strategist, Stedelijk". */
  pullQuoteAttribution: z.string().max(80).optional(),
  /** 3-7 words/phrases from the vacancy or candidate that get accent
   *  highlighting in body text. Case-insensitive substring match. */
  accentKeywords: z.array(z.string().min(1).max(40)).min(0).max(7).optional(),
  /** 2-6 word tagline below the candidate's name (Monocle-style). */
  nameTagline: z.string().max(80).optional(),
  /** Single letter for the drop-cap. Falls back to first letter of summary. */
  dropCapLetter: z.string().min(1).max(1).optional(),
  /** The single line that becomes poster-scale type in poster archetypes. */
  posterLine: z.string().max(160).optional(),
  /** Literal content for backgroundNumeral (e.g. "8" for "8 years of exp"). */
  heroNumeralValue: z.string().max(12).optional(),
});
export type Emphasis = z.infer<typeof EmphasisSchema>;

// ============ Palette override ============

/** Partial override of the recipe's anchor palette. UI/AI may set only the
 *  roles they want to change; each value is then clamped to the recipe's
 *  `palette.{role}.range` at normalize-time. */
export const PaletteOverrideSchema = z.object({
  ink: OklchValueSchema.optional(),
  paper: OklchValueSchema.optional(),
  accent: OklchValueSchema.optional(),
  muted: OklchValueSchema.optional(),
  surface: OklchValueSchema.optional(),
});
export type PaletteOverride = z.infer<typeof PaletteOverrideSchema>;

// ============ CVStyleTokensV2 ============

export const PageModeSchema = z.enum(['a4-paged', 'single-long']);
export type PageMode = z.infer<typeof PageModeSchema>;

export const CVStyleTokensV2Schema = z.object({
  engineVersion: z.literal('v2'),
  /** Fully-qualified recipe id, e.g. 'creative/kinfolk'. */
  recipeId: z.string().regex(/^(safe|balanced|creative|experimental)\/[a-z0-9-]+$/),
  paletteOverride: PaletteOverrideSchema.optional(),
  fontOverride: FontPairingIdSchema.optional(),
  /** Optional — UI/AI may pick 'single-long' for continuous-page output. */
  pageMode: PageModeSchema.optional(),
  emphasis: EmphasisSchema,
  sectionOrder: z.array(z.string()).min(1),
  hiddenSections: z.array(z.string()).optional(),
});
export type CVStyleTokensV2 = z.infer<typeof CVStyleTokensV2Schema>;

// ============ Engine-version helpers ============

export type EngineVersion = 'v1' | 'v2';

/** Reads the engine version from a Firestore CV doc. Missing / unknown = v1
 *  (legacy). Used at the routing switch-points (cv-preview, pdf, dispute). */
export function getEngineVersion(doc: { designTokens?: { engineVersion?: string } | null }): EngineVersion {
  return doc?.designTokens?.engineVersion === 'v2' ? 'v2' : 'v1';
}
