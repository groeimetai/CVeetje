/**
 * Gedeelde EN/NL taal-instructies voor AI-content-generators.
 *
 * Vervangt de gedupliceerde EN/NL conditionals die voorheen in cv-generator,
 * motivation-generator, style-generator-v2, template-analyzer en
 * docx-content-replacer apart leefden.
 *
 * `intro` is een korte rol-positionering die elke generator als eerste regel
 * van zijn prompt kan gebruiken. `outputNote` is de strikte instructie over
 * de output-taal, gericht aan de LLM.
 */

import type { OutputLanguage } from '@/types';

export interface LanguageInstruction {
  intro: string;
  outputNote: string;
}

export const languageInstructions: Record<OutputLanguage, LanguageInstruction> = {
  en: {
    intro: 'You are an expert CV writer. Create a professional, tailored CV based on the following profile data.',
    outputNote: 'Write ALL output in English. Use professional English language appropriate for CVs.',
  },
  nl: {
    intro: 'Je bent een expert CV-schrijver. Maak een professionele, op maat gemaakte CV op basis van de volgende profielgegevens.',
    outputNote: `Write ALL output in Dutch (Nederlands). Use professional Dutch language appropriate for CVs.
Examples of Dutch CV language:
- "Verantwoordelijk voor" → "Leidde" or "Beheerde"
- "Worked on" → "Werkte aan"
- "Led a team" → "Leidde een team van"
- "Increased" → "Verhoogde" or "Groeide"
- "Implemented" → "Implementeerde"
- "Developed" → "Ontwikkelde"`,
  },
};

/**
 * Helper voor generators die alleen de outputNote nodig hebben.
 */
export function getOutputLanguageNote(language: OutputLanguage): string {
  return languageInstructions[language].outputNote;
}
