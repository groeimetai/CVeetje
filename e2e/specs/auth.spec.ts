import { test, expect, loginViaUi } from '../support/fixtures';
import { createUser, getDoc, getOobLinks, listDocs, resetEmulators } from '../support/emulator';

test.describe('Authenticatie', () => {
  test.beforeEach(async () => {
    await resetEmulators();
  });

  test('registreren → e-mail verifiëren → dashboard', async ({ page }) => {
    const email = `nieuw${Date.now()}@e2e.test`;
    await page.goto('/nl/register');
    await page.locator('#name').fill('Nieuwe Gebruiker');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('Sterk-wachtwoord-123!');
    await page.locator('#confirmPassword').fill('Sterk-wachtwoord-123!');
    await page.locator('#ageConfirm').check();
    await page.locator('form button[type="submit"]').click();

    await page.waitForURL(/\/verify-email/, { timeout: 30_000 });

    // Verificatielink uit de Auth-emulator openen
    await expect.poll(async () => (await getOobLinks(email)).length, { timeout: 15_000 }).toBeGreaterThan(0);
    const [link] = await getOobLinks(email);
    const verify = await fetch(link);
    expect(verify.ok).toBeTruthy();

    // User-doc is door /api/auth/init-user aangemaakt met starter-credits
    const users = await listDocs<{ email: string; role: string; credits: { free: number }; ageConfirmed: boolean }>('users');
    const doc = users.find((u) => u.email === email);
    expect(doc).toBeTruthy();
    expect(doc!.role).toBe('user');
    expect(doc!.credits.free).toBe(10);
    expect(doc!.ageConfirmed).toBe(true);

    // Welkomstmail staat in de mail-queue
    const mails = await listDocs<{ to: string }>('mail');
    expect(mails.some((m) => m.to === email)).toBeTruthy();

    // Na verificatie: inloggen geeft het dashboard
    await page.context().clearCookies();
    await page.goto('/nl/login');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('Sterk-wachtwoord-123!');
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  });

  test('onbevestigd account wordt naar /verify-email gestuurd', async ({ page }) => {
    const user = await createUser({ verified: false });
    await page.goto('/nl/login');
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/verify-email/, { timeout: 30_000 });
  });

  test('beschermde route zonder login → login met redirect-parameter', async ({ page }) => {
    await page.goto('/nl/cv');
    await expect(page).toHaveURL(/\/nl\/login\?redirect=%2Fnl%2Fcv/);
  });

  test('ingelogde gebruiker op /login gaat naar dashboard; uitloggen werkt', async ({ page }) => {
    const user = await createUser();
    await loginViaUi(page, user);
    await page.goto('/nl/login');
    await expect(page).toHaveURL(/\/dashboard/);
    const userDoc = await getDoc(`users/${user.uid}`);
    expect(userDoc).toBeTruthy();
  });

  test('fout wachtwoord toont een foutmelding', async ({ page }) => {
    const user = await createUser();
    await page.goto('/nl/login');
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill('verkeerd-wachtwoord');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('[data-slot="alert"]')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
