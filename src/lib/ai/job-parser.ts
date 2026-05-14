import { z } from 'zod';
import { resolveTemperature } from './temperature';
import { generateObjectResilient } from './generate-resilient';
import { getCurrentDateContext } from './date-context';
import type { JobVacancy, LLMProvider, TokenUsage } from '@/types';

// Schema for compensation/benefits
const compensationSchema = z.object({
  salaryMin: z.number().nullable().describe('Minimum salaris (jaarbasis) indien vermeld, anders null'),
  salaryMax: z.number().nullable().describe('Maximum salaris (jaarbasis) indien vermeld, anders null'),
  salaryCurrency: z.string().nullable().describe('Valuta (EUR, USD) indien vermeld, anders null'),
  salaryPeriod: z.enum(['yearly', 'monthly', 'hourly']).nullable().describe('Salaris periode indien vermeld, anders null'),
  benefits: z.array(z.string()).describe('Lijst van secundaire arbeidsvoorwaarden/benefits die in de vacature worden genoemd (bijv. pensioen, auto, laptop, thuiswerken, opleidingsbudget, etc.)'),
  bonusInfo: z.string().nullable().describe('Informatie over bonus/variabele beloning indien vermeld, anders null'),
  notes: z.string().nullable().describe('Overige opmerkingen over compensatie/arbeidsvoorwaarden indien vermeld, anders null'),
}).nullable();

// Schema for market salary estimate (AI analysis)
const salaryEstimateSchema = z.object({
  estimatedMin: z.number().describe('Geschatte minimum jaarsalaris voor deze functie in Nederland (EUR)'),
  estimatedMax: z.number().describe('Geschatte maximum jaarsalaris voor deze functie in Nederland (EUR)'),
  experienceLevel: z.enum(['junior', 'medior', 'senior', 'lead', 'executive']).describe('Geschat ervaringsniveau dat gevraagd wordt'),
  confidence: z.enum(['low', 'medium', 'high']).describe('Betrouwbaarheid van de schatting: low (weinig info), medium (redelijke info), high (duidelijke indicatoren)'),
  reasoning: z.string().describe('Korte onderbouwing van de schatting (max 100 woorden): welke factoren zijn meegenomen?'),
  marketInsight: z.string().describe('Marktinzicht: hoe verhoudt deze functie zich tot de markt? Is het een schaarse skill? Groeiende sector?'),
});

// Schema for experience requirements (for fit analysis)
// Het hele object is nullable: als de vacature geen LETTERLIJKE jaren noemt,
// MOET de AI null teruggeven. Niet afleiden uit functietitel.
const experienceRequiredSchema = z.object({
  minYears: z.number().describe('Letterlijk genoemd minimum aantal jaren ervaring uit de vacaturetekst. Geen letterlijke jaren → retourneer null voor het hele experienceRequired-veld.'),
  maxYears: z.number().nullable().describe('Letterlijk genoemd maximum aantal jaren (alleen bij ranges zoals "3-5 jaar"), anders null'),
  level: z.enum(['junior', 'medior', 'senior', 'lead', 'executive']).describe('Niveau dat gevraagd wordt op basis van letterlijke termen in de tekst'),
  isStrict: z.boolean().describe('Is de eis hard vermeld (signaalwoorden "vereist"/"minimaal") of flexibel ("bij voorkeur")?'),
}).nullable();

