import JSZip from 'jszip';

/**
 * Zip-bomb / resource-exhaustion check voor geüploade DOCX-bestanden.
 *
 * Security: uploads werden alleen op gecomprimeerde grootte gecontroleerd
 * (5–10 MB). Een DOCX is een zip; een `word/document.xml` die naar meerdere
 * GB uitpakt laat de Cloud Run-instance OOM gaan zodra JSZip/mammoth hem
 * decomprimeert. We lezen alleen de central directory (geen decompressie) en
 * weigeren bestanden met te veel entries of te grote uitgepakte grootte.
 */

const MAX_ENTRIES = 2000;
const MAX_TOTAL_UNCOMPRESSED = 100 * 1024 * 1024; // 100 MB
const MAX_ENTRY_UNCOMPRESSED = 50 * 1024 * 1024; // 50 MB
const MAX_RATIO = 200;

export class UnsafeDocxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeDocxError';
  }
}

export async function assertDocxSafe(data: ArrayBuffer | Uint8Array | Buffer): Promise<void> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data, { createFolders: false });
  } catch {
    throw new UnsafeDocxError('Invalid DOCX (not a zip archive)');
  }

  const entries = Object.values(zip.files);
  if (entries.length > MAX_ENTRIES) {
    throw new UnsafeDocxError('DOCX contains too many entries');
  }

  let total = 0;
  for (const entry of entries) {
    if (entry.dir) continue;
    // JSZip leest de groottes uit de central directory zonder te decomprimeren.
    const meta = (entry as unknown as { _data?: { uncompressedSize?: number; compressedSize?: number } })._data;
    const size = Number(meta?.uncompressedSize ?? 0);
    const compressed = Number(meta?.compressedSize ?? 0);
    if (size > MAX_ENTRY_UNCOMPRESSED) {
      throw new UnsafeDocxError('DOCX entry too large when decompressed');
    }
    if (compressed > 0 && size / compressed > MAX_RATIO && size > 1024 * 1024) {
      throw new UnsafeDocxError('DOCX compression ratio too high');
    }
    total += size;
    if (total > MAX_TOTAL_UNCOMPRESSED) {
      throw new UnsafeDocxError('DOCX too large when decompressed');
    }
  }
}
