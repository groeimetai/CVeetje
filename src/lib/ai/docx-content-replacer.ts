import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from './providers';
import type { ParsedLinkedIn, JobVacancy, OutputLanguage, FitAnalysis } from '@/types';
import type { ExperienceDescriptionFormat } from '@/types/design-tokens';

// ==================== Section Types ====================

export type SectionType =
  | 'personal_info'
  | 'education'
  | 'work_experience'
  | 'special_notes'
  | 'skills'
  | 'languages'
  | 'references'
  | 'hobbies'
  | 'unknown';

export interface SectionInfo {
  type: SectionType;
  startIndex: number;
  endIndex: number;
}

// ==================== Section Rules ====================

/**
 * Rules for what content belongs in each section type
 * Used to guide AI in placing content correctly
 */
const SECTION_RULES: Record<
  SectionType,
  { nl: string; en: string; allowedContent: string[] }
> = {
  personal_info: {
    nl: 'Alleen: naam, adres, telefoon, email, geboortedatum, nationaliteit',
    en: 'Only: name, address, phone, email, date of birth, nationality',
    allowedContent: ['name', 'address', 'phone', 'email', 'dob', 'nationality'],
  },
  work_experience: {
    nl: 'ALLEEN: bedrijfsnamen, functies, werkzaamheden/taken, periodes van WERK. Dit is de ENIGE sectie voor werkgerelateerde content!',
    en: 'ONLY: company names, job titles, tasks/responsibilities, work periods. This is the ONLY section for work-related content!',
    allowedContent: ['company', 'title', 'tasks', 'work_period'],
  },
  education: {
    nl: 'Alleen: scholen, opleidingen, diploma\'s, studierichtingen, studieperiodes',
    en: 'Only: schools, degrees, diplomas, fields of study, education periods',
    allowedContent: ['school', 'degree', 'field', 'education_period'],
  },
  special_notes: {
    nl: 'ALLEEN: beschikbaarheid, vervoer, rijbewijs, hobby\'s, extra informatie. VUL NOOIT werkervaring of opleidingen hier in!',
    en: 'ONLY: availability, transport, driver\'s license, hobbies, additional info. NEVER fill work experience or education here!',
    allowedContent: ['availability', 'transport', 'license', 'hobbies', 'extra'],
  },
  skills: {
    nl: 'Alleen: technische vaardigheden, soft skills, talen, certificaten',
    en: 'Only: technical skills, soft skills, languages, certifications',
    allowedContent: ['skills', 'certifications'],
  },
  languages: {
    nl: 'Alleen: talen en taalniveaus',
    en: 'Only: languages and proficiency levels',
    allowedContent: ['languages'],
  },
  references: {
    nl: 'Alleen: referenties en contactpersonen',
    en: 'Only: references and contact persons',
    allowedContent: ['references'],
  },
  hobbies: {
    nl: 'Alleen: hobby\'s en interesses',
    en: 'Only: hobbies and interests',
    allowedContent: ['hobbies', 'interests'],
  },
  unknown: {
    nl: 'Algemene content - bepaal op basis van context',
    en: 'General content - determine based on context',
    allowedContent: [],
  },
};

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
 * Build a compact summary of fit analysis for the AI prompt
 * Helps AI emphasize matched skills and strengths
 */
