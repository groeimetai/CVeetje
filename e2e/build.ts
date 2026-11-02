/**
 * `npm run e2e:build` — bouwt de app in emulator-modus naar `.next-e2e`.
 * Los van de gewone build omdat NEXT_PUBLIC_* bij build-tijd wordt ingebakken.
 */
import { spawnSync } from 'node:child_process';
import { e2eEnv } from './env';

// Lege strings betekenen "uit" (code checkt `!process.env.X`); expliciet ''
// zetten zodat waarden uit de shell-env niet doorlekken.
const env = { ...process.env, ...e2eEnv() };

const result = spawnSync('npx', ['next', 'build'], { stdio: 'inherit', env });
process.exit(result.status ?? 1);
