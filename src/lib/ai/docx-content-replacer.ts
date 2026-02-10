/**
 * AI Phase 2: Fill structured segments with profile data.
 *
 * Receives a structural template map (from structure-extractor) and optionally
 * a blueprint (from template-analyzer), then asks the AI to fill each segment
 * with the correct profile data. Returns a map of segment ID -> new text.
 *
 * Also exports helper functions (buildProfileSummary, buildJobSummary, etc.)
 * used by both the standalone fill call and the combined analyze+fill call.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from './providers';
import { withRetry } from './retry';
import type { ParsedLinkedIn, JobVacancy, OutputLanguage, FitAnalysis } from '@/types';
import type { ExperienceDescriptionFormat } from '@/types/design-tokens';
import type { TemplateBlueprint } from './template-analyzer';

// ==================== Schema ====================

const segmentFillSchema = z.object({
  fills: z.array(
    z.object({
      segmentId: z.string().describe('The segment ID (e.g., "s0", "s5")'),
      value: z.string().describe('The new text value for this segment'),
    })
  ).describe('Array of segment fills. Only include segments that need new values.'),
  warnings: z.array(z.string()).optional().describe('Any warnings about the fill process'),
});

export interface SegmentFillResult {
  fills: Record<string, string>;
  warnings: string[];
}

// ==================== Main Fill Function ====================

/**
 * Ask AI to fill all segments in a structured template map.
 */
export async function fillStructuredSegments(
  templateMap: string,
  blueprint: TemplateBlueprint | null,
  profileData: ParsedLinkedIn,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  jobVacancy?: JobVacancy,
  language: OutputLanguage = 'nl',
  fitAnalysis?: FitAnalysis,
  customInstructions?: string,
  descriptionFormat: ExperienceDescriptionFormat = 'bullets',
  customValues?: Record<string, string>,
): Promise<SegmentFillResult> {
  const aiProvider = createAIProvider(provider, apiKey);
  const isEn = language === 'en';

  const profileSummary = buildProfileSummary(profileData, language, customValues);
  const jobSummary = jobVacancy ? buildJobSummary(jobVacancy, language) : null;
  const fitSummary = buildFitAnalysisSummary(fitAnalysis, language);

  const formatInstruction = descriptionFormat === 'paragraph'
    ? (isEn
        ? '\n--- EXPERIENCE FORMAT: PARAGRAPH ---\nWrite work experience as flowing paragraphs (2-3 sentences). Do not use bullet points.'
        : '\n--- WERKERVARING FORMAAT: PARAGRAAF ---\nSchrijf werkervaring als doorlopende paragrafen (2-3 zinnen). Gebruik geen opsommingstekens.')
    : (isEn
        ? '\n--- EXPERIENCE FORMAT: BULLETS ---\nUse bullet points (starting with "- ") for work experience descriptions.'
        : '\n--- WERKERVARING FORMAAT: BULLETS ---\nGebruik opsommingstekens (beginnend met "- ") voor werkervaring beschrijvingen.');

  const customSection = customInstructions
    ? `\n--- ${isEn ? 'USER INSTRUCTIONS (IMPORTANT)' : 'GEBRUIKER INSTRUCTIES (BELANGRIJK)'} ---\n${customInstructions}\n`
    : '';

  // Build blueprint context for the AI (helps it understand section boundaries)
  let blueprintContext = '';
  if (blueprint) {
    const sectionList = blueprint.sections
      .map(s => `  - ${s.type}: "${s.label}" (segments ${s.segmentIds[0]}..${s.segmentIds[s.segmentIds.length - 1]})`)
      .join('\n');
    blueprintContext = `\nIDENTIFIED SECTIONS:\n${sectionList}\n`;

    if (blueprint.repeatingBlocks.length > 0) {
      const blockList = blueprint.repeatingBlocks
        .map(b => `  - ${b.sectionType}: ${b.instances.length} slots (${b.blockType})`)
        .join('\n');
      blueprintContext += `\nREPEATING BLOCKS:\n${blockList}\n`;
    }
  }

  const systemPrompt = isEn ? buildSystemPromptEN() : buildSystemPromptNL();

  const userPrompt = `TEMPLATE STRUCTURE:
${templateMap}
${blueprintContext}
${isEn ? 'PROFILE DATA' : 'PROFIELDATA'}:
${profileSummary}
${jobSummary ? `\n${isEn ? 'TARGET JOB' : 'DOELVACATURE'}:\n${jobSummary}` : ''}${fitSummary}${formatInstruction}${customSection}

${isEn ? 'Fill all segments with the correct profile data. Return fills as { segmentId, value } objects.'
  : 'Vul alle segmenten in met de juiste profieldata. Retourneer fills als { segmentId, value } objecten.'}`;

  try {
    const result = await withRetry(() =>
      generateObject({
        model: aiProvider(model),
        schema: segmentFillSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.5,
      })
    );

    const fills: Record<string, string> = {};
    for (const f of result.object.fills) {
      fills[f.segmentId] = f.value;
    }

    // Post-processing: filter work-experience content that leaked into special_notes
    const warnings = result.object.warnings || [];
    if (blueprint) {
      const specialNotesIds = new Set<string>();
      for (const section of blueprint.sections) {
        if (section.type === 'special_notes') {
          for (const id of section.segmentIds) {
            specialNotesIds.add(id);
          }
        }
      }

      let removedCount = 0;
      for (const [segId, value] of Object.entries(fills)) {
        if (specialNotesIds.has(segId) && hasWorkExperienceContent(value)) {
          delete fills[segId];
          removedCount++;
          console.warn(`[docx-content-replacer] Removed work content from special_notes segment ${segId}: "${value.substring(0, 50)}..."`);
        }
      }
      if (removedCount > 0) {
        warnings.push(`Removed ${removedCount} segment(s) with misplaced work experience content.`);
      }
    }

    return { fills, warnings };
  } catch (error) {
    console.error('Error filling structured segments:', error);
    throw new Error('Failed to fill document with AI');
  }
}