// Schema for parsed job vacancy.
//
// Top-level fields are OPTIONAL for the same reason as cv-generator:
// Claude Opus 4.7 structured output intermittently returns `{}` or wraps
// the payload in `{data: ...}`. We parse leniently, then validate and fill
// defaults in normalizeJobVacancy() so downstream code always sees a
// fully-populated JobVacancy.
const jobVacancySchema = z.object({
  title: z.string().optional().describe('De functietitel/job title'),
  company: z.string().nullable().optional().describe('Bedrijfsnaam indien vermeld, anders null'),
  description: z.string().optional().describe('Korte samenvatting van de functie in max 200 woorden'),
  requirements: z.array(z.string()).optional().describe('Belangrijkste vereisten en kwalificaties (max 10 items)'),
  keywords: z.array(z.string()).optional().describe('Relevante skills, technologieën en trefwoorden (max 15 items)'),
  industry: z.string().nullable().optional().describe('Sector/industrie indien af te leiden, anders null'),
  location: z.string().nullable().optional().describe('Werklocatie indien vermeld, anders null'),
  employmentType: z.string().nullable().optional().describe('Dienstverband type (fulltime/parttime/freelance) indien vermeld, anders null'),
  compensation: compensationSchema.optional().describe('Compensatie en secundaire arbeidsvoorwaarden indien vermeld in de vacature'),
  salaryEstimate: salaryEstimateSchema.optional().describe('AI-inschatting van het marktsalaris voor deze functie'),

  // Fields for fit analysis
  experienceRequired: experienceRequiredSchema.optional().describe('Vereiste werkervaring: jaren en niveau'),
  mustHaveSkills: z.array(z.string()).optional().describe('Skills die EXPLICIET als vereist/must-have worden genoemd (max 10)'),
  niceToHaveSkills: z.array(z.string()).optional().describe('Skills die als "nice to have", "bonus", "pré" of "bij voorkeur" worden genoemd (max 8)'),
  requiredEducation: z.string().nullable().optional().describe('Minimale opleiding indien expliciet vereist'),
  requiredCertifications: z.array(z.string()).optional().describe('Specifieke certificeringen die als vereist worden genoemd'),
});

function buildParsePrompt(rawText: string): string {
  return `Je bent een expert in het analyseren van vacatureteksten. Extraheer wat letterlijk in de tekst staat — niets meer.

${getCurrentDateContext('nl')}

## KERNREGEL — VERZIN NIETS

Extraheer ALLEEN wat de vacaturetekst expliciet noemt. Leid niets af uit functietitel, vergelijkbare vacatures uit je trainingsdata, of context.

- Lege array of \`null\` is een geldig (en vaak correct) antwoord. Liever leeg dan verzonnen.
- Werktools ("we gebruiken Slack/Jira/X"), teamcultuur en "over ons"-info zijn GEEN eisen aan de kandidaat.
- "Pré", "bonus", "bij voorkeur", "wenselijk", "is een plus" → nice-to-have, NIET must-have.
- Must-have-signalen: "vereist", "minimaal", "must have", "noodzakelijk", "essentieel", "je hebt aantoonbare ervaring met", of vermelding onder kop "Eisen" / "Wat wij vragen" / "Functie-eisen".
- **experienceRequired**: ALLEEN invullen als er LETTERLIJKE jaren in de tekst staan. Geen letterlijke jaren → \`null\` voor het hele veld. Leid GEEN jaren af uit "Senior" / "Lead" in de titel of uit seniority-taal.
- **requiredEducation** / **requiredCertifications**: alleen als expliciet vereist, niet bij "bij voorkeur".
- **salaryEstimate**: jouw inschatting van het marktsalaris (NL, jaarbasis, EUR) op basis van functietitel, sector en locatie. Geef confidence aan en onderbouw kort.

Vul alle overige velden volgens de beschrijvingen in het schema. Bij twijfel: leeg/null.

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
  model: string
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
      normalize: (raw) => normalizeJobVacancy(raw, rawText),
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
function normalizeJobVacancy(rawInput: unknown, rawText: string): JobVacancy {
  type RawShape = Partial<JobVacancy> & { data?: Partial<JobVacancy> };
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

  return {
    title: raw.title ?? '',
    company: raw.company ?? null,
    description: raw.description ?? '',
    requirements: raw.requirements ?? [],
    keywords: raw.keywords ?? [],
    industry: raw.industry ?? undefined,
    location: raw.location ?? undefined,
    employmentType: raw.employmentType ?? undefined,
    compensation: raw.compensation ?? undefined,
    salaryEstimate: raw.salaryEstimate ?? undefined,
    experienceRequired: raw.experienceRequired ?? undefined,
    mustHaveSkills: raw.mustHaveSkills ?? [],
    niceToHaveSkills: raw.niceToHaveSkills ?? [],
    requiredEducation: raw.requiredEducation ?? undefined,
    requiredCertifications: raw.requiredCertifications ?? [],
    rawText,
  };
}
