import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/encryption';
import { createAIProvider } from '@/lib/ai/providers';
import { FieldValue } from 'firebase-admin/firestore';
import type { ParsedLinkedIn, TokenUsage, OutputLanguage } from '@/types';

// Schema for LinkedIn-optimized content
const linkedInExportSchema = z.object({
  // Profile header
  headline: z.string().describe('Professional headline (max 220 chars) - impactful, keyword-rich, describes value proposition'),

  // About section
  about: z.string().describe('LinkedIn About section (500-2000 chars) - engaging summary with clear structure, value proposition, achievements, and call-to-action'),

  // Experience descriptions
  experienceDescriptions: z.array(
    z.object({
      originalTitle: z.string().describe('The original job title for matching'),
      originalCompany: z.string().describe('The original company name for matching'),
      optimizedTitle: z.string().describe('Optimized job title if improvement needed, otherwise same as original'),
      description: z.string().describe('Achievement-focused description with bullet points, metrics where possible (300-2000 chars per role)'),
      skills: z.array(z.string()).describe('Relevant skills to tag for this position'),
    })
  ).describe('LinkedIn-optimized descriptions for each work experience'),

  // Education descriptions
  educationDescriptions: z.array(
    z.object({
      originalSchool: z.string().describe('The original school name for matching'),
      description: z.string().describe('Brief description of relevant activities, achievements, or coursework (optional, max 500 chars)'),
    })
  ).describe('LinkedIn-optimized descriptions for education entries'),

  // Skills recommendations
  topSkills: z.array(z.string()).describe('Top 10 recommended skills to add to LinkedIn profile based on experience'),

  // Tips
  profileTips: z.array(z.string()).describe('3-5 personalized tips for improving this LinkedIn profile'),
});

