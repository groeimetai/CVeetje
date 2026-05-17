/**
 * generateStyleTokensV2 — orchestrator for the new cv-engine style pipeline.
 *
 * Picks one recipe from the candidates for the user's creativity level,
 * lets the AI fill in content-driven emphasis (pull-quote, accent-keywords,
 * name-tagline, etc.) and optional bounded palette/font overrides. Returns
 * CVStyleTokensV2 ready to persist on the CV doc with `engineVersion: 'v2'`.
 *
 * Server-side only (uses load-skill-body via Node fs). Called from
 * /api/cv/style/route.ts.
 */

import { z } from 'zod';
import { getModelId } from '@/lib/ai/providers';
import { resolveTemperature } from '@/lib/ai/temperature';
import { generateObjectResilient } from '@/lib/ai/generate-resilient';
import type { JobVacancy, LLMProvider, StyleCreativityLevel, TokenUsage } from '@/types';
import type { CVStyleTokensV2 } from '../tokens';
import { PaletteOverrideSchema } from '../tokens';
import { FontPairingIdSchema, type DesignSpec } from '../spec';
import { listRecipesByRoute, getRecipeById } from '../recipes/registry';
import { creativityLevelToRoute } from './level-map';
import { normalizeTokens } from './normalize';
import { loadSkillBody } from './load-skill-body';
import {
  CRAFT_REFERENCES,
  DESIGNER_CHARTER,
  PHILOSOPHY_LAYER,
  composeSystemPrompt,
} from './compose-system-prompt';

// ============ Public API ============

export interface OrchestratorInput {
  linkedInSummary: string;
  jobVacancy: JobVacancy | null;
  creativityLevel: StyleCreativityLevel;
  provider: LLMProvider;
  apiKey: string;
  model: string;
  userPreferences?: string;
  hasPhoto: boolean;
  /** Recently-used recipeIds (from user's last N CVs). Drives rotation. */
  recipeUsageHistory?: string[];
}

export interface OrchestratorResult {
  tokens: CVStyleTokensV2;
  usage: TokenUsage;
  /** The recipe the orchestrator + AI ended up with — useful for logging. */
  pickedRecipe: DesignSpec;
}

// ============ AI output schema ============
//
// Intentionally permissive — no length limits on emphasis strings. The AI
// SDK's `generateObject` validates with this schema, so any too-strict
// constraint here turns a recoverable overflow ("AI wrote a 200-char hero
// numeral instead of a 12-char one") into a hard schema-mismatch error +
// 3 wasted retries. We truncate to the canonical max lengths inside
// `normalizeTokens()` (see normalize.ts) — those limits live in
// `EmphasisSchema` which validates on Firestore write.

const PermissiveEmphasisSchema = z.object({
  pullQuoteText: z.string().optional(),
  pullQuoteAttribution: z.string().optional(),
  accentKeywords: z.array(z.string()).optional(),
  nameTagline: z.string().optional(),
  dropCapLetter: z.string().optional(),
  posterLine: z.string().optional(),
  heroNumeralValue: z.string().optional(),
});

const AIOutputSchema = z.object({
  recipeId: z.string(),
  paletteOverride: PaletteOverrideSchema.optional(),
  fontOverride: FontPairingIdSchema.optional(),
  emphasis: PermissiveEmphasisSchema.optional(),
  sectionOrder: z.array(z.string()).optional(),
  hiddenSections: z.array(z.string()).optional(),
});

// ============ Recipe rotation ============

interface RankedCandidate {
  recipe: DesignSpec;
  useCount: number;
  industryFit: boolean;
}

function rankCandidates(
  candidates: DesignSpec[],
  history: string[],
  industry?: string,
): RankedCandidate[] {
  const counts = new Map<string, number>();
  for (const id of history) counts.set(id, (counts.get(id) ?? 0) + 1);

  const industryNorm = (industry ?? '').toLowerCase();
  const ranked = candidates.map(recipe => ({
    recipe,
    useCount: counts.get(recipe.id) ?? 0,
    industryFit: industryNorm
      ? recipe.industryAffinity.some(aff => industryNorm.includes(aff.toLowerCase()))
      : false,
  }));

  // Sort: industry-fit first, then by ascending use-count (least-used wins).
  ranked.sort((a, b) => {
    if (a.industryFit !== b.industryFit) return a.industryFit ? -1 : 1;
    return a.useCount - b.useCount;
  });

  return ranked;
}

// ============ Prompt building ============

async function buildRecipeCandidatesLayer(ranked: RankedCandidate[]): Promise<string> {
  const lines: string[] = ['## Available recipes (pick exactly one)'];
  for (const c of ranked) {
    const r = c.recipe;
    const skillBody = await loadSkillBody(r.id);
    // Compact preview: first non-blank line after the first heading, or the
    // description if SKILL.md is sparse. Helps the AI grok the recipe's
    // character without paying for the whole body in every call.
    const previewLines = skillBody.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const preview = previewLines.slice(0, 4).join(' ').slice(0, 320);

    const tags: string[] = [];
    if (c.industryFit) tags.push('industry-fit');
    if (c.useCount > 0) tags.push(`recent (${c.useCount}×)`);
    const tagsStr = tags.length ? ` [${tags.join(', ')}]` : '';

    lines.push(
      `- **${r.id}** — ${r.displayName}${tagsStr}\n  shape: ${r.layoutShape}, density: ${r.density}, fonts: ${r.allowedFontPairings.join('|')}\n  industries: ${r.industryAffinity.join(', ')}\n  brief: ${r.description}\n  voice: ${preview}`,
    );
  }
  return lines.join('\n\n');
}

