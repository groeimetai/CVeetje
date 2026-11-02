import { test, expect } from '../support/fixtures';
import { credits, listDocs, mockAiRequests } from '../support/emulator';
import { PROFILE_TEXT, VACANCY_TEXT } from '../support/fixtures-data';
import type { Page } from '@playwright/test';

async function enterProfileFromText(page: Page) {
  await page.goto('/nl/cv/new');
  await page.getByRole('button', { name: 'Tekst toevoegen' }).click();
  await page.getByPlaceholder(/Plak hier je LinkedIn profiel/).fill(PROFILE_TEXT);
  await page.getByRole('button', { name: 'Toevoegen', exact: true }).click();
  await page.getByRole('button', { name: /^Informatie verwerken/ }).click();
  await expect(page.getByRole('button', { name: 'Doorgaan', exact: true })).toBeVisible({ timeout: 30_000 });
  // E-mail is verplicht voor een CV (LinkedIn-tekst bevat geen contactgegevens)
  await page.getByPlaceholder('naam@email.com').fill('sanne.devries@example.com');
  await page.getByRole('button', { name: 'Doorgaan', exact: true }).click();
}

test.describe('CV-wizard (gemockte AI)', () => {
  test('volledige flow met vacature: profiel → vacature → match → stijl → CV → PDF', async ({ loggedInPage: page, user }) => {
    test.setTimeout(240_000);
    const before = await credits(user.uid);

    await enterProfileFromText(page);

    // Vacature
    await page.getByPlaceholder(/Plak hier de volledige vacaturetekst/).fill(VACANCY_TEXT);
    await page.getByRole('button', { name: /Analyseer vacature|Vacature Analyseren/i }).click();
    await page.getByRole('button', { name: /^(Doorgaan|Doorgaan met deze vacature)$/ }).click({ timeout: 30_000 });

    // Fit-analyse
    await page.getByRole('button', { name: /Analyseer Match/ }).click();
    await page.getByRole('button', { name: /^(Doorgaan|Toch Doorgaan)$/ }).first().click({ timeout: 30_000 });
    const confirm = page.getByRole('button', { name: 'Ja, Toch Doorgaan' });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();

    // Must-include items
    await page.getByRole('button', { name: 'Overslaan' }).click();

    // Stijlkeuze → AI-stijl
    await page.getByRole('button', { name: /Stijl Genereren/ }).click();

    // Stijl genereren en gebruiken (start CV-generatie)
    await page.getByRole('button', { name: /Generate AI Style|Genereer AI.?stijl/i }).first().click();
    await page.getByRole('button', { name: /Use This Style|Gebruik deze stijl/i }).click({ timeout: 60_000 });

    // Preview met gegenereerd CV
    await expect(page.locator('iframe[title="CV Preview"]')).toBeVisible({ timeout: 90_000 });

    const cvs = await listDocs<{ status: string; generatedContent: unknown }>(`users/${user.uid}/cvs`);
    expect(cvs).toHaveLength(1);
    expect(cvs[0].generatedContent).toBeTruthy();

    // Credits: job-parse 1 + fit 2 + style 1 + generate 3 = 7 (profiel uit tekst is gratis)
    const after = await credits(user.uid);
    expect(before.total - after.total).toBe(7);

    // AI-calls gingen naar de mock
    const calls = await mockAiRequests();
    expect(calls.length).toBeGreaterThanOrEqual(4);

    // PDF-download
    const downloadPromise = page.waitForEvent('download', { timeout: 90_000 });
    await page.getByRole('button', { name: /Download PDF/ }).first().click();
    await page.getByRole('menuitem', { name: /A4 Pagina/ }).click();
    const download = await downloadPromise;
    const pdfPath = await download.path();
    expect(pdfPath).toBeTruthy();
    const { readFileSync } = await import('node:fs');
    const bytes = readFileSync(pdfPath!);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(5_000);

    // PDF-download is gratis: geen extra aftrek
    expect((await credits(user.uid)).total).toBe(after.total);
  });

  test('zonder vacature: overslaan gaat direct naar de stijlkeuze', async ({ loggedInPage: page }) => {
    await enterProfileFromText(page);
    await page.getByRole('button', { name: /^Overslaan \(Algeme(ne|en) CV\)$/ }).click();
    await expect(page.getByRole('button', { name: /Stijl Genereren/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Template Kiezen/ })).toBeVisible();
  });
});

test.describe('Wizard-ingangen', () => {
  test('/cv/new?profile=<id> laadt het opgeslagen profiel direct', async ({ loggedInPage: page, user }) => {
    const { api, SAMPLE_PROFILE } = await import('../support/api');
    const res = await api(user, '/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ name: 'Profiel voor wizard', parsedData: SAMPLE_PROFILE }),
    });
    const json = (await res.json()) as { profile?: { id: string }; id?: string };
    const id = json.profile?.id ?? json.id!;
    await page.goto(`/nl/cv/new?profile=${id}`);
    await expect(page.getByText('Sanne de Vries').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Doorgaan', exact: true })).toBeVisible();
  });
});

test.describe('CV-lijst', () => {
  test('actiemenu opent zonder te navigeren; "Download PDF" start de download', async ({ loggedInPage: page, user }) => {
    test.setTimeout(150_000);
    const { seedGeneratedCv } = await import('../support/api');
    const cvId = await seedGeneratedCv(user);
    await page.goto('/nl/cv');
    await page.getByRole('button', { name: 'Acties' }).first().click();
    await expect(page).toHaveURL(/\/nl\/cv$/);
    const downloadPromise = page.waitForEvent('download', { timeout: 90_000 });
    await page.getByRole('menuitem', { name: /PDF/ }).click();
    await expect(page).toHaveURL(new RegExp(`/nl/cv/${cvId}\\?download=true`));
    const download = await downloadPromise;
    expect(await download.path()).toBeTruthy();
  });
});
