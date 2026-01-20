/**
 * URL validation to prevent SSRF (Server-Side Request Forgery) attacks
 *
 * Used to validate user-provided URLs before passing to:
 * - Puppeteer (avatar URLs in PDF generation)
 * - Any server-side fetch operations
 */

/**
 * List of blocked IP ranges and hosts
 */
const BLOCKED_HOSTS = [
  // Localhost variations
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',

  // Cloud metadata endpoints
  '169.254.169.254', // AWS/GCP metadata
  'metadata.google.internal',
  'metadata.google.com',
  '100.100.100.200', // Alibaba Cloud

  // Internal DNS
  '*.internal',
  '*.local',
];

/**
 * Blocked IP ranges (CIDR notation patterns)
 */
const BLOCKED_IP_PATTERNS = [
  // Private IPv4 ranges
  /^10\./,                          // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,                    // 192.168.0.0/16

  // Link-local
  /^169\.254\./,                    // 169.254.0.0/16

  // Loopback
  /^127\./,                         // 127.0.0.0/8

  // Cloud provider internal ranges
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (Carrier-grade NAT)
];

/**
 * Allowed protocols
 */
const ALLOWED_PROTOCOLS = ['https:', 'http:'];

/**
 * Allowed URL patterns for avatars (Firebase Storage, common image hosts)
 */
const TRUSTED_AVATAR_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'lh3.googleusercontent.com',    // Google profile photos
  'avatars.githubusercontent.com', // GitHub avatars
  'media.licdn.com',              // LinkedIn photos
  'media-exp1.licdn.com',
  'media-exp2.licdn.com',
  'pbs.twimg.com',                // Twitter photos
];

export interface URLValidationResult {
  valid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Check if an IP address matches any blocked pattern
 */
function isBlockedIP(hostname: string): boolean {
  // Check direct IP patterns
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if hostname is in blocked list
 */
function isBlockedHost(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  for (const blocked of BLOCKED_HOSTS) {
    if (blocked.startsWith('*.')) {
      // Wildcard match
      const suffix = blocked.slice(1); // Remove *
      if (lowerHostname.endsWith(suffix) || lowerHostname === blocked.slice(2)) {
        return true;
      }
    } else if (lowerHostname === blocked) {
      return true;
    }
  }

  return false;
}

/**
 * Validate a URL for safe server-side fetching
 * @param urlString - The URL to validate
 * @param options - Validation options
 */
export function validateURL(
  urlString: string | null | undefined,
  options: {
    /** Only allow HTTPS (recommended for production) */
    httpsOnly?: boolean;
    /** Allow any host (not recommended for user input) */
    allowAnyHost?: boolean;
    /** List of additional trusted hosts */
    trustedHosts?: string[];
  } = {}
): URLValidationResult {
  // Handle null/undefined
  if (!urlString) {
    return { valid: true, sanitizedUrl: undefined };
  }

  // Trim whitespace
  const trimmed = urlString.trim();
  if (!trimmed) {
    return { valid: true, sanitizedUrl: undefined };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Check protocol
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return { valid: false, error: `Protocol not allowed: ${url.protocol}` };
  }

  // HTTPS only check
  if (options.httpsOnly && url.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS URLs are allowed' };
  }

  // Get hostname
  const hostname = url.hostname.toLowerCase();

  // Block internal IPs
  if (isBlockedIP(hostname)) {
    return { valid: false, error: 'Internal IP addresses are not allowed' };
  }

  // Block internal hosts
  if (isBlockedHost(hostname)) {
    return { valid: false, error: 'Internal hosts are not allowed' };
  }

  // If not allowing any host, check against trusted list
  if (!options.allowAnyHost) {
    const allTrusted = [...TRUSTED_AVATAR_HOSTS, ...(options.trustedHosts || [])];
    const isTrusted = allTrusted.some(trusted => {
      if (trusted.startsWith('*.')) {
        const domain = trusted.slice(2);
        return hostname === domain || hostname.endsWith('.' + domain);
      }
      return hostname === trusted;
    });

    if (!isTrusted) {
      return { valid: false, error: 'URL host is not in the trusted list' };
    }
  }

  return { valid: true, sanitizedUrl: url.toString() };
}

/**
 * Validate an avatar URL specifically
 * More lenient than general URL validation but still blocks internal resources
 */
export function validateAvatarURL(
  urlString: string | null | undefined
): URLValidationResult {
  // Null/empty is valid (no avatar)
  if (!urlString || !urlString.trim()) {
    return { valid: true, sanitizedUrl: undefined };
  }

  const result = validateURL(urlString, {
    httpsOnly: true,
    allowAnyHost: false,
    trustedHosts: TRUSTED_AVATAR_HOSTS,
  });

  // If not trusted but also not blocked, allow it for avatars
  // This is a balance between security and functionality
  if (!result.valid && result.error === 'URL host is not in the trusted list') {
    // Re-validate with allowAnyHost to just check for blocked patterns
    const relaxedResult = validateURL(urlString, {
      httpsOnly: true,
      allowAnyHost: true,
    });
    return relaxedResult;
  }

  return result;
}

/**
 * Quick check if a URL is safe (doesn't resolve to internal resources)
 */
export function isSafeURL(urlString: string | null | undefined): boolean {
  if (!urlString) return true;
  return validateURL(urlString, { allowAnyHost: true }).valid;
}