function buildProjectMetadataLayer(input: {
  creativityLevel: StyleCreativityLevel;
  industry?: string;
  hasPhoto: boolean;
  recentPicks: string[];
}): string {
  const recent = input.recentPicks.length
    ? `Recent picks (do not repeat unless industry-fit forces it): ${input.recentPicks.join(', ')}`
    : 'No recent picks for this user yet.';

  return `## Project metadata
- creativityLevel: ${input.creativityLevel}
- industry: ${input.industry ?? 'unspecified'}
- hasPhoto: ${input.hasPhoto}
- ${recent}`;
}

function buildUserPrompt(input: {
  linkedInSummary: string;
  jobVacancy: JobVacancy | null;
}): string {
  const jobBlock = input.jobVacancy
    ? `## Target job\nTitle: ${input.jobVacancy.title}\nCompany: ${input.jobVacancy.company ?? '—'}\nIndustry: ${input.jobVacancy.industry ?? '—'}\nKeywords: ${input.jobVacancy.keywords?.join(', ') ?? '—'}`
    : '## Target job\n(no target job — generic CV)';

  return `## Candidate profile (LinkedIn summary)
${input.linkedInSummary}

${jobBlock}

## Your task
Pick exactly one recipeId from the candidates above. Fill in \`emphasis\` with content-driven choices grounded in the candidate's actual material (pull-quote verbatim from a highlight, 3-7 accentKeywords that appear in body text, a tagline that fits the candidate's voice). Only set paletteOverride or fontOverride if you have a clear reason within the recipe's allowed range. Output as structured JSON matching the schema.`;
}

// ============ Main ============

export async function generateStyleTokensV2(input: OrchestratorInput): Promise<OrchestratorResult> {
  const route = creativityLevelToRoute(input.creativityLevel);
  const candidates = listRecipesByRoute(route);
  if (candidates.length === 0) {
    throw new Error(`cv-engine: no recipes registered for route "${route}"`);
  }

  const ranked = rankCandidates(candidates, input.recipeUsageHistory ?? [], input.jobVacancy?.industry);
  const recentPicks = (input.recipeUsageHistory ?? []).slice(0, 5);

  // Build the layered system prompt.
  const recipeCandidatesLayer = await buildRecipeCandidatesLayer(ranked);
  const projectMetadataLayer = buildProjectMetadataLayer({
    creativityLevel: input.creativityLevel,
    industry: input.jobVacancy?.industry,
    hasPhoto: input.hasPhoto,
    recentPicks,
  });

  const systemPrompt = composeSystemPrompt({
    philosophyLayer: PHILOSOPHY_LAYER,
    designerCharter: DESIGNER_CHARTER,
    customInstructions: input.userPreferences,
    recipeCandidates: recipeCandidatesLayer,
    craftReferences: CRAFT_REFERENCES,
    projectMetadata: projectMetadataLayer,
  });

  const userPrompt = buildUserPrompt({
    linkedInSummary: input.linkedInSummary,
    jobVacancy: input.jobVacancy,
  });

  const modelId = getModelId(input.provider, input.model);
  const temperature = resolveTemperature(input.provider, modelId, temperatureForRoute(route));

  console.log(
    `[cv-engine] generateStyleTokensV2 route=${route} candidates=${candidates.length} history=${recentPicks.length} temp=${temperature ?? 'unset'}`,
  );

  const { value, usage } = await generateObjectResilient<typeof AIOutputSchema, z.infer<typeof AIOutputSchema>>({
    provider: input.provider,
    apiKey: input.apiKey,
    model: input.model,
    schema: AIOutputSchema,
    prompt: userPrompt,
    system: systemPrompt,
    temperature,
    logTag: `cv-engine [${route}]`,
    // generateObjectResilient throws on empty output via normalize; we do
    // the heavy lifting (clamping, font validation) later in normalizeTokens.
    normalize: (raw) => {
      const parsed = AIOutputSchema.safeParse(raw);
      if (!parsed.success || !parsed.data.recipeId) {
        throw new Error('no object generated');
      }
      return parsed.data;
    },
  });

  // Validate recipeId against candidates; fall back to the highest-ranked
  // candidate if the AI invented one.
  let recipe = getRecipeById(value.recipeId);
  if (!recipe || recipe.route !== route) {
    console.warn(`[cv-engine] AI returned invalid recipeId "${value.recipeId}"; falling back to ${ranked[0].recipe.id}`);
    recipe = ranked[0].recipe;
  }

  const tokens = normalizeTokens({
    recipe,
    rawRecipeId: value.recipeId,
    paletteOverride: value.paletteOverride,
    fontOverride: value.fontOverride,
    emphasis: value.emphasis,
    sectionOrder: value.sectionOrder,
    hiddenSections: value.hiddenSections,
  });

  console.log(
    `[cv-engine] picked recipe=${recipe.id} (industryFit=${ranked.find(r => r.recipe.id === recipe.id)?.industryFit ?? false}), emphasis-keywords=${tokens.emphasis.accentKeywords?.length ?? 0}, override-font=${tokens.fontOverride ?? '—'}`,
  );

  return { tokens, usage, pickedRecipe: recipe };
}

function temperatureForRoute(route: string): number {
  switch (route) {
    case 'safe':
      return 0.3;
    case 'balanced':
      return 0.6;
    case 'creative':
      return 0.85;
    case 'experimental':
      return 1.0;
    default:
      return 0.6;
  }
}
