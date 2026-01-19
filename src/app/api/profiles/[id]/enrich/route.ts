import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/encryption';
import { createAIProvider } from '@/lib/ai/providers';
import type { ParsedLinkedIn, TokenUsage } from '@/types';

// Schema for profile enrichment - what the AI should add/update
const enrichmentSchema = z.object({
  // New or updated fields
  headline: z.string().nullable().describe('Updated professional headline if the new information warrants it, null to keep existing'),
  about: z.string().nullable().describe('Updated about section if needed, null to keep existing'),

  // New entries to ADD (not replace)
  newExperience: z.array(
    z.object({
      title: z.string().describe('Job title'),
      company: z.string().describe('Company name'),
      location: z.string().describe('Job location, empty string if not specified'),
      startDate: z.string().describe('Start date (e.g., "Jan 2020" or "2020")'),
      endDate: z.string().describe('End date, empty string if current position'),
      description: z.string().describe('Job description'),
      isCurrentRole: z.boolean().describe('Whether this is the current role'),
    })
  ).describe('NEW work experience entries to add based on the input'),

  newEducation: z.array(
    z.object({
      school: z.string().describe('School/university name'),
      degree: z.string().describe('Degree type, empty string if not specified'),
      fieldOfStudy: z.string().describe('Field of study, empty string if not specified'),
      startYear: z.string().describe('Start year, empty string if not specified'),
      endYear: z.string().describe('End year, empty string if not specified'),
    })
  ).describe('NEW education entries to add'),

  newSkills: z.array(
    z.object({
      name: z.string().describe('Skill name'),
    })
  ).describe('NEW skills to add (avoid duplicates with existing skills)'),

  newCertifications: z.array(
    z.object({
      name: z.string().describe('Certification name'),
      issuer: z.string().describe('Issuing organization, empty string if not specified'),
      issueDate: z.string().describe('Issue date, empty string if not specified'),
    })
  ).describe('NEW certifications to add'),

  // Summary of what was changed
  changesSummary: z.string().describe('A brief summary in Dutch of what was added/updated'),
});

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

    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = getAdminDb();

    // Get the profile
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

    // Get user's API key
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

    // Create AI provider
    const aiProvider = createAIProvider(userProvider, apiKey);

    // Build the prompt
    const enrichmentPrompt = `Je bent een professionele CV-assistent. De gebruiker heeft een bestaand profiel en wil dit verrijken met nieuwe informatie.

BESTAAND PROFIEL:
Naam: ${existingProfile.fullName}
Headline: ${existingProfile.headline || 'Niet ingesteld'}
Over mij: ${existingProfile.about || 'Niet ingesteld'}

Bestaande werkervaring:
${existingProfile.experience.map(exp => `- ${exp.title} bij ${exp.company} (${exp.startDate} - ${exp.endDate || 'heden'})`).join('\n') || 'Geen'}

Bestaande opleidingen:
${existingProfile.education.map(edu => `- ${edu.degree || 'Opleiding'} bij ${edu.school}`).join('\n') || 'Geen'}

Bestaande vaardigheden:
${existingProfile.skills.map(s => s.name).join(', ') || 'Geen'}

Bestaande certificaten:
${existingProfile.certifications.map(c => c.name).join(', ') || 'Geen'}

---

NIEUWE INFORMATIE VAN DE GEBRUIKER:
${enrichmentText}

---

INSTRUCTIES:
1. Analyseer de nieuwe informatie en bepaal wat er toegevoegd moet worden aan het profiel
2. Voeg ALLEEN nieuwe items toe, vervang bestaande items niet
3. Als de nieuwe info een project of ervaring beschrijft, maak er een werkervaring van met:
   - Duidelijke functietitel
   - Bedrijfs/projectnaam
   - Startdatum (schat indien nodig, bijv. "2024" of "jan 2024")
   - Einddatum (leeg als het nog loopt)
   - Professionele beschrijving van wat er is gedaan
4. Extract eventuele nieuwe vaardigheden die worden genoemd
5. Als de info een cursus of opleiding beschrijft, voeg het toe als opleiding of certificaat
6. Update de headline alleen als de nieuwe info een significant andere rol beschrijft
7. Vermijd duplicaten met bestaande items
8. Geef een korte samenvatting in het Nederlands van wat er is toegevoegd`;

    try {
      const { object, usage } = await generateObject({
        model: aiProvider(userModel),
        schema: enrichmentSchema,
        prompt: enrichmentPrompt,
      });

      // Helper to convert empty strings to null
      const emptyToNull = (val: string): string | null => val === '' ? null : val;

      // Merge the enrichment with existing profile
      const enrichedProfile: ParsedLinkedIn = {
        ...existingProfile,
        // Update headline if provided
        headline: object.headline ?? existingProfile.headline,
        // Update about if provided
        about: object.about ?? existingProfile.about,
        // Add new experience at the beginning (most recent first)
        experience: [
          ...object.newExperience.map(exp => ({
            ...exp,
            location: emptyToNull(exp.location),
            endDate: emptyToNull(exp.endDate),
            description: emptyToNull(exp.description),
          })),
          ...existingProfile.experience,
        ],
        // Add new education
        education: [
          ...object.newEducation.map(edu => ({
            ...edu,
            degree: emptyToNull(edu.degree),
            fieldOfStudy: emptyToNull(edu.fieldOfStudy),
            startYear: emptyToNull(edu.startYear),
            endYear: emptyToNull(edu.endYear),
          })),
          ...existingProfile.education,
        ],
        // Add new skills (filtering duplicates)
        skills: [
          ...existingProfile.skills,
          ...object.newSkills.filter(
            newSkill => !existingProfile.skills.some(
              existing => existing.name.toLowerCase() === newSkill.name.toLowerCase()
            )
          ),
        ],
        // Add new certifications
        certifications: [
          ...object.newCertifications.map(cert => ({
            ...cert,
            issuer: emptyToNull(cert.issuer),
            issueDate: emptyToNull(cert.issueDate),
          })),
          ...existingProfile.certifications,
        ],
      };

      // Build a summary of what changed
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
      if (object.newEducation.length > 0) {
        changes.push(`${object.newEducation.length} opleiding(en) toegevoegd`);
      }
      const newSkillsAdded = object.newSkills.filter(
        newSkill => !existingProfile.skills.some(
          existing => existing.name.toLowerCase() === newSkill.name.toLowerCase()
        )
      ).length;
      if (newSkillsAdded > 0) {
        changes.push(`${newSkillsAdded} vaardighe${newSkillsAdded === 1 ? 'id' : 'den'} toegevoegd`);
      }
      if (object.newCertifications.length > 0) {
        changes.push(`${object.newCertifications.length} certificaat/certificaten toegevoegd`);
      }

      const tokenUsage: TokenUsage | undefined = usage ? {
        promptTokens: usage.inputTokens ?? 0,
        completionTokens: usage.outputTokens ?? 0,
      } : undefined;

      return NextResponse.json({
        success: true,
        enrichedProfile,
        changes: changes.length > 0 ? changes : ['Geen wijzigingen gedetecteerd'],
        changesSummary: object.changesSummary,
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
