import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from './providers';
import { withRetry } from './retry';
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
    nl: `ALLEEN: beschikbaarheid, vervoer, rijbewijs.
⚠️ VERBODEN: werkervaring, functies, bedrijfsnamen, periodes (2020-2024), @-tekens, talen!
Vul ALLEEN de velden in die in het template staan (bijv. "Beschikbaarheid" en "Vervoer").
Voeg GEEN extra velden toe die niet in het template staan!
Als je werkgerelateerde content hier plaatst, is het CV ONGELDIG.`,
    en: `ONLY: availability, transport, driver's license.
⚠️ FORBIDDEN: work experience, job titles, company names, periods (2020-2024), @-signs, languages!
Fill ONLY the fields that exist in the template (e.g., "Availability" and "Transport").
Do NOT add extra fields that are not in the template!
Placing work-related content here makes the CV INVALID.`,
    allowedContent: ['availability', 'transport', 'license'],
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

SECTION HEADERS (marked with [SECTION HEADER - DO NOT MODIFY]):
- NEVER include section header segments in your output
- These are formatting elements that must remain unchanged

LABEL:VALUE FIELDS:
- For segments with "Label : " pattern (e.g., "Position : ", "Tasks : "), return ONLY the value
- Example: [13] "Position : " → return { "index": "13", "value": "ServiceNow Developer" }
- Do NOT repeat the label in your value! Wrong: "Position : ServiceNow Developer"
- For period fields like "2024-Present : ", return the REAL period and company separated by a tab
- Example: [12] "2024-Present : " → return { "index": "12", "value": "2020-Present\tAlliander" }

TAB-SEPARATED FIELDS:
- Some templates have label and value in separate segments separated by tab characters
- Segments like ": " or ": CompanyName" after tabs contain the value — return ONLY the value without the ":"
- Example: [13] ": Alliander" → return { "index": "13", "value": "Snow-Flow" }
- Example: [10] ": ServiceNow Developer" → return { "index": "10", "value": "Data Engineer" }
- For period segments (e.g., "2024" or "2025-Heden"), return "YEAR-YEAR\tCompanyName" with tab separator

EDUCATION PERIOD FIELDS:
- Education periods work the SAME way as work experience periods
- For period segments in education (e.g., "2022-2024" or "2022-2024 : "), return "STARTYEAR-ENDYEAR\tSchoolName - Degree"
- Example: [5] "2022-2024" → return { "index": "5", "value": "2015-2017\tRijn IJssel - MBO 4 Entrepreneurship" }
- Example: [5] "2022-2024 : " → return { "index": "5", "value": "2015-2017\tRijn IJssel - MBO 4 Entrepreneurship" }
- ALWAYS include the school name and degree after the tab separator! Never return just the year range.
- ALWAYS keep the full year range together (e.g., "2015-2017"), NEVER split it across label and value
- The year range goes in the LEFT column, school + degree in the RIGHT column

INSTRUCTIONS:
1. You receive text segments with numbers: [0] text, [1] text, etc.
2. Fill each segment with the correct profile data
3. Return an ARRAY of objects with index and value
4. Only segments that need to be CHANGED should be in the output
5. NEVER modify segments marked [SECTION HEADER - DO NOT MODIFY]`,
      templateHeader: 'NUMBERED TEMPLATE',
      profileHeader: 'PROFILE DATA',
      jobHeader: 'TARGET JOB (adapt content to this)',
      instructions: `Fill all segments with the correct profile data. Return an array of { index, value } objects.

WORK EXPERIENCE ORDER:
The first "Position :" and "Tasks :" after a period belong to work experience 1.
The second set belongs to work experience 2, etc.

After block duplication, all work experience slots may have IDENTICAL placeholder text.
You MUST fill each slot with a DIFFERENT experience from the profile, in chronological order (most recent first).
Slot 1 = experience 1, Slot 2 = experience 2, Slot 3 = experience 3, etc.
NEVER fill two slots with the same experience!

EDUCATION ORDER:
Education entries follow the same pattern as work experience.
After block duplication, all education slots may have IDENTICAL placeholder text.
You MUST fill each slot with a DIFFERENT education from the profile, in chronological order (most recent first).
Slot 1 = education 1, Slot 2 = education 2, etc.
NEVER fill two education slots with the same education!
Each education period segment MUST contain "STARTYEAR-ENDYEAR\tSchool - Degree" (with tab separator).
NEVER return just the year range — ALWAYS include the school name and degree after the tab.

