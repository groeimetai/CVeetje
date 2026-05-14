/**
 * AI Phase 1: Template Blueprint Analysis
 *
 * Uses an LLM to identify sections and repeating blocks in any DOCX template,
 * replacing all hardcoded regex patterns (SECTION_PATTERNS, detectWeSlots, etc.).
 *
 * The AI receives a compact "template map" (structural overview with segment IDs)
 * and returns a blueprint describing which sections exist and which blocks repeat.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from './providers';
import { resolveTemperature } from './temperature';
import { withRetry } from './retry';

// ==================== Schema ====================

export const sectionTypeSchema = z.enum([
  'personal_info',
  'work_experience',
  'education',
  'skills',
  'languages',
  'references',
  'hobbies',
  'special_notes',
  'profile_summary',
  'other',
]);

export type BlueprintSectionType = z.infer<typeof sectionTypeSchema>;

export const templateBlueprintSchema = z.object({
  sections: z.array(z.object({
    type: sectionTypeSchema,
    label: z.string().describe('The section header text as it appears in the template'),
    segmentIds: z.array(z.string()).describe('All segment IDs belonging to this section (e.g., ["s0","s1","s2"])'),
  })).describe('All identified sections in the template'),

  repeatingBlocks: z.array(z.object({
    sectionType: z.enum(['work_experience', 'education', 'languages', 'skills']),
    blockType: z.enum(['table_rows', 'paragraph_group']),
    instances: z.array(z.object({
      segmentIds: z.array(z.string()).describe('Segment IDs for this instance'),
    })).describe('Each existing instance/slot in the template'),
  })).describe('Blocks that repeat (e.g., multiple work experience entries). Empty array if none detected.'),
});

export type TemplateBlueprint = z.infer<typeof templateBlueprintSchema>;

// ==================== Analysis ====================

/**
 * Ask the AI to analyze a template structure and produce a blueprint.
 *
 * @param templateMap  Compact structural description from buildTemplateMap()
 * @param profileCounts  How many WE/education entries the profile has
 * @param provider  LLM provider name
 * @param apiKey  API key
 * @param model  Model ID
 */
export async function analyzeTemplateBlueprint(
  templateMap: string,
  profileCounts: { workExperience: number; education: number },
  provider: LLMProvider,
  apiKey: string,
  model: string,
): Promise<TemplateBlueprint> {
  const aiProvider = createAIProvider(provider, apiKey);

  const systemPrompt = `You are a DOCX template structure analyzer. You receive a structural map of a CV/resume template and must identify:

1. SECTIONS: Which parts of the template correspond to which CV sections (personal info, work experience, education, skills, etc.)
2. REPEATING BLOCKS: Which groups of segments form a repeating entry (e.g., one work experience block that appears multiple times)

RULES:
- Segment IDs look like "s0", "s1", etc. When multiple segments are in one paragraph/cell they appear as "s0,s1"
- A section header is typically a standalone text like "Work Experience", "Education", "Werkervaring", "Opleidingen", etc.
- Repeating blocks are groups of segments that have the same structure (e.g., period + company + description for each job)
- In tables, repeating blocks are typically consecutive rows with the same column structure
- In body text, repeating blocks are groups of paragraphs with similar patterns (period line, company line, description lines)
- For table-based repeating blocks, use blockType "table_rows"
- For paragraph-based repeating blocks, use blockType "paragraph_group"
- Include ALL segment IDs for each section, including header segments
- A segment should belong to exactly one section
- [TAB] markers indicate tab-separated label/value pairs within a paragraph (e.g., "Name" [TAB] ": " [TAB] value)
- Tab-separated paragraphs are paragraph_group type repeating blocks when they repeat for multiple entries`;

  const userPrompt = `TEMPLATE STRUCTURE:
${templateMap}

PROFILE INFO:
- Work experiences: ${profileCounts.workExperience}
- Education entries: ${profileCounts.education}

Analyze this template and identify all sections and repeating blocks. Return the blueprint.`;

  const result = await withRetry(() =>
    generateObject({
      model: aiProvider(model),
      schema: templateBlueprintSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: resolveTemperature(provider, model, 0.1),
    })
  );

  return result.object;
}

