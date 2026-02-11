import { getAdminAuth, getAdminDb } from './admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UserRole } from '@/types';

// Admin user list response type
export interface AdminUser {
  uid: string;
  email: string | undefined;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  disabled: boolean;
  disabledReason?: string;
  disabledAt?: Date;
  role: UserRole;
  credits: {
    free: number;
    purchased: number;
    total: number;
  };
  createdAt: Date;
  lastSignIn: Date | null;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  nextPageToken?: string;
  totalCount?: number;
}

/**
 * Verify if a request has admin privileges
 * Checks both Firebase Auth custom claims and Firestore role field
 */
export async function verifyAdminRequest(token: string): Promise<boolean> {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // First check custom claims (fastest)
    if (decodedToken.admin === true) {
      return true;
    }

    // Fall back to Firestore role check
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return false;
    }

    const userData = userDoc.data();
    return userData?.role === 'admin';
  } catch (error) {
    console.error('[Admin] Token verification failed:', error);
    return false;
  }
}

/**
 * Get user ID from token
 */
export async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('[Admin] Failed to get user ID from token:', error);
    return null;
  }
}

/**
 * Set user role (both custom claims and Firestore)
 */
export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const auth = getAdminAuth();
  const db = getAdminDb();

  // Update custom claims
  await auth.setCustomUserClaims(userId, { admin: role === 'admin' });

  // Update Firestore
  await db.collection('users').doc(userId).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`[Admin] Set role ${role} for user ${userId}`);
}

/**
 * Disable a user account
 */
