import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;
let adminStorage: Storage;

function getAdminApp(): App {
  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    adminApp = getApps()[0];
  }
  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
    // Bug-fix: `initializeFirestore(app, { ignoreUndefinedProperties })` van
    // firebase-admin geeft deze optie NIET door aan @google-cloud/firestore —
    // de instelling stond dus nooit aan en writes met optionele `undefined`-
    // velden faalden (dispute-regeneratie, admin-audit-log, ...). settings()
    // werkt wel, maar mag maar één keer en vóór het eerste gebruik. De
    // Firestore-instance is gedeeld per app; een tweede module-instantie die
    // hier komt krijgt een throw → die instance is dan al geconfigureerd.
    try {
      adminDb.settings({ ignoreUndefinedProperties: true });
    } catch {
      /* al geconfigureerd door een eerdere module-instantie */
    }
  }
  return adminDb;
}

export function getAdminStorage(): Storage {
  if (!adminStorage) {
    adminStorage = getStorage(getAdminApp());
  }
  return adminStorage;
}