IMPORTANT:
- Fill ALL empty segments where data belongs
- For "Label : " segments, return ONLY the value (not the label)
- For period segments ("2024-Present : "), return "YEAR-YEAR\tCompanyName"
- For education period segments ("2022-2024" or "2022-2024 : "), return "STARTYEAR-ENDYEAR\tSchool - Degree"
- Fill availability, transport etc. if known
- Return ONLY segments that need to be changed
- NEVER return section header segments
- FILL ALL work experience - including older jobs! Skip no experience.
- FILL ALL education entries - including older ones! Skip no education.
- If there are multiple work experience slots, fill them ALL with available experiences
- If there are multiple education slots, fill them ALL with available educations
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

SECTIE HEADERS (gemarkeerd met [SECTION HEADER - DO NOT MODIFY]):
- Neem NOOIT sectie header segmenten op in je output
- Dit zijn opmaak-elementen die ongewijzigd moeten blijven

LABEL:WAARDE VELDEN:
- Voor segmenten met "Label : " patroon (bijv. "Functie : ", "Werkzaamheden : "), retourneer ALLEEN de waarde
- Voorbeeld: [13] "Functie : " → retourneer { "index": "13", "value": "ServiceNow Developer" }
- Herhaal NIET het label in je waarde! Fout: "Functie : ServiceNow Developer"
- Voor periode velden zoals "2024-Heden : ", retourneer de ECHTE periode en bedrijfsnaam gescheiden door een tab
- Voorbeeld: [12] "2024-Heden : " → retourneer { "index": "12", "value": "2020-Heden\tAlliander" }

TAB-GESCHEIDEN VELDEN:
- Sommige templates hebben label en waarde in aparte segmenten gescheiden door tab-tekens
- Segmenten zoals ": " of ": Bedrijfsnaam" na tabs bevatten de waarde — retourneer ALLEEN de waarde zonder de ":"
- Voorbeeld: [13] ": Alliander" → retourneer { "index": "13", "value": "Snow-Flow" }
- Voorbeeld: [10] ": ServiceNow Developer" → retourneer { "index": "10", "value": "Data Engineer" }
- Voor periode segmenten (bijv. "2024" of "2025-Heden"), retourneer "JAAR-JAAR\tBedrijfsnaam" met tab-scheiding

OPLEIDING PERIODE VELDEN:
- Opleidingsperiodes werken HETZELFDE als werkervaring periodes
- Voor periode segmenten in opleidingen (bijv. "2022-2024" of "2022-2024 : "), retourneer "STARTJAAR-EINDJAAR\tSchool - Diploma"
- Voorbeeld: [5] "2022-2024" → retourneer { "index": "5", "value": "2015-2017\tRijn IJssel - MBO 4 Entrepreneurship" }
- Voorbeeld: [5] "2022-2024 : " → retourneer { "index": "5", "value": "2015-2017\tRijn IJssel - MBO 4 Entrepreneurship" }
- Retourneer ALTIJD de schoolnaam en diploma na de tab-scheiding! Retourneer nooit alleen het jaarbereik.
- Houd ALTIJD het volledige jaarbereik bij elkaar (bijv. "2015-2017"), splits het NOOIT over label en waarde
- Het jaarbereik gaat in de LINKER kolom, school + diploma in de RECHTER kolom

INSTRUCTIES:
1. Je krijgt tekst segmenten met nummers: [0] tekst, [1] tekst, etc.
2. Vul elk segment in met de juiste profieldata
3. Retourneer een ARRAY van objecten met index en value
4. Alleen segmenten die GEWIJZIGD moeten worden hoeven in de output
5. Wijzig NOOIT segmenten gemarkeerd met [SECTION HEADER - DO NOT MODIFY]`,
    templateHeader: 'GENUMMERD TEMPLATE',
    profileHeader: 'PROFIELDATA',
    jobHeader: 'DOELVACATURE (pas content hierop aan)',
    instructions: `Vul alle segmenten in met de juiste profieldata. Retourneer een array van { index, value } objecten.

WERKERVARING VOLGORDE:
De eerste "Functie :" en "Werkzaamheden :" na een periode horen bij werkervaring 1.
De tweede set hoort bij werkervaring 2, etc.

Na blok-duplicatie kunnen alle werkervaring slots IDENTIEKE placeholder tekst hebben.
Je MOET elk slot vullen met een ANDERE ervaring uit het profiel, in chronologische volgorde (meest recent eerst).
Slot 1 = ervaring 1, Slot 2 = ervaring 2, Slot 3 = ervaring 3, etc.
Vul NOOIT twee slots met dezelfde ervaring!

OPLEIDING VOLGORDE:
Opleidingen volgen hetzelfde patroon als werkervaring.
Na blok-duplicatie kunnen alle opleiding slots IDENTIEKE placeholder tekst hebben.
Je MOET elk slot vullen met een ANDERE opleiding uit het profiel, in chronologische volgorde (meest recent eerst).
Slot 1 = opleiding 1, Slot 2 = opleiding 2, etc.
Vul NOOIT twee opleiding slots met dezelfde opleiding!
Elk opleiding-periode segment MOET "STARTJAAR-EINDJAAR\tSchool - Diploma" bevatten (met tab-scheiding).
Retourneer NOOIT alleen het jaarbereik — neem ALTIJD de schoolnaam en diploma op na de tab.