/**
 * Analyze template and fill in a single combined AI call.
 * Used when no block duplication is needed (template already has enough slots).
 */
export async function analyzeAndFillTemplate(
  templateMap: string,
  profileSummary: string,
  jobSummary: string | null,
  fitSummary: string,
  formatInstruction: string,
  customInstructions: string,
  profileCounts: { workExperience: number; education: number },
  language: 'nl' | 'en',
  provider: LLMProvider,
  apiKey: string,
  model: string,
): Promise<{ blueprint: TemplateBlueprint; fills: Record<string, string> }> {
  const aiProvider = createAIProvider(provider, apiKey);

  const combinedSchema = z.object({
    blueprint: templateBlueprintSchema,
    fills: z.array(z.object({
      segmentId: z.string().describe('The segment ID (e.g., "s0", "s5")'),
      value: z.string().describe('The new text value for this segment'),
    })).describe('Array of segment fills. Only include segments that need new values.'),
  });

  const isEn = language === 'en';

  const systemPrompt = isEn
    ? buildCombinedSystemPromptEN()
    : buildCombinedSystemPromptNL();

  const userPrompt = `TEMPLATE STRUCTURE:
${templateMap}

PROFILE DATA:
${profileSummary}
${jobSummary ? `\nTARGET JOB:\n${jobSummary}` : ''}${fitSummary}${formatInstruction}${customInstructions ? `\n\nUSER INSTRUCTIONS:\n${customInstructions}` : ''}

PROFILE COUNTS:
- Work experiences: ${profileCounts.workExperience}
- Education entries: ${profileCounts.education}

${isEn
  ? 'Analyze the template structure AND fill all segments with the correct profile data.'
  : 'Analyseer de templatestructuur EN vul alle segmenten in met de juiste profieldata.'}`;

  const result = await withRetry(() =>
    generateObject({
      model: aiProvider(model),
      schema: combinedSchema,
      system: systemPrompt,
      prompt: userPrompt,
      // Lower temperature: template filling is mechanical mapping, not creative writing.
      // High temperature here causes the model to "improve" segments by adding flair
      // that wasn't in the profile.
      temperature: resolveTemperature(provider, model, 0.2),
    })
  );

  const fills: Record<string, string> = {};
  for (const f of result.object.fills) {
    fills[f.segmentId] = f.value;
  }

  return { blueprint: result.object.blueprint, fills };
}

// ==================== System Prompts ====================

function buildCombinedSystemPromptEN(): string {
  return `You are a CV template analyzer AND filler. You receive a structural template map and profile data.

PHASE 1 - ANALYZE: Identify sections (personal_info, work_experience, education, skills, languages, etc.) and repeating blocks.

PHASE 2 - FILL: Replace template placeholder text with actual profile data.

═══════════════════════════════════════════════
ANTI-HALLUCINATIE — STRICT
═══════════════════════════════════════════════

- Use ONLY exact data from the profile. NEVER invent experiences, education, dates, companies, job titles, or skills.
- If the template has MORE slots than the profile has entries: leave the excess slots empty (return an empty string for their fills, or skip them in the fills array). NEVER duplicate an entry. NEVER invent a fake entry to fill an extra slot.
- If a profile field is missing (no email, no phone, no address): leave that segment empty rather than fabricating a value.
- If a segment in the template asks for something not in the profile (e.g. "hobbies" but the profile has none): leave it empty.

═══════════════════════════════════════════════
FILL RULES
═══════════════════════════════════════════════

- Fill ALL work experiences and education entries that fit — skip nothing the profile contains.
- Each repeating block instance must contain a DIFFERENT entry (experience 1, experience 2, etc.). Never repeat the same entry across slots.
- Section headers must NOT be filled — leave them as-is.
- For segments that combine multiple pieces in one cell (like "year - year\\nSchool\\nDegree"), use \\n for line breaks.
- If a segment contains only formatting ("year - year") or generic placeholder text, replace it entirely with real profile data — or leave empty if no data exists.

SECTION RULES:
- personal_info: ONLY name, address, phone, email, date of birth, nationality from the profile
- work_experience: ONLY company names, job titles, tasks/responsibilities, work periods from the profile
- education: ONLY schools, degrees, fields of study, education periods from the profile
- skills: ONLY skills present in the profile's skills list (technical + soft)
- languages: ONLY languages and proficiency from the profile
- certifications: ONLY certifications listed in the profile
- special_notes: ONLY availability, transport, driver's license — and ONLY if those are explicitly in the profile
- NEVER mix content between sections!

TAB-SEPARATED LAYOUTS:
- [TAB] markers indicate tab-separated label/value pairs within a paragraph
- Segments BEFORE [TAB] are labels — do NOT change these
- Segments AFTER [TAB] are value fields — fill these with profile data (or leave empty if no data)

ORDER: Fill work experience and education in reverse chronological order (most recent first).

REMEMBER: a half-filled template with empty slots for missing data is INFINITELY better than a fully-filled template with fabricated content. Empty cells are honest; invented content is a CV-killer.`;
}

