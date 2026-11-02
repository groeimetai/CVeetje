/**
 * `npm run e2e:build` — bouwt de app in emulator-modus naar `.next-e2e`.
 * Los van de gewone build omdat NEXT_PUBLIC_* bij build-tijd wordt ingebakken.
 */
import { spawnSync } from 'node:child_process';
import { e2eEnv } from './env';

const env = { ...process.env, ...e2eEnv() };
// Lege strings betekenen "uit"; verwijder ze zodat code `!process.env.X` ziet.
for (const [k, v] of Object.entries(env)) if (v === '') delete env[k];

const result = spawnSync('npx', ['next', 'build'], { stdio: 'inherit', env });
process.exit(result.status ?? 1);
