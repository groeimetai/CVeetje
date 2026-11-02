import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (typeof window !== 'undefined') {
  // Client-side initialization
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);

  // E2E / lokale ontwikkeling tegen de Firebase Emulator Suite. Wordt bij
  // `next build` ingebakken, dus de flag moet al bij de build gezet zijn.
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === '1') {
    const g = globalThis as { __cveetjeFirebaseEmulators?: boolean };
    if (!g.__cveetjeFirebaseEmulators) {
      const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
      const [fsHost, fsPort] = (process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
      connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
      connectFirestoreEmulator(db, fsHost, Number(fsPort));
      g.__cveetjeFirebaseEmulators = true;
    }
  }
}

export { app, auth, db };
export { firebaseConfig };
