/**
 * In-memory rate limiter for API endpoints
 *
 * For multi-instance Cloud Run deployments, consider using:
 * - Cloud Memorystore (Redis)
 * - Firestore (with TTL documents)
 *
 * Current implementation works well for:
 * - Single instance deployments
 * - Development environments
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., userId, IP, or combination)
 * @param endpoint - Endpoint identifier for separate limits per route
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupOldEntries();

  const key = `${endpoint}:${identifier}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No existing entry or window has passed
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Within window, check count
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Within window, increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Pre-configured rate limits for different endpoint types
 */
export const RATE_LIMITS = {
  /** AI generation endpoints (expensive operations) */
  aiGeneration: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 per minute
  },
  /** PDF generation (resource-intensive) */
  pdfGeneration: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 per minute
  },
  /** Authentication endpoints (brute force protection) */
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 per minute
  },
  /** File uploads (DoS protection) */
  fileUpload: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 per minute
  },
  /** Webhook endpoints */
  webhook: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 per minute (Mollie may send multiple)
  },
  /** General API endpoints */
  general: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 60 per minute
  },
} as const;

/**
 * Helper to extract identifier from request
 * Prefers userId if available, falls back to IP
 */
export function getRequestIdentifier(
  userId?: string,
  ip?: string | null
): string {
  if (userId) return `user:${userId}`;
  if (ip) return `ip:${ip}`;
  return 'anonymous';
}

/**
 * Get client IP from request headers
 * Handles common proxy headers
 */
export function getClientIP(headers: Headers): string | null {
  // Cloud Run / Load balancer
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (client IP)
    return forwardedFor.split(',')[0].trim();
  }

  // Cloudflare
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;

  // Other proxies
  const realIP = headers.get('x-real-ip');
  if (realIP) return realIP;

  return null;
}