// ==================== System Prompts ====================

function buildSystemPromptEN(): string {
  return `You are a CV filling specialist. You receive a structural template map showing all text segments with their IDs and positions.

CRITICAL RULES:
- Use ONLY exact data from the profile. NEVER invent experiences, education, or years.
- FILL ALL work experience and education entries - skip NOTHING!
- If there are more profile entries than template slots, fill available slots with the most recent/relevant
- Each repeating block instance should contain a DIFFERENT entry (experience 1, experience 2, etc.)
- NEVER fill two slots with the same experience or education!

SEGMENT IDs:
- Segments are identified like "s0", "s1", etc.
- When filling, use the exact segment ID as segmentId
- Only include segments that need to be CHANGED

SECTION RULES:
- personal_info: ONLY name, address, phone, email, date of birth, nationality
- work_experience: ONLY company names, job titles, tasks, work periods
- education: ONLY schools, degrees, fields of study, education periods
- skills: ONLY technical/soft skills, certifications
- languages: ONLY languages and proficiency levels
- special_notes: ONLY availability, transport, driver's license. FORBIDDEN: job titles, company names, work periods, career summaries!
- NEVER mix content between sections!

TABLE CELLS:
- Some templates use tables where each cell is a segment
- Fill each cell with the appropriate data for its column position
- For multi-line content within one cell, use \\n for line breaks

TAB-SEPARATED LAYOUTS:
- Some templates use [TAB] markers to separate labels from values within a paragraph
- Segments BEFORE [TAB] are labels (e.g., "Name", "Date of birth") — do NOT change these
- Segments AFTER [TAB] are value fields — fill these with the corresponding profile data
- Example: [s1] "Name" [TAB] [s2] ": " [TAB] [s3] " " → only fill s3 with the person's name, leave s1 and s2 unchanged

ORDER: Fill in reverse chronological order (most recent first).
Slot 1 = most recent, Slot 2 = second most recent, etc.

IMPORTANT: Do NOT modify section header segments. Leave them unchanged.`;
}

