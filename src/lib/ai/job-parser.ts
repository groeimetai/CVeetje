import { z } from 'zod';
import { resolveTemperature } from './temperature';
import { generateObjectResilient } from './generate-resilient';
import { getCurrentDateContext } from './date-context';
import type {
  ConfidenceLevel,
  ExperienceLevel,
  JobCompensation,
  JobVacancy,
  LLMProvider,
  SalaryEstimate,
  ExperienceRequired,
  TokenUsage,
} from '@/types';

// ============ Schema notes ============
//
// Anthropic Opus 4.7's tool/structured-output validation rejects schemas
// over a (undocumented) complexity ceiling with `400 "Schema is too complex"`.
// The earlier shape — 3 nested objects, many `z.enum()`, every field with a
// long Dutch `.describe()` — tripped that limit.
//
// Mitigations applied here:
//   - All instructions live in the prompt body (`buildParsePrompt`); the
//     Zod schema is a thin type contract, no `.describe()` prose.
//   - Nested-object enums (`salaryPeriod`, `experienceLevel`, `confidence`,
//     `level`) are typed as `z.string()` here and re-validated to the strict
//     enum values inside `normalizeJobVacancy`. The AI still gets the closed
//     vocabulary from the prompt — wrong values are normalized away.
//   - `.nullable()` replaced by `.optional()` everywhere it appears with
//     `.optional()`: the AI can just omit the field, which is a simpler
//     schema construct than `T | null | undefined`.

// Anthropic Opus 4.7 has an undocumented optional-parameter ceiling
// ("limit: 24"). To fit under it we make the always-present fields REQUIRED
// (defaulting to "" or [] when the vacancy doesn't mention them — empty
// is still honest), drop overlapping fields (bonusInfo → folded into notes,
// currency/period assumed EUR/yearly, marketInsight folded into reasoning).
//
// Current count (must stay ≤ 24):
//   Top-level optional: company, location, employmentType, requiredEducation,
//     requiredCertifications, compensation, salaryEstimate, experienceRequired
//     → 8
//   compensation:    salaryMin, salaryMax, benefits, notes → 4
//   salaryEstimate:  estimatedMin, estimatedMax, experienceLevel,
//                    confidence, reasoning → 5
//   experienceRequired: minYears, maxYears, level, isStrict → 4
//   TOTAL: 21 optional fields ≤ 24 ✓

