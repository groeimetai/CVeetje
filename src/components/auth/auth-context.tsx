'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  // Helper to set the token cookie
  const setTokenCookie = useCallback((token: string) => {
    // Set cookie to expire in 55 minutes (before the 1 hour Firebase token expiry)
    document.cookie = `firebase-token=${token}; path=/; max-age=3300; SameSite=Strict`;
  }, []);

  // Refresh the Firebase token and update the cookie
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!firebaseUser) return null;
    try {
      // Force refresh to get a new token
      const token = await firebaseUser.getIdToken(true);
      setTokenCookie(token);
      return token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }, [firebaseUser, setTokenCookie]);

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

  // Auth state change listener
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setFirebaseUser(user);

      if (user) {
        // Get and store the ID token as a cookie for API routes
        try {
          const token = await user.getIdToken();
          setTokenCookie(token);
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
  }, [setTokenCookie]);

  // Automatic token refresh every 50 minutes (before the 1 hour expiry)
  useEffect(() => {
    if (!firebaseUser) return;

    const refreshInterval = setInterval(async () => {
      console.log('[Auth] Auto-refreshing token...');
      await refreshToken();
    }, 50 * 60 * 1000); // 50 minutes

    return () => clearInterval(refreshInterval);
  }, [firebaseUser, refreshToken]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userData,
        credits,
        loading,
        refreshCredits,
        refreshUserData,
        refreshToken,
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
