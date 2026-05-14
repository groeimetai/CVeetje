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
const experienceRequiredSchema = z.object({
  minYears: z.number().describe('Minimum aantal jaren ervaring dat gevraagd wordt (0 als niet gespecificeerd of "starter")'),
  maxYears: z.number().nullable().describe('Maximum aantal jaren ervaring indien gespecificeerd (bijv. bij "3-5 jaar"), anders null'),
  level: z.enum(['junior', 'medior', 'senior', 'lead', 'executive']).describe('Het ervaringsniveau dat gevraagd wordt, gebaseerd op taalgebruik en jaren'),
  isStrict: z.boolean().describe('Is de ervaring eis strikt vermeld (bijv. "minimaal 5 jaar vereist") of flexibel (bijv. "bij voorkeur ervaring met")?'),
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
  return `Je bent een expert in het analyseren van vacatureteksten. Analyseer de volgende vacaturetekst en extraheer de belangrijkste informatie.

${getCurrentDateContext('nl')}

## KERNREGEL — LEES EERST

**Verzin niets.** Extraheer ALLEEN wat letterlijk in de vacaturetekst staat.

- Als een skill, eis, opleiding of certificering niet expliciet wordt genoemd, neem hem NIET op. Punt.
- Beter een lege array dan een verzonnen item. \`mustHaveSkills: []\` is een geldig en vaak correct antwoord.
- Leid GEEN must-haves af uit context. "We werken in een Agile team" betekent NIET dat Agile een must-have skill is — het beschrijft de werkcultuur, niet een eis aan de kandidaat.
- "We gebruiken Slack/Jira/Confluence" → werktool, GEEN must-have skill.
- "Kennis van X is een pré/bonus/wenselijk" → nice-to-have, NIET must-have.
- "Bij voorkeur ervaring met..." → nice-to-have, NIET must-have.

De meest gemaakte fout is het opblazen van vacature-eisen. Wees daar bewust van.

## Vacaturetekst:

${rawText}

## Instructies:

1. **Titel**: Identificeer de exacte functietitel. Als er meerdere varianten zijn, kies de meest specifieke.

2. **Bedrijf**: Zoek de bedrijfsnaam. Dit kan aan het begin staan, in de tekst, of in een "Over ons" sectie.

3. **Beschrijving**: Maak een korte, krachtige samenvatting (max 200 woorden) van:
   - Wat de functie inhoudt
   - De belangrijkste verantwoordelijkheden
   - De context/afdeling

4. **Vereisten** (\`requirements\`): Letterlijk genoemde kwalificaties en eisen.
   - Neem ALLEEN op wat de vacature expliciet als eis of kwalificatie noemt
   - Geen verzonnen items om de lijst te vullen
   - Als de vacature kort is en weinig eisen noemt, mag de lijst kort zijn (3 items prima)
   - Maximum 10 items, geen minimum

5. **Keywords**: Identificeer relevante technische skills, tools, en soft skills die LETTERLIJK in de vacature staan:
   - Programmeertalen, frameworks, tools (alleen genoemd)
   - Methodieken (Agile, Scrum, etc.) alleen als ze expliciet vermeld worden
   - Soft skills die genoemd worden
   - Max 15 keywords, geen minimum

6. **Industrie**: Leid af in welke sector het bedrijf opereert (tech, finance, healthcare, retail, etc.)

7. **Locatie**: Zoek naar werklocatie, inclusief remote/hybrid opties

8. **Type**: Bepaal of het fulltime, parttime, freelance, of een andere vorm betreft

9. **Compensatie & Benefits**: Zoek naar alle informatie over:
   - Salaris/salarisrange (converteer naar jaarlijkse basis indien mogelijk)
   - Secundaire arbeidsvoorwaarden zoals:
     * Pensioenregeling
     * Auto van de zaak / mobiliteitsbudget
     * Laptop/telefoon
     * Thuiswerk/hybride werken mogelijkheden
     * Opleidingsbudget / persoonlijke ontwikkeling
     * Vakantiedagen (extra)
     * Bonus/winstdeling
     * Reiskostenvergoeding
     * Sportschool/fitness
     * Verzekeringen
     * Flexibele werktijden
     * Sabbatical mogelijkheden
   - Bonus structuur indien vermeld
   - Overige arbeidsvoorwaarden

10. **Salaris Inschatting (AI Analyse)**: Maak een gefundeerde inschatting van het marktsalaris:
   - Schat het ervaringsniveau (junior/medior/senior/lead/executive) op basis van de vereisten
   - Geef een realistische salaris range voor Nederland (jaarbasis, EUR)
   - Houd rekening met: functietitel, industrie, locatie, vereiste ervaring, schaarsheid van skills
   - Typische ranges per niveau (2024 NL):
     * Junior (0-2 jaar): €30.000-€45.000
     * Medior (2-5 jaar): €45.000-€65.000
     * Senior (5-10 jaar): €65.000-€90.000
     * Lead (8+ jaar): €85.000-€120.000
     * Executive: €100.000-€180.000+
   - Tech/Finance/Consulting betaalt vaak 10-30% boven gemiddelde
   - Amsterdam/Randstad betaalt ~10% meer dan rest van NL
   - Geef een betrouwbaarheidsniveau (low/medium/high)
   - Onderbouw je schatting met concrete factoren
   - Geef marktinzicht: is dit een schaarse skill? Groeiende sector?

11. **Ervaringsvereisten (Fit Analyse)**: Analyseer de gevraagde werkervaring:
   - Zoek naar expliciete jaren ervaring (bijv. "5+ jaar", "minimaal 3 jaar", "3-5 jaar ervaring")
   - Bepaal het niveau: junior (0-2), medior (2-5), senior (5-10), lead (8+), executive
   - Let op sleutelwoorden: "starter", "ervaren", "senior", "expert", "lead", "principal"
   - Markeer of de eis strikt is ("vereist", "minimaal") of flexibel ("bij voorkeur", "liefst")

12. **Must-Have Skills** — STRIKT:

    Een skill mag ALLEEN als must-have als de vacaturetekst hem koppelt aan een van deze signaalwoorden:
    - "vereist", "must have", "noodzakelijk", "essentieel"
    - "je hebt minimaal X jaar ervaring met..."
    - "je beschikt over...", "je hebt aantoonbare ervaring met..."
    - "wij verwachten dat je..."
    - Genoemd onder kop "Eisen", "Wat wij vragen", "Functie-eisen"

    Dit zijn NIET must-haves (ook niet als de skill ergens in de tekst staat):
    - "Pré", "bonus", "plus", "wenselijk", "bij voorkeur" → nice-to-have
    - "Kennis van X is een voordeel" → nice-to-have
    - "We werken met X" / "Ons team gebruikt X" → werktool, GEEN must-have skill
    - "Ervaring met X is een plus" → nice-to-have
    - Genoemd in "Wat bieden wij" of "Over het team" sectie → meestal geen eis

    Bij twijfel: GEEN must-have. Liever lege array dan verzonnen items.
    Max 10 items, geen minimum.

13. **Nice-to-Have Skills**: Bonus-skills die de tekst expliciet als optioneel/wenselijk markeert.
    - Signaalwoorden: "pré", "bonus", "bij voorkeur", "wenselijk", "ervaring met X is een plus", "kennis van Y is een voordeel"
    - Max 8 items, geen minimum

14. **Opleiding & Certificeringen**:
    - requiredEducation: ALLEEN invullen als de tekst expliciet zegt "HBO vereist" / "WO-niveau" / "Master in X". Niet bij "bij voorkeur HBO".
    - requiredCertifications: Alleen wat expliciet als vereist (niet wenselijk/pré) genoemd wordt.

## Anti-hallucinatie checklist

Voor elk item dat je in mustHaveSkills, niceToHaveSkills, requiredCertifications of requirements zet, vraag jezelf af:
- Staat dit LETTERLIJK in de vacaturetekst? (Niet afgeleid, niet aangenomen.)
- Welk signaalwoord uit de tekst koppelt dit aan deze categorie?

Als je het signaalwoord niet kunt aanwijzen, hoort het item daar niet. Liever leeg dan vol.

Wees accuraat en baseer alles op de letterlijke tekst. Geef null terug voor optionele velden waarvoor de tekst geen evidence heeft.`;
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
