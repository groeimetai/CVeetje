import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
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

// Schema for parsed job vacancy
const jobVacancySchema = z.object({
  title: z.string().describe('De functietitel/job title'),
  company: z.string().nullable().describe('Bedrijfsnaam indien vermeld, anders null'),
  description: z.string().describe('Korte samenvatting van de functie in max 200 woorden'),
  requirements: z.array(z.string()).describe('Belangrijkste vereisten en kwalificaties (max 10 items)'),
  keywords: z.array(z.string()).describe('Relevante skills, technologieën en trefwoorden (max 15 items)'),
  industry: z.string().nullable().describe('Sector/industrie indien af te leiden, anders null'),
  location: z.string().nullable().describe('Werklocatie indien vermeld, anders null'),
  employmentType: z.string().nullable().describe('Dienstverband type (fulltime/parttime/freelance) indien vermeld, anders null'),
  compensation: compensationSchema.describe('Compensatie en secundaire arbeidsvoorwaarden indien vermeld in de vacature'),
  salaryEstimate: salaryEstimateSchema.describe('AI-inschatting van het marktsalaris voor deze functie, gebaseerd op functie, locatie, industrie en ervaringsniveau'),
});

function buildParsePrompt(rawText: string): string {
  return `Je bent een expert in het analyseren van vacatureteksten. Analyseer de volgende vacaturetekst en extraheer de belangrijkste informatie.

## Vacaturetekst:

${rawText}

## Instructies:

1. **Titel**: Identificeer de exacte functietitel. Als er meerdere varianten zijn, kies de meest specifieke.

2. **Bedrijf**: Zoek de bedrijfsnaam. Dit kan aan het begin staan, in de tekst, of in een "Over ons" sectie.

3. **Beschrijving**: Maak een korte, krachtige samenvatting (max 200 woorden) van:
   - Wat de functie inhoudt
   - De belangrijkste verantwoordelijkheden
   - De context/afdeling

4. **Vereisten**: Lijst de belangrijkste kwalificaties en vereisten:
   - Vereiste jaren ervaring
   - Diploma's/opleidingen
   - Harde eisen vs. "nice to haves"
   - Selecteer de 8-10 belangrijkste

5. **Keywords**: Identificeer relevante technische skills, tools, en soft skills:
   - Programmeertalen, frameworks, tools
   - Methodieken (Agile, Scrum, etc.)
   - Soft skills die genoemd worden
   - Max 15 keywords

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

Wees accuraat en baseer alles op de tekst. Als informatie niet duidelijk is, geef null terug voor optionele velden.`;
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
  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);

  const prompt = buildParsePrompt(rawText);

  const { object, usage } = await generateObject({
    model: aiProvider(modelId),
    schema: jobVacancySchema,
    prompt,
  });

  return {
    vacancy: {
      ...object,
      rawText, // Preserve original text
    } as JobVacancy,
    usage: {
      promptTokens: usage?.inputTokens ?? 0,
      completionTokens: usage?.outputTokens ?? 0,
    },
  };
}