const compensationSchema = z.object({
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  benefits: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const salaryEstimateSchema = z.object({
  estimatedMin: z.number().optional(),
  estimatedMax: z.number().optional(),
  experienceLevel: z.string().optional(),
  confidence: z.string().optional(),
  reasoning: z.string().optional(),
});

const experienceRequiredSchema = z.object({
  minYears: z.number().optional(),
  maxYears: z.number().optional(),
  level: z.string().optional(),
  isStrict: z.boolean().optional(),
});

const jobVacancySchema = z.object({
  title: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
  keywords: z.array(z.string()),
  industry: z.string(),
  mustHaveSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  company: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  compensation: compensationSchema.optional(),
  salaryEstimate: salaryEstimateSchema.optional(),
  experienceRequired: experienceRequiredSchema.optional(),
  requiredEducation: z.string().optional(),
  requiredCertifications: z.array(z.string()).optional(),
});

const VALID_EXPERIENCE_LEVELS: ExperienceLevel[] = ['junior', 'medior', 'senior', 'lead', 'executive'];
const VALID_CONFIDENCE_LEVELS: ConfidenceLevel[] = ['low', 'medium', 'high'];
const VALID_SALARY_PERIODS = ['yearly', 'monthly', 'hourly'] as const;

function asExperienceLevel(v: unknown): ExperienceLevel | undefined {
  if (typeof v !== 'string') return undefined;
  return (VALID_EXPERIENCE_LEVELS as string[]).includes(v) ? (v as ExperienceLevel) : undefined;
}

function asConfidenceLevel(v: unknown): ConfidenceLevel | undefined {
  if (typeof v !== 'string') return undefined;
  return (VALID_CONFIDENCE_LEVELS as string[]).includes(v) ? (v as ConfidenceLevel) : undefined;
}

function asSalaryPeriod(v: unknown): JobCompensation['salaryPeriod'] {
  if (typeof v !== 'string') return undefined;
  return (VALID_SALARY_PERIODS as readonly string[]).includes(v) ? (v as JobCompensation['salaryPeriod']) : undefined;
}

function buildParsePrompt(rawText: string): string {
  return `Je bent een expert in het analyseren van vacatureteksten. Extraheer wat letterlijk in de tekst staat — niets meer.

${getCurrentDateContext('nl')}

## KERNREGEL — VERZIN NIETS

Extraheer ALLEEN wat de vacaturetekst expliciet noemt. Leid niets af uit functietitel, vergelijkbare vacatures uit je trainingsdata, of context.

- Lege array of weggelaten veld is een geldig (en vaak correct) antwoord. Liever leeg dan verzonnen.
- Werktools ("we gebruiken Slack/Jira/X"), teamcultuur en "over ons"-info zijn GEEN eisen aan de kandidaat.
- "Pré", "bonus", "bij voorkeur", "wenselijk", "is een plus" → niceToHaveSkills, NIET mustHaveSkills.
- Must-have-signalen: "vereist", "minimaal", "must have", "noodzakelijk", "essentieel", "je hebt aantoonbare ervaring met", of vermelding onder kop "Eisen" / "Wat wij vragen" / "Functie-eisen".

## Verplichte velden (vul altijd in, lege array of "" is geldig)

- **title**: functietitel. Empty string als niet duidelijk vermeld.
- **description**: samenvatting van de functie, max 200 woorden. Empty string mag als de vacature zo kort is dat er niets om samen te vatten valt.
- **requirements**: max 10 belangrijkste vereisten/kwalificaties. Lege array \`[]\` mag.
- **keywords**: max 15 relevante skills/technologieën/trefwoorden. Lege array mag.
- **industry**: sector indien af te leiden uit functietitel/bedrijf, anders "".
- **mustHaveSkills**: max 10, alleen skills die EXPLICIET als vereist worden genoemd. Lege array mag.
- **niceToHaveSkills**: max 8, EXPLICIET als bonus/pré/bij voorkeur genoemd. Lege array mag.

## Optionele velden (laat WEG als niet expliciet vermeld)

- **company**: bedrijfsnaam.
- **location**, **employmentType** (fulltime/parttime/freelance).
- **compensation** (sub-object). Alleen invullen bij vermelding. Sub-velden:
  - \`salaryMin\` / \`salaryMax\`: number (jaarbasis, EUR aangenomen — geef niets door als de vacature een andere valuta/periode noemt).
  - \`benefits\`: lijst (pensioen, auto, laptop, thuiswerken, opleidingsbudget, etc.).
  - \`notes\`: vrije tekst over bonus/variabel/compensatie-opmerkingen.
- **salaryEstimate** (sub-object): JOUW marktinschatting (NL, jaarbasis, EUR) — vul altijd in als je een redelijke inschatting kunt maken. Sub-velden:
  - \`estimatedMin\` / \`estimatedMax\`: number.
  - \`experienceLevel\`: één van \`junior\` | \`medior\` | \`senior\` | \`lead\` | \`executive\`.
  - \`confidence\`: één van \`low\` | \`medium\` | \`high\`.
  - \`reasoning\`: max 100 woorden onderbouwing, inclusief eventueel marktinzicht (schaarse skill? groeiende sector?).
- **experienceRequired** (sub-object): ALLEEN bij LETTERLIJKE jaren in de tekst. Geen letterlijke jaren → laat het hele veld weg. Leid GEEN jaren af uit "Senior" / "Lead" in de titel. Sub-velden:
  - \`minYears\`: number, letterlijk genoemd minimum.
  - \`maxYears\`: number, alleen bij ranges (3–5 jaar).
  - \`level\`: één van \`junior\` | \`medior\` | \`senior\` | \`lead\` | \`executive\`.
  - \`isStrict\`: boolean, hard ("vereist"/"minimaal") of flexibel ("bij voorkeur").
- **requiredEducation**, **requiredCertifications**: alleen als EXPLICIET vereist, niet bij "bij voorkeur".

Bij twijfel: lege string/array bij verplichte velden, helemaal weglaten bij optionele.

## Vacaturetekst

${rawText}
`;
}

export interface ParseJobResult {
  vacancy: JobVacancy;
  usage: TokenUsage;
}

export async function parseJobVacancy(
  rawText: string,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  sourceUrl?: string | null,
): Promise<ParseJobResult> {
  const prompt = buildParsePrompt(rawText);

  try {
    const { value, usage } = await generateObjectResilient({
      provider,
      apiKey,
      model,
      schema: jobVacancySchema,
      prompt,
      temperature: resolveTemperature(provider, model, 0.3),
      normalize: (raw) => normalizeJobVacancy(raw, rawText, sourceUrl ?? null),
      logTag: 'Job Parser',
    });

    return { vacancy: value, usage };
  } catch (error) {
    console.error('[Job Parser] Failed after all attempts:', error);
    throw error;
  }
}

// Normalize what the LLM returned into a fully-populated JobVacancy.
// Mirrors the approach in cv-generator.ts — same intermittent Opus 4.7
// structured-output failure modes ({}, {data: ...}, missing fields).
//
// Plus: the simplified Zod schema accepts `z.string()` for the four enum
// fields (salaryPeriod, salaryEstimate.experienceLevel/confidence,
// experienceRequired.level). We validate them against the closed vocab here;
// invalid values are dropped (the corresponding field becomes `undefined`).
function normalizeJobVacancy(rawInput: unknown, rawText: string, sourceUrl: string | null): JobVacancy {
  type RawCompensation = Omit<JobCompensation, 'salaryPeriod'> & { salaryPeriod?: unknown };
  type RawEstimate = Omit<SalaryEstimate, 'experienceLevel' | 'confidence'> & {
    experienceLevel?: unknown;
    confidence?: unknown;
  };
  type RawExpReq = Omit<ExperienceRequired, 'level'> & { level?: unknown };
  type RawShape = Omit<Partial<JobVacancy>, 'compensation' | 'salaryEstimate' | 'experienceRequired'> & {
    compensation?: RawCompensation;
    salaryEstimate?: RawEstimate;
    experienceRequired?: RawExpReq;
    data?: RawShape;
  };
  let raw = (rawInput ?? {}) as RawShape;

  if (
    raw.data &&
    typeof raw.data === 'object' &&
    !raw.title &&
    !raw.description &&
    !raw.requirements
  ) {
    raw = raw.data as RawShape;
  }

  const hasContent =
    (raw.title && raw.title.trim().length > 0) ||
    (raw.description && raw.description.trim().length > 0) ||
    (raw.requirements && raw.requirements.length > 0);

  if (!hasContent) {
    throw new Error(
      'Het AI-model gaf een leeg antwoord terug bij het analyseren van de vacature. Probeer het opnieuw — dit gebeurt af en toe bij lange teksten. Je credit is niet afgeschreven.',
    );
  }

  const compensation: JobCompensation | undefined = raw.compensation
    ? {
        salaryMin: raw.compensation.salaryMin,
        salaryMax: raw.compensation.salaryMax,
        salaryCurrency: raw.compensation.salaryCurrency,
        salaryPeriod: asSalaryPeriod(raw.compensation.salaryPeriod),
        benefits: raw.compensation.benefits ?? [],
        bonusInfo: raw.compensation.bonusInfo,
        notes: raw.compensation.notes,
      }
    : undefined;

  const salaryEstimate: SalaryEstimate | undefined =
    raw.salaryEstimate &&
    typeof raw.salaryEstimate.estimatedMin === 'number' &&
    typeof raw.salaryEstimate.estimatedMax === 'number'
      ? {
          estimatedMin: raw.salaryEstimate.estimatedMin,
          estimatedMax: raw.salaryEstimate.estimatedMax,
          experienceLevel: asExperienceLevel(raw.salaryEstimate.experienceLevel) ?? 'medior',
          confidence: asConfidenceLevel(raw.salaryEstimate.confidence) ?? 'low',
          reasoning: raw.salaryEstimate.reasoning ?? '',
          marketInsight: raw.salaryEstimate.marketInsight ?? '',
        }
      : undefined;

  const experienceRequired: ExperienceRequired | undefined =
    raw.experienceRequired && typeof raw.experienceRequired.minYears === 'number'
      ? {
          minYears: raw.experienceRequired.minYears,
          maxYears: raw.experienceRequired.maxYears,
          level: asExperienceLevel(raw.experienceRequired.level) ?? 'medior',
          isStrict: !!raw.experienceRequired.isStrict,
        }
      : undefined;

  return {
    title: raw.title ?? '',
    company: raw.company ?? null,
    description: raw.description ?? '',
    requirements: raw.requirements ?? [],
    keywords: raw.keywords ?? [],
    industry: raw.industry ?? undefined,
    location: raw.location ?? undefined,
    employmentType: raw.employmentType ?? undefined,
    compensation,
    salaryEstimate,
    experienceRequired,
    mustHaveSkills: raw.mustHaveSkills ?? [],
    niceToHaveSkills: raw.niceToHaveSkills ?? [],
    requiredEducation: raw.requiredEducation ?? undefined,
    requiredCertifications: raw.requiredCertifications ?? [],
    rawText,
    sourceUrl: sourceUrl && sourceUrl.length > 0 ? sourceUrl : null,
  };
}
