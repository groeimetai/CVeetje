/**
 * reCAPTCHA v3 Server-side Verification
 *
 * Verifies reCAPTCHA tokens and returns the score.
 * Score ranges from 0.0 (likely bot) to 1.0 (likely human).
 *
 * Recommended thresholds:
 * - 0.5+ for most actions
 * - 0.7+ for sensitive actions (payments, account changes)
 * - 0.3+ for low-risk actions (viewing pages)
 */

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export interface RecaptchaResult {
  success: boolean;
  score: number;
  action: string | null;
  errors: string[];
}

/**
 * Verify a reCAPTCHA v3 token
 *
 * @param token - The reCAPTCHA token from the client
 * @param expectedAction - The expected action name (for validation)
 * @param remoteIp - Optional client IP for additional verification
 */
export async function verifyRecaptcha(
  token: string | null | undefined,
  expectedAction?: string,
  remoteIp?: string
): Promise<RecaptchaResult> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  // If not configured, skip verification (development mode)
  if (!secretKey) {
    console.warn('RECAPTCHA_SECRET_KEY not configured - verification skipped');
    return {
      success: true,
      score: 1.0,
      action: expectedAction || null,
      errors: [],
    };
  }

  // If no token provided, fail verification
  if (!token) {
    return {
      success: false,
      score: 0,
      action: null,
      errors: ['missing-input-response'],
    };
  }

  try {
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        score: 0,
        action: null,
        errors: ['verification-request-failed'],
      };
    }

    const data: RecaptchaVerifyResponse = await response.json();

    // Check if action matches (if expected action provided)
    if (expectedAction && data.action !== expectedAction) {
      return {
        success: false,
        score: data.score || 0,
        action: data.action || null,
        errors: ['action-mismatch'],
      };
    }

    return {
      success: data.success,
      score: data.score || 0,
      action: data.action || null,
      errors: data['error-codes'] || [],
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return {
      success: false,
      score: 0,
      action: null,
      errors: ['verification-error'],
    };
  }
}

/**
 * Check if a reCAPTCHA score passes the threshold
 *
 * @param result - The verification result
 * @param threshold - Minimum score to pass (default 0.5)
 */
export function isHuman(result: RecaptchaResult, threshold = 0.5): boolean {
  return result.success && result.score >= threshold;
}

/**
 * Middleware helper to verify reCAPTCHA in API routes
 */
export async function requireRecaptcha(
  token: string | null | undefined,
  action: string,
  threshold = 0.5,
  remoteIp?: string
): Promise<{ valid: boolean; error?: string; score?: number }> {
  const result = await verifyRecaptcha(token, action, remoteIp);

  if (!result.success) {
    return {
      valid: false,
      error: 'reCAPTCHA verification failed',
      score: result.score,
    };
  }

  if (result.score < threshold) {
    return {
      valid: false,
      error: 'Request blocked for security reasons',
      score: result.score,
    };
  }

  return {
    valid: true,
    score: result.score,
  };
}
