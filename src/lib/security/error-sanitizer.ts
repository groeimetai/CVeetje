/**
 * Error sanitization utility
 *
 * Prevents leaking sensitive information through error messages
 * while preserving useful debugging info in server logs.
 */

/**
 * Known error patterns and their safe replacements
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  safeMessage: string;
  /** Log original error on server side */
  logOriginal: boolean;
}> = [
  // API Key errors
  {
    pattern: /api[_-]?key/i,
    safeMessage: 'Invalid API key. Please check your settings.',
    logOriginal: true,
  },
  // Rate limiting
  {
    pattern: /rate[_-]?limit|quota|too many requests/i,
    safeMessage: 'Rate limit exceeded. Please try again later.',
    logOriginal: false,
  },
  // Authentication errors
  {
    pattern: /unauthorized|forbidden|auth|token.*invalid|jwt/i,
    safeMessage: 'Authentication failed. Please sign in again.',
    logOriginal: true,
  },
  // Database/Firestore errors
  {
    pattern: /firestore|firebase|document.*not.*found|collection/i,
    safeMessage: 'Database operation failed. Please try again.',
    logOriginal: true,
  },
  // Network errors
  {
    pattern: /network|connection|ECONNREFUSED|ETIMEDOUT|fetch failed/i,
    safeMessage: 'Connection error. Please check your network and try again.',
    logOriginal: true,
  },
  // Internal server paths (never expose)
  {
    pattern: /\/Users\/|\/home\/|\/var\/|C:\\|node_modules/i,
    safeMessage: 'An internal error occurred. Please try again.',
    logOriginal: true,
  },
  // Stack traces (never expose)
  {
    pattern: /at\s+\w+\s+\(|at\s+Object\.|at\s+Module\.|\.ts:\d+:\d+/i,
    safeMessage: 'An internal error occurred. Please try again.',
    logOriginal: true,
  },
  // Environment variables mentioned
  {
    pattern: /process\.env|environment.*variable|ENCRYPTION_KEY|SECRET/i,
    safeMessage: 'Configuration error. Please contact support.',
    logOriginal: true,
  },
  // AI provider specific errors
  {
    pattern: /openai|anthropic|gemini|groq|model.*not.*found/i,
    safeMessage: 'AI service error. Please check your API key and model settings.',
    logOriginal: true,
  },
];

/**
 * Safe error messages for HTTP status codes
 */
const STATUS_CODE_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Authentication required. Please sign in.',
  403: 'Access denied.',
  404: 'Resource not found.',
  409: 'Conflict with current state. Please refresh and try again.',
  429: 'Too many requests. Please wait and try again.',
  500: 'An internal error occurred. Please try again.',
  502: 'Service temporarily unavailable. Please try again.',
  503: 'Service temporarily unavailable. Please try again.',
  504: 'Request timed out. Please try again.',
};

export interface SanitizedError {
  /** Safe message to send to client */
  message: string;
  /** Appropriate HTTP status code */
  statusCode: number;
  /** Optional error code for client-side handling */
  code?: string;
}

/**
 * Sanitize an error for client response
 *
 * @param error - The original error
 * @param context - Optional context for logging
 * @returns Sanitized error safe for client response
 */
export function sanitizeError(
  error: unknown,
  context?: string
): SanitizedError {
  // Extract error message
  const originalMessage = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : 'Unknown error';

  // Check against known patterns
  for (const { pattern, safeMessage, logOriginal } of ERROR_PATTERNS) {
    if (pattern.test(originalMessage)) {
      if (logOriginal) {
        console.error(
          `[${context || 'Error'}] Original:`,
          originalMessage
        );
      }
      return {
        message: safeMessage,
        statusCode: 500,
      };
    }
  }

  // For errors that don't match patterns, use a generic message
  // Log the original for debugging
  console.error(`[${context || 'Error'}] Unmatched error:`, originalMessage);

  return {
    message: 'An unexpected error occurred. Please try again.',
    statusCode: 500,
  };
}

/**
 * Get a safe error message for a given HTTP status code
 */
export function getSafeStatusMessage(statusCode: number): string {
  return STATUS_CODE_MESSAGES[statusCode] || STATUS_CODE_MESSAGES[500];
}

/**
 * Create a sanitized error response for NextResponse.json()
 */
export function createErrorResponse(
  error: unknown,
  context?: string
): { error: string; statusCode: number } {
  const sanitized = sanitizeError(error, context);
  return {
    error: sanitized.message,
    statusCode: sanitized.statusCode,
  };
}

/**
 * Helper to check if an error is a known "user error" vs server error
 * User errors can show more specific messages
 */
export function isUserError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const userErrorPatterns = [
    /required/i,
    /invalid.*input/i,
    /missing.*field/i,
    /validation.*failed/i,
  ];
  return userErrorPatterns.some(p => p.test(message));
}
