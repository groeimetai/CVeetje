import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from './providers';
import type { ParsedLinkedIn, JobVacancy } from '@/types';

/**
 * Schema for content replacements identified by AI
 */
const contentReplacementSchema = z.object({
  replacements: z.array(z.object({
    searchText: z.string().describe('Exact text to search for in the document'),
    replaceWith: z.string().describe('New text to replace with'),
    type: z.enum(['name', 'title', 'company', 'period', 'description', 'skill', 'education', 'contact', 'summary']).describe('Type of content being replaced'),
    confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the replacement'),
  })),
  warnings: z.array(z.string()).optional().describe('Any warnings about issues that could not be auto-fixed'),
});

export type ContentReplacement = z.infer<typeof contentReplacementSchema>['replacements'][number];

export interface ContentReplacementResult {
  replacements: ContentReplacement[];
  warnings: string[];
}

/**
 * Analyze document text and generate AI-powered replacements based on profile data
 */
export async function analyzeAndGenerateReplacements(
  documentText: string,
  profileData: ParsedLinkedIn,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  jobVacancy?: JobVacancy,
): Promise<ContentReplacementResult> {
  const aiProvider = createAIProvider(provider, apiKey);

  // Build profile summary for the prompt
  const profileSummary = buildProfileSummary(profileData);
  const jobSummary = jobVacancy ? buildJobSummary(jobVacancy) : null;

  const systemPrompt = `Je bent een CV invul-specialist. Je vult CV templates in met profieldata.

TEMPLATE STRUCTUUR:
Het document bevat placeholder velden die JIJ moet invullen:
- Periodes: "2024-Heden :", "2023-2024 :", "2022-2022 :", etc.
- Functie labels: "Functie :"
- Taken labels: "Werkzaamheden :"
- Persoonlijke velden: naam, email, telefoon, adres, etc.

JE MOET ELKE PLACEHOLDER INVULLEN!

Voor ELKE werkervaring slot in het document (periode + functie + werkzaamheden):
1. Vervang de periode "YYYY-YYYY :" met echte periode + bedrijf
2. Vervang "Functie :" met "Functie : [echte functietitel]"
3. Vervang "Werkzaamheden :" met "Werkzaamheden : [echte taken/beschrijving]"

KRITISCH:
- Genereer een replacement voor ELKE placeholder die je vindt
- Als er 4 werkervaring slots zijn, genereer 4x periode + 4x functie + 4x werkzaamheden = 12 replacements
- searchText moet EXACT matchen met de tekst in het document
- Kijk GOED naar de exacte tekst inclusief spaties en dubbele punten`;

  const userPrompt = `TEMPLATE:
"""
${documentText.substring(0, 15000)}
"""

PROFIELDATA:
${profileSummary}
${jobSummary ? `\nDOELVACATURE:\n${jobSummary}` : ''}

OPDRACHT: Genereer een replacement voor ELKE placeholder in het document.

Als het document bijvoorbeeld bevat:
- "2024-Heden :" (1e werkervaring periode)
- "Functie :" (1e werkervaring titel)
- "Werkzaamheden :" (1e werkervaring taken)
- "2023-2024 :" (2e werkervaring periode)
- "Functie :" (2e werkervaring titel)
- "Werkzaamheden :" (2e werkervaring taken)

Dan moet je 6 replacements genereren (of meer als er meer slots zijn).

WERKERVARING MAPPING (in volgorde van document):
Slot 1 → Werkervaring 1 uit profiel
Slot 2 → Werkervaring 2 uit profiel
Slot 3 → Werkervaring 3 uit profiel
Etc.

Let op: "Functie :" komt meerdere keren voor - elke keer voor een andere werkervaring!`;

  try {
    const result = await generateObject({
      model: aiProvider(model),
      schema: contentReplacementSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return {
      replacements: result.object.replacements,
      warnings: result.object.warnings || [],
    };
  } catch (error) {
    console.error('Error generating content replacements:', error);
    throw new Error('Failed to analyze document for content replacement');
  }
}

/**
 * Build a summary of the profile data for the AI prompt
 */
function buildProfileSummary(profile: ParsedLinkedIn): string {
  const parts: string[] = [];

  parts.push(`Naam: ${profile.fullName || 'Niet opgegeven'}`);

  if (profile.headline) {
    parts.push(`Headline: ${profile.headline}`);
  }

  if (profile.location) {
    parts.push(`Locatie: ${profile.location}`);
  }

  if (profile.email) {
    parts.push(`Email: ${profile.email}`);
  }

  if (profile.phone) {
    parts.push(`Telefoon: ${profile.phone}`);
  }

  if (profile.experience && profile.experience.length > 0) {
    parts.push('\nWERKERVARING:');
    profile.experience.forEach((exp, index) => {
      parts.push(`\n${index + 1}. ${exp.title || 'Functie'} bij ${exp.company || 'Bedrijf'}`);
      if (exp.startDate || exp.endDate) {
        parts.push(`   Periode: ${exp.startDate || '?'} - ${exp.endDate || 'Heden'}`);
      }
      if (exp.description) {
        parts.push(`   Beschrijving: ${exp.description.substring(0, 500)}`);
      }
    });
  }

  if (profile.education && profile.education.length > 0) {
    parts.push('\nOPLEIDING:');
    profile.education.forEach((edu, index) => {
      parts.push(`\n${index + 1}. ${edu.degree || 'Diploma'} - ${edu.fieldOfStudy || ''}`);
      parts.push(`   School: ${edu.school || 'Instituut'}`);
      if (edu.startYear || edu.endYear) {
        parts.push(`   Periode: ${edu.startYear || '?'} - ${edu.endYear || '?'}`);
      }
    });
  }

  if (profile.skills && profile.skills.length > 0) {
    parts.push('\nVAARDIGHEDEN:');
    parts.push(profile.skills.slice(0, 20).join(', '));
  }

  return parts.join('\n');
}

/**
 * Build a summary of the job vacancy for the AI prompt
 */
function buildJobSummary(job: JobVacancy): string {
  const parts: string[] = [];

  parts.push(`Functietitel: ${job.title}`);

  if (job.company) {
    parts.push(`Bedrijf: ${job.company}`);
  }

  if (job.requirements && job.requirements.length > 0) {
    parts.push(`Vereisten: ${job.requirements.join(', ')}`);
  }

  if (job.keywords && job.keywords.length > 0) {
    parts.push(`Keywords: ${job.keywords.join(', ')}`);
  }

  return parts.join('\n');
}
