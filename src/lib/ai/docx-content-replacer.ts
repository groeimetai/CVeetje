import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from './providers';
import type { ParsedLinkedIn, JobVacancy, OutputLanguage } from '@/types';

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
 * Get language-specific prompts
 */
function getPrompts(language: OutputLanguage) {
  if (language === 'en') {
    return {
      system: `You are a CV filling specialist. You receive a numbered CV template and must fill in the values.

CRITICAL RULES:
- Use ONLY the exact data from the profile
- NEVER invent extra education, experiences or years
- If data is "Unknown", leave the field empty or use "-"
- FILL ALL work experience and education, including older ones - skip NOTHING!
- If there are more experiences than template slots, fill available slots with most recent/relevant
- Do NOT worry about space or following sections - fill everything that fits

INSTRUCTIONS:
1. You receive text segments with numbers: [0] text, [1] text, etc.
2. Fill each segment with the correct profile data
3. Return an ARRAY of objects with index and value
4. Only segments that need to be CHANGED should be in the output

EXAMPLE:
Input:
[0] Name :
[1]
[2] Position :
[3]
[4] 2024-Present :
[5] Company

If the person is "John Smith" and is a "Developer" at "Google" since 2020:
Output: [
  { "index": "1", "value": "John Smith" },
  { "index": "3", "value": "Developer" },
  { "index": "4", "value": "2020-Present :" },
  { "index": "5", "value": "Google" }
]

Note: Empty segments [1], [3] are where values should go!
Segments with labels like "Name :" or "Position :" do NOT need to be in the output.`,
      templateHeader: 'NUMBERED TEMPLATE',
      profileHeader: 'PROFILE DATA',
      jobHeader: 'TARGET JOB (adapt content to this)',
      instructions: `Fill all segments with the correct profile data. Return an array of { index, value } objects.

WORK EXPERIENCE ORDER:
The first "Position :" and "Tasks :" after a period belong to work experience 1.
The second set belongs to work experience 2, etc.

IMPORTANT:
- Fill ALL empty segments where data belongs
- Adjust periods to real dates
- Fill availability, transport etc. if known
- Return ONLY segments that need to be changed
- FILL ALL work experience - including older jobs! Skip no experience.
- If there are multiple work experience slots, fill them ALL with available experiences
- Space is NOT a problem - fill everything from the profile`,
    };
  }

  // Dutch (default)
  return {
    system: `Je bent een CV invul-specialist. Je krijgt een genummerd CV template en moet de waarden invullen.

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
Segmenten met labels zoals "Naam :" of "Functie :" hoeven NIET in de output.`,
    templateHeader: 'GENUMMERD TEMPLATE',
    profileHeader: 'PROFIELDATA',
    jobHeader: 'DOELVACATURE (pas content hierop aan)',
    instructions: `Vul alle segmenten in met de juiste profieldata. Retourneer een array van { index, value } objecten.

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
- Ruimte is GEEN probleem - vul alles in wat in het profiel staat`,
  };
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
  language: OutputLanguage = 'nl',
): Promise<IndexedFillResult> {
  const aiProvider = createAIProvider(provider, apiKey);

  // Build profile summary
  const profileSummary = buildProfileSummary(profileData, language);
  const jobSummary = jobVacancy ? buildJobSummary(jobVacancy, language) : null;

  // Create numbered document representation
  const numberedDoc = indexedSegments
    .map(seg => `[${seg.index}] ${seg.text}`)
    .join('\n');

  // Language-specific prompts
  const prompts = getPrompts(language);

  const systemPrompt = prompts.system;

  const userPrompt = `${prompts.templateHeader}:
${numberedDoc}

${prompts.profileHeader}:
${profileSummary}
${jobSummary ? `\n${prompts.jobHeader}:\n${jobSummary}` : ''}

${prompts.instructions}`;

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
function buildProfileSummary(profile: ParsedLinkedIn, language: OutputLanguage = 'nl'): string {
  const parts: string[] = [];
  const isEn = language === 'en';

  parts.push(`${isEn ? 'Name' : 'Naam'}: ${profile.fullName || (isEn ? 'Not specified' : 'Niet opgegeven')}`);

  if (profile.headline) {
    parts.push(`Headline: ${profile.headline}`);
  }

  if (profile.location) {
    parts.push(`${isEn ? 'Location' : 'Locatie'}: ${profile.location}`);
  }

  if (profile.email) {
    parts.push(`Email: ${profile.email}`);
  }

  if (profile.phone) {
    parts.push(`${isEn ? 'Phone' : 'Telefoon'}: ${profile.phone}`);
  }

  const unknown = isEn ? 'Unknown' : 'Onbekend';
  const present = isEn ? 'Present' : 'Heden';

  if (profile.experience && profile.experience.length > 0) {
    const expHeader = isEn
      ? `\nWORK EXPERIENCE (${profile.experience.length} experiences - fill ALL of them!):`
      : `\nWERKERVARING (${profile.experience.length} ervaringen - vul ze ALLEMAAL in!):`;
    parts.push(expHeader);

    profile.experience.forEach((exp, index) => {
      const expLabel = isEn
        ? `\nWork experience ${index + 1} of ${profile.experience.length}:`
        : `\nWerkervaring ${index + 1} van ${profile.experience.length}:`;
      parts.push(expLabel);
      parts.push(`   ${isEn ? 'Position' : 'Functie'}: ${exp.title || unknown}`);
      parts.push(`   ${isEn ? 'Company' : 'Bedrijf'}: ${exp.company || unknown}`);
      parts.push(`   ${isEn ? 'Start date' : 'Startdatum'}: ${exp.startDate || unknown}`);
      parts.push(`   ${isEn ? 'End date' : 'Einddatum'}: ${exp.endDate || present}`);
      if (exp.description) {
        parts.push(`   ${isEn ? 'Tasks' : 'Werkzaamheden'}: ${exp.description.substring(0, 800)}`);
      }
    });

    const totalExp = isEn
      ? `\nTOTAL: ${profile.experience.length} work experiences. Fill ALL ${profile.experience.length}!`
      : `\nTOTAAL: ${profile.experience.length} werkervaringen. Vul ALLE ${profile.experience.length} in!`;
    parts.push(totalExp);
  }

  if (profile.education && profile.education.length > 0) {
    const eduHeader = isEn
      ? '\nEDUCATION (use EXACTLY this data, do NOT invent other years or education):'
      : '\nOPLEIDING (gebruik EXACT deze gegevens, verzin GEEN andere jaren of opleidingen):';
    parts.push(eduHeader);

    profile.education.forEach((edu, index) => {
      parts.push(`\n${isEn ? 'Education' : 'Opleiding'} ${index + 1}:`);
      parts.push(`   ${isEn ? 'School' : 'School'}: ${edu.school || unknown}`);
      parts.push(`   ${isEn ? 'Degree/Level' : 'Diploma/Niveau'}: ${edu.degree || unknown}`);
      parts.push(`   ${isEn ? 'Field of study' : 'Richting'}: ${edu.fieldOfStudy || unknown}`);
      parts.push(`   ${isEn ? 'Start year' : 'Startjaar'}: ${edu.startYear || unknown}`);
      parts.push(`   ${isEn ? 'End year' : 'Eindjaar'}: ${edu.endYear || unknown}`);
    });

    const eduNote = isEn
      ? '\nIMPORTANT: There are EXACTLY ' + profile.education.length + ' educations. Fill no more or less!'
      : '\nBELANGRIJK: Er zijn PRECIES ' + profile.education.length + ' opleidingen. Vul niet meer of minder in!';
    parts.push(eduNote);
  }

  if (profile.skills && profile.skills.length > 0) {
    parts.push(`\n${isEn ? 'SKILLS' : 'VAARDIGHEDEN'}:`);
    parts.push(profile.skills.slice(0, 20).join(', '));
  }

  return parts.join('\n');
}

/**
 * Build a summary of the job vacancy for the AI prompt
 */
function buildJobSummary(job: JobVacancy, language: OutputLanguage = 'nl'): string {
  const parts: string[] = [];
  const isEn = language === 'en';

  parts.push(`${isEn ? 'Job title' : 'Functietitel'}: ${job.title}`);

  if (job.company) {
    parts.push(`${isEn ? 'Company' : 'Bedrijf'}: ${job.company}`);
  }

  if (job.requirements && job.requirements.length > 0) {
    parts.push(`${isEn ? 'Requirements' : 'Vereisten'}: ${job.requirements.join(', ')}`);
  }

  if (job.keywords && job.keywords.length > 0) {
    parts.push(`Keywords: ${job.keywords.join(', ')}`);
  }

  return parts.join('\n');
}
