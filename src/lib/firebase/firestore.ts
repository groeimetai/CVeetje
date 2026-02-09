'use client';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import type {
  User,
  CV,
  CreditTransaction,
  UserApiKey,
  ParsedLinkedIn,
  JobVacancy,
  CVTemplate,
  CVColorScheme,
  CVStyleConfig,
  GeneratedCVContent,
} from '@/types';

// ============ User Operations ============

export async function getUserData(userId: string): Promise<User | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as User;
  }
  return null;
}

export async function updateUserApiKey(
  userId: string,
  apiKey: UserApiKey
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    apiKey,
    updatedAt: serverTimestamp(),
  });
}

export async function removeUserApiKey(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    apiKey: null,
    updatedAt: serverTimestamp(),
  });
}

// ============ Credits Operations ============

export async function getUserCredits(userId: string): Promise<number> {
  const userData = await getUserData(userId);
  // Return total: free + purchased (backward compatible with old balance field)
  const free = userData?.credits?.free ?? 0;
  const purchased = userData?.credits?.purchased ?? 0;
  const legacyBalance = userData?.credits?.balance ?? 0;
  // If new fields exist, use them; otherwise fall back to legacy balance
  if (free > 0 || purchased > 0 || (userData?.credits?.free !== undefined)) {
    return free + purchased;
  }
  return legacyBalance;
}

export interface CreditBreakdown {
  free: number;
  purchased: number;
  total: number;
}

export async function getUserCreditsBreakdown(userId: string): Promise<CreditBreakdown> {
  const userData = await getUserData(userId);
  const free = userData?.credits?.free ?? 0;
  const purchased = userData?.credits?.purchased ?? 0;
  return {
    free,
    purchased,
    total: free + purchased,
  };
}

export async function deductCredit(
  userId: string,
  amount: number,
  cvId: string
): Promise<boolean> {
  const userData = await getUserData(userId);
  const freeCredits = userData?.credits?.free ?? 0;
  const purchasedCredits = userData?.credits?.purchased ?? 0;
  const totalCredits = freeCredits + purchasedCredits;

  if (!userData || totalCredits < amount) {
    return false;
  }

  const userRef = doc(db, 'users', userId);

  // Deduct from free credits first, then purchased
  if (freeCredits >= amount) {
    await updateDoc(userRef, {
      'credits.free': freeCredits - amount,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Use all free credits and deduct remainder from purchased
    const remainingToDeduct = amount - freeCredits;
    await updateDoc(userRef, {
      'credits.free': 0,
      'credits.purchased': purchasedCredits - remainingToDeduct,
      updatedAt: serverTimestamp(),
    });
  }

  // Log transaction
  const creditSource = freeCredits >= amount ? 'free' : 'mixed';
  await addCreditTransaction(userId, {
    amount: -amount,
    type: 'cv_generation',
    description: `CV PDF generation (${creditSource} credit)`,
    molliePaymentId: null,
    cvId,
    createdAt: Timestamp.now(),
  });

  return true;
}

export async function addCredits(
  userId: string,
  amount: number,
  molliePaymentId: string
): Promise<void> {
  const userData = await getUserData(userId);
  if (!userData) return;

  const currentPurchased = userData.credits?.purchased ?? 0;

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    'credits.purchased': currentPurchased + amount,
    updatedAt: serverTimestamp(),
  });

  // Log transaction
  await addCreditTransaction(userId, {
    amount,
    type: 'purchase',
    description: `Purchased ${amount} credits`,
    molliePaymentId,
    cvId: null,
    createdAt: Timestamp.now(),
  });
}

