import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { FieldValue, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { resolveProvider, ProviderError } from '@/lib/ai/platform-provider';
import { runDisputeGatekeeper } from '@/lib/ai/dispute-gatekeeper';
import { generateDesignTokens } from '@/lib/ai/style-generator-v2';
import { generateCV } from '@/lib/ai/cv-generator';
import { createLinkedInSummaryV2 } from '@/lib/ai/style-generator-v2';
import type {
  CV,
  StyleCreativityLevel,
  DisputeStatus,
  GeneratedCVContent,
  ParsedLinkedIn,
  JobVacancy,
} from '@/types';

// The CVDispute shape from types/index.ts uses the client Firestore Timestamp
// type; on the admin SDK we write with AdminTimestamp. We use a loose shape
// here and cast so we don't need to duplicate the type.
type DisputeWrite = Omit<import('@/types').CVDispute, 'id' | 'createdAt' | 'resolvedAt'> & {
  createdAt: AdminTimestamp;
  resolvedAt?: AdminTimestamp;
};

// Max allowed disputes per CV. Third one escalates to human admin review.
const MAX_DISPUTES = 3;
const MIN_REASON_LENGTH = 20;

const VALID_LEVELS: StyleCreativityLevel[] = ['conservative', 'balanced', 'creative', 'experimental'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: cvId } = await params;

    // Auth
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let userId: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const reason: unknown = body.reason;
    const requestedLevel: unknown = body.requestedLevel;

    if (typeof reason !== 'string' || reason.trim().length < MIN_REASON_LENGTH) {
      return NextResponse.json(
        { error: `Reden moet minstens ${MIN_REASON_LENGTH} tekens bevatten` },
        { status: 400 },
      );
    }
    if (typeof requestedLevel !== 'string' || !VALID_LEVELS.includes(requestedLevel as StyleCreativityLevel)) {
      return NextResponse.json({ error: 'Ongeldig creativity level' }, { status: 400 });
    }
    const newLevel = requestedLevel as StyleCreativityLevel;

    // Fetch CV
    const db = getAdminDb();
    const cvRef = db.collection('users').doc(userId).collection('cvs').doc(cvId);
    const cvDoc = await cvRef.get();
    if (!cvDoc.exists) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }
    const cvData = cvDoc.data() as Partial<CV>;
    if (!cvData.generatedContent || !cvData.linkedInData) {
      return NextResponse.json({ error: 'CV is nog niet gegenereerd' }, { status: 400 });
    }

    const disputeCount = cvData.disputeCount || 0;
    if (disputeCount >= MAX_DISPUTES) {
      return NextResponse.json(
        { error: 'Maximaal aantal disputes bereikt voor deze CV.' },
        { status: 400 },
      );
    }

    const previousLevel: StyleCreativityLevel = cvData.creativityLevel || 'balanced';
    if (newLevel === previousLevel) {
      return NextResponse.json(
        { error: 'Kies een ander stijl-niveau dan de huidige.' },
        { status: 400 },
      );
    }

    const attempt = disputeCount + 1;
    const disputesCol = cvRef.collection('disputes');

    // Get user email for admin queue display
    let userEmail: string | undefined;
    try {
      const authUser = await getAdminAuth().getUser(userId);
      userEmail = authUser.email;
    } catch {
      // non-fatal
    }

    // ========= 3rd dispute: escalate to human =========
    if (attempt === MAX_DISPUTES) {
      const disputeRef = disputesCol.doc();
      const disputeDoc: DisputeWrite = {
        cvId,
        userId,
        userEmail,
        reason: reason.trim(),
        previousLevel,
        requestedLevel: newLevel,
        status: 'needs-human',
        attempt,
        createdAt: AdminTimestamp.now(),
      };
      await disputeRef.set(disputeDoc);

      await cvRef.update({
        disputeCount: FieldValue.increment(1),
        activeDisputeId: disputeRef.id,
        activeDisputeStatus: 'needs-human' as DisputeStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        status: 'needs-human' as DisputeStatus,
        disputeId: disputeRef.id,
        message: 'Dit is je derde dispute — deze wordt handmatig beoordeeld door een admin. Je hoort zo snel mogelijk van ons.',
      });
    }

    // ========= Attempts 1 and 2: AI gatekeeper =========
    let resolved;
    try {
      // skipCreditDeduction — disputes are free for the user (Option C)
      resolved = await resolveProvider({ userId, skipCreditDeduction: true });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    const gatekeeper = await runDisputeGatekeeper(
      {
        userReason: reason.trim(),
        currentLevel: previousLevel,
        requestedLevel: newLevel,
        content: cvData.generatedContent as GeneratedCVContent,
        profile: cvData.linkedInData as ParsedLinkedIn,
        jobVacancy: (cvData.jobVacancy as JobVacancy | null) || null,
      },
      resolved.providerName,
      resolved.apiKey,
      resolved.model,
    );

    const disputeRef = disputesCol.doc();

    if (gatekeeper.verdict === 'rejected') {
      const disputeDoc: DisputeWrite = {
        cvId,
        userId,
        userEmail,
        reason: reason.trim(),
        previousLevel,
        requestedLevel: newLevel,
        aiVerdict: 'rejected',
        aiRationale: gatekeeper.rationale,
        status: 'rejected',
        attempt,
        createdAt: AdminTimestamp.now(),
        resolvedAt: AdminTimestamp.now(),
      };
      await disputeRef.set(disputeDoc);

      await cvRef.update({
        disputeCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        status: 'rejected' as DisputeStatus,
        disputeId: disputeRef.id,
        rationale: gatekeeper.rationale,
        attempt,
        remainingAttempts: MAX_DISPUTES - attempt,
      });
    }

    // ========= Approved — regenerate the CV =========
    // Load the user's recent style history so the anti-convergence rotation
    // in the experimental expert can pick a different archetype + palette.
    // Without this, dispute regenerations tend to converge on the same look
    // as the original CV.
    let styleHistory: import('@/types/design-tokens').CVDesignTokens[] = [];
    try {
      const recentCvs = await db.collection('users').doc(userId).collection('cvs')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .select('designTokens')
        .get();
      styleHistory = recentCvs.docs
        .map(doc => doc.data()?.designTokens)
        .filter(Boolean) as import('@/types/design-tokens').CVDesignTokens[];
    } catch (e) {
      console.warn('[dispute] Could not fetch style history, continuing without:', e);
    }

    const regenResult = await regenerateCV(
      cvData as CV,
      newLevel,
      resolved.provider,
      resolved.providerName,
      resolved.apiKey,
      resolved.model,
      styleHistory,
    );

    const disputeDoc: DisputeWrite = {
      cvId,
      userId,
      userEmail,
      reason: reason.trim(),
      previousLevel,
      requestedLevel: newLevel,
      aiVerdict: 'approved',
      aiRationale: gatekeeper.rationale,
      status: 'approved',
      attempt,
      createdAt: AdminTimestamp.now(),
      resolvedAt: AdminTimestamp.now(),
    };
    await disputeRef.set(disputeDoc);

    // Apply regenerated content to the CV
    const hadPaidPdf = cvData.status === 'pdf_ready';
    await cvRef.update({
      generatedContent: regenResult.content,
      designTokens: regenResult.tokens,
      creativityLevel: newLevel,
      creativityLevelHistory: FieldValue.arrayUnion(newLevel),
      disputeCount: FieldValue.increment(1),
      // Disputes are free. If this CV had already been paid/downloaded once,
      // preserve that entitlement so the regenerated version can be downloaded
      // again without charging the user a second time.
      status: hadPaidPdf ? 'pdf_ready' : 'generated',
      pdfUrl: null,
      // Reset element overrides from the old CV — they won't match the new content
      elementOverrides: FieldValue.delete(),
      activeDisputeId: null,
      activeDisputeStatus: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      status: 'approved' as DisputeStatus,
      disputeId: disputeRef.id,
      rationale: gatekeeper.rationale,
      attempt,
      remainingAttempts: MAX_DISPUTES - attempt,
      newLevel,
    });
  } catch (error) {
    console.error('[Dispute] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Onbekende fout' },
      { status: 500 },
    );
  }
}

