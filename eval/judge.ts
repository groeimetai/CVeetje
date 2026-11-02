/**
 * LLM-judge met een vaste rubric. Krijgt het bronprofiel, de vacature en de
 * output, en beoordeelt op 1-5 per dimensie met concrete voorbeelden.
 */
import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider } from '../src/lib/ai/providers';
import type { GeneratedCVContent, ParsedLinkedIn } from '../src/types';

const Score = z.object({
  score: z.number().min(1).max(5),
  evidence: z.array(z.string()).describe('Concrete citaten/voorbeelden uit de output die de score onderbouwen'),
});

export const JudgeSchema = z.object({
  honesty: Score.describe('Alles in het CV is herleidbaar tot het profiel; niets verzonnen (cijfers, tools, verantwoordelijkheden, resultaten).'),
  relevance: Score.describe('Het CV legt de nadruk op wat de vacature vraagt, zonder irrelevante opvulling.'),
  readability: Score.describe('Helder, concreet, natuurlijke taal in de gevraagde taal; geen AI-clichés of wolligheid.'),
  ats: Score.describe('Standaard sectienamen, functietitels en keywords uit de vacature komen letterlijk terug waar terecht.'),
  letter: Score.optional().describe('Motivatiebrief: persoonlijk, specifiek voor bedrijf/rol, geen herhaling van het CV, juiste toon en taal.'),
  topIssues: z.array(z.string()).describe('De 3 belangrijkste verbeterpunten, concreet.'),
});

export async function judgeCase(input: {
  apiKey: string;
  model: string;
  profile: ParsedLinkedIn;
  vacancyText: string | null;
  content: GeneratedCVContent;
  letter: string | null;
  lang: 'nl' | 'en';
}) {
  const provider = createAIProvider('anthropic', input.apiKey);
  const { object } = await generateObject({
    model: provider(input.model),
    schema: JudgeSchema,
    system:
      'Je bent een strenge, ervaren recruiter en CV-reviewer. Beoordeel objectief en kritisch. Een 5 is uitzonderlijk; een 3 is "acceptabel maar duidelijk verbeterbaar". Elke verzonnen claim betekent maximaal 2 op honesty.',
    prompt: [
      `Taal van het CV: ${input.lang === 'nl' ? 'Nederlands' : 'Engels'}`,
      '## Bronprofiel (enige toegestane bron van feiten)',
      JSON.stringify(input.profile, null, 2),
      '## Vacature',
      input.vacancyText ?? '(geen vacature — algemeen CV)',
      '## Gegenereerd CV',
      JSON.stringify(input.content, null, 2),
      input.letter ? `## Motivatiebrief\n${input.letter}` : '',
    ].join('\n\n'),
  });
  return object;
}
