import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

/**
 * AVG art. 20 — recht op dataportabiliteit.
 *
 * Levert alle persoonsgegevens van de aangemelde gebruiker als
 * gestructureerd, machineleesbaar JSON-bestand. Bevat:
 * - account-document (zonder versleutelde API-keys)
 * - opgeslagen profielen
 * - opgeslagen CV's
 * - transacties
 * - applications (sollicitaties)
 * - feedback
 *
 * Versleutelde API-keys worden expliciet uitgesloten; die zijn alleen
 * leesbaar binnen ons eigen platform en hebben geen waarde voor de
 * gebruiker buiten CVeetje.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('firebase-token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  let userId: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    userId = decoded.uid;
    email = decoded.email;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const userRef = adminDb.collection('users').doc(userId);
  const [userSnap, profilesSnap, cvsSnap, transactionsSnap, applicationsSnap, feedbackSnap] = await Promise.all([
    userRef.get(),
    userRef.collection('profiles').get(),
    userRef.collection('cvs').get(),
    userRef.collection('transactions').get(),
    userRef.collection('applications').get().catch(() => null),
    userRef.collection('feedback').get().catch(() => null),
  ]);

  const account = userSnap.exists ? userSnap.data() ?? {} : {};
  // Strip versleutelde geheimen — die zijn geen "persoonsgegevens" in de
  // zin van portabiliteit, en exporteren brengt risico met zich mee.
  delete (account as Record<string, unknown>).encryptedApiKey;
  delete (account as Record<string, unknown>).apiKeyIv;
  delete (account as Record<string, unknown>).apiKeyTag;

  const serializeDocs = (snap: FirebaseFirestore.QuerySnapshot | null) =>
    snap ? snap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];

  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    subject: {
      uid: userId,
      email,
    },
    account,
    profiles: serializeDocs(profilesSnap),
    cvs: serializeDocs(cvsSnap),
    transactions: serializeDocs(transactionsSnap),
    applications: serializeDocs(applicationsSnap),
    feedback: serializeDocs(feedbackSnap),
    notes: {
      portability: 'AVG art. 20 — gestructureerd, gangbaar en machineleesbaar formaat (JSON).',
      excludedFields: ['encryptedApiKey', 'apiKeyIv', 'apiKeyTag'],
      thirdPartyData: 'Data verwerkt door subverwerkers (Anthropic, Mollie, Adzuna, GitHub) staat niet in deze export — vraag deze bij hen op via hun eigen portals.',
    },
  };

  const filename = `cveetje-export-${userId}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