export type LinkedInExportResult = z.infer<typeof linkedInExportSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const language = (body.language as OutputLanguage) || 'nl';

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

    // Check user credits (LinkedIn export costs 1 credit)
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const freeCredits = userData?.credits?.free ?? 0;
    const purchasedCredits = userData?.credits?.purchased ?? 0;
    const totalCredits = freeCredits + purchasedCredits;

    if (!userData || totalCredits < 1) {
      return NextResponse.json(
        { error: 'Onvoldoende credits. Koop meer credits om door te gaan.' },
        { status: 402 }
      );
    }

    // Check API key
    if (!userData.apiKey) {
      return NextResponse.json(
        { error: 'Geen API key geconfigureerd. Voeg je API key toe in Instellingen.' },
        { status: 400 }
      );
    }

    // Get the profile
    const profileDoc = await db
      .collection('users')
      .doc(userId)
      .collection('profiles')
      .doc(id)
      .get();

    if (!profileDoc.exists) {
      return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileData = profileDoc.data() as any;
    const profile = profileData.parsedData as ParsedLinkedIn;

    // Decrypt API key
    const apiKey = decrypt(userData.apiKey.encryptedKey);
    const userProvider = userData.apiKey.provider;
    const userModel = userData.apiKey.model;

    // Create AI provider
    const aiProvider = createAIProvider(userProvider, apiKey);

    // Build the prompt
    const isNL = language === 'nl';
    const linkedInPrompt = `Je bent een expert LinkedIn profiel schrijver en career coach. Genereer geoptimaliseerde LinkedIn content voor het volgende profiel.

PROFIEL DATA:
Naam: ${profile.fullName}
Huidige Headline: ${profile.headline || 'Niet ingesteld'}
Huidige Over mij: ${profile.about || 'Niet ingesteld'}
Locatie: ${profile.location || 'Niet ingesteld'}

WERKERVARING:
${profile.experience.map((exp, i) => `
${i + 1}. ${exp.title} bij ${exp.company}
   Periode: ${exp.startDate} - ${exp.endDate || 'heden'}
   Locatie: ${exp.location || 'Niet vermeld'}
   Huidige beschrijving: ${exp.description || 'Geen beschrijving'}
`).join('\n')}

OPLEIDING:
${profile.education.map((edu, i) => `
${i + 1}. ${edu.degree || 'Opleiding'} - ${edu.fieldOfStudy || 'Niet gespecificeerd'}
   School: ${edu.school}
   Periode: ${edu.startYear || '?'} - ${edu.endYear || '?'}
`).join('\n')}

VAARDIGHEDEN:
${profile.skills.map(s => s.name).join(', ') || 'Geen vaardigheden vermeld'}

CERTIFICATEN:
${profile.certifications.map(c => c.name).join(', ') || 'Geen certificaten'}

---

INSTRUCTIES VOOR LINKEDIN OPTIMALISATIE:

1. **HEADLINE** (max 220 tekens):
   - Gebruik formule: [Functie] | [Specialisatie/Waarde] | [Resultaat/Impact]
   - Voeg relevante keywords toe voor zoekvindingbaarheid
   - Maak het actiegericht en resultaatgericht
   - Voorbeeld: "Senior Software Engineer | Building Scalable Cloud Solutions | Helping teams ship 2x faster"

2. **ABOUT SECTIE** (500-2000 tekens):
   - Begin met een sterke hook (eerste 2 regels zijn cruciaal!)
   - Structuur: Hook → Wat je doet → Hoe je dat doet → Resultaten/Impact → Call-to-action
   - Gebruik witregels voor leesbaarheid
   - Voeg relevante keywords toe
   - Eindig met een uitnodiging om contact op te nemen
   - ${isNL ? 'Schrijf in het Nederlands' : 'Write in English'}

3. **WERKERVARING BESCHRIJVINGEN**:
   - Focus op RESULTATEN, niet taken
   - Gebruik de CAR methode: Challenge → Action → Result
   - Voeg waar mogelijk cijfers/metrics toe
   - Begin elke bullet met een actiewerkwoord
   - Formaat: Korte intro (1-2 zinnen) + bullet points met achievements
   - ${isNL ? 'Schrijf in het Nederlands' : 'Write in English'}

4. **OPLEIDING BESCHRIJVINGEN**:
   - Alleen invullen als er relevante achievements zijn
   - Vermeld relevante projecten, awards, of extracurriculaire activiteiten
   - Houd het kort (max 500 tekens)

5. **SKILLS**:
   - Selecteer de 10 meest relevante en gevraagde skills
   - Mix van technical en soft skills
   - Focus op skills die passen bij de carrièrerichting

6. **PROFIEL TIPS**:
   - Geef 3-5 specifieke, actionable tips
   - Focus op wat deze persoon specifiek kan verbeteren
   - ${isNL ? 'Schrijf tips in het Nederlands' : 'Write tips in English'}`;

    try {
      const { object, usage } = await generateObject({
        model: aiProvider(userModel),
        schema: linkedInExportSchema,
        prompt: linkedInPrompt,
      });

      // Deduct credit (use free credits first, then purchased)
      if (freeCredits >= 1) {
        await db.collection('users').doc(userId).update({
          'credits.free': FieldValue.increment(-1),
          updatedAt: new Date(),
        });
      } else {
        await db.collection('users').doc(userId).update({
          'credits.purchased': FieldValue.increment(-1),
          updatedAt: new Date(),
        });
      }

      // Log transaction
      const creditSource = freeCredits >= 1 ? 'free' : 'purchased';
      await db.collection('users').doc(userId).collection('transactions').add({
        amount: -1,
        type: 'linkedin_export',
        description: `LinkedIn profiel export (${creditSource} credit)`,
        molliePaymentId: null,
        profileId: id,
        createdAt: new Date(),
      });

      const tokenUsage: TokenUsage | undefined = usage ? {
        promptTokens: usage.inputTokens ?? 0,
        completionTokens: usage.outputTokens ?? 0,
      } : undefined;

      return NextResponse.json({
        success: true,
        linkedInContent: object,
        usage: tokenUsage,
      });
    } catch (aiError) {
      console.error('AI LinkedIn export error:', aiError);
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
      return NextResponse.json(
        { error: `LinkedIn export mislukt: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('LinkedIn export error:', error);
    return NextResponse.json(
      { error: 'LinkedIn export mislukt' },
      { status: 500 }
    );
  }
}