export async function resetMonthlyCredits(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  const FREE_CREDITS_AMOUNT = 10;
  const currentFree = userData?.credits?.free ?? 0;

  // Reset free credits to 10 (this is a separate bucket from purchased)
  // Purchased credits are never touched
  await updateDoc(userRef, {
    'credits.free': FREE_CREDITS_AMOUNT,
    'credits.lastFreeReset': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Log transaction with credits added (5 minus what they had left)
  const creditsAdded = FREE_CREDITS_AMOUNT - currentFree;
  if (creditsAdded > 0) {
    await addCreditTransaction(userId, {
      amount: creditsAdded,
      type: 'monthly_free',
      description: `Monthly free credits reset (${currentFree} → ${FREE_CREDITS_AMOUNT})`,
      molliePaymentId: null,
      cvId: null,
      createdAt: Timestamp.now(),
    });
  }
}

// ============ Transaction Operations ============

export async function addCreditTransaction(
  userId: string,
  transaction: CreditTransaction
): Promise<string> {
  const transactionsRef = collection(db, 'users', userId, 'transactions');
  const docRef = await addDoc(transactionsRef, transaction);
  return docRef.id;
}

export async function getTransactionHistory(
  userId: string
): Promise<CreditTransaction[]> {
  const transactionsRef = collection(db, 'users', userId, 'transactions');
  const q = query(transactionsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CreditTransaction[];
}

// ============ CV Operations ============

export async function createCV(
  userId: string,
  linkedInData: ParsedLinkedIn,
  jobVacancy: JobVacancy | null,
  template: CVTemplate,
  colorScheme: CVColorScheme,
  styleConfig?: CVStyleConfig | null,
  avatarUrl?: string | null
): Promise<string> {
  const cvsRef = collection(db, 'users', userId, 'cvs');

  const cvData: Omit<CV, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: ReturnType<typeof serverTimestamp>; updatedAt: ReturnType<typeof serverTimestamp> } = {
    linkedInData,
    jobVacancy,
    template,
    colorScheme,
    brandStyle: null,
    styleConfig: styleConfig || null,
    avatarUrl: avatarUrl || null,
    generatedContent: null,
    pdfUrl: null,
    status: 'draft',
    llmProvider: null,
    llmModel: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(cvsRef, cvData);
  return docRef.id;
}

export async function getCV(userId: string, cvId: string): Promise<CV | null> {
  const cvRef = doc(db, 'users', userId, 'cvs', cvId);
  const cvSnap = await getDoc(cvRef);

  if (cvSnap.exists()) {
    return { id: cvSnap.id, ...cvSnap.data() } as CV;
  }
  return null;
}

export async function getUserCVs(userId: string): Promise<CV[]> {
  const cvsRef = collection(db, 'users', userId, 'cvs');
  const q = query(cvsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CV[];
}

export async function updateCVStatus(
  userId: string,
  cvId: string,
  status: CV['status']
): Promise<void> {
  const cvRef = doc(db, 'users', userId, 'cvs', cvId);
  await updateDoc(cvRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function updateCVGeneratedContent(
  userId: string,
  cvId: string,
  generatedContent: GeneratedCVContent,
  llmProvider: string,
  llmModel: string
): Promise<void> {
  const cvRef = doc(db, 'users', userId, 'cvs', cvId);
  await updateDoc(cvRef, {
    generatedContent,
    llmProvider,
    llmModel,
    status: 'generated',
    updatedAt: serverTimestamp(),
  });
}

export async function updateCVPdfUrl(
  userId: string,
  cvId: string,
  pdfUrl: string
): Promise<void> {
  const cvRef = doc(db, 'users', userId, 'cvs', cvId);
  await updateDoc(cvRef, {
    pdfUrl,
    status: 'pdf_ready',
    updatedAt: serverTimestamp(),
  });
}

export async function updateCV(
  userId: string,
  cvId: string,
  updates: Partial<CV>
): Promise<void> {
  const cvRef = doc(db, 'users', userId, 'cvs', cvId);
  await updateDoc(cvRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCV(userId: string, cvId: string): Promise<void> {
  const cvRef = doc(db, 'users', userId, 'cvs', cvId);
  await deleteDoc(cvRef);
}
