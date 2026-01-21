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
import { onAuthStateChange, signOut as firebaseSignOut } from '@/lib/firebase/auth';
import { getUserData, getUserCredits, getUserCreditsBreakdown, type CreditBreakdown } from '@/lib/firebase/firestore';
import type { User } from '@/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userData: User | null;
  credits: number;          // Total credits (free + purchased)
  freeCredits: number;      // Monthly free credits
  purchasedCredits: number; // Purchased credits
  emailVerified: boolean;   // Whether email is verified
  isAdmin: boolean;         // Whether user has admin role
  loading: boolean;
  refreshCredits: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [freeCredits, setFreeCredits] = useState(0);
  const [purchasedCredits, setPurchasedCredits] = useState(0);
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
      // Update credits from the new breakdown
      const breakdown = await getUserCreditsBreakdown(firebaseUser.uid);
      setCredits(breakdown.total);
      setFreeCredits(breakdown.free);
      setPurchasedCredits(breakdown.purchased);
    }
  };

  const refreshCredits = async () => {
    if (firebaseUser) {
      const breakdown = await getUserCreditsBreakdown(firebaseUser.uid);
      setCredits(breakdown.total);
      setFreeCredits(breakdown.free);
      setPurchasedCredits(breakdown.purchased);
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Sign out from Firebase
      await firebaseSignOut();
      // Clear cookies
      document.cookie = 'firebase-token=; path=/; max-age=0';
      document.cookie = 'session=; path=/; max-age=0';
      // Clear state
      setUserData(null);
      setCredits(0);
      setFreeCredits(0);
      setPurchasedCredits(0);
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

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

        // Check for monthly credit reset (via API to prevent client-side manipulation)
        try {
          await fetch('/api/credits/check-reset', { method: 'POST' });
        } catch (error) {
          console.error('Failed to check credit reset:', error);
        }

        // Fetch user data and credits
        const data = await getUserData(user.uid);
        setUserData(data);
        const breakdown = await getUserCreditsBreakdown(user.uid);
        setCredits(breakdown.total);
        setFreeCredits(breakdown.free);
        setPurchasedCredits(breakdown.purchased);
      } else {
        // Clear the token cookie on logout
        document.cookie = 'firebase-token=; path=/; max-age=0';
        setUserData(null);
        setCredits(0);
        setFreeCredits(0);
        setPurchasedCredits(0);
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

  // Compute emailVerified status
  // Google/Apple OAuth users are considered verified
  // Email/password users need to verify their email
  const emailVerified = firebaseUser?.emailVerified ?? false;

  // Compute isAdmin status from userData
  // Defaults to false if role is not set
  const isAdmin = userData?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userData,
        credits,
        freeCredits,
        purchasedCredits,
        emailVerified,
        isAdmin,
        loading,
        refreshCredits,
        refreshUserData,
        refreshToken,
        logout,
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
