/**
 * Runtime platform-AI configuration stored in Firestore (`config/platform`).
 *
 * Lets admins pick which Claude model drives each platform AI operation
 * without a redeploy. Reads are cached in-process for 5 minutes to keep
 * per-request latency low; writes from the admin API invalidate the cache.
 *
 * Defaults are pulled from PLATFORM_MODEL.modelId, so a missing doc or
 * missing fields fall back to the compile-time default.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  PLATFORM_MODEL,
  type PlatformOperation,
} from './platform-config';

const CONFIG_COLLECTION = 'config';
const CONFIG_DOC = 'platform';
const CACHE_TTL_MS = 5 * 60 * 1000;

export const PLATFORM_OPERATIONS: PlatformOperation[] = [
  'cv-generate',
  'profile-parse',
  'job-parse',
  'fit-analysis',
  'style-generate',
  'cv-chat',
];

export interface PlatformConfig {
  models: Record<PlatformOperation, string>;
}

interface StoredPlatformConfig {
  models?: Partial<Record<PlatformOperation, string>>;
  updatedAt?: unknown;
  updatedBy?: string;
}

let cached: { data: PlatformConfig; expiresAt: number } | null = null;

function defaultConfig(): PlatformConfig {
  const models = Object.fromEntries(
    PLATFORM_OPERATIONS.map((op) => [op, PLATFORM_MODEL.modelId]),
  ) as Record<PlatformOperation, string>;
  return { models };
}

function mergeWithDefaults(stored: StoredPlatformConfig | null): PlatformConfig {
  const base = defaultConfig();
  if (!stored?.models) return base;
  for (const op of PLATFORM_OPERATIONS) {
    const value = stored.models[op];
    if (typeof value === 'string' && value.trim().length > 0) {
      base.models[op] = value.trim();
    }
  }
  return base;
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const db = getAdminDb();
  const snap = await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
  const stored = snap.exists ? (snap.data() as StoredPlatformConfig) : null;
  const data = mergeWithDefaults(stored);
  cached = { data, expiresAt: now + CACHE_TTL_MS };
  return data;
}

export async function getPlatformModelFor(
  operation: PlatformOperation,
): Promise<string> {
  const config = await getPlatformConfig();
  return config.models[operation] ?? PLATFORM_MODEL.modelId;
}

export interface UpdatePlatformConfigInput {
  models?: Partial<Record<PlatformOperation, string>>;
}

export async function updatePlatformConfig(
  input: UpdatePlatformConfigInput,
  updatedBy: string,
): Promise<PlatformConfig> {
  const db = getAdminDb();
  const docRef = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC);

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy,
  };

  if (input.models) {
    for (const [op, value] of Object.entries(input.models)) {
      if (!PLATFORM_OPERATIONS.includes(op as PlatformOperation)) continue;
      if (typeof value !== 'string' || value.trim().length === 0) continue;
      update[`models.${op}`] = value.trim();
    }
  }

  await docRef.set(update, { merge: true });

  cached = null;
  return getPlatformConfig();
}

export function invalidatePlatformConfigCache() {
  cached = null;
}
