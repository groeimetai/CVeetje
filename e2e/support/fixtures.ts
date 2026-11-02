import { test as base, expect, type Page } from '@playwright/test';
import { createUser, resetEmulators, type TestUser } from './emulator';

export async function loginViaUi(page: Page, user: TestUser, locale = 'nl'): Promise<void> {
  await page.goto(`/${locale}/login`);
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

type Fixtures = {
  /** Ingelogde, geverifieerde platform-gebruiker met 15 free credits. */
  user: TestUser;
  loggedInPage: Page;
};

export const test = base.extend<Fixtures>({
  // Cookiebanner standaard weggeklikt (wordt apart getest in public.spec)
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('cveetje-cookie-consent', 'declined');
      } catch {
        /* ignore */
      }
    });
    await use(page);
  },
  // eslint-disable-next-line no-empty-pattern
  user: async ({}, use) => {
    await resetEmulators();
    await use(await createUser());
  },
  loggedInPage: async ({ page, user }, use) => {
    await loginViaUi(page, user);
    await use(page);
  },
});

export { expect };

/** Verzamel console-errors/pageerrors op een pagina (excl. bekende ruis). */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|Failed to load resource: the server responded with a status of 404/.test(t)) return;
    errors.push(t);
  });
  return errors;
}
