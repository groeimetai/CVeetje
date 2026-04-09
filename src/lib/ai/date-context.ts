/**
 * Current date context for AI prompts.
 *
 * LLMs don't know the real current date — they anchor on their training
 * cutoff. That causes subtle bugs in every prompt that reasons about
 * time: "Present" experience dates get calculated against the model's
 * cutoff year instead of today, so a profile with "2022 – Present" reads
 * as 3 years of experience when it's actually 4+, and the fit analyzer
 * then reports a year gap that doesn't exist.
 *
 * Fix: explicitly tell the model today's date and instruct it to anchor
 * all time calculations on that date, not its training knowledge.
 *
 * Inject the output of getCurrentDateContext() near the top of any
 * prompt that computes "years of X" or interprets relative terms like
 * "heden", "Present", "Current", "starting next month".
 */

type DateContextLanguage = 'nl' | 'en';

/**
 * Build a date-context block to prepend to AI prompts.
 *
 * @param language  The output language of the caller. Defaults to 'nl'
 *                  since that's the app default.
 */
export function getCurrentDateContext(language: DateContextLanguage = 'nl'): string {
  const now = new Date();
  const iso = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const year = now.getFullYear();
  const locale = language === 'nl' ? 'nl-NL' : 'en-US';
  const monthName = now.toLocaleDateString(locale, { month: 'long' });

  if (language === 'nl') {
    return `## Huidige datum (CRITICAL — anchor voor alle tijdberekeningen)

Vandaag is het **${iso}** (${monthName} ${year}).

Gebruik deze datum als de enige referentie voor ALLE tijdberekeningen.
Jouw eigen training cutoff is NIET "nu" — gebruik altijd bovenstaande
datum.

Specifiek:
- Wanneer een profielervaring loopt tot "heden", "Present", "Current",
  of een lege einddatum heeft, betekent dat de rol loopt tot
  **${iso}**. Bereken jaren ervaring door de startdatum af te trekken
  van **${iso}**, niet van een eerdere datum.
- Wanneer een vacature refereert aan "startend per", "per [maand]",
  "vanaf volgende maand" etc., interpreteer dat ten opzichte van
  **${iso}**.
- Als je in de redenatie een jaar moet noemen ("X jaar ervaring" /
  "Y jaar werkzaam"), reken dan tegen **${iso}**.`;
  }

  return `## Current date (CRITICAL — anchor for all time calculations)

Today is **${iso}** (${monthName} ${year}).

Use this date as the sole reference for ALL time calculations. Your own
training cutoff is NOT "now" — always use the date above.

Specifically:
- When a profile experience runs to "Present", "Current", "heden", or
  has an empty end date, it means the role runs until **${iso}**.
  Calculate years of experience by subtracting the start date from
  **${iso}**, not from an earlier date.
- When a vacancy references "starting in", "from next month", "as of",
  interpret those relative to **${iso}**.
- When your reasoning mentions a year count ("X years of experience" /
  "Y years working in"), compute against **${iso}**.`;
}