// ============ Regeneration helper ============

type ResolvedProvider = Awaited<ReturnType<typeof resolveProvider>>['provider'];

interface RegenResult {
  content: GeneratedCVContent;
  tokens: import('@/types/design-tokens').CVDesignTokens;
}

async function regenerateCV(
  cv: CV,
  newLevel: StyleCreativityLevel,
  _provider: ResolvedProvider,
  providerName: string,
  apiKey: string,
  modelName: string,
  styleHistory: import('@/types/design-tokens').CVDesignTokens[] = [],
): Promise<RegenResult> {
  const linkedIn = cv.linkedInData;
  const jobVacancy = cv.jobVacancy || null;
  const language = cv.language || 'nl';

  // 1) New design tokens for the new creativity level.
  //    Combine the caller-supplied history with the previous CV tokens so
  //    the rotation has something to work with even when history is empty.
  const profileSummary = createLinkedInSummaryV2(linkedIn);
  const mergedHistory = styleHistory.length > 0
    ? styleHistory
    : (cv.designTokens ? [cv.designTokens] : undefined);
  const styleResult = await generateDesignTokens(
    profileSummary,
    jobVacancy,
    providerName as Parameters<typeof generateDesignTokens>[2],
    apiKey,
    modelName,
    undefined,
    newLevel,
    !!cv.avatarUrl,
    mergedHistory,
  );

  // 2) Regenerate CV content (same profile/job, different creativity level
  //    may produce subtly different wording via the AI's temperature variance)
  const cvResult = await generateCV(
    linkedIn,
    jobVacancy,
    providerName as Parameters<typeof generateCV>[2],
    apiKey,
    modelName,
    undefined,
    language,
    'bullets',
    cv.fitAnalysis || null,
  );

  return {
    content: cvResult.content,
    tokens: styleResult.tokens,
  };
}
