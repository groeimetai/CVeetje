import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { generateMotivationLetter } from '@/lib/ai/motivation-generator';
import { FieldValue } from 'firebase-admin/firestore';
import { resolveProvider, ProviderError } from '@/lib/ai/platform-provider';
import type {
  GeneratedCVContent,
  ParsedLinkedIn,
  JobVacancy,
  OutputLanguage,
} from '@/types';

/**
 * POST /api/templates/motivation
 *
 * Generate a motivation letter for template-based CV fills.
 * Unlike /api/cv/[id]/motivation, this endpoint doesn't require a stored CV.
 * It takes the profile and job data directly in the request body.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const linkedInData = body.linkedInData as ParsedLinkedIn;
    const jobVacancy = body.jobVacancy as JobVacancy;
    const personalMotivation = body.personalMotivation as string | undefined;
    const language = (body.language as OutputLanguage) || 'nl';

    // Validate required data
    if (!linkedInData || !jobVacancy) {
      return NextResponse.json(
        { error: 'Missing required data: linkedInData and jobVacancy are required' },
        { status: 400 }
      );
    }

    // Get auth token from cookie or header
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const db = getAdminDb();

    // Check user credits (motivation letter costs 1 credit)
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const freeCredits = userData?.credits?.free ?? 0;
    const purchasedCredits = userData?.credits?.purchased ?? 0;
    const totalCredits = freeCredits + purchasedCredits;

    if (!userData || totalCredits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits.' },
        { status: 402 }
      );
    }

    // Resolve AI provider (skipCreditDeduction — this route handles its own credits)
    let resolved;
    try {
      resolved = await resolveProvider({ userId, skipCreditDeduction: true });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    // Create a minimal GeneratedCVContent for the motivation generator
    // The generator mainly uses cvContent.summary for consistency
    const minimalCVContent: GeneratedCVContent = {
      headline: linkedInData.headline || '',
      summary: linkedInData.about || `${linkedInData.fullName} is een ervaren professional met expertise in ${linkedInData.skills?.slice(0, 5).map(s => s.name).join(', ') || 'diverse vakgebieden'}.`,
      experience: linkedInData.experience.map(exp => {
        // Format period from startDate/endDate
        const period = exp.endDate
          ? `${exp.startDate} - ${exp.endDate}`
          : `${exp.startDate} - Present`;
        return {
          title: exp.title,
          company: exp.company,
          location: exp.location,
          period,
          highlights: exp.description ? [exp.description] : [],
        };
      }),
      education: linkedInData.education.map(edu => ({
        degree: edu.degree || edu.fieldOfStudy || '',
        institution: edu.school,
        year: edu.endYear || edu.startYear || '',
        details: null,
      })),
      skills: {
        technical: linkedInData.skills?.slice(0, 10).map(s => s.name) || [],
        soft: [],
      },
      languages: [],
      certifications: [],
    };

    // Generate motivation letter
    const { letter, usage } = await generateMotivationLetter(
      linkedInData,
      jobVacancy,
      minimalCVContent,
      resolved.providerName,
      resolved.apiKey,
      resolved.model,
      language,
      personalMotivation
    );

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
      type: 'template_motivation_letter',
      description: `Template motivation letter generation (${creditSource} credit)`,
      molliePaymentId: null,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      letter,
      usage,
    });
  } catch (error) {
    console.error('Template motivation letter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate motivation letter' },
      { status: 500 }
    );
  }
}
