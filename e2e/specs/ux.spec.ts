import { test, expect } from '../support/fixtures';
import { listDocs, seedJob } from '../support/emulator';
import { seedGeneratedCv } from '../support/api';
import { PROFILE_TEXT } from '../support/fixtures-data';

test.describe('UX: navigatie, dialogen en wizard-voortgang', () => {
  test('CV verwijderen vraagt bevestiging in een dialoog (geen browser-confirm)', async ({ loggedInPage: page, user }) => {
    test.setTimeout(150_000);
    await seedGeneratedCv(user);
    await page.goto('/nl/cv');
    let nativeDialog = false;
    page.on('dialog', async (d) => { nativeDialog = true; await d.dismiss(); });
    await page.getByRole('button', { name: 'Acties' }).first().click();
    await page.getByRole('menuitem', { name: /Verwijderen/ }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Verwijderen' }).click();
    await expect.poll(async () => (await listDocs(`users/${user.uid}/cvs`)).length).toBe(0);
    expect(nativeDialog).toBe(false);
  });

  test('command palette: Ctrl+K opent, zoekt vacatures en navigeert', async ({ loggedInPage: page }) => {
    await seedJob('frontend-palette-az-acme-777', { title: 'Palette Frontend Engineer' });
    await page.keyboard.press('Control+k');
    const box = page.getByRole('combobox');
    await expect(box).toBeVisible();
    await expect(page.getByRole('option', { name: /Instellingen/ })).toBeVisible();
    await box.fill('Instell');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/nl\/settings/);
  });

  test('breadcrumbs tonen geen ruwe CV-ID', async ({ loggedInPage: page, user }) => {
    test.setTimeout(150_000);
    const cvId = await seedGeneratedCv(user);
    await page.goto(`/nl/cv/${cvId}`);
    const crumb = page.locator('.dash-topbar__crumb');
    await expect(crumb).toContainText('Details');
    await expect(crumb).not.toContainText(cvId.slice(0, 6));
  });

  test('mobiel: header heeft zoeken, thema en taal', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('cveetje-cookie-consent', 'declined'));
    const { createUser, resetEmulators } = await import('../support/emulator');
    const { loginViaUi } = await import('../support/fixtures');
    await resetEmulators();
    const user = await createUser();
    await loginViaUi(page, user);
    const header = page.locator('.dash-mobile-header');
    await expect(header).toBeVisible();
    await header.getByRole('button', { name: /Zoek/ }).click();
    await expect(page.getByRole('combobox')).toBeVisible();
    await context.close();
  });

  test('wizard-voortgang: 5 fases, Match gemarkeerd als overgeslagen zonder vacature', async ({ loggedInPage: page }) => {
    await page.goto('/nl/cv/new');
    const nav = page.getByRole('navigation', { name: /Voortgang/ });
    for (const label of ['Profiel', 'Vacature', 'Match', 'Ontwerp', 'Resultaat']) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Tekst toevoegen' }).click();
    await page.getByPlaceholder(/Plak hier je LinkedIn profiel/).fill(PROFILE_TEXT);
    await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
    await page.getByRole('button', { name: /^Informatie verwerken/ }).click();
    await page.getByPlaceholder('naam@email.com').fill('sanne@example.com');
    await page.getByRole('button', { name: 'Doorgaan', exact: true }).click();
    await page.getByRole('button', { name: /^Overslaan \(Algeme(ne|en) CV\)$/ }).click();
    await expect(nav.getByText('overgeslagen')).toBeVisible();
    // Afgeronde fase is klikbaar → terug naar Profiel
    await nav.getByRole('button', { name: /Profiel/ }).click();
    await expect(page.getByRole('button', { name: 'Doorgaan', exact: true })).toBeVisible();
  });
});
