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

  const systemPrompt = `Je bent een CV specialist die CV TEMPLATES invult met profieldata.

BELANGRIJK: Het document is een TEMPLATE met PLACEHOLDER tekst die vervangen moet worden:
- Datums zoals "2012 - 2015 :" zijn PLACEHOLDERS, niet echte datums
- "Functie :" is een placeholder voor de functietitel
- "Werkzaamheden :" is een placeholder voor de taakomschrijving
- Namen, bedrijven, etc. in het document zijn voorbeelden die vervangen moeten worden

Je taak:
1. Identificeer ALLE placeholder patronen in het document (datums, "Functie:", "Werkzaamheden:", namen, etc.)
2. Vervang ze IN VOLGORDE met de echte profieldata:
   - Eerste "YYYY - YYYY :" bij werkervaring → eerste werkervaring uit profiel
   - Tweede "YYYY - YYYY :" bij werkervaring → tweede werkervaring uit profiel
   - Etc.
3. Als er meer slots zijn dan data: laat de placeholder staan of vervang met lege string
4. Als er meer data is dan slots: vul alleen de beschikbare slots

REPLACEMENT REGELS:
- searchText moet EXACT overeenkomen met tekst in het document
- Voor datums: zoek "2012 - 2015" (of welke datum er staat) en vervang met echte periode
- Voor "Functie :" → vervang met "Functie : Software Developer" (of de echte titel)
- Voor "Werkzaamheden :" → vervang met "Werkzaamheden : [echte taken]"
- Behoud de labels ("Functie :", "Werkzaamheden :") en voeg alleen de waarde toe`;

  const userPrompt = `TEMPLATE DOCUMENT:
"""
${documentText.substring(0, 15000)}
"""

PROFIELDATA OM IN TE VULLEN:
${profileSummary}

${jobSummary ? `DOELVACATURE (pas beschrijvingen hierop aan):
${jobSummary}
` : ''}

INSTRUCTIES:
1. Vind alle placeholder tekst in het document (datums, "Functie :", namen, etc.)
2. Vervang elke placeholder met de juiste profieldata IN VOLGORDE
3. Geef voor elke vervanging:
   - searchText: EXACTE tekst uit het document (bijv. "2024-Heden :" of "Functie :")
   - replaceWith: De nieuwe waarde (bijv. "2020-2023 : Google" of "Functie : Software Engineer")
   - type: Type content (name, title, company, period, description, skill, education, contact, summary)
   - confidence: high/medium/low

VOORBEELD:
Als document bevat "2024-Heden :" en "Functie :" bij eerste werkervaring, en profiel heeft:
- Werkervaring 1: Software Developer bij Google (2020-2023)
Dan:
- {"searchText": "2024-Heden :", "replaceWith": "2020-2023 : Google", "type": "period", "confidence": "high"}
- {"searchText": "Functie :", "replaceWith": "Functie : Software Developer", "type": "title", "confidence": "high"}`;

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
