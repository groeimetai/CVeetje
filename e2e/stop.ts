/**
 * `npm run e2e:stop` — ruimt achtergebleven E2E-processen op (emulators,
 * mock-AI, next start) door de poorten vrij te maken. Handig na een
 * afgebroken run: Playwright start de webServers anders niet opnieuw.
 */
import { execSync } from 'node:child_process';
import { APP_PORT, MOCK_AI_PORT } from './env';

const ports = [9099, 8080, 9199, 4400, 4500, 9150, MOCK_AI_PORT, APP_PORT];
for (const port of ports) {
  try {
    execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    console.log(`freed :${port}`);
  } catch {
    // niets te stoppen
  }
}
