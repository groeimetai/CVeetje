import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from './providers';
import type { ParsedLinkedIn, JobVacancy } from '@/types';

/**
 * Schema for indexed content filling
 * AI receives numbered text segments and returns filled values for each
 * Using array instead of record because Anthropic doesn't support propertyNames in JSON schema
 */
const indexedFillSchema = z.object({
  filledSegments: z.array(
    z.object({
      index: z.string().describe('The segment number as a string (e.g., "0", "1", "5")'),
      value: z.string().describe('The filled text value for this segment'),
    })
  ).describe('Array of segments to fill. Only include segments that need to be changed.'),
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

KRITIEKE REGELS:
- Gebruik ALLEEN de exacte gegevens uit de profieldata
- VERZIN NOOIT extra opleidingen, ervaringen of jaren
- Als data "Onbekend" is, laat het veld dan leeg of gebruik "-"
- VUL ALLE werkervaring en opleidingen in, ook oudere - sla NIETS over!
- Als er meer ervaringen zijn dan template slots, vul dan de beschikbare slots met de meest recente/relevante
- Maak je GEEN zorgen over ruimte of volgende secties - vul alles in wat past

INSTRUCTIES:
1. Je krijgt tekst segmenten met nummers: [0] tekst, [1] tekst, etc.
2. Vul elk segment in met de juiste profieldata
3. Retourneer een ARRAY van objecten met index en value
4. Alleen segmenten die GEWIJZIGD moeten worden hoeven in de output

VOORBEELD:
Input:
[0] Naam :
[1]
[2] Functie :
[3]
[4] 2024-Heden :
[5] Bedrijf

Als de persoon "Jan Jansen" heet en "Developer" is bij "Google" sinds 2020:
Output: [
  { "index": "1", "value": "Jan Jansen" },
  { "index": "3", "value": "Developer" },
  { "index": "4", "value": "2020-Heden :" },
  { "index": "5", "value": "Google" }
]

Let op: Lege segmenten [1], [3] zijn waar de waarden moeten komen!
Segmenten met labels zoals "Naam :" of "Functie :" hoeven NIET in de output.`;

  const userPrompt = `GENUMMERD TEMPLATE:
${numberedDoc}

PROFIELDATA:
${profileSummary}
${jobSummary ? `\nDOELVACATURE (pas content hierop aan):\n${jobSummary}` : ''}

Vul alle segmenten in met de juiste profieldata. Retourneer een array van { index, value } objecten.

WERKERVARING VOLGORDE:
De eerste "Functie :" en "Werkzaamheden :" na een periode horen bij werkervaring 1.
De tweede set hoort bij werkervaring 2, etc.

BELANGRIJK:
- Vul ALLE lege segmenten in waar data hoort
- Periodes aanpassen naar echte datums
- Beschikbaarheid, vervoer etc. ook invullen indien bekend
- Retourneer ALLEEN segmenten die gewijzigd moeten worden
- VUL ALLE werkervaring in - ook oudere banen! Sla geen ervaring over.
- Als er meerdere werkervaring slots zijn, vul ze ALLEMAAL in met de beschikbare ervaringen
- Ruimte is GEEN probleem - vul alles in wat in het profiel staat`;

  try {
    const result = await generateObject({
      model: aiProvider(model),
      schema: indexedFillSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Convert array format to Record format for compatibility
    const filledSegmentsRecord: Record<string, string> = {};
    for (const segment of result.object.filledSegments) {
      filledSegmentsRecord[segment.index] = segment.value;
    }

    return {
      filledSegments: filledSegmentsRecord,
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
    parts.push(`\nWERKERVARING (${profile.experience.length} ervaringen - vul ze ALLEMAAL in!):`);
    profile.experience.forEach((exp, index) => {
      parts.push(`\nWerkervaring ${index + 1} van ${profile.experience.length}:`);
      parts.push(`   Functie: ${exp.title || 'Onbekend'}`);
      parts.push(`   Bedrijf: ${exp.company || 'Onbekend'}`);
      parts.push(`   Startdatum: ${exp.startDate || 'Onbekend'}`);
      parts.push(`   Einddatum: ${exp.endDate || 'Heden'}`);
      if (exp.description) {
        parts.push(`   Werkzaamheden: ${exp.description.substring(0, 800)}`);
      }
    });
    parts.push(`\nTOTAAL: ${profile.experience.length} werkervaringen. Vul ALLE ${profile.experience.length} in!`);
  }

  if (profile.education && profile.education.length > 0) {
    parts.push('\nOPLEIDING (gebruik EXACT deze gegevens, verzin GEEN andere jaren of opleidingen):');
    profile.education.forEach((edu, index) => {
      parts.push(`\nOpleiding ${index + 1}:`);
      parts.push(`   School: ${edu.school || 'Onbekend'}`);
      parts.push(`   Diploma/Niveau: ${edu.degree || 'Onbekend'}`);
      parts.push(`   Richting: ${edu.fieldOfStudy || 'Onbekend'}`);
      parts.push(`   Startjaar: ${edu.startYear || 'Onbekend'}`);
      parts.push(`   Eindjaar: ${edu.endYear || 'Onbekend'}`);
    });
    parts.push('\nBELANGRIJK: Er zijn PRECIES ' + profile.education.length + ' opleidingen. Vul niet meer of minder in!');
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
