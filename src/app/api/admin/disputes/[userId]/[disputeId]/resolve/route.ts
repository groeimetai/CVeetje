import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { resolveProvider, ProviderError } from '@/lib/ai/platform-provider';
import { generateDesignTokens, createLinkedInSummaryV2 } from '@/lib/ai/style-generator-v2';
import { generateCV } from '@/lib/ai/cv-generator';
import type { CV, StyleCreativityLevel } from '@/types';

/**
 * POST /api/admin/disputes/[userId]/[disputeId]/resolve
 * Admin resolves a needs-human dispute.
 * Body: { verdict: 'approved' | 'rejected', rationale: string }
 *
 * When approved → regenerate CV at the requested creativity level.
 * When rejected → just mark resolved, CV stays as-is.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; disputeId: string }> },
) {
  try {
    const token = request.cookies.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const adminUid = (await getAdminAuth().verifyIdToken(token)).uid;

    const body = await request.json();
    const verdict = body.verdict as 'approved' | 'rejected' | undefined;
    const rationale = typeof body.rationale === 'string' ? body.rationale.trim() : '';

    if (verdict !== 'approved' && verdict !== 'rejected') {
      return NextResponse.json({ error: "verdict must be 'approved' or 'rejected'" }, { status: 400 });
    }
    if (rationale.length < 10) {
      return NextResponse.json({ error: 'Rationale moet minstens 10 tekens bevatten' }, { status: 400 });
    }

    const { userId, disputeId } = await params;
    const db = getAdminDb();

    // Find the dispute via a collectionGroup lookup — faster than scanning
    const disputeSnap = await db
      .collectionGroup('disputes')
      .where('userId', '==', userId)
      .get();
    const disputeDoc = disputeSnap.docs.find(d => d.id === disputeId);
    if (!disputeDoc) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }
    const dispute = disputeDoc.data();
    if (dispute.status !== 'needs-human') {
      return NextResponse.json(
        { error: 'Deze dispute is al afgehandeld.' },
        { status: 400 },
      );
    }

    const cvId = dispute.cvId;
    const cvRef = db.collection('users').doc(userId).collection('cvs').doc(cvId);
    const cvDoc = await cvRef.get();
    if (!cvDoc.exists) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }
    const cvData = cvDoc.data() as Partial<CV>;

    // Update dispute record
    await disputeDoc.ref.update({
      status: verdict,
      adminVerdict: verdict,
      adminRationale: rationale,
      adminUserId: adminUid,
      resolvedAt: AdminTimestamp.now(),
    });

    if (verdict === 'rejected') {
      await cvRef.update({
        activeDisputeId: null,
        activeDisputeStatus: 'rejected',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ status: 'rejected', disputeId });
    }

    // Approved — regenerate the CV at the requested creativity level
    if (!cvData.generatedContent || !cvData.linkedInData) {
      return NextResponse.json({ error: 'CV heeft geen content om te regenereren' }, { status: 400 });
    }

    const newLevel = dispute.requestedLevel as StyleCreativityLevel;

    // Resolve provider for the ORIGINAL user (so we use their platform access
    // or their own API key — not the admin's).
    let resolved;
    try {
      resolved = await resolveProvider({ userId, skipCreditDeduction: true });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    const profileSummary = createLinkedInSummaryV2(cvData.linkedInData);
    const styleResult = await generateDesignTokens(
      profileSummary,
      cvData.jobVacancy || null,
      resolved.providerName as Parameters<typeof generateDesignTokens>[2],
      resolved.apiKey,
      resolved.model,
      undefined,
      newLevel,
      !!cvData.avatarUrl,
      cvData.designTokens ? [cvData.designTokens] : undefined,
    );
    const cvResult = await generateCV(
      cvData.linkedInData,
      cvData.jobVacancy || null,
      resolved.providerName as Parameters<typeof generateCV>[2],
      resolved.apiKey,
      resolved.model,
      undefined,
      cvData.language || 'nl',
      'bullets',
      cvData.fitAnalysis || null,
    );

    await cvRef.update({
      generatedContent: cvResult.content,
      designTokens: styleResult.tokens,
      creativityLevel: newLevel,
      creativityLevelHistory: FieldValue.arrayUnion(newLevel),
      status: 'generated',
      pdfUrl: null,
      elementOverrides: FieldValue.delete(),
      activeDisputeId: null,
      activeDisputeStatus: 'approved',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ status: 'approved', disputeId, newLevel });
  } catch (error) {
    console.error('[Admin Disputes] resolve error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
