import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GitHub webhook receiver — syncs issue state changes back to the in-app
 * feedback collection.
 *
 * Setup:
 *   1. Go to https://github.com/groeimetai/CVeetje/settings/hooks
 *   2. Add webhook:
 *      - Payload URL:     https://maakcveetje.nl/api/github/webhook
 *      - Content type:    application/json
 *      - Secret:          <same value as GITHUB_WEBHOOK_SECRET env var>
 *      - Events:          "Let me select individual events" → Issues
 *   3. Set GITHUB_WEBHOOK_SECRET in Cloud Run environment variables.
 *
 * Supported events: issues.closed, issues.reopened. Other actions are
 * acknowledged with a 200 but skipped, so we never block GitHub's retry
 * loop on events we don't care about.
 */

// Node runtime required for crypto and the firebase-admin SDK.
export const runtime = 'nodejs';

const GITHUB_REPO = 'groeimetai/CVeetje';

type FeedbackStatus =
  | 'new'
  | 'in_review'
  | 'planned'
  | 'in_progress'
  | 'resolved'
  | 'declined';

interface GitHubIssuePayload {
  action: string;
  issue?: {
    number?: number;
    state?: string;
    state_reason?: string | null;
  };
  repository?: {
    full_name?: string;
  };
}

/**
 * Verify GitHub's HMAC-SHA256 signature against the raw request body.
 * GitHub sends the signature in the `x-hub-signature-256` header as
 * `sha256=<hex>`. We compare with a constant-time comparison to avoid
 * timing attacks.
 */
function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const expected = 'sha256=' + hmac.update(rawBody).digest('hex');

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);

  if (expectedBuf.length !== actualBuf.length) return false;

  try {
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Map a GitHub issue action (+ state_reason for closed events) to the
 * corresponding feedback status.
 *
 * - closed + not_planned       → declined
 * - closed + completed / null  → resolved
 * - reopened                   → in_progress
 * - anything else              → null (no-op)
 */
function mapActionToStatus(
  action: string,
  stateReason: string | null,
): FeedbackStatus | null {
  if (action === 'closed') {
    if (stateReason === 'not_planned') return 'declined';
    return 'resolved';
  }
  if (action === 'reopened') {
    return 'in_progress';
  }
  return null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[GitHub Webhook] GITHUB_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook not configured on the server' },
      { status: 500 },
    );
  }

  // Read the raw body once for signature verification, then parse it
  // ourselves. request.json() would consume the stream and we'd lose the
  // raw bytes needed for HMAC.
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!verifySignature(rawBody, signature, secret)) {
    console.warn('[GitHub Webhook] Invalid or missing signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = request.headers.get('x-github-event');

  // GitHub sends a ping event when the webhook is first registered —
  // acknowledge it so the setup UI shows a green checkmark.
  if (event === 'ping') {
    return NextResponse.json({ ok: true, pong: true });
  }

  if (event !== 'issues') {
    return NextResponse.json({ ok: true, skipped: `event:${event}` });
  }

  let payload: GitHubIssuePayload;
  try {
    payload = JSON.parse(rawBody) as GitHubIssuePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Defense in depth: make sure the event is from our own repo, not a
  // misconfigured or spoofed webhook targeting a different repo.
  if (payload.repository?.full_name !== GITHUB_REPO) {
    return NextResponse.json({
      ok: true,
      skipped: `wrong-repo:${payload.repository?.full_name ?? 'unknown'}`,
    });
  }

  const action = payload.action;
  const issueNumber = payload.issue?.number;
  const stateReason = payload.issue?.state_reason ?? null;

  if (!issueNumber) {
    return NextResponse.json({ ok: true, skipped: 'missing-issue-number' });
  }

  const newStatus = mapActionToStatus(action, stateReason);
  if (!newStatus) {
    return NextResponse.json({ ok: true, skipped: `action:${action}` });
  }

  // Find the feedback document that was linked to this issue when it was
  // created. Feedback docs that were created manually in GitHub (without
  // going through /api/feedback) have no linked feedback and are silently
  // skipped.
  const db = getAdminDb();
  const snapshot = await db
    .collection('feedback')
    .where('githubIssueNumber', '==', issueNumber)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log(
      `[GitHub Webhook] No feedback doc linked to issue #${issueNumber}, skipping`,
    );
    return NextResponse.json({ ok: true, skipped: 'no-linked-feedback' });
  }

  const doc = snapshot.docs[0];
  await doc.ref.update({
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(
    `[GitHub Webhook] Issue #${issueNumber} ${action} → feedback ${doc.id} status=${newStatus}`,
  );

  return NextResponse.json({
    ok: true,
    feedbackId: doc.id,
    newStatus,
    issueNumber,
    action,
  });
}
