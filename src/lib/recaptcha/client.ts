'use client';

/**
 * reCAPTCHA v3 Client-side Implementation
 *
 * reCAPTCHA v3 is completely invisible to users and returns a score
 * between 0.0 (likely bot) and 1.0 (likely human).
 *
 * Setup:
 * 1. Get keys from https://www.google.com/recaptcha/admin
 * 2. Choose reCAPTCHA v3
 * 3. Add your domain(s)
 * 4. Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY in .env.local
 */

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

/**
 * Load the reCAPTCHA v3 script
 */
function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (scriptLoaded && window.grecaptcha) {
      resolve();
      return;
    }

    // Loading in progress
    if (scriptLoading) {
      loadCallbacks.push(() => resolve());
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      // In development without key, resolve silently
      console.warn('NEXT_PUBLIC_RECAPTCHA_SITE_KEY not configured - reCAPTCHA disabled');
      resolve();
      return;
    }

    scriptLoading = true;

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptcha.ready(() => {
        scriptLoaded = true;
        scriptLoading = false;
        resolve();
        loadCallbacks.forEach(cb => cb());
        loadCallbacks.length = 0;
      });
    };

    script.onerror = () => {
      scriptLoading = false;
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Execute reCAPTCHA v3 and get a token
 *
 * @param action - Action name for analytics (e.g., 'login', 'register')
 * @returns reCAPTCHA token or null if not available
 */
export async function executeRecaptcha(action: string): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Skip if not configured (development)
  if (!siteKey) {
    return null;
  }

  try {
    await loadRecaptchaScript();

    if (!window.grecaptcha) {
      console.warn('reCAPTCHA not available');
      return null;
    }

    const token = await window.grecaptcha.execute(siteKey, { action });
    return token;
  } catch (error) {
    console.error('reCAPTCHA execution failed:', error);
    return null;
  }
}

/**
 * React hook to use reCAPTCHA
 */
import { useCallback, useEffect, useState } from 'react';

export function useRecaptcha() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      // Not configured, consider it "ready" (will skip verification)
      setReady(true);
      return;
    }

    loadRecaptchaScript()
      .then(() => setReady(true))
      .catch((err) => setError(err.message));
  }, []);

  const execute = useCallback(async (action: string) => {
    return executeRecaptcha(action);
  }, []);

  return { ready, error, execute };
}
