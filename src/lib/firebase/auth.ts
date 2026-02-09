'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendEmailVerification as firebaseSendEmailVerification,
} from 'firebase/auth';
import { auth } from './config';

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Initialize user document via server API (Admin SDK bypasses Firestore rules)
async function initUserDocument(firebaseUser: FirebaseUser): Promise<void> {
  const token = await firebaseUser.getIdToken();
  const response = await fetch('/api/auth/init-user', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    console.error('[Auth] Failed to init user document:', data.error);
    // Don't throw — the user is already authenticated, the doc will be
    // created on next sign-in or via admin. Throwing here would show
    // "Google inloggen mislukt" even though auth succeeded.
  }
}

/**
 * Verify reCAPTCHA token before authentication
 * Returns true if verification passes or is not configured
 */
async function verifyCaptcha(token: string | null, action: string): Promise<void> {
  // Skip if no token (reCAPTCHA not configured)
  if (!token) {
    return;
  }

  const response = await fetch('/api/auth/verify-captcha', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, action }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Security verification failed');
  }
}

// Email/Password Registration with reCAPTCHA
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
  captchaToken?: string | null
): Promise<FirebaseUser> {
  // Verify reCAPTCHA first
  await verifyCaptcha(captchaToken || null, 'register');

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Update display name
  await updateProfile(userCredential.user, { displayName });

  // Create user document
  await initUserDocument(userCredential.user);

  // Send email verification
  await firebaseSendEmailVerification(userCredential.user, {
    url: `${window.location.origin}/dashboard`,
    handleCodeInApp: false,
  });

  return userCredential.user;
}

// Send email verification (for resend functionality)
export async function sendEmailVerification(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user logged in');
  }
  if (user.emailVerified) {
    throw new Error('Email already verified');
  }
  await firebaseSendEmailVerification(user, {
    url: `${window.location.origin}/dashboard`,
    handleCodeInApp: false,
  });
}

// Email/Password Sign In with reCAPTCHA
export async function signInWithEmail(
  email: string,
  password: string,
  captchaToken?: string | null
): Promise<FirebaseUser> {
  // Verify reCAPTCHA first
  await verifyCaptcha(captchaToken || null, 'login');

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Google Sign In (OAuth has built-in bot protection)
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const userCredential = await signInWithPopup(auth, googleProvider);
  await initUserDocument(userCredential.user);
  return userCredential.user;
}

// Apple Sign In (OAuth has built-in bot protection)
export async function signInWithApple(): Promise<FirebaseUser> {
  const userCredential = await signInWithPopup(auth, appleProvider);
  await initUserDocument(userCredential.user);
  return userCredential.user;
}

// Sign Out
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// Auth State Observer
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// Get Current User
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

// Map Firebase error codes to i18n translation keys
const firebaseErrorMap: Record<string, string> = {
  'auth/invalid-credential': 'firebaseInvalidCredential',
  'auth/user-not-found': 'firebaseUserNotFound',
  'auth/wrong-password': 'firebaseWrongPassword',
  'auth/email-already-in-use': 'firebaseEmailInUse',
  'auth/too-many-requests': 'firebaseTooManyRequests',
  'auth/user-disabled': 'firebaseUserDisabled',
  'auth/network-request-failed': 'firebaseNetworkError',
  'auth/popup-closed-by-user': 'firebasePopupClosed',
  'auth/cancelled-popup-request': 'firebasePopupClosed',
  'auth/weak-password': 'firebaseWeakPassword',
  'auth/invalid-email': 'firebaseInvalidCredential',
};

/**
 * Extract a translation key from a Firebase error.
 * Returns the key (e.g. "firebaseInvalidCredential") or null if unknown.
 */
export function getFirebaseErrorKey(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    return firebaseErrorMap[code] ?? null;
  }
  // Firebase errors sometimes only expose the code inside the message
  if (error instanceof Error) {
    const match = error.message.match(/\(auth\/[\w-]+\)/);
    if (match) {
      const code = match[0].slice(1, -1); // strip parens
      return firebaseErrorMap[code] ?? null;
    }
  }
  return null;
}
