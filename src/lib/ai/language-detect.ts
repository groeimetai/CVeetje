/**
 * Lightweight language detection voor vacaturetekst.
 *
 * Doel: bepaal de output-taal voor template-fill (`nl` / `en`) zodat de
 * gebruiker niet handmatig de juiste taal hoeft te kiezen.
 *
 * Strategy: heuristic-first (stopwoord-frequentie) — alleen als die geen
 * duidelijke winnaar oplevert, vertrouwen we op een mini AI-call. Voor de
 * meeste vacatures geeft de heuristiek al een betrouwbaar antwoord.
 */

import type { OutputLanguage } from '@/types';

// High-signal stopwoorden / function words die zelden in de andere taal voorkomen
const NL_MARKERS = new Set([
  'de', 'het', 'een', 'en', 'van', 'om', 'voor', 'met', 'naar', 'zijn',
  'wij', 'jouw', 'onze', 'binnen', 'jaar', 'jaren', 'werken', 'werkzaam',
  'ervaring', 'minimaal', 'minstens', 'als', 'die', 'dat', 'wordt', 'worden',
  'kandidaat', 'functie', 'organisatie', 'bedrijf', 'salaris',
]);

const EN_MARKERS = new Set([
  'the', 'and', 'of', 'to', 'for', 'with', 'in', 'on', 'we', 'our',
  'you', 'your', 'is', 'are', 'will', 'have', 'experience', 'years',
  'within', 'role', 'team', 'company', 'salary', 'requirements',
  'candidate', 'responsibilities', 'qualifications',
]);

const TOKEN_RE = /[a-zà-öø-ÿ']+/giu;
const MIN_TOKENS = 20;
const CONFIDENCE_MARGIN = 0.15;

export interface LanguageDetectionResult {
  language: OutputLanguage;
  confidence: 'high' | 'medium' | 'low';
  source: 'heuristic' | 'unsupported-fallback';
}

/**
 * Detect language from text. Synchronous — no network, no AI call.
 * Falls back to 'nl' (project default) when text is too short or ambiguous.
 */
export function detectLanguageFromText(input: string | null | undefined): LanguageDetectionResult {
  if (!input || input.trim().length < 20) {
    return { language: 'nl', confidence: 'low', source: 'unsupported-fallback' };
  }

  const tokens = input.toLowerCase().match(TOKEN_RE) ?? [];
  if (tokens.length < MIN_TOKENS) {
    return { language: 'nl', confidence: 'low', source: 'unsupported-fallback' };
  }

  let nl = 0;
  let en = 0;
  for (const tok of tokens) {
    if (NL_MARKERS.has(tok)) nl++;
    if (EN_MARKERS.has(tok)) en++;
  }

  const total = nl + en;
  if (total === 0) {
    return { language: 'nl', confidence: 'low', source: 'unsupported-fallback' };
  }

  const nlRatio = nl / total;
  const enRatio = en / total;
  const margin = Math.abs(nlRatio - enRatio);

  const language: OutputLanguage = nlRatio >= enRatio ? 'nl' : 'en';
  const confidence: 'high' | 'medium' | 'low' =
    margin >= 0.5 ? 'high' : margin >= CONFIDENCE_MARGIN ? 'medium' : 'low';

  return { language, confidence, source: 'heuristic' };
}
