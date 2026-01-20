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
  warnings: z.array(z.string()).optional().describe('Any warnings about the replacement process'),
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

  const systemPrompt = `Je bent een CV specialist die bestaande CV documenten analyseert en bepaalt welke tekst moet worden vervangen met nieuwe profieldata.

Je taak is om:
1. Bestaande namen, functies, bedrijven, datums en beschrijvingen in het document te identificeren
2. Te bepalen welke onderdelen vervangen moeten worden met de verstrekte profieldata
3. Nieuwe beschrijvingen te genereren die relevant zijn voor de doelvacature (indien opgegeven)
4. De originele documentstructuur en opmaak zoveel mogelijk te behouden

BELANGRIJK:
- Zoek naar exacte tekst in het document om te vervangen
- Genereer professionele, relevante beschrijvingen
- Behoud de toon en stijl van het originele document
- Vervang alleen content die duidelijk persoonlijke of professionele informatie is
- Markeer met lage confidence als je niet zeker bent`;

  const userPrompt = `DOCUMENT TEKST:
"""
${documentText.substring(0, 15000)}
"""

NIEUWE PROFIELDATA:
${profileSummary}

${jobSummary ? `DOELVACATURE:
${jobSummary}

Pas de beschrijvingen aan om relevant te zijn voor deze vacature.` : ''}

Analyseer het document en geef een lijst van vervangingen terug. Voor elke vervanging:
- searchText: De exacte tekst uit het document om te vervangen
- replaceWith: De nieuwe tekst gebaseerd op de profieldata
- type: Het type content (name, title, company, period, description, skill, education, contact, summary)
- confidence: Hoe zeker je bent (high, medium, low)`;

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
