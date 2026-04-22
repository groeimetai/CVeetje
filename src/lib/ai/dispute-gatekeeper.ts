/**
 * Dispute Gatekeeper
 *
 * When a user claims a CV is "wrong", we don't want to blindly regenerate.
 * Sometimes the user is genuinely right (AI hallucinated, missed a field,
 * styled poorly for the industry). Sometimes the user just doesn't like it
 * but the CV is actually fine — no amount of regeneration will help then,
 * and we'd burn credits for nothing.
 *
 * The gatekeeper is a single LLM call that reviews:
 * - The user's written complaint (min 20 chars)
 * - The CV content (summary, experience, education, skills)
 * - The target job (if any)
 * - The source profile data
 *
 * Returns a verdict ('approved' = user is right, regenerate; 'rejected' =
 * CV is fine, don't regenerate) plus a short rationale shown to the user.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import { resolveTemperature } from './temperature';
import { withRetry } from './retry';
import type {
  GeneratedCVContent,
  JobVacancy,
  ParsedLinkedIn,
  LLMProvider,
  TokenUsage,
  StyleCreativityLevel,
} from '@/types';

const verdictSchema = z.object({
  verdict: z.enum(['approved', 'rejected']).describe(
    'approved = the user has a legitimate point and the CV should be regenerated. ' +
    'rejected = the CV is actually fine and the complaint does not warrant regeneration.',
  ),
  rationale: z.string().describe(
    'One to three short sentences explaining the decision to the user. ' +
    'Be direct and specific. Refer to concrete elements of the CV/complaint. ' +
    'Written in the same language as the user reason.',
  ),
});

export interface GatekeeperInput {
  userReason: string;
  currentLevel: StyleCreativityLevel;
  requestedLevel: StyleCreativityLevel;
  content: GeneratedCVContent;
  profile: ParsedLinkedIn;
  jobVacancy: JobVacancy | null;
}

export interface GatekeeperResult {
  verdict: 'approved' | 'rejected';
  rationale: string;
  usage: TokenUsage;
}

export async function runDisputeGatekeeper(
  input: GatekeeperInput,
  provider: LLMProvider,
  apiKey: string,
  model: string,
): Promise<GatekeeperResult> {
  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  try {
    const result = await withRetry(() =>
      generateObject({
        model: aiProvider(modelId),
        schema: verdictSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: resolveTemperature(provider, modelId, 0.2),
      }),
    );

    return {
      verdict: result.object.verdict,
      rationale: result.object.rationale,
      usage: {
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
      },
    };
  } catch (error) {
    // If the gatekeeper itself fails we err on the side of the user:
    // approve the dispute. This is the safer default — we'd rather
    // regenerate an okay CV than leave a genuinely broken one.
    console.error('[Dispute Gatekeeper] LLM call failed, defaulting to approved:', error);
    return {
      verdict: 'approved',
      rationale: 'Automatische beoordeling mislukte — je dispute wordt automatisch goedgekeurd en de CV wordt opnieuw gegenereerd.',
      usage: { promptTokens: 0, completionTokens: 0 },
    };
  }
}

function buildSystemPrompt(): string {
  return `Je bent een onafhankelijke beoordelaar van CV-klachten. Een gebruiker
heeft gevraagd om een CV opnieuw te laten genereren omdat er volgens hen iets
mis is. Jouw taak is om objectief te beoordelen of de klacht terecht is.

BEOORDELINGSCRITERIA:

Approve (dispute TERECHT) als:
- De klacht wijst op een concrete, verifieerbare fout in de CV (datum ontbreekt,
  bedrijfsnaam verkeerd, skill staat er niet in terwijl die in het profiel zit,
  ervaring mist, samenvatting bevat hallucinatie, etc.)
- De klacht wijst op een mismatch tussen de CV en de vacature (belangrijke
  vacature-eis wordt niet benoemd, verkeerde toon voor de branche, etc.)
- De klacht wijst op een duidelijke fout in de structuur/weergave
- Een andere stijl zou aantoonbaar beter passen bij de vacature dan de huidige
- Je twijfelt: approve (we kiezen voor de gebruiker, regeneratie is gratis)

Reject (dispute NIET TERECHT) als:
- De klacht is puur subjectief zonder specifieke onderbouwing
  ("ik vind hem niet mooi", "ik heb er niks mee")
- De klacht wijst op iets wat EIGENLIJK GOED is in de CV
- De klacht probeert iets toe te voegen wat niet in het bronprofiel staat
  (zou hallucinatie veroorzaken in de nieuwe versie)
- De klacht is onduidelijk/onverstaanbaar

Stijl-keuze van de gebruiker:
- De gebruiker kiest zelf welk creativity level ze willen bij regeneratie.
  Dit is HUN keuze — jij beoordeelt niet of die keuze verstandig is, alleen
  of de KLACHT terecht is.

Rationale:
- Houd het kort (1-3 zinnen). Wees specifiek: noem het element waar je naar
  kijkt. Schrijf in dezelfde taal als de klacht zelf.
- Bij reject: leg uit WAAROM de CV volgens jou wél klopt, zodat de gebruiker
  begrijpt waarom de dispute is afgewezen.`;
}

function buildUserPrompt(input: GatekeeperInput): string {
  const { userReason, currentLevel, requestedLevel, content, profile, jobVacancy } = input;

  const profileSummary = `
Naam: ${profile.fullName}
Headline: ${profile.headline || '—'}
${profile.experience.length} werkervaringen, ${profile.education.length} opleidingen
Skills uit profiel: ${profile.skills.slice(0, 15).map(s => s.name).join(', ')}
`.trim();

  const jobSummary = jobVacancy
    ? `
Functietitel: ${jobVacancy.title}
Bedrijf: ${jobVacancy.company || '—'}
Industrie: ${jobVacancy.industry || '—'}
Keywords: ${jobVacancy.keywords.slice(0, 10).join(', ')}
Must-have skills: ${jobVacancy.requirements.slice(0, 5).join(', ')}
`.trim()
    : 'Geen vacature gekoppeld.';

  const cvSummary = `
Samenvatting: ${content.summary.slice(0, 400)}
Ervaringen (${content.experience.length}):
${content.experience.slice(0, 4).map((e, i) =>
  `  ${i + 1}. ${e.title} @ ${e.company} (${e.period}) — ${e.highlights?.slice(0, 2).join(' | ') || e.description?.slice(0, 120) || ''}`
).join('\n')}
Skills in CV: technical=${content.skills.technical.slice(0, 10).join(', ')}; soft=${content.skills.soft.slice(0, 6).join(', ')}
Opleidingen: ${content.education.map(e => `${e.degree} @ ${e.institution} (${e.year})`).join('; ')}
`.trim();

  return `De gebruiker heeft een dispute ingediend over hun CV.

## Klacht van de gebruiker
"${userReason}"

## Context
- Huidige stijl-niveau: ${currentLevel}
- Aangevraagd nieuw stijl-niveau: ${requestedLevel}

## Bronprofiel
${profileSummary}

## Doelvacature
${jobSummary}

## Huidige CV-inhoud
${cvSummary}

Beoordeel of de klacht terecht is. Geef je verdict ('approved' of 'rejected')
en een korte rationale voor de gebruiker.`;
}
