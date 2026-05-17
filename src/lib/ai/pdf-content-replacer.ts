/**
 * AI Phase 2 (PDF): Fill the blueprint with profile data, translated to the
 * job's language.
 *
 * Mirror of `docx-content-replacer.ts` but the input is a PDF blueprint
 * (boxes + section classification) instead of structured XML segments.
 *
 * Hergebruikt expliciet `buildProfileSummary`, `buildJobSummary`, en
 * `buildFitAnalysisSummary` uit de DOCX-flow zodat taalvertaling + fit-context
 * automatisch meekomen.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from './providers';
import { resolveTemperature } from './temperature';
import { withRetry } from './retry';
import {
  buildProfileSummary,
  buildJobSummary,
  buildFitAnalysisSummary,
} from './docx-content-replacer';
import type { ParsedLinkedIn, JobVacancy, OutputLanguage, FitAnalysis } from '@/types';
import type { PDFBlueprint, PDFField } from './pdf-template-analyzer';

// ==================== Schema ====================

const pdfFillSchema = z.object({
  fills: z.array(z.object({
    fieldId: z.string().describe('Field id from the blueprint, e.g. "f3"'),
    value: z.string().describe('Plain text value. Use \\n for line breaks within multiline boxes.'),
  })),
  warnings: z.array(z.string()).optional(),
});

export interface PDFFillResult {
  values: Map<string, string>;
  warnings: string[];
  usage: { inputTokens: number; outputTokens: number };
}

export interface FillPDFFieldsOptions {
  blueprint: PDFBlueprint;
  profileData: ParsedLinkedIn;
  provider: LLMProvider;
  apiKey: string;
  model: string;
  jobVacancy?: JobVacancy;
  language?: OutputLanguage;
  fitAnalysis?: FitAnalysis;
  customInstructions?: string;
  customValues?: Record<string, string>;
}

// ==================== Main fill function ====================

export async function fillPDFFields(opts: FillPDFFieldsOptions): Promise<PDFFillResult> {
  const {
    blueprint,
    profileData,
    provider,
    apiKey,
    model,
    jobVacancy,
    language = 'nl',
    fitAnalysis,
    customInstructions,
    customValues,
  } = opts;

  const aiProvider = createAIProvider(provider, apiKey);
  const isEn = language === 'en';

  const profileSummary = buildProfileSummary(profileData, language, customValues);
  const jobSummary = jobVacancy ? buildJobSummary(jobVacancy, language) : null;
  const fitSummary = buildFitAnalysisSummary(fitAnalysis, language);

  const fieldList = compactFieldList(blueprint.fields);

  const systemPrompt = isEn ? buildSystemPromptEN() : buildSystemPromptNL();

  const userPrompt = `${isEn ? 'FIELDS TO FILL' : 'VELDEN OM IN TE VULLEN'}:
${fieldList}

${isEn ? 'PROFILE DATA' : 'PROFIELDATA'}:
${profileSummary}
${jobSummary ? `\n${isEn ? 'TARGET JOB' : 'DOELVACATURE'}:\n${jobSummary}` : ''}${fitSummary}
${customInstructions ? `\n--- ${isEn ? 'USER INSTRUCTIONS (IMPORTANT)' : 'GEBRUIKER INSTRUCTIES (BELANGRIJK)'} ---\n${customInstructions}\n` : ''}

${isEn
  ? 'Return one fill per fieldId. Output the value in the SAME LANGUAGE as the target job. Use \\n for line breaks within multiLine boxes.'
  : 'Geef per fieldId één fill terug. Schrijf de waarde in de TAAL VAN DE VACATURE. Gebruik \\n voor regelafbrekingen binnen multiLine-vakken.'}`;

  const result = await withRetry(() =>
    generateObject({
      model: aiProvider(model),
      schema: pdfFillSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: resolveTemperature(provider, model, 0.2),
    })
  );

  const values = new Map<string, string>();
  for (const f of result.object.fills) {
    values.set(f.fieldId, f.value);
  }

  return {
    values,
    warnings: result.object.warnings ?? [],
    usage: {
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
    },
  };
}

// ==================== Helpers ====================

function compactFieldList(fields: PDFField[]): string {
  return fields.map((f) => {
    const idx = typeof f.index === 'number' ? `[${f.index}]` : '';
    const ml = f.multiLine ? ' multiLine' : '';
    const lbl = f.label ? ` label="${f.label}"` : '';
    return `  ${f.id} (page ${f.page}) — ${f.kind} ${f.profileField}${idx} box=${Math.round(f.width)}×${Math.round(f.height)}pt${ml}${lbl}`;
  }).join('\n');
}

function buildSystemPromptEN(): string {
  return `You are a CV-template fill specialist for PDFs. You receive a list of detected fields
(each with id, section, profile attribute, box size in points, optional label) and the candidate's
profile data. Return the text for each fieldId.

═══════════════════════════════════════════════
ANTI-HALLUCINATIE — STRICT
═══════════════════════════════════════════════
- ONLY use facts present in the profile. NEVER invent jobs, employers, dates, skills, schools.
- If the profile lacks a value for a field: return an empty string for that fieldId, do NOT make one up.
- Repeating blocks: if the template has more slots than profile entries, leave the extra slots empty.
  NEVER duplicate an existing entry to fill an empty slot.

═══════════════════════════════════════════════
TRANSLATION / TONE
═══════════════════════════════════════════════
- Write each value in the language of the TARGET JOB (English here).
- Match the formality of the template; do not add marketing flair.
- Periods: format like "Jan 2022 — Present" / "2018 — 2022".

═══════════════════════════════════════════════
SECTION DISCIPLINE
═══════════════════════════════════════════════
- personal_info fields: only name, contact, location, birth date, nationality.
- work_experience fields: only company/title/period/description from THAT indexed experience.
- education fields: only school/degree/field/period from THAT indexed education.
- skills field: a single skill (use profile.skills in order); language: language + proficiency.
- Never mix content between sections.

═══════════════════════════════════════════════
BOX SIZE AWARENESS
═══════════════════════════════════════════════
- Use the box width/height as a hint of how much text fits.
- For multiLine description boxes you may use 2-4 short bullets (each starting with "- ") OR a short paragraph.
- For single-line boxes keep the value compact.

REMEMBER: empty fields are honest; invented content is a CV-killer.`;
}

function buildSystemPromptNL(): string {
  return `Je bent een PDF-template invulspecialist. Je krijgt een lijst van gedetecteerde velden
(elk met id, sectie, profile-attribuut, vakgrootte in punten, optioneel label) en de profieldata
van de kandidaat. Geef voor elk fieldId de tekst die ingevuld moet worden.

═══════════════════════════════════════════════
ANTI-HALLUCINATIE — STRIKT
═══════════════════════════════════════════════
- Gebruik ALLEEN feiten uit het profiel. VERZIN NOOIT banen, werkgevers, datums, skills, scholen.
- Heeft het profiel geen waarde voor een veld? Retourneer een lege string voor dat fieldId, verzin NOOIT.
- Herhalende blokken: heeft het template meer slots dan profiel-entries, laat de extra slots leeg.
  Dupliceer NOOIT een bestaande entry.

═══════════════════════════════════════════════
TAAL / TOON
═══════════════════════════════════════════════
- Schrijf elke waarde in de taal van de VACATURE (Nederlands hier).
- Matchen formaliteit van het template; geen marketingtaal toevoegen.
- Periodes: notatie zoals "Jan 2022 — Heden" / "2018 — 2022".

═══════════════════════════════════════════════
SECTIE-DISCIPLINE
═══════════════════════════════════════════════
- personal_info-velden: alleen naam, contact, locatie, geboortedatum, nationaliteit.
- work_experience-velden: alleen company/title/period/description van DIE geïndexeerde ervaring.
- education-velden: alleen school/diploma/richting/periode van DIE geïndexeerde opleiding.
- skills-veld: één skill (gebruik profile.skills in volgorde); language: taal + niveau.
- Mix nooit content tussen secties.

═══════════════════════════════════════════════
VAKGROOTTE-BEWUSTZIJN
═══════════════════════════════════════════════
- Gebruik box-breedte/hoogte als hint hoeveel tekst er past.
- Voor multiLine-beschrijvingsvakken mag je 2-4 korte bullets gebruiken (elk beginnend met "- ") OF een korte paragraaf.
- Voor single-line-vakken houd je de waarde compact.

ONTHOUD: lege velden zijn eerlijk; verzonnen inhoud is een CV-killer.`;
}