function buildSystemPromptNL(): string {
  return `Je bent een CV invul-specialist. Je krijgt een structurele template map met alle tekst-segmenten, hun IDs en posities.

KRITIEKE REGELS:
- Gebruik ALLEEN exacte data uit het profiel. VERZIN NOOIT ervaringen, opleidingen of jaren.
- VUL ALLE werkervaring en opleidingen in - sla NIETS over!
- Als er meer profielentries zijn dan template slots, vul de beschikbare slots met de meest recente/relevante
- Elke herhalend blok instantie moet een ANDERE entry bevatten (ervaring 1, ervaring 2, etc.)
- Vul NOOIT twee slots met dezelfde ervaring of opleiding!

SEGMENT IDs:
- Segmenten worden geidentificeerd als "s0", "s1", etc.
- Gebruik bij het invullen het exacte segment ID als segmentId
- Neem alleen segmenten op die GEWIJZIGD moeten worden

SECTIE REGELS:
- personal_info: ALLEEN naam, adres, telefoon, email, geboortedatum, nationaliteit
- work_experience: ALLEEN bedrijfsnamen, functies, werkzaamheden, werkperiodes
- education: ALLEEN scholen, diploma's, studierichtingen, studieperiodes
- skills: ALLEEN technische/soft skills, certificaten
- languages: ALLEEN talen en taalniveaus
- special_notes: ALLEEN beschikbaarheid, vervoer, rijbewijs. VERBODEN: functietitels, bedrijfsnamen, werkperiodes, carriere-samenvattingen!
- MIX NOOIT content tussen secties!

TABEL CELLEN:
- Sommige templates gebruiken tabellen waar elke cel een segment is
- Vul elke cel met de juiste data voor de kolompositie
- Voor multi-line content binnen een cel, gebruik \\n voor regelafbrekingen

TAB-GESCHEIDEN LAYOUTS:
- Sommige templates gebruiken [TAB] markers om labels van waarden te scheiden binnen een paragraaf
- Segmenten VOOR [TAB] zijn labels (bijv. "Naam", "Geboortedatum") — wijzig deze NIET
- Segmenten NA [TAB] zijn waarde-velden — vul deze met de bijbehorende profieldata
- Voorbeeld: [s1] "Naam" [TAB] [s2] ": " [TAB] [s3] " " → vul alleen s3 in met de naam, laat s1 en s2 ongewijzigd

VOLGORDE: Vul in omgekeerd chronologische volgorde (meest recent eerst).
Slot 1 = meest recent, Slot 2 = op een na meest recent, etc.

BELANGRIJK: Wijzig GEEN sectie header segmenten. Laat ze ongewijzigd.`;
}

// ==================== Profile/Job Summary Builders (exported for template-analyzer) ====================

export function buildProfileSummary(profile: ParsedLinkedIn, language: OutputLanguage = 'nl', customValues?: Record<string, string>): string {
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

  if (customValues?.birthDate) {
    parts.push(`${isEn ? 'Date of birth' : 'Geboortedatum'}: ${customValues.birthDate}`);
  }
  if (customValues?.nationality) {
    parts.push(`${isEn ? 'Nationality' : 'Nationaliteit'}: ${customValues.nationality}`);
  }

  const unknown = isEn ? 'Unknown' : 'Onbekend';
  const present = isEn ? 'Present' : 'Heden';

  if (profile.experience && profile.experience.length > 0) {
    parts.push(isEn
      ? `\nWORK EXPERIENCE (${profile.experience.length} experiences - fill ALL!):`
      : `\nWERKERVARING (${profile.experience.length} ervaringen - vul ALLEMAAL in!):`
    );

    profile.experience.forEach((exp, index) => {
      parts.push(isEn
        ? `\nExperience ${index + 1} of ${profile.experience.length}:`
        : `\nWerkervaring ${index + 1} van ${profile.experience.length}:`
      );
      parts.push(`   ${isEn ? 'Position' : 'Functie'}: ${exp.title || unknown}`);
      parts.push(`   ${isEn ? 'Company' : 'Bedrijf'}: ${exp.company || unknown}`);
      parts.push(`   ${isEn ? 'Start date' : 'Startdatum'}: ${exp.startDate || unknown}`);
      parts.push(`   ${isEn ? 'End date' : 'Einddatum'}: ${exp.endDate || present}`);
      if (exp.description) {
        parts.push(`   ${isEn ? 'Tasks' : 'Werkzaamheden'}: ${exp.description.substring(0, 800)}`);
      }
    });

    parts.push(isEn
      ? `\nTOTAL: ${profile.experience.length} experiences. Fill ALL!`
      : `\nTOTAAL: ${profile.experience.length} ervaringen. Vul ALLE in!`
    );
  }

  if (profile.education && profile.education.length > 0) {
    parts.push(isEn
      ? '\nEDUCATION (use EXACTLY this data):'
      : '\nOPLEIDING (gebruik EXACT deze gegevens):'
    );

    profile.education.forEach((edu, index) => {
      parts.push(`\n${isEn ? 'Education' : 'Opleiding'} ${index + 1}:`);
      parts.push(`   ${isEn ? 'School' : 'School'}: ${edu.school || unknown}`);
      parts.push(`   ${isEn ? 'Degree/Level' : 'Diploma/Niveau'}: ${edu.degree || unknown}`);
      parts.push(`   ${isEn ? 'Field of study' : 'Richting'}: ${edu.fieldOfStudy || unknown}`);
      parts.push(`   ${isEn ? 'Start year' : 'Startjaar'}: ${edu.startYear || unknown}`);
      parts.push(`   ${isEn ? 'End year' : 'Eindjaar'}: ${edu.endYear || unknown}`);
    });

    parts.push(isEn
      ? `\nIMPORTANT: EXACTLY ${profile.education.length} educations. No more, no less!`
      : `\nBELANGRIJK: PRECIES ${profile.education.length} opleidingen. Niet meer, niet minder!`
    );
  }

  if (profile.skills && profile.skills.length > 0) {
    parts.push(`\n${isEn ? 'SKILLS' : 'VAARDIGHEDEN'}:`);
    parts.push(profile.skills.slice(0, 20).join(', '));
  }

  return parts.join('\n');
}

