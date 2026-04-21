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
import { getUserData, getUserCredits, getUserCreditsBreakdown, getCreditsFromServer, type CreditBreakdown } from '@/lib/firebase/firestore';
import type { User, LLMMode } from '@/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userData: User | null;
  credits: number;          // Total credits (free + purchased)
  freeCredits: number;      // Monthly free credits
  purchasedCredits: number; // Purchased credits
  emailVerified: boolean;   // Whether email is verified
  isAdmin: boolean;         // Whether user has admin role
  llmMode: LLMMode;         // 'own-key' or 'platform'
  hasAIAccess: boolean;     // true if platform mode OR own API key configured
  loading: boolean;
  // Impersonation
  impersonating: boolean;
  impersonatedUserId: string | null;
  effectiveUserId: string | null;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
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

  // Impersonation state
  const [impersonating, setImpersonating] = useState(false);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserData, setImpersonatedUserData] = useState<User | null>(null);
  const [impersonatedCredits, setImpersonatedCredits] = useState(0);
  const [impersonatedFreeCredits, setImpersonatedFreeCredits] = useState(0);
  const [impersonatedPurchasedCredits, setImpersonatedPurchasedCredits] = useState(0);

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

  // Load impersonated user data from Firestore
  const loadImpersonatedUser = useCallback(async (userId: string) => {
    const data = await getUserData(userId);
    setImpersonatedUserData(data);
    const breakdown = await getUserCreditsBreakdown(userId);
    setImpersonatedCredits(breakdown.total);
    setImpersonatedFreeCredits(breakdown.free);
    setImpersonatedPurchasedCredits(breakdown.purchased);
  }, []);

  // Clear any user-scoped client-side state that would otherwise leak between
  // the admin and the impersonated user (or back). The wizard draft lives in a
  // single global localStorage key, so admin-state would persist into the
  // impersonated session if we don't wipe it here.
  const clearUserScopedClientState = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('cveetje_wizard_draft');
    } catch {
      // ignore — localStorage can throw in private mode
    }
  }, []);

  // Detect locale from current URL so the redirect lands on the right path
  const getLocalePath = useCallback((target: string) => {
    if (typeof window === 'undefined') return target;
    const match = window.location.pathname.match(/^\/(nl|en)(\/|$)/);
    const locale = match?.[1] || 'nl';
    return `/${locale}${target}`;
  }, []);

  // Start impersonating a user
  const startImpersonation = useCallback(async (userId: string) => {
    const response = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start impersonation');
    }

    // Wipe local state and do a hard navigation so the dashboard re-mounts with
    // a clean slate — this is the only reliable way for the admin to see
    // EXACTLY what the user sees (no stale React state, no leftover wizard
    // draft, no in-memory caches).
    clearUserScopedClientState();
    if (typeof window !== 'undefined') {
      window.location.href = getLocalePath('/dashboard');
    }
  }, [clearUserScopedClientState, getLocalePath]);

  // Stop impersonating
  const stopImpersonation = useCallback(async () => {
    await fetch('/api/admin/impersonate', { method: 'DELETE' });

    // Hard navigation back to admin users — same reasoning as startImpersonation:
    // we want the admin to see their own state cleanly, with no impersonated-user
    // data leaking into their view.
    clearUserScopedClientState();
    if (typeof window !== 'undefined') {
      window.location.href = getLocalePath('/admin/users');
    }
  }, [clearUserScopedClientState, getLocalePath]);

  const refreshCredits = async () => {
    if (firebaseUser) {
      // Use getCreditsFromServer to bypass Firestore client cache —
      // credits are deducted server-side (admin SDK) so the local cache is stale.
      const breakdown = await getCreditsFromServer(firebaseUser.uid);
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
      document.cookie = 'impersonate-uid=; path=/; max-age=0';
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

  // Check for existing impersonation session on mount
  useEffect(() => {
    if (!firebaseUser || loading) return;

    // Only admins can impersonate
    const role = userData?.role;
    if (role !== 'admin') return;

    // Check if impersonation cookie exists
    const cookieMatch = document.cookie.match(/(?:^|; )impersonate-uid=([^;]*)/);
    if (!cookieMatch) return;

    const impersonateUid = cookieMatch[1];
    if (impersonateUid && impersonateUid !== firebaseUser.uid) {
      // Verify impersonation is still valid via API
      fetch('/api/admin/impersonate')
        .then(res => res.json())
        .then(data => {
          if (data.impersonating) {
            setImpersonatedUserId(data.impersonating.userId);
            setImpersonating(true);
            loadImpersonatedUser(data.impersonating.userId);
          }
        })
        .catch(() => {
          // Impersonation check failed — ignore
        });
    }
  }, [firebaseUser, loading, userData?.role, loadImpersonatedUser]);

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

  // LLM mode: 'platform' (default) or 'own-key'
  const effectiveUserData = impersonating ? impersonatedUserData : userData;
  const llmMode: LLMMode = effectiveUserData?.llmMode || 'platform';

  // User has AI access if they're in platform mode OR have their own API key
  const hasAIAccess = llmMode === 'platform' || !!effectiveUserData?.apiKey;

  // Effective userId for data fetching
  const effectiveUserId = impersonatedUserId ?? firebaseUser?.uid ?? null;

  // Effective credits — show impersonated user's credits when impersonating
  const effectiveCredits = impersonating ? impersonatedCredits : credits;
  const effectiveFreeCredits = impersonating ? impersonatedFreeCredits : freeCredits;
  const effectivePurchasedCredits = impersonating ? impersonatedPurchasedCredits : purchasedCredits;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userData: effectiveUserData,
        credits: effectiveCredits,
        freeCredits: effectiveFreeCredits,
        purchasedCredits: effectivePurchasedCredits,
        emailVerified,
        isAdmin,
        llmMode,
        hasAIAccess,
        loading,
        impersonating,
        impersonatedUserId,
        effectiveUserId,
        startImpersonation,
        stopImpersonation,
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