function buildFitAnalysisSummary(
  fitAnalysis: FitAnalysis | undefined,
  language: OutputLanguage
): string {
  if (!fitAnalysis) return '';

  const isEn = language === 'en';
  const parts: string[] = [];

  // Header
  parts.push(isEn
    ? '\n--- FIT ANALYSIS (use this to optimize content) ---'
    : '\n--- FIT ANALYSE (gebruik dit om content te optimaliseren) ---'
  );

  // Matched skills (top 5)
  if (fitAnalysis.skillMatch.matched.length > 0) {
    const skills = fitAnalysis.skillMatch.matched.slice(0, 5).join(', ');
    parts.push(isEn
      ? `EMPHASIZE these matched skills in descriptions: ${skills}`
      : `BENADRUK deze matchende skills in beschrijvingen: ${skills}`
    );
  }

  // Strengths (top 3)
  if (fitAnalysis.strengths.length > 0) {
    const strengths = fitAnalysis.strengths
      .slice(0, 3)
      .map(s => s.message)
      .join('; ');
    parts.push(isEn
      ? `KEY STRENGTHS to highlight: ${strengths}`
      : `STERKE PUNTEN om uit te lichten: ${strengths}`
    );
  }

  // Bonus skills (top 3)
  if (fitAnalysis.skillMatch.bonus.length > 0) {
    const bonus = fitAnalysis.skillMatch.bonus.slice(0, 3).join(', ');
    parts.push(isEn
      ? `BONUS skills that add value: ${bonus}`
      : `BONUS skills die waarde toevoegen: ${bonus}`
    );
  }

  // Strategic instruction based on verdict
  if (fitAnalysis.verdict === 'challenging' || fitAnalysis.verdict === 'unlikely') {
    parts.push(isEn
      ? 'NOTE: Fit is moderate - emphasize transferable skills and learning ability'
      : 'LET OP: Fit is matig - benadruk overdraagbare skills en leervermogen'
    );
  }

  return parts.join('\n');
}

/**
 * Build section-grouped document representation for AI
 * Groups segments by their detected section for better context
 */
