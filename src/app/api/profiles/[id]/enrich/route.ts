import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/encryption';
import { createAIProvider } from '@/lib/ai/providers';
import type {
  ParsedLinkedIn,
  LinkedInExperience,
  LinkedInEducation,
  LinkedInSkill,
  LinkedInCertification,
  LinkedInProject,
  TokenUsage,
} from '@/types';

// ============================================================================
// Schema
// ============================================================================
// Anthropic structured-output vereist dat alle velden aanwezig zijn. Voor
// updates gebruiken we daarom empty-string-keep semantiek: een lege waarde
// betekent "behoud bestaande waarde", een niet-lege waarde "overschrijf".
// `isCurrentRole` is een tri-state enum omdat een boolean geen "keep" kent.

const updateExperienceSchema = z.object({
  targetIndex: z.number().int().min(0).describe('0-based index in the existing experience list'),
  targetIdentifier: z.string().min(1).describe('REQUIRED, non-empty. Identifier of the item being updated, exact format: "{currentTitle} @ {currentCompany}" — copied verbatim from the profile listing. Used to verify the right item is targeted.'),
  title: z.string().describe('New job title, empty string to keep existing'),
  company: z.string().describe('New company name, empty string to keep existing'),
  location: z.string().describe('New location, empty string to keep existing'),
  startDate: z.string().describe('New start date, empty string to keep existing'),
  endDate: z.string().describe('New end date, empty string to keep existing'),
  description: z.string().describe('New description, empty string to keep existing'),
  isCurrentRole: z.enum(['true', 'false', 'keep']).describe('Whether this is the current role. Use "keep" if the user input doesn\'t mention it.'),
});

const updateEducationSchema = z.object({
  targetIndex: z.number().int().min(0),
  targetIdentifier: z.string().min(1).describe('REQUIRED, non-empty. Format: "{currentDegree} @ {currentSchool}"'),
  school: z.string().describe('Empty string to keep existing'),
  degree: z.string().describe('Empty string to keep existing'),
  fieldOfStudy: z.string().describe('Empty string to keep existing'),
  startYear: z.string().describe('Empty string to keep existing'),
  endYear: z.string().describe('Empty string to keep existing'),
});

const updateSkillSchema = z.object({
  targetIndex: z.number().int().min(0),
  targetIdentifier: z.string().min(1).describe('REQUIRED, non-empty. Current skill name verbatim.'),
  name: z.string().min(1).describe('New skill name (cannot be empty for a skill update)'),
});

const updateCertificationSchema = z.object({
  targetIndex: z.number().int().min(0),
  targetIdentifier: z.string().min(1).describe('REQUIRED, non-empty. Format: "{currentName} @ {currentIssuer}"'),
  name: z.string().describe('Empty string to keep existing'),
  issuer: z.string().describe('Empty string to keep existing'),
  issueDate: z.string().describe('Empty string to keep existing'),
});

const updateProjectSchema = z.object({
  targetIndex: z.number().int().min(0),
  targetIdentifier: z.string().min(1).describe('REQUIRED, non-empty. Current project title verbatim.'),
  title: z.string().describe('Empty string to keep existing'),
  description: z.string().describe('Empty string to keep existing'),
  technologies: z.array(z.string()).describe('Empty array to keep existing technologies, non-empty replaces the entire list'),
  url: z.string().describe('Empty string to keep existing'),
  startDate: z.string().describe('Empty string to keep existing'),
  endDate: z.string().describe('Empty string to keep existing'),
  role: z.string().describe('Empty string to keep existing'),
});