export function buildJobSummary(job: JobVacancy, language: OutputLanguage = 'nl'): string {
  const parts: string[] = [];
  const isEn = language === 'en';

  parts.push(`${isEn ? 'Job title' : 'Functietitel'}: ${job.title}`);
  if (job.company) parts.push(`${isEn ? 'Company' : 'Bedrijf'}: ${job.company}`);
  if (job.requirements?.length) parts.push(`${isEn ? 'Requirements' : 'Vereisten'}: ${job.requirements.join(', ')}`);
  if (job.keywords?.length) parts.push(`Keywords: ${job.keywords.join(', ')}`);

  return parts.join('\n');
}

export function buildFitAnalysisSummary(
  fitAnalysis: FitAnalysis | undefined,
  language: OutputLanguage
): string {
  if (!fitAnalysis) return '';

  const isEn = language === 'en';
  const parts: string[] = [];

  parts.push(isEn
    ? '\n--- FIT ANALYSIS (optimize content for this) ---'
    : '\n--- FIT ANALYSE (optimaliseer content hiervoor) ---'
  );

  if (fitAnalysis.skillMatch.matched.length > 0) {
    const skills = fitAnalysis.skillMatch.matched.slice(0, 5).join(', ');
    parts.push(isEn
      ? `EMPHASIZE these matched skills: ${skills}`
      : `BENADRUK deze matchende skills: ${skills}`
    );
  }

  if (fitAnalysis.strengths.length > 0) {
    const strengths = fitAnalysis.strengths.slice(0, 3).map(s => s.message).join('; ');
    parts.push(isEn
      ? `KEY STRENGTHS: ${strengths}`
      : `STERKE PUNTEN: ${strengths}`
    );
  }

  if (fitAnalysis.skillMatch.bonus.length > 0) {
    const bonus = fitAnalysis.skillMatch.bonus.slice(0, 3).join(', ');
    parts.push(isEn
      ? `BONUS skills: ${bonus}`
      : `BONUS skills: ${bonus}`
    );
  }

  if (fitAnalysis.verdict === 'challenging' || fitAnalysis.verdict === 'unlikely') {
    parts.push(isEn
      ? 'NOTE: Fit is moderate - emphasize transferable skills'
      : 'LET OP: Fit is matig - benadruk overdraagbare skills'
    );
  }

  return parts.join('\n');
}

// ==================== Validation ====================

function hasWorkExperienceContent(value: string): boolean {
  const patterns = [
    /\d{4}\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent)/,
    /@/,
    /\b(Founder|Co-?[Ff]ounder|CEO|CTO|Manager|Director|Lead|Developer|Engineer|Consultant)\b/i,
    /\b(Technical|Senior|Junior|Head of|VP|Vice President)\b/i,
    /\b(BV|B\.V\.|NV|N\.V\.|Inc|LLC|Ltd|GmbH)\b/i,
  ];
  return patterns.some(p => p.test(value));
}
