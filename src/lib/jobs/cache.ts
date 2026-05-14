import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import type { ApplyQuestion, NormalizedJob } from './providers/types';

export interface CachedJob extends NormalizedJob {
  fetchedAt: string;
  expiresAt: string;
}

const COLLECTION = 'jobs';
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

function serializeDate(value: Timestamp | Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return new Date().toISOString();
}

function fromFirestore(docId: string, data: Record<string, unknown>): CachedJob {
  return {
    sourceProvider: (data.sourceProvider as CachedJob['sourceProvider']) ?? 'recruitee',
    sourceId: String(data.sourceId ?? docId),
    providerCompanyKey: (data.providerCompanyKey as string | null) ?? null,
    providerCompanyId: (data.providerCompanyId as string | null) ?? null,
    slug: String(data.slug ?? docId),
    title: String(data.title ?? ''),
    company: (data.company as string | null) ?? null,
    location: (data.location as string | null) ?? null,
    description: String(data.description ?? ''),
    industry: (data.industry as string | null) ?? null,
    employmentType: (data.employmentType as string | null) ?? null,
    salaryMin: (data.salaryMin as number | null) ?? null,
    salaryMax: (data.salaryMax as number | null) ?? null,
    salaryCurrency: (data.salaryCurrency as string | null) ?? null,
    url: String(data.url ?? ''),
    postedAt: (data.postedAt as string | null) ?? null,
    supportsInAppApply: Boolean(data.supportsInAppApply ?? false),
    applyQuestions: (data.applyQuestions as ApplyQuestion[] | undefined) ?? [],
    fetchedAt: serializeDate(data.fetchedAt as Timestamp | undefined),
    expiresAt: serializeDate(data.expiresAt as Timestamp | undefined),
  };
}

export async function getCachedJob(slug: string): Promise<CachedJob | null> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).doc(slug).get();
  if (!snap.exists) return null;
  return fromFirestore(snap.id, snap.data() as Record<string, unknown>);
}

/**
 * Recursively remove `undefined` values. Firestore rejects undefined unless the
 * admin SDK is initialized with `ignoreUndefinedProperties: true`, and that
 * setting is fragile across cold starts. Strip preemptively so a single rogue
 * undefined never breaks the entire cache write.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

export async function upsertCachedJob(job: NormalizedJob): Promise<CachedJob> {
  const db = getAdminDb();
  const now = Date.now();
  const expiresAt = new Date(now + TTL_MS);

  const payload = stripUndefined({
    ...job,
    fetchedAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });

  await db.collection(COLLECTION).doc(job.slug).set(payload, { merge: true });

  return {
    ...job,
    fetchedAt: new Date(now).toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function listRecentCachedJobSlugs(limit = 5000): Promise<
  Array<{ slug: string; fetchedAt: string }>
> {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTION)
    .orderBy('fetchedAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      slug: doc.id,
      fetchedAt: serializeDate(data.fetchedAt as Timestamp | undefined),
    };
  });
}