const enrichmentSchema = z.object({
  // Top-level fields (already supported)
  headline: z.string().nullable().describe('Updated headline, null to keep existing'),
  about: z.string().nullable().describe('Updated about section, null to keep existing'),

  // ADDS
  newExperience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      location: z.string().describe('Empty string if not specified'),
      startDate: z.string(),
      endDate: z.string().describe('Empty string if current'),
      description: z.string(),
      isCurrentRole: z.boolean(),
    })
  ).describe('NEW work experience entries — only if the user describes a position that does not already exist in the profile'),
  newEducation: z.array(
    z.object({
      school: z.string(),
      degree: z.string().describe('Empty string if not specified'),
      fieldOfStudy: z.string().describe('Empty string if not specified'),
      startYear: z.string().describe('Empty string if not specified'),
      endYear: z.string().describe('Empty string if not specified'),
    })
  ).describe('NEW education entries'),
  newSkills: z.array(z.object({ name: z.string() })).describe('NEW skills (avoid duplicates)'),
  newCertifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().describe('Empty string if not specified'),
      issueDate: z.string().describe('Empty string if not specified'),
    })
  ).describe('NEW certifications'),
  newProjects: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      url: z.string().describe('Empty string if not specified'),
      startDate: z.string().describe('Empty string if not specified'),
      endDate: z.string().describe('Empty string if not specified'),
      role: z.string().describe('Empty string if not specified'),
    })
  ).describe('NEW projects'),
  newInterests: z.array(z.string()).describe('NEW interests/hobbies — only when the user explicitly mentions a hobby or interest (e.g. "ik fotografeer veel", "houd van wandelen"). Empty array otherwise. Avoid duplicates with existing interests.'),

  // UPDATES — alleen invullen als de gebruikersinput EXPLICIET een bestaand item beschrijft
  updatedExperience: z.array(updateExperienceSchema).describe('UPDATES to existing experience items. Empty array if no updates.'),
  updatedEducation: z.array(updateEducationSchema).describe('UPDATES to existing education items. Empty array if no updates.'),
  updatedSkills: z.array(updateSkillSchema).describe('UPDATES to existing skill names (rename). Empty array if no updates.'),
  updatedCertifications: z.array(updateCertificationSchema).describe('UPDATES to existing certifications. Empty array if no updates.'),
  updatedProjects: z.array(updateProjectSchema).describe('UPDATES to existing projects. Empty array if no updates.'),

  // Ambiguity
  ambiguityWarnings: z.array(z.string()).describe('In Dutch: short warnings when user input could refer to multiple items and you skipped the update. Empty array if everything was clear.'),

  changesSummary: z.string().describe('Short Dutch summary of what was added and what was updated. If nothing changed, explain why (e.g. ambiguous input).'),
});

type EnrichmentOutput = z.infer<typeof enrichmentSchema>;

// ============================================================================
// Helpers
// ============================================================================

const emptyToNull = (val: string): string | null => (val.trim() === '' ? null : val);

/** Apply empty-string-keep semantics: only overwrite when AI returned a non-empty value. */
function patchString(current: string | null | undefined, next: string): string | null {
  if (!next || next.trim() === '') return current ?? null;
  return next;
}

function patchRequiredString(current: string, next: string): string {
  if (!next || next.trim() === '') return current;
  return next;
}

