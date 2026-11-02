import { execSync } from 'node:child_process';

/**
 * Playwright stopt `firebase emulators:start` via SIGTERM op npx, maar de
 * Java-kindprocessen (Firestore/Storage) blijven dan soms draaien en blokkeren
 * de volgende run. Maak de emulator-poorten expliciet vrij.
 */
export default function globalTeardown() {
  for (const port of [9099, 8080, 9199, 4400, 4500, 9150]) {
    try {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    } catch {
      /* niets te stoppen */
    }
  }
}
