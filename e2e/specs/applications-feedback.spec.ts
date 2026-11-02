import { test, expect } from '../support/fixtures';
import { getDoc, listDocs, seedJob } from '../support/emulator';
import { api } from '../support/api';

test.describe('Sollicitaties en feedback', () => {
  test('sollicitatie toevoegen, status wijzigen en verwijderen', async ({ loggedInPage: page, user }) => {
    const slug = await seedJob();
    const create = await api(user, '/api/applications', { method: 'POST', body: JSON.stringify({ jobSlug: slug }) });
    const created = (await create.json()) as { applicationId?: string; error?: string };
    expect([200, 201]).toContain(create.status);
    const id = created.applicationId!;

    await page.goto('/nl/applications');
    await expect(page.getByText('Senior Frontend Developer').first()).toBeVisible();

    const patch = await api(user, `/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'interview' }) });
    expect(patch.status).toBe(200);
    expect((await getDoc<{ status: string }>(`users/${user.uid}/applications/${id}`))!.status).toBe('interview');

    const invalid = await api(user, `/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status: '<img onerror=x>' }) });
    expect(invalid.status).toBe(400);

    const del = await api(user, `/api/applications/${id}`, { method: 'DELETE' });
    expect(del.status).toBe(200);
  });

  test('feedback indienen: vertrouwde velden zijn niet te overschrijven', async ({ user }) => {
    const res = await api(user, '/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bug_report',
        title: 'Knop werkt niet',
        stepsToReproduce: 'Klik op de knop',
        userId: 'someone-else',
        status: 'done',
        githubIssueUrl: 'https://evil.example',
      }),
    });
    expect(res.status).toBe(200);
    const all = await listDocs<{ userId: string; status: string; githubIssueUrl?: string; title: string }>('feedback');
    const fb = all.find((f) => f.title === 'Knop werkt niet');
    expect(fb!.userId).toBe(user.uid);
    expect(fb!.status).toBe('new');
    expect(fb!.githubIssueUrl).toBeUndefined();
  });

  test('feedback-pagina laadt het formulier', async ({ loggedInPage: page }) => {
    await page.goto('/nl/feedback');
    await expect(page.locator('form').first()).toBeVisible();
  });
});
