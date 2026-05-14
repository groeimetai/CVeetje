/**
 * Firestore-backed crawl cache. Keyed by sha256(sourceUrl) so the same job
 * URL only gets crawled once per week, no matter how many users request a CV
 * for it.
 *
 * Set a Firestore TTL policy on the `expiresAt` field to auto-purge old
 * entries (Firestore console → Time-to-live → field `expiresAt`).
 */

import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

const COLLECTION = 'crawlCache';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CrawlMethod = 'http' | 'ats-api' | 'puppeteer';

export interface CrawlCacheEntry {
  sourceUrl: string;
  finalUrl: string;
  fullText: string;
  title: string | null;
  method: CrawlMethod;
  bytes: number;
  crawledAt: string;
  expiresAt: string;
}

function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

function fromFirestore(data: Record<string, unknown>): CrawlCacheEntry {
  const crawledAt = data.crawledAt instanceof Timestamp
    ? data.crawledAt.toDate().toISOString()
    : String(data.crawledAt ?? new Date().toISOString());
  const expiresAt = data.expiresAt instanceof Timestamp
    ? data.expiresAt.toDate().toISOString()
    : String(data.expiresAt ?? new Date().toISOString());
  return {
    sourceUrl: String(data.sourceUrl ?? ''),
    finalUrl: String(data.finalUrl ?? ''),
    fullText: String(data.fullText ?? ''),
    title: (data.title as string | null) ?? null,
    method: (data.method as CrawlMethod) ?? 'http',
    bytes: Number(data.bytes ?? 0),
    crawledAt,
    expiresAt,
  };
}

export async function getCrawlCache(sourceUrl: string): Promise<CrawlCacheEntry | null> {
  const db = getAdminDb();
  const id = hashUrl(sourceUrl);
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const entry = fromFirestore(snap.data() as Record<string, unknown>);
  if (Date.parse(entry.expiresAt) < Date.now()) return null;
  return entry;
}

export async function setCrawlCache(entry: Omit<CrawlCacheEntry, 'crawledAt' | 'expiresAt'>): Promise<void> {
  const db = getAdminDb();
  const id = hashUrl(entry.sourceUrl);
  const now = new Date();
  const expires = new Date(now.getTime() + TTL_MS);
  await db.collection(COLLECTION).doc(id).set({
    sourceUrl: entry.sourceUrl,
    finalUrl: entry.finalUrl,
    fullText: entry.fullText,
    title: entry.title ?? null,
    method: entry.method,
    bytes: entry.bytes,
    crawledAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expires),
  });
}
