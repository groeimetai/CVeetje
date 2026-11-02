import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { validateURL, validateAvatarURL, isPrivateAddress } from './url-validator';

/**
 * SSRF-veilige fetch voor door gebruikers aangeleverde URL's.
 *
 * Bovenop de syntactische checks van `validateURL`:
 * - DNS-resolutie: elke hostname wordt opgezocht en ALLE resolved adressen
 *   (IPv4 + IPv6) moeten publiek zijn. Dit blokkeert `127.0.0.1.nip.io` of een
 *   eigen A-record dat naar 10.x/169.254.x wijst.
 * - Redirects worden handmatig gevolgd en elke hop opnieuw gevalideerd
 *   (fetch volgt standaard blind redirects naar interne adressen).
 * - Response-grootte is begrensd.
 *
 * Restrisico: DNS-rebinding tussen onze lookup en de connect van fetch (TOCTOU).
 * Dat venster is klein; volledige pinning vereist een eigen undici-dispatcher.
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

/** Gooit UnsafeUrlError als de hostname naar een intern adres resolvet. */
export async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '').toLowerCase();
  if (!host) throw new UnsafeUrlError('Empty host');
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError('Internal IP addresses are not allowed');
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError('Host could not be resolved');
  }
  if (addresses.length === 0) throw new UnsafeUrlError('Host could not be resolved');
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new UnsafeUrlError('Host resolves to an internal address');
    }
  }
}

/** Syntactische check + DNS-check. Geeft de genormaliseerde URL terug. */
export async function validatePublicUrl(
  rawUrl: string,
  opts: { avatar?: boolean; httpsOnly?: boolean } = {},
): Promise<URL> {
  const result = opts.avatar
    ? validateAvatarURL(rawUrl)
    : validateURL(rawUrl, { allowAnyHost: true, httpsOnly: opts.httpsOnly });
  if (!result.valid || !result.sanitizedUrl) {
    throw new UnsafeUrlError(result.error || 'Invalid URL');
  }
  const url = new URL(result.sanitizedUrl);
  await assertPublicHost(url.hostname);
  return url;
}

export interface SafeFetchOptions {
  avatar?: boolean;
  httpsOnly?: boolean;
  maxBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface SafeFetchResult {
  status: number;
  ok: boolean;
  finalUrl: string;
  headers: Headers;
  body: Buffer;
}

/** GET met DNS-check, handmatige redirects (elke hop gevalideerd) en byte-limiet. */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const maxBytes = opts.maxBytes ?? 10 * 1024 * 1024;
  const maxRedirects = opts.maxRedirects ?? 5;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

  try {
    let current = await validatePublicUrl(rawUrl, opts);
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: opts.headers,
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        await res.body?.cancel().catch(() => {});
        if (!location) throw new UnsafeUrlError('Redirect without location');
        current = await validatePublicUrl(new URL(location, current).toString(), opts);
        continue;
      }

      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > maxBytes) {
        await res.body?.cancel().catch(() => {});
        throw new UnsafeUrlError('Response too large');
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      if (res.body) {
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > maxBytes) {
            await reader.cancel().catch(() => {});
            throw new UnsafeUrlError('Response too large');
          }
          chunks.push(value);
        }
      }

      return {
        status: res.status,
        ok: res.ok,
        finalUrl: current.toString(),
        headers: res.headers,
        body: Buffer.concat(chunks),
      };
    }
    throw new UnsafeUrlError('Too many redirects');
  } finally {
    clearTimeout(timer);
  }
}