BELANGRIJK:
- Vul ALLE lege segmenten in waar data hoort
- Voor "Label : " segmenten, retourneer ALLEEN de waarde (niet het label)
- Voor periode segmenten ("2024-Heden : "), retourneer "JAAR-JAAR\tBedrijfsnaam"
- Voor opleiding periode segmenten ("2022-2024" of "2022-2024 : "), retourneer "STARTJAAR-EINDJAAR\tSchool - Diploma"
- Beschikbaarheid, vervoer etc. ook invullen indien bekend
- Retourneer ALLEEN segmenten die gewijzigd moeten worden
- Retourneer NOOIT sectie header segmenten
- VUL ALLE werkervaring in - ook oudere banen! Sla geen ervaring over.
- VUL ALLE opleidingen in - ook oudere! Sla geen opleiding over.
- Als er meerdere werkervaring slots zijn, vul ze ALLEMAAL in met de beschikbare ervaringen
- Als er meerdere opleiding slots zijn, vul ze ALLEMAAL in met de beschikbare opleidingen
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
 * Annotates header segments so AI knows not to modify them
 */
function buildSectionGroupedDocument(
  segments: { index: number; text: string; section?: SectionType; isHeader?: boolean }[],
  sections: SectionInfo[],
  language: OutputLanguage
): string {
  const isEn = language === 'en';

  // If no sections detected, return flat list
  if (sections.length === 0 || sections.every(s => s.type === 'unknown')) {
    return segments.map(seg => {
      if (seg.isHeader) {
        return `[${seg.index}] ${seg.text} [SECTION HEADER - DO NOT MODIFY]`;
      }
      return `[${seg.index}] ${seg.text}`;
    }).join('\n');
  }

  const parts: string[] = [];

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
        if (seg.isHeader) {
          parts.push(`[${seg.index}] ${seg.text} [SECTION HEADER - DO NOT MODIFY]`);
        } else {
          parts.push(`[${seg.index}] ${seg.text}`);
        }
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

2. SPECIAL NOTES / ADDITIONAL INFO ("Bijzonderheden") SECTION:
   ⚠️ CRITICAL RESTRICTIONS:
   - Fill ONLY the exact fields that exist in the template (e.g., "Beschikbaarheid", "Vervoer")
   - Do NOT add content for fields that don't exist (e.g., don't add "Talen" if there's no Talen field)
   - FORBIDDEN CONTENT (will be removed):
     * Job titles (Developer, Manager, Founder, etc.)
     * Company names
     * Work periods (2020-2024, 2025-Heden)
     * Career summaries
     * @ symbols (like "Developer @ Company")
     * Languages (unless there is a specific "Talen" field)
   - If you place work-related content here, it will be DELETED!

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
   ⚠️ KRITIEKE BEPERKINGEN:
   - Vul ALLEEN de exacte velden in die in het template staan (bijv. "Beschikbaarheid", "Vervoer")
   - Voeg GEEN content toe voor velden die niet bestaan (bijv. geen "Talen" als er geen Talen veld is)
   - VERBODEN CONTENT (wordt verwijderd):
     * Functietitels (Developer, Manager, Founder, etc.)
     * Bedrijfsnamen
     * Werkperiodes (2020-2024, 2025-Heden)
     * Carrière samenvattingen
     * @ symbolen (zoals "Developer @ Bedrijf")
     * Talen (tenzij er specifiek een "Talen" veld is)
   - Als je werkgerelateerde content hier plaatst, wordt het VERWIJDERD!

3. OPLEIDINGEN SECTIE:
   - Vul ALLEEN: scholen, diploma's, studierichtingen, studieperiodes
   - ZET NOOIT werkervaring hier!

4. PERSOONLIJKE GEGEVENS SECTIE:
   - Vul ALLEEN: naam, adres, telefoon, email, geboortedatum

⚠️ WAARSCHUWING: Elk type content hoort in SLECHTS ÉÉN specifieke sectie!
`;
}

/**
 * Filter out invalid content from sections based on section rules
 * This is a post-processing step to catch any AI mistakes
 */
function filterInvalidSectionContent(
  filledSegments: Record<string, string>,
  segments: { index: number; text: string; section?: SectionType }[]
): { filtered: Record<string, string>; removedCount: number } {
  const filtered = { ...filledSegments };
  let removedCount = 0;

  // Patterns that indicate work experience content (should NOT be in special_notes)
  const workExperiencePatterns = [
    /\d{4}\s*[-–—]\s*(\d{4}|[Hh]eden|[Pp]resent)/,  // Year ranges like 2020-2024, 2025-Heden
    /@/,                                              // @ symbol (Developer @ Company)
    /\b(Founder|Co-?[Ff]ounder|CEO|CTO|Manager|Director|Lead|Developer|Engineer|Consultant)\b/i,
    /\b(Technical|Senior|Junior|Head of|VP|Vice President)\b/i,
    /\b(BV|B\.V\.|NV|N\.V\.|Inc|LLC|Ltd|GmbH)\b/i,   // Company suffixes
  ];

  for (const [indexStr, value] of Object.entries(filtered)) {
    const index = parseInt(indexStr);
    const segment = segments.find(s => s.index === index);

    // Only validate special_notes section
    if (segment?.section === 'special_notes' && value) {
      // Check if the content matches work experience patterns
      const hasWorkContent = workExperiencePatterns.some(pattern => pattern.test(value));

      if (hasWorkContent) {
        // Remove the invalid content
        delete filtered[indexStr];
        removedCount++;
        console.warn(`[docx-content-replacer] Removed work experience content from special_notes: "${value.substring(0, 50)}..."`);
      }
    }
  }

  return { filtered, removedCount };
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
  indexedSegments: { index: number; text: string; section?: SectionType; isHeader?: boolean }[],
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
  customValues?: Record<string, string>,
): Promise<IndexedFillResult> {
  const aiProvider = createAIProvider(provider, apiKey);

  // Build profile summary (include custom values like birthDate, nationality)
  const profileSummary = buildProfileSummary(profileData, language, customValues);
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
        ? '\n--- EXPERIENCE FORMAT: BULLETS ---\nUse bullet points (starting with "- ") for work experience descriptions.'
        : '\n--- WERKERVARING FORMAAT: BULLETS ---\nGebruik opsommingstekens (beginnend met "- ") voor werkervaring beschrijvingen.');

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
    const result = await withRetry(() =>
      generateObject({
        model: aiProvider(model),
        schema: indexedFillSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.5,
      })
    );

    // Convert array format to Record format for compatibility
    const filledSegmentsRecord: Record<string, string> = {};
    for (const segment of result.object.filledSegments) {
      filledSegmentsRecord[segment.index] = segment.value;
    }

    // Post-processing: Strip accidental label prefixes from AI responses
    // AI sometimes returns "Functie : Developer" instead of just "Developer"
    for (const [idx, value] of Object.entries(filledSegmentsRecord)) {
      const origSegment = indexedSegments.find(s => s.index === parseInt(idx));
      if (origSegment) {
        // Check if original had "Label : " pattern
        const labelMatch = origSegment.text.match(/^(.+?)\s*:\s*$/);
        if (labelMatch) {
          const label = labelMatch[1].trim();
          // Check if AI accidentally repeated the label
          const labelPrefix = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i');
          if (labelPrefix.test(value)) {
            filledSegmentsRecord[idx] = value.replace(labelPrefix, '').trim();
          }
        }
      }
    }

    // Post-processing: Strip leading `:` prefix from tab-separated value segments
    // Safety net for when AI includes the colon despite instructions
    for (const [idx, value] of Object.entries(filledSegmentsRecord)) {
      const origSegment = indexedSegments.find(s => s.index === parseInt(idx));
      if (origSegment && /^:\s/.test(origSegment.text) && /^:\s*/.test(value)) {
        filledSegmentsRecord[idx] = value.replace(/^:\s*/, '').trim();
      }
    }

    // Post-processing: Remove header segments that AI might have included
    for (const seg of indexedSegments) {
      if (seg.isHeader && filledSegmentsRecord[seg.index.toString()] !== undefined) {
        delete filledSegmentsRecord[seg.index.toString()];
      }
    }

    // Post-processing: Filter out invalid content from sections
    const { filtered, removedCount } = filterInvalidSectionContent(
      filledSegmentsRecord,
      indexedSegments
    );

    // Add warning if content was removed
    const warnings = result.object.warnings || [];
    if (removedCount > 0) {
      warnings.push(`Removed ${removedCount} segment(s) with misplaced work experience content from special_notes section.`);
    }

    return {
      filledSegments: filtered,
      warnings,
    };
  } catch (error) {
    console.error('Error filling document with AI:', error);
    throw new Error('Failed to fill document with AI');
  }
}

/**
 * Build a summary of the profile data for the AI prompt
 */
function buildProfileSummary(profile: ParsedLinkedIn, language: OutputLanguage = 'nl', customValues?: Record<string, string>): string {
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

  // Include custom values (birthDate, nationality, etc.)
  if (customValues?.birthDate) {
    parts.push(`${isEn ? 'Date of birth' : 'Geboortedatum'}: ${customValues.birthDate}`);
  }
  if (customValues?.nationality) {
    parts.push(`${isEn ? 'Nationality' : 'Nationaliteit'}: ${customValues.nationality}`);
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
