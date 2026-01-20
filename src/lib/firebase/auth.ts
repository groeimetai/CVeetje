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
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from './config';
import type { User } from '@/types';

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Create user document in Firestore
async function createUserDocument(firebaseUser: FirebaseUser): Promise<void> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const userData: Omit<User, 'createdAt' | 'updatedAt'> & { createdAt: ReturnType<typeof serverTimestamp>; updatedAt: ReturnType<typeof serverTimestamp> } = {
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      apiKey: null,
      credits: {
        free: 5,        // 5 free monthly credits
        purchased: 0,   // No purchased credits yet
        lastFreeReset: Timestamp.now(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, userData);
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
  await createUserDocument(userCredential.user);

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
  await createUserDocument(userCredential.user);
  return userCredential.user;
}

// Apple Sign In (OAuth has built-in bot protection)
export async function signInWithApple(): Promise<FirebaseUser> {
  const userCredential = await signInWithPopup(auth, appleProvider);
  await createUserDocument(userCredential.user);
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
