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
        balance: 5, // 5 free credits
        lastFreeReset: Timestamp.now(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, userData);
  }
}

// Email/Password Registration
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Update display name
  await updateProfile(userCredential.user, { displayName });

  // Create user document
  await createUserDocument(userCredential.user);

  return userCredential.user;
}

// Email/Password Sign In
export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Google Sign In
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const userCredential = await signInWithPopup(auth, googleProvider);
  await createUserDocument(userCredential.user);
  return userCredential.user;
}

// Apple Sign In
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
