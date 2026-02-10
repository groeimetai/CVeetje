import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface AdminEmail {
  id: string;
  to: string | string[];
  subject: string;
  html?: string;
  deliveryState: string | null;
  deliveryError: string | null;
  deliveryAttempts: number;
  deliveryStartTime: string | null;
  deliveryEndTime: string | null;
  deliveryInfo: Record<string, unknown> | null;
  createdAt: string | null;
}

/**
 * GET /api/admin/emails
 * Get list of all emails from the mail collection (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const isAdmin = await verifyAdminRequest(token);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const db = getAdminDb();
    // Note: the mail collection documents are created by queueEmail() without
    // a createdAt field. The Firebase "Trigger Email" extension adds
    // delivery.startTime/endTime later. We cannot orderBy a field that
    // doesn't exist on every document, so we fetch all and sort in JS.
    const snapshot = await db.collection('mail')
      .limit(limit)
      .get();

    const toTimestamp = (val: unknown): string | null => {
      if (!val) return null;
      if (val instanceof Timestamp) return val.toDate().toISOString();
      if (typeof val === 'object' && val !== null && 'toDate' in val) {
        return (val as Timestamp).toDate().toISOString();
      }
      if (typeof val === 'string') return val;
      return null;
    };

    const emails: AdminEmail[] = snapshot.docs.map(doc => {
      const data = doc.data();
      const delivery = data.delivery || {};
      const message = data.message || {};

      return {
        id: doc.id,
        to: data.to || message.to || '',
        subject: message.subject || '',
        html: message.html || '',
        deliveryState: delivery.state || null,
        deliveryError: delivery.error || null,
        deliveryAttempts: delivery.attempts || 0,
        deliveryStartTime: toTimestamp(delivery.startTime),
        deliveryEndTime: toTimestamp(delivery.endTime),
        deliveryInfo: delivery.info || null,
        createdAt: toTimestamp(data.createdAt) || toTimestamp(delivery.startTime),
      };
    });

    // Sort by most recent first (use createdAt which falls back to delivery.startTime)
    emails.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({
      emails,
      total: emails.length,
    });
  } catch (error) {
    console.error('[Admin API] Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
