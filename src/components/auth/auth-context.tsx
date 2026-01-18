'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/firebase/auth';
import { getUserData, getUserCredits } from '@/lib/firebase/firestore';
import { checkAndResetMonthlyCredits } from '@/lib/credits/manager';
import type { User } from '@/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userData: User | null;
  credits: number;
  loading: boolean;
  refreshCredits: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async () => {
    if (firebaseUser) {
      const data = await getUserData(firebaseUser.uid);
      setUserData(data);
      if (data?.credits?.balance !== undefined) {
        setCredits(data.credits.balance);
      }
    }
  };

  const refreshCredits = async () => {
    if (firebaseUser) {
      const balance = await getUserCredits(firebaseUser.uid);
      setCredits(balance);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setFirebaseUser(user);

      if (user) {
        // Get and store the ID token as a cookie for API routes
        try {
          const token = await user.getIdToken();
          document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Strict`;
        } catch (error) {
          console.error('Failed to get ID token:', error);
        }

        // Check for monthly credit reset
        await checkAndResetMonthlyCredits(user.uid);

        // Fetch user data
        const data = await getUserData(user.uid);
        setUserData(data);
        if (data?.credits?.balance !== undefined) {
          setCredits(data.credits.balance);
        }
      } else {
        // Clear the token cookie on logout
        document.cookie = 'firebase-token=; path=/; max-age=0';
        setUserData(null);
        setCredits(0);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userData,
        credits,
        loading,
        refreshCredits,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
