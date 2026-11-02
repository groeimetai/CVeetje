/**
 * Server-side validatie van geüploade afbeeldingen op basis van magic bytes.
 *
 * Security: de client-gestuurde `file.type` werd vertrouwd en alles met
 * `image/*` werd publiek gemaakt — inclusief `image/svg+xml` (met script) of
 * een HTML-bestand met gespoofde content-type. We accepteren nu alleen
 * PNG/JPEG/WebP, bepalen type + extensie zelf en negeren `file.type`.
 */

export type SniffedImage = { mime: 'image/png' | 'image/jpeg' | 'image/webp'; ext: 'png' | 'jpg' | 'webp' };

export function sniffImage(buf: Buffer): SniffedImage | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}
