#!/usr/bin/env tsx
/**
 * One-time migration: bump all existing user credit balances by 3×.
 *
 * Why: pricing v2 increased the credits-per-operation roughly 3× (1 credit per
 * action → 1–3 credits weighted by real cost), and the credits-per-pack also
 * roughly 3×. To keep existing customers whole — so a user holding 30 credits
 * under the old system can still finish the same amount of work — we multiply
 * their current balances at deploy time.
 *
 * Run once after deploying pricing v2:
 *   $ npx tsx scripts/migrate-credits-v2.ts          # dry run
 *   $ npx tsx scripts/migrate-credits-v2.ts --apply  # actually write
 *
 * Idempotency: a `credits.migratedToV2 = true` flag is set on each user doc.
 * Re-runs skip users that already have this flag.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const MULTIPLIER = 3;

function getServiceAccount() {
  const json =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (json) {
    return JSON.parse(json);
  }

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path && fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
  }

  throw new Error(
    'No Firebase admin credentials found. Set FIREBASE_ADMIN_PRIVATE_KEY_JSON or GOOGLE_APPLICATION_CREDENTIALS.',
  );
}

async function main() {
  const apply = process.argv.includes('--apply');
  const mode = apply ? 'APPLY' : 'DRY RUN';

  if (!getApps().length) {
    const sa = getServiceAccount();
    initializeApp({ credential: cert(sa) });
  }

  const db = getFirestore();
  const usersSnap = await db.collection('users').get();

  let migrated = 0;
  let skipped = 0;
  let unchanged = 0;
  let totalAddedFree = 0;
  let totalAddedPurchased = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const credits = data.credits || {};

    if (credits.migratedToV2 === true) {
      skipped++;
      continue;
    }

    const oldFree = typeof credits.free === 'number' ? credits.free : 0;
    const oldPurchased = typeof credits.purchased === 'number' ? credits.purchased : 0;

    if (oldFree === 0 && oldPurchased === 0) {
      // Nothing to migrate — just stamp the flag so subsequent runs skip.
      if (apply) {
        await userDoc.ref.update({
          'credits.migratedToV2': true,
          updatedAt: new Date(),
        });
      }
      unchanged++;
      continue;
    }

    const newFree = oldFree * MULTIPLIER;
    const newPurchased = oldPurchased * MULTIPLIER;
    const addedFree = newFree - oldFree;
    const addedPurchased = newPurchased - oldPurchased;

    console.log(
      `[${mode}] ${userDoc.id} (${data.email || 'no-email'}): ` +
        `free ${oldFree} → ${newFree} (+${addedFree}), ` +
        `purchased ${oldPurchased} → ${newPurchased} (+${addedPurchased})`,
    );

    if (apply) {
      await userDoc.ref.update({
        'credits.free': newFree,
        'credits.purchased': newPurchased,
        'credits.migratedToV2': true,
        updatedAt: new Date(),
      });

      // Log audit transactions so the user can see what happened.
      if (addedFree > 0) {
        await userDoc.ref.collection('transactions').add({
          amount: addedFree,
          type: 'monthly_free',
          description: `Pricing v2 migration: free balance ${oldFree} → ${newFree} (×${MULTIPLIER})`,
          molliePaymentId: null,
          cvId: null,
          createdAt: new Date(),
        });
      }
      if (addedPurchased > 0) {
        await userDoc.ref.collection('transactions').add({
          amount: addedPurchased,
          type: 'purchase',
          description: `Pricing v2 migration: purchased balance ${oldPurchased} → ${newPurchased} (×${MULTIPLIER})`,
          molliePaymentId: null,
          cvId: null,
          createdAt: new Date(),
        });
      }

    }

    migrated++;
    totalAddedFree += addedFree;
    totalAddedPurchased += addedPurchased;
  }

  console.log('\n=== Migration summary ===');
  console.log(`Mode:           ${mode}`);
  console.log(`Users scanned:  ${usersSnap.size}`);
  console.log(`Migrated:       ${migrated}`);
  console.log(`Already done:   ${skipped}`);
  console.log(`Empty / flag-only: ${unchanged}`);
  console.log(`+free credits:  ${totalAddedFree}`);
  console.log(`+purchased credits: ${totalAddedPurchased}`);
  if (!apply) {
    console.log('\nThis was a DRY RUN. Re-run with --apply to commit changes.');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
