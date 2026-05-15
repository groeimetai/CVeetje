import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NextRequest } from 'next/server';

/**
 * Admin audit log — AVG art. 32 lid 1 sub b/d (passende technische maatregelen).
 *
 * Schrijft één onveranderlijke entry naar `admin_audit_log/{auto-id}` voor elke
 * gevoelige admin-actie. Bedoeld voor accountability bij toegang tot
 * persoonsgegevens van eindgebruikers — vooral impersonation en mutaties
 * op andere user accounts.
 *
 * Niet bedoeld voor read-only listings (te ruisig). Wel voor:
 * - impersonation start/stop
 * - user credit-mutaties
 * - role-changes
 * - kanban-card create/edit/delete (kanban kan PII bevatten)
 * - feedback close + admin reply
 * - account deletion door admin
 * - template publish/unpublish
 *
 * Fire-and-forget: log failures naar console, throw niet — een audit-fout
 * mag de feitelijke actie niet blokkeren.
 */

export type AdminAction =
  | 'impersonate.start'
  | 'impersonate.stop'
  | 'user.credits.update'
  | 'user.role.update'
  | 'user.delete'
  | 'user.disable'
  | 'user.enable'
  | 'kanban.card.create'
  | 'kanban.card.update'
  | 'kanban.card.delete'
  | 'feedback.update'
  | 'feedback.delete'
  | 'template.publish'
  | 'template.unpublish'
  | 'platform-config.update';

export interface AuditLogEntry {
  adminUid: string;
  action: AdminAction;
  /** UID van het user-document waarop de actie wordt uitgevoerd, indien van toepassing. */
  targetUid?: string;
  /** Vrije metadata — geen wachtwoorden, API-keys of plain tokens. */
  metadata?: Record<string, unknown>;
  /** IP-adres uit X-Forwarded-For of remoteAddress. */
  ip?: string;
  /** User-Agent string. */
  userAgent?: string;
}

export function extractRequestContext(request: NextRequest): { ip?: string; userAgent?: string } {
  const fwd = request.headers.get('x-forwarded-for');
  const ip = fwd ? fwd.split(',')[0].trim() : undefined;
  const userAgent = request.headers.get('user-agent') ?? undefined;
  return { ip, userAgent };
}

export function logAdminAction(entry: AuditLogEntry): void {
  const db = getAdminDb();
  db.collection('admin_audit_log')
    .add({
      ...entry,
      metadata: entry.metadata ?? null,
      targetUid: entry.targetUid ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      createdAt: FieldValue.serverTimestamp(),
    })
    .catch((err) => {
      console.error('[AuditLog] Failed to write entry', entry.action, err);
    });
}
