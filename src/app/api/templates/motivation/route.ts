import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { generateMotivationLetter } from '@/lib/ai/motivation-generator';
import {
  resolveProvider,
  ProviderError,
  chargePlatformCredits,
  refundPlatformCredits,
} from '@/lib/ai/platform-provider';
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
  let creditCharged = false;
  let chargedUserId: string | null = null;
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
      chargedUserId = userId;
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }


    // Credit (1) atomisch vooraf afschrijven — voorheen check-then-deduct ná de
    // AI-call, waardoor parallelle requests gratis generaties opleverden.
    try {
      await chargePlatformCredits(userId, 1, 'template-motivation-letter');
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json(
          { error: 'Insufficient credits. Please purchase more credits.' },
          { status: err.statusCode },
        );
      }
      throw err;
    }
    creditCharged = true;

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

    return NextResponse.json({
      success: true,
      letter,
      usage,
    });
  } catch (error) {
    console.error('Template motivation letter generation error:', error);
    if (creditCharged && chargedUserId) {
      await refundPlatformCredits(chargedUserId, 'template-motivation-letter').catch(() => {});
    }
    return NextResponse.json(
      { error: 'Failed to generate motivation letter' },
      { status: 500 }
    );
  }
}