function normalizeIdentifier(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Verify the AI's targetIdentifier still resembles the current item before
 * applying an update. Prevents accidental overwrites when the AI picks a
 * wrong index. Matching is permissive: we just need the identifier to share
 * a substantial token with the current item's identifying field(s).
 */
function identifierMatches(claimed: string, ...candidates: string[]): boolean {
  const norm = normalizeIdentifier(claimed);
  if (!norm) return false;
  for (const cand of candidates) {
    const c = normalizeIdentifier(cand || '');
    if (!c) continue;
    if (norm.includes(c) || c.includes(norm)) return true;
    // Token overlap fallback
    const normTokens = new Set(norm.split(' ').filter(t => t.length >= 3));
    const candTokens = c.split(' ').filter(t => t.length >= 3);
    if (candTokens.length > 0 && candTokens.some(t => normTokens.has(t))) return true;
  }
  return false;
}

// ============================================================================
// Merge logic
// ============================================================================

interface MergeOutcome {
  enrichedProfile: ParsedLinkedIn;
  appliedUpdates: {
    experience: number;
    education: number;
    skills: number;
    certifications: number;
    projects: number;
  };
  skippedUpdates: string[]; // Human-readable reasons for skipped updates
}

function mergeEnrichment(
  existing: ParsedLinkedIn,
  ai: EnrichmentOutput,
): MergeOutcome {
  const skipped: string[] = [];

  // ---- Apply experience updates ----
  const experienceWithUpdates = [...existing.experience];
  let appliedExp = 0;
  for (const upd of ai.updatedExperience) {
    const target = experienceWithUpdates[upd.targetIndex];
    if (!target) {
      skipped.push(`Werkervaring-update genegeerd: index ${upd.targetIndex} bestaat niet`);
      continue;
    }
    if (!identifierMatches(upd.targetIdentifier, target.title, target.company, `${target.title} ${target.company}`)) {
      skipped.push(`Werkervaring-update genegeerd: identifier "${upd.targetIdentifier}" matcht niet met huidig item "${target.title} @ ${target.company}"`);
      continue;
    }
    const patched: LinkedInExperience = {
      title: patchRequiredString(target.title, upd.title),
      company: patchRequiredString(target.company, upd.company),
      location: patchString(target.location, upd.location),
      startDate: patchRequiredString(target.startDate, upd.startDate),
      endDate: patchString(target.endDate, upd.endDate),
      description: patchString(target.description, upd.description),
      isCurrentRole:
        upd.isCurrentRole === 'true' ? true
        : upd.isCurrentRole === 'false' ? false
        : target.isCurrentRole,
    };
    experienceWithUpdates[upd.targetIndex] = patched;
    appliedExp++;
  }

  // ---- Apply education updates ----
  const educationWithUpdates = [...existing.education];
  let appliedEdu = 0;
  for (const upd of ai.updatedEducation) {
    const target = educationWithUpdates[upd.targetIndex];
    if (!target) {
      skipped.push(`Opleiding-update genegeerd: index ${upd.targetIndex} bestaat niet`);
      continue;
    }
    if (!identifierMatches(upd.targetIdentifier, target.school, target.degree || '', `${target.degree || ''} ${target.school}`)) {
      skipped.push(`Opleiding-update genegeerd: identifier matcht niet met "${target.degree || 'Opleiding'} @ ${target.school}"`);
      continue;
    }
    const patched: LinkedInEducation = {
      school: patchRequiredString(target.school, upd.school),
      degree: patchString(target.degree, upd.degree),
      fieldOfStudy: patchString(target.fieldOfStudy, upd.fieldOfStudy),
      startYear: patchString(target.startYear, upd.startYear),
      endYear: patchString(target.endYear, upd.endYear),
    };
    educationWithUpdates[upd.targetIndex] = patched;
    appliedEdu++;
  }

  // ---- Apply skill updates (rename) ----
  const skillsWithUpdates = [...existing.skills];
  let appliedSkill = 0;
  for (const upd of ai.updatedSkills) {
    const target = skillsWithUpdates[upd.targetIndex];
    if (!target) {
      skipped.push(`Skill-update genegeerd: index ${upd.targetIndex} bestaat niet`);
      continue;
    }
    if (!identifierMatches(upd.targetIdentifier, target.name)) {
      skipped.push(`Skill-update genegeerd: identifier matcht niet met "${target.name}"`);
      continue;
    }
    if (!upd.name || !upd.name.trim()) {
      skipped.push(`Skill-update genegeerd: nieuwe naam is leeg`);
      continue;
    }
    const patched: LinkedInSkill = { name: upd.name };
    skillsWithUpdates[upd.targetIndex] = patched;
    appliedSkill++;
  }

  // ---- Apply certification updates ----
  const certsWithUpdates = [...existing.certifications];
  let appliedCert = 0;
  for (const upd of ai.updatedCertifications) {
    const target = certsWithUpdates[upd.targetIndex];
    if (!target) {
      skipped.push(`Certificaat-update genegeerd: index ${upd.targetIndex} bestaat niet`);
      continue;
    }
    if (!identifierMatches(upd.targetIdentifier, target.name, target.issuer || '', `${target.name} ${target.issuer || ''}`)) {
      skipped.push(`Certificaat-update genegeerd: identifier matcht niet met "${target.name}"`);
      continue;
    }
    const patched: LinkedInCertification = {
      name: patchRequiredString(target.name, upd.name),
      issuer: patchString(target.issuer, upd.issuer),
      issueDate: patchString(target.issueDate, upd.issueDate),
    };
    certsWithUpdates[upd.targetIndex] = patched;
    appliedCert++;
  }

  // ---- Apply project updates ----
  const projectsWithUpdates = [...(existing.projects || [])];
  let appliedProj = 0;
  for (const upd of ai.updatedProjects) {
    const target = projectsWithUpdates[upd.targetIndex];
    if (!target) {
      skipped.push(`Project-update genegeerd: index ${upd.targetIndex} bestaat niet`);
      continue;
    }
    if (!identifierMatches(upd.targetIdentifier, target.title)) {
      skipped.push(`Project-update genegeerd: identifier matcht niet met "${target.title}"`);
      continue;
    }
    const patched: LinkedInProject = {
      title: patchRequiredString(target.title, upd.title),
      description: patchString(target.description, upd.description),
      technologies: upd.technologies && upd.technologies.length > 0 ? upd.technologies : target.technologies,
      url: patchString(target.url, upd.url),
      startDate: patchString(target.startDate, upd.startDate),
      endDate: patchString(target.endDate, upd.endDate),
      role: patchString(target.role, upd.role),
    };
    projectsWithUpdates[upd.targetIndex] = patched;
    appliedProj++;
  }

  // ---- Add new items (prepend so most recent appears first) ----
  const enrichedProfile: ParsedLinkedIn = {
    ...existing,
    headline: ai.headline ?? existing.headline,
    about: ai.about ?? existing.about,
    experience: [
      ...ai.newExperience.map(exp => ({
        ...exp,
        location: emptyToNull(exp.location),
        endDate: emptyToNull(exp.endDate),
        description: emptyToNull(exp.description),
      })),
      ...experienceWithUpdates,
    ],
    education: [
      ...ai.newEducation.map(edu => ({
        ...edu,
        degree: emptyToNull(edu.degree),
        fieldOfStudy: emptyToNull(edu.fieldOfStudy),
        startYear: emptyToNull(edu.startYear),
        endYear: emptyToNull(edu.endYear),
      })),
      ...educationWithUpdates,
    ],
    skills: [
      ...skillsWithUpdates,
      ...ai.newSkills.filter(
        newSkill => !skillsWithUpdates.some(
          existing => existing.name.toLowerCase() === newSkill.name.toLowerCase()
        )
      ),
    ],
    certifications: [
      ...ai.newCertifications.map(cert => ({
        ...cert,
        issuer: emptyToNull(cert.issuer),
        issueDate: emptyToNull(cert.issueDate),
      })),
      ...certsWithUpdates,
    ],
    projects: [
      ...ai.newProjects.map(proj => ({
        title: proj.title,
        description: emptyToNull(proj.description),
        technologies: proj.technologies || [],
        url: emptyToNull(proj.url),
        startDate: emptyToNull(proj.startDate),
        endDate: emptyToNull(proj.endDate),
        role: emptyToNull(proj.role),
      })),
      ...projectsWithUpdates,
    ],
    interests: [
      ...(existing.interests || []),
      ...ai.newInterests
        .map(i => i.trim())
        .filter(i => i.length > 0)
        .filter(i => !(existing.interests || []).some(e => e.toLowerCase() === i.toLowerCase())),
    ],
  };

  return {
    enrichedProfile,
    appliedUpdates: {
      experience: appliedExp,
      education: appliedEdu,
      skills: appliedSkill,
      certifications: appliedCert,
      projects: appliedProj,
    },
    skippedUpdates: skipped,
  };
}

// ============================================================================
// Prompt
// ============================================================================

function buildPrompt(existing: ParsedLinkedIn, enrichmentText: string): string {
  // Render existing items with explicit 0-based indexes so the AI knows what
  // to target. Identifiers are formatted so the AI can copy them verbatim.
  const expList = existing.experience.length === 0
    ? '(geen)'
    : existing.experience.map((exp, i) =>
        `  [${i}] "${exp.title} @ ${exp.company}" (${exp.startDate}${exp.endDate ? ` – ${exp.endDate}` : ' – heden'})${exp.description ? ` — ${exp.description.slice(0, 120)}${exp.description.length > 120 ? '…' : ''}` : ''}`
      ).join('\n');

  const eduList = existing.education.length === 0
    ? '(geen)'
    : existing.education.map((edu, i) =>
        `  [${i}] "${edu.degree || 'Opleiding'} @ ${edu.school}"${edu.fieldOfStudy ? ` (${edu.fieldOfStudy})` : ''}`
      ).join('\n');

  const skillList = existing.skills.length === 0
    ? '(geen)'
    : existing.skills.map((s, i) => `  [${i}] "${s.name}"`).join('\n');

  const certList = existing.certifications.length === 0
    ? '(geen)'
    : existing.certifications.map((c, i) => `  [${i}] "${c.name}${c.issuer ? ` @ ${c.issuer}` : ''}"`).join('\n');

  const projList = (existing.projects || []).length === 0
    ? '(geen)'
    : (existing.projects || []).map((p, i) => `  [${i}] "${p.title}"`).join('\n');

  const interestList = (existing.interests || []).length === 0
    ? '(geen)'
    : (existing.interests || []).map((interest, i) => `  [${i}] "${interest}"`).join('\n');

  return `Je bent een professionele CV-assistent. De gebruiker heeft een bestaand profiel en wil dit verrijken of bijwerken op basis van vrije tekst.

═══════════════════════════════════════
BESTAAND PROFIEL
═══════════════════════════════════════
Naam: ${existing.fullName}
Headline: ${existing.headline || '(niet ingesteld)'}
Over mij: ${existing.about || '(niet ingesteld)'}

Werkervaring (0-based index):
${expList}

Opleidingen (0-based index):
${eduList}

Vaardigheden (0-based index):
${skillList}

Certificaten (0-based index):
${certList}

Projecten (0-based index):
${projList}

Interesses & hobbies (0-based index):
${interestList}

═══════════════════════════════════════
GEBRUIKERSINPUT
═══════════════════════════════════════
${enrichmentText}

═══════════════════════════════════════
INSTRUCTIES
═══════════════════════════════════════

Je kunt TWEE soorten wijzigingen voorstellen:

A) NIEUW TOEVOEGEN (newExperience, newEducation, newSkills, newCertifications, newProjects, newInterests)
   → Gebruik dit als de input een item beschrijft dat NIET in het bestaande profiel staat.
   → Voor newInterests: korte vrije tekst per item (bijv. "fotografie", "mountainbiken"). Alleen toevoegen als de gebruiker expliciet een hobby/interesse benoemt.

B) BESTAAND ITEM WIJZIGEN (updatedExperience, updatedEducation, updatedSkills, updatedCertifications, updatedProjects)
   → Gebruik dit als de input EXPLICIET een wijziging beschrijft aan een item dat AL in het profiel staat.
   → Bijvoorbeeld: "verander mijn titel bij Acme naar Lead Engineer" of "verplaats mijn startdatum bij Contoso naar maart 2024".
   → Vereisten per update-item:
       • targetIndex: de exacte 0-based index uit de lijst hierboven
       • targetIdentifier: kopieer het identifier-deel tussen aanhalingstekens uit de lijst hierboven (bijv. "Senior Engineer @ Acme"). NOOIT leeg laten — zonder identifier wordt de update afgewezen.
       • Voor velden die je NIET wilt wijzigen: gebruik een lege string ""
       • Voor isCurrentRole (alleen experience): "keep" tenzij de input expliciet aangeeft dat de rol stopt of nu loopt
   → Een update-item alleen NEW velden bevat die DAADWERKELIJK iets veranderen — geen identieke kopie van de huidige waarde.
   → Voor interesses bestaat GEEN updated-variant: als de gebruiker een hobby wil hernoemen, laat dat aan de gebruiker (deze flow ondersteunt het niet).

═══════════════════════════════════════
SIGNAAL-WOORDEN: UPDATE vs ADD
═══════════════════════════════════════

→ Werkwoorden zoals **"verander", "wijzig", "update", "hernoem", "pas aan", "corrigeer", "verbeter", "verfijn"** duiden bijna altijd op UPDATE — niet ADD.
→ Werkwoorden zoals **"voeg toe", "nieuw", "begonnen bij", "extra", "ook nog"** duiden op ADD.
→ Frases zoals **"vanaf <datum>"** of **"sinds <datum>"** met een nieuwe bedrijfsnaam = ADD; met een bestaande bedrijfsnaam = UPDATE op endDate/isCurrentRole.

═══════════════════════════════════════
KRITIEKE REGELS — ANTI-HALLUCINATIE
═══════════════════════════════════════

1. **Verzin geen gegevens.** Als de input een veld niet noemt, vul het niet in. Liever een lege verrijking dan verzonnen feiten.

2. **Bij twijfel: zet in ambiguityWarnings, doe NIETS.**
   - "Verander mijn titel naar Lead" en er zijn meerdere mogelijke ervaringen → géén update, voeg een waarschuwing toe in ambiguityWarnings die uitlegt om welke ervaring het zou kunnen gaan.
   - "Voeg toe dat ik bij Acme werk" en er staat al een Acme-rol → géén NEW maar overweeg of het een UPDATE is.
   - Maar: als er één duidelijke kandidaat is (één Acme-rol, één titel die "Engineer" bevat, etc.) → wees NIET overdreven voorzichtig. Voer de update uit.

3. **UPDATE vs ADD:**
   - Als de input een bedrijf/school/skill/project noemt dat AL bestaat (zelfde of vergelijkbare spelling) → UPDATE.
   - Als de naam volledig nieuw is en het beschrijft een aparte ervaring → ADD.
   - Bij twijfel tussen UPDATE en ADD: voeg ambiguityWarning toe en kies de veiligste optie (geen wijziging).

4. **Update alleen velden die de input noemt.** Als de gebruiker alleen de titel noemt, vul je company, startDate, endDate, etc. met een lege string. Forceer geen volledige object-herschrijving.

5. **Date- en company-changes zijn high-risk.** Wees extra voorzichtig met het wijzigen van bedrijfsnamen of startdates — vraag liever om verduidelijking via ambiguityWarnings dan te gokken.

6. **Headline/about updaten alleen** als de input een significant nieuwe rol of richting beschrijft. Anders headline=null en about=null.

7. **Interesses zijn vrij-tekst** — alleen toevoegen via newInterests als de input expliciet een hobby of interesse benoemt. Verzin geen interesses uit de about-tekst of werkervaring.

8. **changesSummary** in Nederlands, kort, telt zowel toegevoegde als gewijzigde items. Als je niets hebt gewijzigd vanwege ambiguïteit, leg dat uit.`;
}

// ============================================================================
// Route handler
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { enrichmentText } = body as { enrichmentText: string };

    if (!enrichmentText || typeof enrichmentText !== 'string' || enrichmentText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Voeg tekst toe om je profiel te verrijken' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = getAdminDb();

    const profileDoc = await db
      .collection('users')
      .doc(userId)
      .collection('profiles')
      .doc(id)
      .get();

    if (!profileDoc.exists) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileData = profileDoc.data() as any;
    const existingProfile = profileData.parsedData as ParsedLinkedIn;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.apiKey) {
      return NextResponse.json(
        { error: 'API key niet geconfigureerd. Voeg je API key toe in Instellingen.' },
        { status: 400 }
      );
    }

    const apiKey = decrypt(userData.apiKey.encryptedKey);
    const userProvider = userData.apiKey.provider;
    const userModel = userData.apiKey.model;

    const aiProvider = createAIProvider(userProvider, apiKey);

    try {
      const { object, usage } = await generateObject({
        model: aiProvider(userModel),
        schema: enrichmentSchema,
        prompt: buildPrompt(existingProfile, enrichmentText),
        temperature: 0.2,
      });

      const merge = mergeEnrichment(existingProfile, object);

      // ---- Build human-readable change list ----
      const changes: string[] = [];
      if (object.headline && object.headline !== existingProfile.headline) {
        changes.push('Headline bijgewerkt');
      }
      if (object.about && object.about !== existingProfile.about) {
        changes.push('Over mij bijgewerkt');
      }
      if (object.newExperience.length > 0) {
        changes.push(`${object.newExperience.length} werkervaring(en) toegevoegd`);
      }
      if (merge.appliedUpdates.experience > 0) {
        changes.push(`${merge.appliedUpdates.experience} werkervaring(en) gewijzigd`);
      }
      if (object.newEducation.length > 0) {
        changes.push(`${object.newEducation.length} opleiding(en) toegevoegd`);
      }
      if (merge.appliedUpdates.education > 0) {
        changes.push(`${merge.appliedUpdates.education} opleiding(en) gewijzigd`);
      }
      const newSkillsAdded = object.newSkills.filter(
        s => !existingProfile.skills.some(e => e.name.toLowerCase() === s.name.toLowerCase())
      ).length;
      if (newSkillsAdded > 0) {
        changes.push(`${newSkillsAdded} vaardighe${newSkillsAdded === 1 ? 'id' : 'den'} toegevoegd`);
      }
      if (merge.appliedUpdates.skills > 0) {
        changes.push(`${merge.appliedUpdates.skills} vaardighe${merge.appliedUpdates.skills === 1 ? 'id' : 'den'} hernoemd`);
      }
      if (object.newCertifications.length > 0) {
        changes.push(`${object.newCertifications.length} certificaat/certificaten toegevoegd`);
      }
      if (merge.appliedUpdates.certifications > 0) {
        changes.push(`${merge.appliedUpdates.certifications} certificaat/certificaten gewijzigd`);
      }
      if (object.newProjects.length > 0) {
        changes.push(`${object.newProjects.length} project(en) toegevoegd`);
      }
      if (merge.appliedUpdates.projects > 0) {
        changes.push(`${merge.appliedUpdates.projects} project(en) gewijzigd`);
      }
      const newInterestsAdded = (object.newInterests || []).filter(
        i => i.trim() && !(existingProfile.interests || []).some(e => e.toLowerCase() === i.trim().toLowerCase())
      ).length;
      if (newInterestsAdded > 0) {
        changes.push(`${newInterestsAdded} interesse(s)/hobby('s) toegevoegd`);
      }

      const tokenUsage: TokenUsage | undefined = usage ? {
        promptTokens: usage.inputTokens ?? 0,
        completionTokens: usage.outputTokens ?? 0,
      } : undefined;

      // Build update preview info (before/after) so the drawer can show diffs.
      // We send the original items as well so the UI doesn't have to compute
      // them from indexes.
      const updatedExperiencePreview = object.updatedExperience
        .map(upd => {
          const before = existingProfile.experience[upd.targetIndex];
          const after = merge.enrichedProfile.experience.find((e, i) => {
            // Account for prepended new items
            return i === upd.targetIndex + object.newExperience.length;
          });
          if (!before || !after) return null;
          return { before, after, targetIndex: upd.targetIndex };
        })
        .filter(Boolean);

      const updatedEducationPreview = object.updatedEducation
        .map(upd => {
          const before = existingProfile.education[upd.targetIndex];
          const after = merge.enrichedProfile.education.find((_, i) => i === upd.targetIndex + object.newEducation.length);
          if (!before || !after) return null;
          return { before, after, targetIndex: upd.targetIndex };
        })
        .filter(Boolean);

      const updatedSkillsPreview = object.updatedSkills
        .map(upd => {
          const before = existingProfile.skills[upd.targetIndex];
          const after = merge.enrichedProfile.skills[upd.targetIndex];
          if (!before || !after || before.name === after.name) return null;
          return { before, after, targetIndex: upd.targetIndex };
        })
        .filter(Boolean);

      const updatedCertificationsPreview = object.updatedCertifications
        .map(upd => {
          const before = existingProfile.certifications[upd.targetIndex];
          const after = merge.enrichedProfile.certifications.find((_, i) => i === upd.targetIndex + object.newCertifications.length);
          if (!before || !after) return null;
          return { before, after, targetIndex: upd.targetIndex };
        })
        .filter(Boolean);

      const updatedProjectsPreview = object.updatedProjects
        .map(upd => {
          const before = (existingProfile.projects || [])[upd.targetIndex];
          const after = (merge.enrichedProfile.projects || []).find((_, i) => i === upd.targetIndex + object.newProjects.length);
          if (!before || !after) return null;
          return { before, after, targetIndex: upd.targetIndex };
        })
        .filter(Boolean);

      return NextResponse.json({
        success: true,
        enrichedProfile: merge.enrichedProfile,
        changes: changes.length > 0 ? changes : ['Geen wijzigingen gedetecteerd'],
        changesSummary: object.changesSummary,
        ambiguityWarnings: object.ambiguityWarnings,
        skippedUpdates: merge.skippedUpdates,
        updates: {
          experience: updatedExperiencePreview,
          education: updatedEducationPreview,
          skills: updatedSkillsPreview,
          certifications: updatedCertificationsPreview,
          projects: updatedProjectsPreview,
        },
        usage: tokenUsage,
      });
    } catch (aiError) {
      console.error('AI enrichment error:', aiError);
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
      return NextResponse.json(
        { error: `Profiel verrijking mislukt: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Profile enrichment error:', error);
    return NextResponse.json(
      { error: 'Profiel verrijking mislukt' },
      { status: 500 }
    );
  }
}
