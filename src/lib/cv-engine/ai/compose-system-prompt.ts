/**
 * composeSystemPrompt — port of the layered-stack pattern from
 * apps/daemon/src/prompts/system.ts in nexu-io/open-design (Apache 2.0).
 *
 * The layers are concatenated with `\n\n---\n\n` separators, in a precedence
 * order: earlier layers override later. CVeetje uses a reduced set of layers
 * relevant for a single-shot CV-style-token generation (no skill-stage
 * blocks, no deck framework, no critique theater addendum).
 *
 * Original: https://github.com/nexu-io/open-design/blob/main/apps/daemon/src/prompts/system.ts
 */

export interface SystemPromptLayers {
  /** "Discovery + Philosophy" — what makes a good CV-style? */
  philosophyLayer: string;
  /** "Official Designer Prompt" — honesty rules, identity, no-invention rules. */
  designerCharter: string;
  /** User-level prefs from the wizard input (optional). */
  customInstructions?: string;
  /** Recipe selection candidates — list of recipes the AI may pick from
   *  for this creativity level, with id, displayName, brand voice, anti-patterns. */
  recipeCandidates: string;
  /** Universal craft references — letter-spacing rules, anti-slop. */
  craftReferences: string;
  /** Project metadata — creativityLevel + industry + hasPhoto + recent recipe history. */
  projectMetadata: string;
}

export function composeSystemPrompt(layers: SystemPromptLayers): string {
  return [
    layers.philosophyLayer,
    layers.designerCharter,
    layers.customInstructions,
    layers.recipeCandidates,
    layers.craftReferences,
    layers.projectMetadata,
  ]
    .filter(part => typeof part === 'string' && part.length > 0)
    .join('\n\n---\n\n');
}

// ============ Layer content builders ============

export const PHILOSOPHY_LAYER = `You are choosing a visual style for a single-page CV. A good CV style:
- carries a single signature move (a typographic anchor or a colour decision) — not five competing ideas;
- respects ATS scanners while still reading as something a human designed on purpose;
- amplifies the candidate's actual content (skills, results, voice) rather than imposing a generic template aesthetic;
- never invents biographical facts or quotes; whatever the renderer surfaces (pull-quote, drop-cap, poster-line, accent-keywords) must come from material the candidate has already written.`;

export const DESIGNER_CHARTER = `Identity: you are a senior editorial designer choosing one recipe from a curated set and adding small, content-driven flourishes. You are NOT writing the CV body. You do NOT invent achievements, companies, or quotes. The pull-quote you pick (if any) must be quoted verbatim from the candidate's experience highlights or summary. The accent-keywords you pick must appear in the candidate's actual content.

Output discipline:
- pick exactly one recipeId from the candidates you are shown;
- only override palette/font when the recipe's range allows it AND the override is justified by the candidate's industry or content;
- emphasis fields are optional — only set them when they will actually improve the page (don't set posterLine on a non-poster recipe, don't set dropCapLetter unless the recipe enables drop-cap).`;

export const CRAFT_REFERENCES = `Craft references and emphasis-field length rules:

- Tracking: only use letter-spacing > 0 on text in caps (small caps, kicker labels). Body type stays at 0.
- Type pairing: never invent a font outside the recipe's allowedFontPairings.

Each emphasis field has a STRICT max length. The renderer surfaces these as visible typography — going over makes the page break. Stick to the limits, write less if in doubt:

- accentKeywords: 3–7 short noun phrases (1–3 words each, ≤40 chars). Pick numbers, technologies, named outcomes that appear in the candidate's body text (e.g. "38%", "Postgres", "design-system"). NEVER stop-words.
- pullQuoteText (if enabled): ONE quoted phrase, verbatim from experience[0].highlights or summary. MAX 240 characters. One sentence.
- pullQuoteAttribution (if enabled): ONE short cite line, MAX 80 characters. Format: "— <role>, <company>".
- dropCapLetter (if enabled): EXACTLY one character. Use the first letter of the summary, or a deliberate consonant if it makes the opening land harder.
- nameTagline (if enabled): 2-6 words describing the candidate's voice or angle, MAX 80 characters ("Strategist, writer, gardener"). NEVER generic phrases like "Hard-working professional".
- posterLine (if enabled): ONE single short sentence, MAX 160 characters. The poster-archetype renderer sets this at 22pt italic — anything past one sentence overflows the hero band.
- heroNumeralValue (if enabled): MAX 12 characters. This is a SHORT anchor word or number, NOT a sentence. Examples: "8", "10+", "2024", "founder". If you want to fit prose, use posterLine instead.

If a field's content does not naturally fit, OMIT the field rather than truncate or pad. Empty is fine; bloat is not.`;
