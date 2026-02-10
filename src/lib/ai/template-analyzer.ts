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
      temperature: 0.1,
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
      temperature: 0.5,
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

CRITICAL RULES:
- Use ONLY exact data from the profile. NEVER invent experiences, education, or years.
- Fill ALL work experiences and education entries - skip NOTHING!
- Each repeating block instance should contain a DIFFERENT entry (experience 1, experience 2, etc.)
- NEVER fill two slots with the same experience or education!
- Section headers should NOT be filled - leave them as-is
- For segments that combine multiple pieces in one cell (like "year - year\\nSchool\\nDegree"), use \\n for line breaks
- If the template has fewer slots than profile entries, fill available slots with the most recent/relevant entries
- If a segment is empty or contains only formatting ("year - year"), replace it entirely with real data

SECTION RULES:
- personal_info: ONLY name, address, phone, email, date of birth, nationality
- work_experience: ONLY company names, job titles, tasks/responsibilities, work periods
- education: ONLY schools, degrees, fields of study, education periods
- skills: ONLY technical skills, soft skills, certifications
- languages: ONLY languages and proficiency levels
- special_notes: ONLY availability, transport, driver's license
- NEVER mix content between sections!

TAB-SEPARATED LAYOUTS:
- [TAB] markers indicate tab-separated label/value pairs within a paragraph
- Segments BEFORE [TAB] are labels — do NOT change these
- Segments AFTER [TAB] are value fields — fill these with profile data

ORDER: Fill work experience and education in reverse chronological order (most recent first).`;
}

function buildCombinedSystemPromptNL(): string {
  return `Je bent een CV template analist EN invuller. Je krijgt een structurele template map en profieldata.

FASE 1 - ANALYSEER: Identificeer secties (personal_info, work_experience, education, skills, languages, etc.) en herhalende blokken.

FASE 2 - VUL IN: Vervang template placeholder tekst met echte profieldata.

KRITIEKE REGELS:
- Gebruik ALLEEN exacte data uit het profiel. VERZIN NOOIT ervaringen, opleidingen of jaren.
- Vul ALLE werkervaring en opleidingen in - sla NIETS over!
- Elke herhalend blok instantie moet een ANDERE entry bevatten (ervaring 1, ervaring 2, etc.)
- Vul NOOIT twee slots met dezelfde ervaring of opleiding!
- Sectie headers NIET invullen - laat ze staan
- Voor segmenten die meerdere stukken combineren in een cel (zoals "jaar - jaar\\nSchool\\nDiploma"), gebruik \\n voor regelafbrekingen
- Als het template minder slots heeft dan profielentries, vul de beschikbare slots met de meest recente/relevante entries
- Als een segment leeg is of alleen opmaak bevat ("year - year"), vervang het geheel met echte data

SECTIE REGELS:
- personal_info: ALLEEN naam, adres, telefoon, email, geboortedatum, nationaliteit
- work_experience: ALLEEN bedrijfsnamen, functies, werkzaamheden/taken, werkperiodes
- education: ALLEEN scholen, diploma's, studierichtingen, studieperiodes
- skills: ALLEEN technische vaardigheden, soft skills, certificaten
- languages: ALLEEN talen en taalniveaus
- special_notes: ALLEEN beschikbaarheid, vervoer, rijbewijs
- MIX NOOIT content tussen secties!

TAB-GESCHEIDEN LAYOUTS:
- [TAB] markers geven tab-gescheiden label/waarde paren aan binnen een paragraaf
- Segmenten VOOR [TAB] zijn labels — wijzig deze NIET
- Segmenten NA [TAB] zijn waarde-velden — vul deze met profieldata

VOLGORDE: Vul werkervaring en opleidingen in omgekeerd chronologische volgorde (meest recent eerst).`;
}
