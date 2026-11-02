/**
 * Helpers om de Firebase-emulators direct via REST te seeden en te lezen.
 * `Authorization: Bearer owner` omzeilt de security rules in de emulators.
 */
import { AUTH_HOST, FIRESTORE_HOST, MOCK_AI_PORT, PROJECT_ID, STORAGE_HOST } from '../env';

const AUTH = `http://${AUTH_HOST}`;
const FS = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

export async function resetEmulators(): Promise<void> {
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  await fetch(`http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: 'DELETE',
  });
  await fetch(`http://127.0.0.1:${MOCK_AI_PORT}/__requests`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Firestore value encoding
// ---------------------------------------------------------------------------

type FsValue = Record<string, unknown>;

export function toFs(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, toFs(x)])) } };
}

export function fromFs(v: FsValue | undefined): unknown {
  if (!v) return undefined;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return new Date(String(v.timestampValue));
  if ('arrayValue' in v) return ((v.arrayValue as { values?: FsValue[] }).values ?? []).map(fromFs);
  if ('mapValue' in v) {
    const f = (v.mapValue as { fields?: Record<string, FsValue> }).fields ?? {};
    return Object.fromEntries(Object.entries(f).map(([k, x]) => [k, fromFs(x)]));
  }
  return undefined;
}

export async function setDoc(path: string, data: Record<string, unknown>): Promise<void> {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFs(v)]));
  const res = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`setDoc ${path}: ${res.status} ${await res.text()}`);
}

export async function getDoc<T = Record<string, unknown>>(path: string): Promise<T | null> {
  const res = await fetch(`${FS}/${path}`, { headers: OWNER });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getDoc ${path}: ${res.status}`);
  const json = (await res.json()) as { fields?: Record<string, FsValue> };
  return fromFs({ mapValue: { fields: json.fields ?? {} } }) as T;
}

export async function listDocs<T = Record<string, unknown>>(path: string): Promise<Array<T & { id: string }>> {
  const res = await fetch(`${FS}/${path}?pageSize=300`, { headers: OWNER });
  if (!res.ok) return [];
  const json = (await res.json()) as { documents?: Array<{ name: string; fields?: Record<string, FsValue> }> };
  return (json.documents ?? []).map((d) => ({
    id: d.name.split('/').pop()!,
    ...(fromFs({ mapValue: { fields: d.fields ?? {} } }) as T),
  }));
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface TestUser {
  uid: string;
  email: string;
  password: string;
  idToken: string;
}

export async function signUp(email: string, password: string, displayName = 'E2E Gebruiker'): Promise<TestUser> {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`signUp: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { localId: string; idToken: string };
  return { uid: json.localId, email, password, idToken: json.idToken };
}

export async function updateAuthUser(uid: string, patch: { emailVerified?: boolean; admin?: boolean; displayName?: string }) {
  const body: Record<string, unknown> = { localId: uid };
  if (patch.emailVerified !== undefined) body.emailVerified = patch.emailVerified;
  if (patch.displayName) body.displayName = patch.displayName;
  if (patch.admin !== undefined) body.customAttributes = JSON.stringify(patch.admin ? { admin: true } : {});
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`, {
    method: 'POST',
    headers: OWNER,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updateAuthUser: ${res.status} ${await res.text()}`);
}

export async function getOobLinks(email: string): Promise<string[]> {
  const res = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT_ID}/oobCodes`);
  const json = (await res.json()) as { oobCodes: Array<{ email: string; oobLink: string; requestType: string }> };
  return json.oobCodes.filter((c) => c.email === email).map((c) => c.oobLink);
}

let counter = 0;

/**
 * Maak een (geverifieerde) gebruiker met user-doc, zoals /api/auth/init-user
 * dat zou doen. Credits en rol zijn instelbaar.
 */
export async function createUser(opts: {
  verified?: boolean;
  admin?: boolean;
  free?: number;
  purchased?: number;
  llmMode?: 'platform' | 'own-key';
  email?: string;
} = {}): Promise<TestUser> {
  counter += 1;
  const email = opts.email ?? `user${Date.now()}${counter}@e2e.test`;
  const user = await signUp(email, 'Test-wachtwoord-123!');
  await updateAuthUser(user.uid, { emailVerified: opts.verified ?? true, admin: opts.admin ?? false });
  await setDoc(`users/${user.uid}`, {
    email,
    displayName: 'E2E Gebruiker',
    photoURL: null,
    apiKey: null,
    llmMode: opts.llmMode ?? 'platform',
    credits: { free: opts.free ?? 15, purchased: opts.purchased ?? 0, lastFreeReset: new Date() },
    role: opts.admin ? 'admin' : 'user',
    ageConfirmed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return user;
}

export async function credits(uid: string): Promise<{ free: number; purchased: number; total: number }> {
  const doc = await getDoc<{ credits?: { free?: number; purchased?: number } }>(`users/${uid}`);
  const free = Number(doc?.credits?.free ?? 0);
  const purchased = Number(doc?.credits?.purchased ?? 0);
  return { free, purchased, total: free + purchased };
}

export async function mockAiRequests(): Promise<Array<{ mode: string; schemaKeys: string[]; stream: boolean }>> {
  const res = await fetch(`http://127.0.0.1:${MOCK_AI_PORT}/__requests`);
  return res.json();
}

export const STORAGE_EMULATOR = `http://${STORAGE_HOST}`;

/** Seed een vacature in de jobs-cache (Adzuna-bron → geen ATS-enrichment). */
export async function seedJob(slug = 'senior-frontend-developer-az-acme-12345', overrides: Record<string, unknown> = {}) {
  await setDoc(`jobs/${slug}`, {
    sourceProvider: 'adzuna',
    sourceId: '12345',
    providerCompanyKey: 'acme',
    providerCompanyId: null,
    slug,
    title: 'Senior Frontend Developer',
    company: 'Acme BV',
    location: 'Utrecht',
    description: 'Wij zoeken een Senior Frontend Developer met ervaring in React en TypeScript.',
    industry: 'IT',
    employmentType: 'full_time',
    salaryMin: 50000,
    salaryMax: 70000,
    salaryCurrency: 'EUR',
    url: 'https://example.com/vacature/12345',
    postedAt: new Date().toISOString(),
    supportsInAppApply: false,
    applyQuestions: [],
    fetchedAt: new Date(),
    ...overrides,
  });
  return slug;
}