export async function disableUser(userId: string, reason?: string): Promise<void> {
  const auth = getAdminAuth();
  const db = getAdminDb();

  // Disable in Firebase Auth
  await auth.updateUser(userId, { disabled: true });

  // Update Firestore with disable info
  await db.collection('users').doc(userId).update({
    disabled: true,
    disabledAt: FieldValue.serverTimestamp(),
    disabledReason: reason || 'Disabled by admin',
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`[Admin] Disabled user ${userId}: ${reason || 'No reason provided'}`);
}

/**
 * Enable a user account
 */
export async function enableUser(userId: string): Promise<void> {
  const auth = getAdminAuth();
  const db = getAdminDb();

  // Enable in Firebase Auth
  await auth.updateUser(userId, { disabled: false });

  // Update Firestore
  await db.collection('users').doc(userId).update({
    disabled: false,
    disabledAt: FieldValue.delete(),
    disabledReason: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`[Admin] Enabled user ${userId}`);
}

/**
 * Get all users with pagination
 */
export async function getAllUsers(
  limit: number = 50,
  pageToken?: string
): Promise<AdminUserListResponse> {
  const auth = getAdminAuth();
  const db = getAdminDb();

  // Get users from Firebase Auth
  const listResult = await auth.listUsers(limit, pageToken);

  // Get Firestore data for all users
  const userIds = listResult.users.map(u => u.uid);
  const firestoreDataMap = new Map<string, Record<string, unknown>>();

  // Batch fetch Firestore data
  if (userIds.length > 0) {
    // Firestore doesn't support getting multiple docs by ID in one call,
    // so we need to fetch them individually or use a query
    const usersSnapshot = await db.collection('users')
      .where('__name__', 'in', userIds.slice(0, 10)) // Firestore 'in' query limit is 10
      .get();

    usersSnapshot.docs.forEach(doc => {
      firestoreDataMap.set(doc.id, doc.data());
    });

    // Fetch remaining users in batches of 10
    for (let i = 10; i < userIds.length; i += 10) {
      const batch = userIds.slice(i, i + 10);
      if (batch.length > 0) {
        const batchSnapshot = await db.collection('users')
          .where('__name__', 'in', batch)
          .get();
        batchSnapshot.docs.forEach(doc => {
          firestoreDataMap.set(doc.id, doc.data());
        });
      }
    }
  }

  // Combine data
  const users: AdminUser[] = listResult.users.map(authUser => {
    const firestoreData = firestoreDataMap.get(authUser.uid) || {};
    const credits = (firestoreData.credits || {}) as { free?: number; purchased?: number };

    return {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName || (firestoreData.displayName as string | null) || null,
      photoURL: authUser.photoURL || (firestoreData.photoURL as string | null) || null,
      emailVerified: authUser.emailVerified,
      disabled: authUser.disabled || (firestoreData.disabled as boolean) || false,
      disabledReason: firestoreData.disabledReason as string | undefined,
      disabledAt: firestoreData.disabledAt
        ? (firestoreData.disabledAt as Timestamp).toDate()
        : undefined,
      role: (firestoreData.role as UserRole) || 'user',
      credits: {
        free: credits.free || 0,
        purchased: credits.purchased || 0,
        total: (credits.free || 0) + (credits.purchased || 0),
      },
      createdAt: new Date(authUser.metadata.creationTime || Date.now()),
      lastSignIn: authUser.metadata.lastSignInTime
        ? new Date(authUser.metadata.lastSignInTime)
        : null,
    };
  });

  return {
    users,
    nextPageToken: listResult.pageToken,
  };
}

/**
 * Get a single user by ID
 */
export async function getUserById(userId: string): Promise<AdminUser | null> {
  const auth = getAdminAuth();
  const db = getAdminDb();

  try {
    const [authUser, firestoreDoc] = await Promise.all([
      auth.getUser(userId),
      db.collection('users').doc(userId).get(),
    ]);

    const firestoreData = firestoreDoc.data() || {};
    const credits = (firestoreData.credits || {}) as { free?: number; purchased?: number };

    return {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName || (firestoreData.displayName as string | null) || null,
      photoURL: authUser.photoURL || (firestoreData.photoURL as string | null) || null,
      emailVerified: authUser.emailVerified,
      disabled: authUser.disabled || (firestoreData.disabled as boolean) || false,
      disabledReason: firestoreData.disabledReason as string | undefined,
      disabledAt: firestoreData.disabledAt
        ? (firestoreData.disabledAt as Timestamp).toDate()
        : undefined,
      role: (firestoreData.role as UserRole) || 'user',
      credits: {
        free: credits.free || 0,
        purchased: credits.purchased || 0,
        total: (credits.free || 0) + (credits.purchased || 0),
      },
      createdAt: new Date(authUser.metadata.creationTime || Date.now()),
      lastSignIn: authUser.metadata.lastSignInTime
        ? new Date(authUser.metadata.lastSignInTime)
        : null,
    };
  } catch (error) {
    console.error(`[Admin] Failed to get user ${userId}:`, error);
    return null;
  }
}

/**
 * Update user credits
 */
export async function updateUserCredits(
  userId: string,
  free: number,
  purchased: number
): Promise<void> {
  const db = getAdminDb();

  // Use set with merge so it works even if Firestore doc doesn't exist yet
  await db.collection('users').doc(userId).set({
    credits: { free, purchased },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`[Admin] Updated credits for user ${userId}: free=${free}, purchased=${purchased}`);
}

/**
 * Delete a user completely (Firebase Auth + Firestore)
 */
export async function deleteUser(userId: string): Promise<void> {
  const auth = getAdminAuth();
  const db = getAdminDb();

  // Delete from Firebase Auth
  await auth.deleteUser(userId);

  // Delete from Firestore
  await db.collection('users').doc(userId).delete();

  // Also delete related collections (CVs, profiles, transactions)
  const batch = db.batch();

  // Delete CVs
  const cvsSnapshot = await db.collection('users').doc(userId).collection('cvs').get();
  cvsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  // Delete profiles
  const profilesSnapshot = await db.collection('users').doc(userId).collection('profiles').get();
  profilesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  // Delete transactions
  const transactionsSnapshot = await db.collection('users').doc(userId).collection('transactions').get();
  transactionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  // Delete templates
  const templatesSnapshot = await db.collection('users').doc(userId).collection('templates').get();
  templatesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

  await batch.commit();

  console.log(`[Admin] Deleted user ${userId} and all associated data`);
}

// Admin CV list response type
export interface AdminCV {
  cvId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  status: string;
  jobTitle: string | null;
  llmProvider: string | null;
  llmModel: string | null;
  createdAt: Date;
}

export interface AdminCVListResponse {
  cvs: AdminCV[];
  total: number;
}

/**
 * Get all CVs across all users (admin only)
 * Uses collectionGroup query for reliable cross-user CV retrieval
 */
export async function getAllCVs(
  limit: number = 100,
  userIdFilter?: string,
  statusFilter?: string
): Promise<AdminCVListResponse> {
  const auth = getAdminAuth();
  const db = getAdminDb();

  const allCvs: AdminCV[] = [];

  if (userIdFilter) {
    // Fetch CVs for a specific user
    const userRecord = await auth.getUser(userIdFilter).catch(() => null);
    if (!userRecord) return { cvs: [], total: 0 };

    let query = db.collection('users').doc(userIdFilter).collection('cvs')
      .orderBy('createdAt', 'desc');

    if (statusFilter) {
      query = db.collection('users').doc(userIdFilter).collection('cvs')
        .where('status', '==', statusFilter)
        .orderBy('createdAt', 'desc');
    }

    const snapshot = await query.get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      allCvs.push({
        cvId: doc.id,
        userId: userIdFilter,
        userEmail: userRecord.email || 'Unknown',
        userDisplayName: userRecord.displayName || null,
        status: data.status || 'unknown',
        jobTitle: data.jobVacancy?.title || null,
        llmProvider: data.llmProvider || null,
        llmModel: data.llmModel || null,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    }
  } else {
    // Use collectionGroup to query ALL cvs across all users
    let query: FirebaseFirestore.Query = db.collectionGroup('cvs')
      .orderBy('createdAt', 'desc');

    if (statusFilter) {
      query = db.collectionGroup('cvs')
        .where('status', '==', statusFilter)
        .orderBy('createdAt', 'desc');
    }

    const snapshot = await query.get();

    // Collect unique userIds to batch-fetch user info
    const userIds = new Set<string>();
    const cvDocs: { doc: FirebaseFirestore.QueryDocumentSnapshot; userId: string }[] = [];

    for (const doc of snapshot.docs) {
      // Path: users/{userId}/cvs/{cvId}
      const userId = doc.ref.parent.parent?.id;
      if (!userId) continue;
      userIds.add(userId);
      cvDocs.push({ doc, userId });
    }

    // Batch-fetch user info from Auth
    const userInfoMap = new Map<string, { email: string; displayName: string | null }>();
    const userIdArray = Array.from(userIds);

    // Fetch in batches of 100 (Firebase Auth getUsers limit)
    for (let i = 0; i < userIdArray.length; i += 100) {
      const batch = userIdArray.slice(i, i + 100);
      const identifiers = batch.map(uid => ({ uid }));
      try {
        const result = await auth.getUsers(identifiers);
        for (const userRecord of result.users) {
          userInfoMap.set(userRecord.uid, {
            email: userRecord.email || 'Unknown',
            displayName: userRecord.displayName || null,
          });
        }
      } catch {
        // Fall back to individual lookups if batch fails
        for (const uid of batch) {
          try {
            const userRecord = await auth.getUser(uid);
            userInfoMap.set(uid, {
              email: userRecord.email || 'Unknown',
              displayName: userRecord.displayName || null,
            });
          } catch {
            userInfoMap.set(uid, { email: 'Unknown', displayName: null });
          }
        }
      }
    }

    // Build CV list
    for (const { doc, userId } of cvDocs) {
      const data = doc.data();
      const userInfo = userInfoMap.get(userId) || { email: 'Unknown', displayName: null };
      allCvs.push({
        cvId: doc.id,
        userId,
        userEmail: userInfo.email,
        userDisplayName: userInfo.displayName,
        status: data.status || 'unknown',
        jobTitle: data.jobVacancy?.title || null,
        llmProvider: data.llmProvider || null,
        llmModel: data.llmModel || null,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    }
  }

  // Sort all CVs by createdAt descending
  allCvs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    cvs: allCvs.slice(0, limit),
    total: allCvs.length,
  };
}

/**
 * Get a specific CV with full data (admin only)
 */
export async function getAdminCVFull(userId: string, cvId: string): Promise<Record<string, unknown> | null> {
  const db = getAdminDb();
  const doc = await db.collection('users').doc(userId).collection('cvs').doc(cvId).get();

  if (!doc.exists) return null;

  const data = doc.data()!;

  // Convert Timestamps to serializable dates
  const convertTimestamps = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
        result[key] = (value as Timestamp).toDate().toISOString();
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = convertTimestamps(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return { id: doc.id, ...convertTimestamps(data) };
}

/**
 * Delete a specific CV (admin only)
 */
export async function deleteAdminCV(userId: string, cvId: string): Promise<void> {
  const db = getAdminDb();
  await db.collection('users').doc(userId).collection('cvs').doc(cvId).delete();
  console.log(`[Admin] Deleted CV ${cvId} for user ${userId}`);
}

/**
 * Setup initial admin user based on ADMIN_EMAIL env var
 * This should only be called once during initial setup
 */
export async function setupInitialAdmin(requestingUserEmail: string): Promise<{ success: boolean; message: string }> {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    return { success: false, message: 'ADMIN_EMAIL environment variable not set' };
  }

  if (requestingUserEmail !== adminEmail) {
    return { success: false, message: 'Your email does not match the configured admin email' };
  }

  const auth = getAdminAuth();
  const db = getAdminDb();

  try {
    // Find the user by email
    const userRecord = await auth.getUserByEmail(adminEmail);

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });

    // Update Firestore
    await db.collection('users').doc(userRecord.uid).update({
      role: 'admin',
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[Admin] Initial admin setup completed for ${adminEmail}`);
    return { success: true, message: `Admin role granted to ${adminEmail}. Please log out and log back in for changes to take effect.` };
  } catch (error) {
    console.error('[Admin] Initial admin setup failed:', error);
    return { success: false, message: 'Failed to set up admin user. Make sure the user exists.' };
  }
}
