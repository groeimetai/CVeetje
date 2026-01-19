import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userId = decodedClaims.uid;

    // Delete all user data in Firestore
    const batch = adminDb.batch();

    // 1. Delete all CVs
    const cvsSnapshot = await adminDb.collection('users').doc(userId).collection('cvs').get();
    cvsSnapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
    });

    // 2. Delete all profiles
    const profilesSnapshot = await adminDb.collection('users').doc(userId).collection('profiles').get();
    profilesSnapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
    });

    // 3. Delete all transactions
    const transactionsSnapshot = await adminDb.collection('users').doc(userId).collection('transactions').get();
    transactionsSnapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
    });

    // 4. Delete the user document itself
    batch.delete(adminDb.collection('users').doc(userId));

    // Execute the batch delete
    await batch.commit();

    // 5. Delete the Firebase Auth user
    await adminAuth.deleteUser(userId);

    // 6. Clear the session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('session', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
