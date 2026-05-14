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

## Klachtcategorieën — koppel de klacht aan één of meer hieronder

**A. Hallucinatie in CV** — gebruiker meldt iets dat in de CV staat maar NIET in het bronprofiel.
→ Check: staat dat element echt in de CV? Staat het echt NIET in het bronprofiel?
→ Beide ja → APPROVE (terecht, CV moet opnieuw zonder die hallucinatie).
→ Eén van beide nee → REJECT (geen daadwerkelijke hallucinatie).

**B. Ontbrekend element** — gebruiker meldt dat iets ontbreekt in de CV dat WEL in het bronprofiel staat.
→ Check: staat het in het bronprofiel? Ontbreekt het echt in de CV?
→ Beide ja → APPROVE.
→ Element staat niet in profiel → REJECT (zou hallucinatie veroorzaken bij regeneratie).
→ Staat wel in CV, gebruiker zag het over het hoofd → REJECT (met vriendelijke verwijzing).

**C. Mismatch met vacature** — gebruiker meldt dat de CV niet aansluit op de vacature.
→ Check: noemt de vacature dit aspect echt? Mist de CV het daadwerkelijk?
→ Concrete mismatch op vacature-eis → APPROVE.
→ Vage smaakklacht zonder verband met vacature → REJECT.

**D. Verkeerde toon / stijl** — gebruiker wil andere uitstraling.
→ De gebruiker kiest het nieuwe creativity-level zelf — dat is HUN keuze. Beoordeel niet of die keuze verstandig is.
→ Zolang de klacht enige onderbouwing heeft ("te conservatief voor een creatief bureau", "te zakelijk voor een startup"), is APPROVE prima.
→ Puur "ik vind hem niet mooi" zonder enige onderbouwing → REJECT.

**E. Feitelijke fout** — datum verkeerd, bedrijfsnaam fout, opleiding verkeerd weergegeven.
→ Check: klopt de klacht echt? Vergelijk CV met bronprofiel.
→ Klopt → APPROVE.
→ Klopt niet → REJECT.

## Algemene principes

- **Bij echte twijfel: APPROVE.** Een terechte regen kost niets extra; een afgekeurde terechte klacht frustreert de gebruiker. Wees pro-user.
- **MAAR**: een afkeer-klacht zonder enige onderbouwing rechtvaardigt geen credit-kostende regen. Reject die.
- **Een dispute mag niet leiden tot een grotere hallucinatie.** Als de gebruiker vraagt om iets toe te voegen dat niet in het profiel staat, is REJECT correct — anders maak je de CV juist erger.

## Rationale — schrijfregels

- 1–3 zinnen, in dezelfde taal als de klacht.
- Wees concreet: noem het element. "Je opmerking over X klopt: in je profiel staat Y, maar in de CV is dat als Z weergegeven."
- Bij REJECT: leg vriendelijk uit waarom de CV volgens jou wél klopt of waarom de klacht niet bij een terechte regen past. Niet betuttelend.
- Bij APPROVE: kort bevestigen wat verbeterd gaat worden.
- Natuurlijk Nederlands, formele "u" of "je" — match wat de gebruiker zelf gebruikte in de klacht.`;
}

function buildUserPrompt(input: GatekeeperInput): string {
  const { userReason, currentLevel, requestedLevel, content, profile, jobVacancy } = input;

  // Full profile context (no slicing). The gatekeeper needs the full picture
  // to verify hallucination/missing-element claims accurately.
  const experienceLines = profile.experience.map((exp) => {
    const period = `${exp.startDate}${exp.endDate ? ` – ${exp.endDate}` : ' – heden'}`;
    const desc = exp.description ? `\n      ${exp.description}` : '';
    return `  - **${exp.title}** at ${exp.company} (${period})${desc}`;
  }).join('\n');

  const educationLines = profile.education.length > 0
    ? profile.education.map(e => `  - ${e.degree || ''}${e.fieldOfStudy ? ` ${e.fieldOfStudy}` : ''} @ ${e.school} (${e.startYear || ''}${e.endYear ? ` – ${e.endYear}` : ''})`).join('\n')
    : '  (geen opleidingen in profiel)';

  const profileSummary = `
Naam: ${profile.fullName}
Headline: ${profile.headline || '—'}
${profile.about ? `About: ${profile.about}` : ''}

Werkervaringen (${profile.experience.length}):
${experienceLines}

Opleidingen (${profile.education.length}):
${educationLines}

Skills uit profiel: ${profile.skills.map(s => s.name).join(', ') || '(geen)'}
Certificeringen: ${profile.certifications.map(c => c.name).join(', ') || '(geen)'}
Talen: ${profile.languages.map(l => l.language).join(', ') || '(geen)'}
${profile.projects && profile.projects.length > 0 ? `Projecten: ${profile.projects.map(p => p.title).join(', ')}` : ''}
`.trim();

  const jobSummary = jobVacancy
    ? `
Functietitel: ${jobVacancy.title}
Bedrijf: ${jobVacancy.company || '—'}
Industrie: ${jobVacancy.industry || '—'}
${jobVacancy.description ? `Omschrijving: ${jobVacancy.description}` : ''}
Must-have skills: ${jobVacancy.mustHaveSkills?.join(', ') || '(geen)'}
Nice-to-have skills: ${jobVacancy.niceToHaveSkills?.join(', ') || '(geen)'}
Keywords: ${jobVacancy.keywords.join(', ') || '(geen)'}
`.trim()
    : 'Geen vacature gekoppeld.';

  // Full CV content (no slicing). User complaints often reference specific
  // bullets that would otherwise be missed.
  const cvExperienceLines = content.experience.map((e, i) => {
    const bullets = e.highlights && e.highlights.length > 0
      ? '\n' + e.highlights.map(h => `        • ${h}`).join('\n')
      : (e.description ? `\n        ${e.description}` : '');
    return `  ${i + 1}. ${e.title} @ ${e.company} (${e.period})${bullets}`;
  }).join('\n');

  const cvSummary = `
Headline: ${content.headline}
Samenvatting: ${content.summary}

Ervaringen (${content.experience.length}):
${cvExperienceLines}

Skills in CV:
  Technical: ${content.skills.technical.join(', ')}
  Soft: ${content.skills.soft.join(', ')}

Opleidingen in CV:
${content.education.length > 0 ? content.education.map(e => `  - ${e.degree} @ ${e.institution} (${e.year})`).join('\n') : '  (geen)'}

Certificeringen in CV: ${content.certifications.join(', ') || '(geen)'}
Talen in CV: ${content.languages.map(l => `${l.language} (${l.level})`).join(', ') || '(geen)'}
${content.projects && content.projects.length > 0 ? `Projecten in CV: ${content.projects.map(p => p.title).join(', ')}` : ''}
`.trim();

  return `De gebruiker heeft een dispute ingediend over hun CV.

## Klacht van de gebruiker
"${userReason}"

## Context
- Huidige stijl-niveau: ${currentLevel}
- Aangevraagd nieuw stijl-niveau: ${requestedLevel}

## Bronprofiel (de waarheid — alles wat hierin staat is "echt")
${profileSummary}

## Doelvacature
${jobSummary}

## Huidige CV-inhoud (wat de gebruiker nu ziet)
${cvSummary}

Beoordeel de klacht via de categorieën uit het systeembericht (A t/m E).
Vergelijk waar nodig CV met bronprofiel om hallucinatie- of missing-claims te verifiëren.
Geef je verdict ('approved' of 'rejected') en een korte, concrete rationale voor de gebruiker.`;
}
