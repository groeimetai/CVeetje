/**
 * Gedeelde E2E-omgeving: dezelfde env wordt gebruikt voor `next build`
 * (NEXT_PUBLIC_* wordt ingebakken), `next start` en de test-helpers.
 */
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const PROJECT_ID = 'demo-cveetje';
export const APP_PORT = Number(process.env.E2E_APP_PORT || 3100);
export const MOCK_AI_PORT = Number(process.env.MOCK_AI_PORT || 4010);
export const AUTH_HOST = '127.0.0.1:9099';
export const FIRESTORE_HOST = '127.0.0.1:8080';
export const STORAGE_HOST = '127.0.0.1:9199';
export const BUCKET = `${PROJECT_ID}.appspot.com`;
export const BASE_URL = `http://localhost:${APP_PORT}`;
export const ADMIN_EMAIL = 'admin@e2e.test';

const CACHE_DIR = path.join(__dirname, '.cache');

/**
 * Wegwerp-RSA-key voor de Admin SDK. Tegen de emulators is geen echte
 * service-account nodig, maar `cert()` en `getSignedUrl()` willen een geldige
 * PEM. Gecached zodat build, server en workers dezelfde key gebruiken.
 */
function adminPrivateKey(): string {
  const file = path.join(CACHE_DIR, 'admin-key.pem');
  if (existsSync(file)) return readFileSync(file, 'utf8');
  mkdirSync(CACHE_DIR, { recursive: true });
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  writeFileSync(file, pem);
  return pem;
}

export function e2eEnv(): Record<string, string> {
  return {
    NODE_ENV: 'production',
    NEXT_DIST_DIR: '.next-e2e',
    NEXT_PRIVATE_SKIP_TURBOPACK: '1',
    NEXT_TELEMETRY_DISABLED: '1',

    // Client (ingebakken bij build)
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: '1',
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
    NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST,
    NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-api-key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:1:web:e2e',
    NEXT_PUBLIC_APP_URL: BASE_URL,

    // Server
    FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
    FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST,
    FIREBASE_STORAGE_EMULATOR_HOST: STORAGE_HOST,
    GCLOUD_PROJECT: PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: `e2e@${PROJECT_ID}.iam.gserviceaccount.com`,
    FIREBASE_ADMIN_PRIVATE_KEY: adminPrivateKey(),
    ANTHROPIC_PLATFORM_API_KEY: 'mock-key',
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${MOCK_AI_PORT}/v1`,
    ENCRYPTION_KEY: 'e2e-Xk9#mQ2$vL7@pR4!wN8&tZ3^bH6*jF5',
    ADMIN_EMAIL,
    JOBS_DISABLE_SEEDED_ATS: '1',
    PUPPETEER_EXECUTABLE_PATH:
      process.env.PUPPETEER_EXECUTABLE_PATH_E2E || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',

    // Bewust leeg: geen echte externe diensten
    RECAPTCHA_SECRET_KEY: '',
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: '',
    MOLLIE_API_KEY: '',
    GITHUB_TOKEN: '',
    ADZUNA_APP_ID: '',
    ADZUNA_APP_KEY: '',
  };
}
