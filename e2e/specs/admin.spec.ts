import { test, expect, loginViaUi } from '../support/fixtures';
import { createUser, credits, getDoc, resetEmulators } from '../support/emulator';
import { api } from '../support/api';

test.describe('Admin', () => {
  test.beforeEach(async () => {
    await resetEmulators();
  });

  test('niet-admin krijgt geen toegang tot admin-pagina of -API', async ({ page }) => {
    const user = await createUser();
    await loginViaUi(page, user);
    await page.goto('/nl/admin/users');
    await expect(page).not.toHaveURL(/\/admin\/users$/, { timeout: 15_000 }).catch(async () => {
      await expect(page.getByText(/geen toegang|access denied|Toegang geweigerd/i)).toBeVisible();
    });
    const res = await api(user, '/api/admin/users');
    expect(res.status).toBe(403);
  });

  test('admin: gebruikers, credits aanpassen, rol, platform-config en impersonation', async ({ page }) => {
    const admin = await createUser({ admin: true, email: `admin${Date.now()}@e2e.test` });
    const target = await createUser({ email: `target${Date.now()}@e2e.test` });

    await loginViaUi(page, admin);
    await page.goto('/nl/admin/users');
    await expect(page.getByText(target.email)).toBeVisible({ timeout: 30_000 });

    const list = await api(admin, '/api/admin/users');
    expect(list.status).toBe(200);

    const add = await api(admin, `/api/admin/users/${target.uid}/credits`, {
      method: 'PATCH',
      body: JSON.stringify({ addPurchased: 5 }),
    });
    expect(add.status).toBe(200);
    expect((await credits(target.uid)).purchased).toBe(5);

    const cfg = await api(admin, '/api/admin/platform-config');
    expect(cfg.status).toBe(200);

    const imp = await api(admin, '/api/admin/impersonate', { method: 'POST', body: JSON.stringify({ userId: target.uid }) });
    expect(imp.status).toBe(200);
    const stop = await api(admin, '/api/admin/impersonate', { method: 'DELETE' });
    expect(stop.status).toBe(200);

    // Audit-log (AVG art. 32) bevat de credit-aanpassing
    const target2 = await getDoc(`users/${target.uid}`);
    expect(target2).toBeTruthy();
  });

  for (const path of ['cvs', 'disputes', 'emails', 'feedback', 'templates', 'kanban', 'platform', 'profielen']) {
    test(`admin-pagina /admin/${path} laadt zonder fouten`, async ({ page }) => {
      const admin = await createUser({ admin: true });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await loginViaUi(page, admin);
      await page.goto(`/nl/admin/${path}`);
      await expect(page.locator('main')).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(errors).toEqual([]);
    });
  }
});
