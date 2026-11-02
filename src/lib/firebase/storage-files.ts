import { getAdminStorage } from './admin';

/**
 * Storage-helpers die zowel tegen productie-GCS als tegen de Firebase Storage
 * Emulator werken (E2E-tests, `FIREBASE_STORAGE_EMULATOR_HOST`).
 */

export function isStorageEmulator(): boolean {
  return Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
}

/** Publieke URL voor een object dat (in productie) via makePublic() leesbaar is. */
export function publicObjectUrl(bucketName: string, path: string): string {
  const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  if (emulatorHost) {
    const host = emulatorHost.replace(/^https?:\/\//, '');
    return `http://${host}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`;
  }
  return `https://storage.googleapis.com/${bucketName}/${path}`;
}

/** Maak een object publiek leesbaar (no-op in de emulator; die kent geen ACL's). */
export async function makeObjectPublic(path: string): Promise<void> {
  if (isStorageEmulator()) return;
  await getAdminStorage().bucket().file(path).makePublic();
}

/**
 * Leid het storage-pad af uit een opgeslagen (signed) URL. Template-docs
 * slaan historisch alleen `storageUrl` op, geen `storagePath`.
 */
export function storagePathFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:^|\/|%2F)((?:global-)?templates(?:\/|%2F)[^?#]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

/**
 * Download een template-bestand server-side via de Admin SDK. Robuuster dan
 * `fetch(signedUrl)` (geen afhankelijkheid van URL-signing of -expiry) en
 * werkt tegen de emulator.
 */
export async function downloadTemplateFile(opts: {
  storagePath?: string | null;
  storageUrl?: string | null;
}): Promise<Buffer> {
  const path = opts.storagePath || storagePathFromUrl(opts.storageUrl);
  if (!path) throw new Error('Template storage path unknown');
  const [contents] = await getAdminStorage().bucket().file(path).download();
  return contents;
}