function buildSectionGroupedDocument(
  segments: { index: number; text: string; section?: SectionType }[],
  sections: SectionInfo[],
  language: OutputLanguage
): string {
  const isEn = language === 'en';

  // If no sections detected, return flat list
  if (sections.length === 0 || sections.every(s => s.type === 'unknown')) {
    return segments.map(seg => `[${seg.index}] ${seg.text}`).join('\n');
  }

  const parts: string[] = [];
  let currentSectionIndex = 0;

  for (const section of sections) {
    const rule = SECTION_RULES[section.type];
    const sectionName = section.type.replace(/_/g, ' ').toUpperCase();

    // Section header with rules
    parts.push(`\n=== ${sectionName} (${section.startIndex}-${section.endIndex}) ===`);
    parts.push(`📋 ${isEn ? rule.en : rule.nl}`);
    parts.push('');

    // Add segments belonging to this section
    for (const seg of segments) {
      if (seg.index >= section.startIndex && seg.index <= section.endIndex) {
        parts.push(`[${seg.index}] ${seg.text}`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Get section-specific rules text for the system prompt
 */
function getSectionRulesText(language: OutputLanguage): string {
  const isEn = language === 'en';

  if (isEn) {
    return `
=== SECTION RULES (CRITICAL!) ===

1. WORK EXPERIENCE SECTION:
   - Fill ONLY: company names, job titles, tasks/responsibilities, work periods
   - This is the ONLY section for work-related content
   - NEVER put work experience in other sections!

2. SPECIAL NOTES / ADDITIONAL INFO SECTION:
   - Fill ONLY: availability, transport, driver's license, hobbies
   - NEVER fill work experience here!
   - NEVER fill education here!

3. EDUCATION SECTION:
   - Fill ONLY: schools, degrees, fields of study, education periods
   - NEVER put work experience here!

4. PERSONAL INFO SECTION:
   - Fill ONLY: name, address, phone, email, date of birth

⚠️ WARNING: Each content type belongs in ONLY ONE specific section!
`;
  }

  return `
=== SECTIE REGELS (KRITIEK!) ===

1. WERKERVARING SECTIE:
   - Vul ALLEEN: bedrijfsnamen, functies, werkzaamheden/taken, werkperiodes
   - Dit is de ENIGE sectie voor werkgerelateerde content
   - ZET NOOIT werkervaring in andere secties!

2. BIJZONDERHEDEN / AANVULLENDE INFO SECTIE:
   - Vul ALLEEN: beschikbaarheid, vervoer, rijbewijs, hobby's
   - VUL NOOIT werkervaring hier in!
   - VUL NOOIT opleidingen hier in!

3. OPLEIDINGEN SECTIE:
   - Vul ALLEEN: scholen, diploma's, studierichtingen, studieperiodes
   - ZET NOOIT werkervaring hier!

4. PERSOONLIJKE GEGEVENS SECTIE:
   - Vul ALLEEN: naam, adres, telefoon, email, geboortedatum

⚠️ WAARSCHUWING: Elk type content hoort in SLECHTS ÉÉN specifieke sectie!
`;
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
  indexedSegments: { index: number; text: string; section?: SectionType }[],
  profileData: ParsedLinkedIn,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  jobVacancy?: JobVacancy,
  language: OutputLanguage = 'nl',
  fitAnalysis?: FitAnalysis,
  customInstructions?: string,
  descriptionFormat: ExperienceDescriptionFormat = 'bullets',
  sections: SectionInfo[] = [],
): Promise<IndexedFillResult> {
  const aiProvider = createAIProvider(provider, apiKey);

  // Build profile summary
  const profileSummary = buildProfileSummary(profileData, language);
  const jobSummary = jobVacancy ? buildJobSummary(jobVacancy, language) : null;
  const fitSummary = buildFitAnalysisSummary(fitAnalysis, language);

  // Create section-grouped document representation
  const numberedDoc = buildSectionGroupedDocument(indexedSegments, sections, language);

  // Language-specific prompts
  const prompts = getPrompts(language);

  // Add section rules to system prompt if sections were detected
  const hasSections = sections.length > 0 && sections.some(s => s.type !== 'unknown');
  const sectionRules = hasSections ? getSectionRulesText(language) : '';
  const systemPrompt = prompts.system + sectionRules;

  // Build format instruction section
  const formatInstruction = descriptionFormat === 'paragraph'
    ? (language === 'en'
        ? '\n--- EXPERIENCE FORMAT: PARAGRAPH ---\nWrite work experience as flowing paragraphs (2-3 sentences). Do not use bullet points.'
        : '\n--- WERKERVARING FORMAAT: PARAGRAAF ---\nSchrijf werkervaring als doorlopende paragrafen (2-3 zinnen). Gebruik geen opsommingstekens.')
    : (language === 'en'
        ? `\n--- EXPERIENCE FORMAT: BULLETS ---
CRITICAL: Keep each bullet point SHORT (max 50-60 characters)!
- Use concise, keyword-focused descriptions
- Avoid long sentences that wrap to next line
- Split long tasks into multiple short bullets
- Example GOOD: "- API integration with REST services"
- Example BAD: "- Developed and implemented comprehensive API integration solutions for REST-based web services"
Each bullet must fit on ONE line in the template!`
        : `\n--- WERKERVARING FORMAAT: BULLETS ---
KRITIEK: Houd elke bullet KORT (max 50-60 tekens)!
- Gebruik bondige, keyword-gerichte beschrijvingen
- Vermijd lange zinnen die doorlopen naar volgende regel
- Splits lange taken op in meerdere korte bullets
- Voorbeeld GOED: "- API integratie met REST services"
- Voorbeeld FOUT: "- Ontwikkelen en implementeren van uitgebreide API integratie oplossingen voor REST-gebaseerde webservices"
Elke bullet moet op ÉÉN regel passen in het template!`);

  // Build custom instructions section if provided
  const customInstructionsSection = customInstructions
    ? `\n--- ${language === 'en' ? 'USER INSTRUCTIONS (IMPORTANT - follow these adjustments)' : 'GEBRUIKER INSTRUCTIES (BELANGRIJK - volg deze aanpassingen)'} ---\n${customInstructions}\n`
    : '';

  const userPrompt = `${prompts.templateHeader}:
${numberedDoc}

${prompts.profileHeader}:
${profileSummary}
${jobSummary ? `\n${prompts.jobHeader}:\n${jobSummary}` : ''}${fitSummary}${formatInstruction}${customInstructionsSection}

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