function buildCombinedSystemPromptNL(): string {
  return `Je bent een CV template analist EN invuller. Je krijgt een structurele template map en profieldata.

FASE 1 - ANALYSEER: Identificeer secties (personal_info, work_experience, education, skills, languages, etc.) en herhalende blokken.

FASE 2 - VUL IN: Vervang template placeholder tekst met echte profieldata.

═══════════════════════════════════════════════
ANTI-HALLUCINATIE — STRIKT
═══════════════════════════════════════════════

- Gebruik ALLEEN letterlijke data uit het profiel. VERZIN NOOIT ervaringen, opleidingen, datums, bedrijfsnamen, functietitels of skills.
- Heeft het template MEER slots dan het profiel entries heeft? Laat de overtollige slots leeg (lege string of niet in fills opnemen). Dupliceer NOOIT een entry. Verzin NOOIT een nepervaring om een lege slot te vullen.
- Ontbreekt een veld in het profiel (geen email, geen adres, geen telefoonnummer)? Laat dat segment leeg — verzin geen waarde.
- Vraagt een segment om iets wat niet in het profiel staat (bv. "hobby's" maar profiel noemt geen hobby's)? Laat leeg.

═══════════════════════════════════════════════
INVULREGELS
═══════════════════════════════════════════════

- Vul ALLE werkervaring en opleidingen in die in het profiel staan — sla geen echte entries over.
- Elke herhalend-blok-instantie moet een ANDERE entry bevatten (ervaring 1, ervaring 2, etc.). Dupliceer nooit.
- Sectie-headers NIET invullen — laat ze staan zoals ze zijn.
- Voor segmenten die meerdere stukken combineren in een cel (zoals "jaar - jaar\\nSchool\\nDiploma"), gebruik \\n voor regelafbrekingen.
- Bevat een segment alleen opmaak ("year - year") of generieke placeholder-tekst? Vervang met echte data, of laat leeg als geen data beschikbaar is.

SECTIEREGELS:
- personal_info: ALLEEN naam, adres, telefoon, email, geboortedatum, nationaliteit uit het profiel
- work_experience: ALLEEN bedrijfsnamen, functies, werkzaamheden/taken, werkperiodes uit het profiel
- education: ALLEEN scholen, diploma's, studierichtingen, studieperiodes uit het profiel
- skills: ALLEEN skills die in de skills-lijst van het profiel staan (technisch + soft)
- languages: ALLEEN talen en niveaus uit het profiel
- certifications: ALLEEN certificeringen uit het profiel
- special_notes: ALLEEN beschikbaarheid, vervoer, rijbewijs — en ALLEEN als die expliciet in het profiel staan
- MIX NOOIT content tussen secties!

TAB-GESCHEIDEN LAYOUTS:
- [TAB] markers geven tab-gescheiden label/waarde paren aan binnen een paragraaf
- Segmenten VOOR [TAB] zijn labels — wijzig deze NIET
- Segmenten NA [TAB] zijn waarde-velden — vul deze met profieldata (of laat leeg als geen data)

VOLGORDE: Vul werkervaring en opleidingen in omgekeerd chronologische volgorde (meest recent eerst).

ONTHOUD: een half-gevuld template met lege slots voor ontbrekende data is ONEINDIG beter dan een vol template met verzonnen inhoud. Lege cellen zijn eerlijk; verzonnen inhoud is een CV-killer.`;
}
