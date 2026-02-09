import { getAdminDb } from '@/lib/firebase/admin';

/**
 * Queue an email by writing to the Firestore `mail` collection.
 * The Firebase "Trigger Email from Firestore" extension picks these up
 * and sends them via SMTP automatically.
 *
 * Fire-and-forget: logs errors but never throws.
 * Safe to call without await in API routes.
 */
export function queueEmail(
  to: string,
  subject: string,
  html: string,
): void {
  const db = getAdminDb();

  db.collection('mail')
    .add({
      to,
      message: { subject, html },
    })
    .catch((err) => {
      console.error(`[Email] Failed to queue "${subject}" to ${to}:`, err);
    });
}
