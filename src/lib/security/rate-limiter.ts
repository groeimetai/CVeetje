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
    // Security: de Google Front End (Cloud Run) VOEGT het echte client-IP
    // achteraan toe; eerdere entries komen van de client en zijn spoofbaar.
    // Daarom het laatste element, niet het eerste.
    const parts = forwardedFor.split(',').map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || null;
  }

  // Cloudflare
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;

  // Other proxies
  const realIP = headers.get('x-real-ip');
  if (realIP) return realIP;

  return null;
}

// ============================================================================
// Persistente (multi-instance) rate limiter
// ============================================================================
//
// Security: de in-memory limiter hierboven is per Cloud Run-instance (max 10
// instances, reset bij elke cold start) en werd maar op 5 routes gebruikt.
// Deze variant houdt een fixed-window teller bij in Firestore
// (`rateLimits/{endpoint}__{identifier}`, Admin-SDK-only via default deny) en
// is bedoeld voor alle dure AI-/Puppeteer-routes, gekeyd op userId.

/** Extra presets voor de persistente limiter (per user). */
export const PERSISTENT_RATE_LIMITS = {
  /** Dure AI-calls (generatie, parsing, enrich, motivatie, template-fill) */
  ai: { maxRequests: 20, windowMs: 10 * 60 * 1000 },
  /** Chat-berichten */
  chat: { maxRequests: 60, windowMs: 10 * 60 * 1000 },
  /** Puppeteer-renders (PDF/preview/download) */
  render: { maxRequests: 30, windowMs: 10 * 60 * 1000 },
  /** Uploads */
  upload: { maxRequests: 20, windowMs: 10 * 60 * 1000 },
  /** Account-init / laag-volume acties */
  low: { maxRequests: 10, windowMs: 10 * 60 * 1000 },
} as const;

export async function checkRateLimitPersistent(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  // Snelle lokale check eerst — bespaart Firestore-calls bij burst-misbruik.
  const local = checkRateLimit(identifier, endpoint, config);
  if (!local.allowed) return local;

  try {
    const { getAdminDb } = await import('@/lib/firebase/admin');
    const db = getAdminDb();
    const docId = `${endpoint}__${identifier}`.replace(/[^A-Za-z0-9_:.-]/g, '_').slice(0, 400);
    const ref = db.collection('rateLimits').doc(docId);
    const now = Date.now();

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data()! : null;
      const windowStart = Number(data?.windowStart ?? 0);
      const inWindow = now - windowStart < config.windowMs;
      const count = inWindow ? Number(data?.count ?? 0) : 0;
      const start = inWindow ? windowStart : now;
      const resetTime = start + config.windowMs;

      if (count >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: Math.max(1, Math.ceil((resetTime - now) / 1000)),
        };
      }
      tx.set(ref, { windowStart: start, count: count + 1, expiresAt: new Date(resetTime) });
      return { allowed: true, remaining: config.maxRequests - count - 1, resetTime };
    });
  } catch (err) {
    // Fail-open op infra-fouten (de lokale limiter blijft gelden).
    console.error('[rate-limit] persistent check failed:', err);
    return local;
  }
}

/**
 * Convenience voor routes: geeft een 429-Response terug als de limiet bereikt
 * is, anders null.
 */
export async function enforceRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig,
): Promise<Response | null> {
  const result = await checkRateLimitPersistent(`user:${userId}`, endpoint, config);
  if (result.allowed) return null;
  return new Response(
    JSON.stringify({ error: 'Te veel verzoeken. Probeer het later opnieuw.', retryAfter: result.retryAfter }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter ?? 60),
      },
    },
  );
}
