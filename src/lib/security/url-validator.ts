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
 * Parse een IPv4-adres (dotted quad) naar 4 octets, of null.
 */
function parseIPv4(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((n) => n >= 0 && n <= 255) ? parts : null;
}

function isPrivateIPv4(p: number[]): boolean {
  const [a, b, c] = p;
  return (
    a === 0 ||                                  // 0.0.0.0/8
    a === 10 ||                                 // 10/8
    a === 127 ||                                // loopback
    (a === 100 && b >= 64 && b <= 127) ||       // 100.64/10 CGNAT
    (a === 169 && b === 254) ||                 // link-local / metadata
    (a === 172 && b >= 16 && b <= 31) ||        // 172.16/12
    (a === 192 && b === 168) ||                 // 192.168/16
    (a === 192 && b === 0 && c === 0) ||        // 192.0.0/24
    (a === 198 && (b === 18 || b === 19)) ||    // 198.18/15 benchmarking
    a >= 224                                    // multicast + reserved
  );
}

/**
 * Expandeer een IPv6-adres naar 8 hextets, of null als het geen IPv6 is.
 * Ondersteunt `::`-compressie en een IPv4-staart (`::ffff:1.2.3.4`).
 */
function parseIPv6(host: string): number[] | null {
  let h = host;
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  if (!h.includes(':')) return null;
  h = h.split('%')[0]; // zone id
  let tail: number[] = [];
  const v4Match = h.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4Match) {
    const v4 = parseIPv4(v4Match[1]);
    if (!v4) return null;
    tail = [(v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]];
    h = h.slice(0, -v4Match[1].length).replace(/:$/, ':0').replace(/:0$/, '') || '';
    if (h.endsWith(':') && !h.endsWith('::')) h = h.slice(0, -1);
  }
  const halves = h.split('::');
  if (halves.length > 2) return null;
  const toNums = (seg: string) => (seg ? seg.split(':').filter(Boolean).map((x) => parseInt(x, 16)) : []);
  const head = toNums(halves[0]);
  const rest = halves.length === 2 ? toNums(halves[1]) : [];
  const fill = 8 - tail.length - head.length - rest.length;
  if (halves.length === 1 && fill !== 0) return null;
  if (fill < 0) return null;
  const all = [...head, ...Array(halves.length === 2 ? fill : 0).fill(0), ...rest, ...tail];
  if (all.length !== 8 || all.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return all;
}

function isPrivateIPv6(h: number[]): boolean {
  const allZeroPrefix = h.slice(0, 5).every((x) => x === 0);
  // IPv4-mapped (::ffff:a.b.c.d) en IPv4-compatible (::a.b.c.d)
  if (allZeroPrefix && (h[5] === 0xffff || h[5] === 0)) {
    if (h[5] === 0 && h[6] === 0 && (h[7] === 0 || h[7] === 1)) return true; // :: en ::1
    return isPrivateIPv4([h[6] >> 8, h[6] & 0xff, h[7] >> 8, h[7] & 0xff]);
  }
  if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((h[0] & 0xff00) === 0xff00) return true; // multicast
  if (h[0] === 0x64 && h[1] === 0xff9b) {       // 64:ff9b::/96 NAT64
    return isPrivateIPv4([h[6] >> 8, h[6] & 0xff, h[7] >> 8, h[7] & 0xff]);
  }
  return false;
}

/**
 * True als het adres (IPv4 of IPv6, met of zonder brackets) intern/privé is.
 * Exporteren zodat safe-fetch na DNS-resolutie hetzelfde beleid toepast.
 */
export function isPrivateAddress(address: string): boolean {
  const v4 = parseIPv4(address);
  if (v4) return isPrivateIPv4(v4);
  const v6 = parseIPv6(address);
  if (v6) return isPrivateIPv6(v6);
  return false;
}

/**
 * Check if an IP address matches any blocked pattern
 */
function isBlockedIP(hostname: string): boolean {
  if (isPrivateAddress(hostname)) return true;
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

  // Credentials in URL nooit doorlaten
  if (url.username || url.password) {
    return { valid: false, error: 'Credentials in URL are not allowed' };
  }

  // Get hostname (trailing dot strippen: `localhost.` / `metadata.google.internal.`)
  const hostname = url.hostname.toLowerCase().replace(/\.+$/, '');

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
