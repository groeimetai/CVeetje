import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb, getAdminStorage } from '@/lib/firebase/admin';

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    // Use firebase-token (ID token) instead of session cookie
    const token = cookieStore.get('firebase-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Verify the ID token
    let userId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Delete user's avatar from Firebase Storage
    try {
      const storage = getAdminStorage();
      const bucket = storage.bucket();
      const avatarPrefix = `avatars/${userId}/`;

      // List and delete all files with the user's avatar prefix
      const [files] = await bucket.getFiles({ prefix: avatarPrefix });
      if (files.length > 0) {
        await Promise.all(files.map(file => file.delete()));
        console.log(`Deleted ${files.length} avatar files for user ${userId}`);
      }
    } catch (storageError) {
      // Log but don't fail - storage deletion is best effort
      console.error('Error deleting user avatars from storage:', storageError);
    }

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

    // 6. Clear the firebase-token cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('firebase-token', '', {
      maxAge: 0,
      httpOnly: false, // Must match how it was set
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    console.log(`Successfully deleted account for user ${userId}`);

    return response;
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
