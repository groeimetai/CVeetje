import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import type { JobVacancy, LLMProvider, TokenUsage } from '@/types';

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
