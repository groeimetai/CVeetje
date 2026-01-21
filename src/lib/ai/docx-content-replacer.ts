import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from './providers';
import type { ParsedLinkedIn, JobVacancy } from '@/types';

/**
 * Schema for indexed content filling
 * AI receives numbered text segments and returns filled values for each
 */
const indexedFillSchema = z.object({
  filledSegments: z.record(z.string(), z.string()).describe('Map of segment index to filled value. Key is the segment number, value is the filled text.'),
  warnings: z.array(z.string()).optional().describe('Any warnings about the fill process'),
});

export interface IndexedFillResult {
  filledSegments: Record<string, string>;
  warnings: string[];
}

/**
 * Fill document using indexed segments approach
 *
 * Instead of search/replace, we:
 * 1. Number each text segment in the document
 * 2. AI returns filled values for each segment number
 * 3. We replace by index (no text matching needed)
 */
export async function fillDocumentWithAI(
  indexedSegments: { index: number; text: string }[],
  profileData: ParsedLinkedIn,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  jobVacancy?: JobVacancy,
): Promise<IndexedFillResult> {
  const aiProvider = createAIProvider(provider, apiKey);

  // Build profile summary
  const profileSummary = buildProfileSummary(profileData);
  const jobSummary = jobVacancy ? buildJobSummary(jobVacancy) : null;

  // Create numbered document representation
  const numberedDoc = indexedSegments
    .map(seg => `[${seg.index}] ${seg.text}`)
    .join('\n');

  const systemPrompt = `Je bent een CV invul-specialist. Je krijgt een genummerd CV template en moet de waarden invullen.

INSTRUCTIES:
1. Je krijgt tekst segmenten met nummers: [0] tekst, [1] tekst, etc.
2. Vul elk segment in met de juiste profieldata
3. Retourneer een object met het nummer als key en de ingevulde waarde als value
4. Als een segment niet ingevuld hoeft te worden (bijv. een label), geef dan de originele tekst terug

VOORBEELD:
Input:
[0] Naam :
[1]
[2] Functie :
[3]
[4] 2024-Heden :
[5] Bedrijf

Als de persoon "Jan Jansen" heet en "Developer" is bij "Google" sinds 2020:
Output: { "1": "Jan Jansen", "3": "Developer", "4": "2020-Heden :", "5": "Google" }

Let op: Lege segmenten [1], [3] zijn waar de waarden moeten komen!
Segmenten met labels zoals "Naam :" of "Functie :" blijven meestal ongewijzigd.`;

  const userPrompt = `GENUMMERD TEMPLATE:
${numberedDoc}

PROFIELDATA:
${profileSummary}
${jobSummary ? `\nDOELVACATURE (pas content hierop aan):\n${jobSummary}` : ''}

Vul alle segmenten in met de juiste profieldata. Retourneer een object met segment nummers als keys.

WERKERVARING VOLGORDE:
De eerste "Functie :" en "Werkzaamheden :" na een periode horen bij werkervaring 1.
De tweede set hoort bij werkervaring 2, etc.

BELANGRIJK:
- Vul ALLE lege segmenten in waar data hoort
- Periodes aanpassen naar echte datums
- Beschikbaarheid, vervoer etc. ook invullen indien bekend`;

  try {
    const result = await generateObject({
      model: aiProvider(model),
      schema: indexedFillSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return {
      filledSegments: result.object.filledSegments,
      warnings: result.object.warnings || [],
    };
  } catch (error) {
    console.error('Error filling document with AI:', error);
    throw new Error('Failed to fill document with AI');
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
