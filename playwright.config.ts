import { defineConfig, devices } from '@playwright/test';
import { APP_PORT, BASE_URL, MOCK_AI_PORT, PROJECT_ID, e2eEnv } from './e2e/env';

/**
 * E2E-suite: Next.js (`next start` op de `.next-e2e`-build) tegen de Firebase
 * Emulator Suite en een gemockte Anthropic-API. Zie e2e/README.md.
 */
// Let op: Playwright vult `env` aan met process.env van de shell. Lege
// waarden moeten daarom expliciet '' blijven (niet verwijderen), anders lekt
// bv. een GITHUB_TOKEN uit de omgeving door en maken tests echte issues aan.
const serverEnv: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) if (typeof v === 'string') serverEnv[k] = v;
Object.assign(serverEnv, e2eEnv());

export default defineConfig({
  testDir: './e2e/specs',
  globalTeardown: './e2e/teardown.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1, // gedeelde emulator-state; specs resetten zelf
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'nl-NL',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: [
    {
      command: `npx firebase emulators:start --only auth,firestore,storage --project ${PROJECT_ID}`,
      url: 'http://127.0.0.1:9099/',
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npx tsx e2e/mock-ai/server.ts',
      url: `http://127.0.0.1:${MOCK_AI_PORT}/__requests`,
      reuseExistingServer: true,
      timeout: 30_000,
      env: { MOCK_AI_PORT: String(MOCK_AI_PORT) },
    },
    {
      command: `npx next start -p ${APP_PORT}`,
      url: `${BASE_URL}/nl`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: serverEnv,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
