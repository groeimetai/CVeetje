import { test, expect } from '../support/fixtures';
import { credits, getDoc, listDocs, mockAiRequests } from '../support/emulator';
import { api, seedGeneratedCv, SAMPLE_PROFILE } from '../support/api';

test.describe('CV-detail, motivatiebrief, chat en disputes', () => {
  test('CV-lijst en detailpagina tonen het gegenereerde CV', async ({ loggedInPage: page, user }) => {
    const cvId = await seedGeneratedCv(user);
    await page.goto('/nl/cv');
    await expect(page.getByText(/Acme BV/).first()).toBeVisible();

    await page.goto(`/nl/cv/${cvId}`);
    const frame = page.frameLocator('iframe[title="CV Preview"]');
    await expect(frame.getByText('Sanne de Vries').first()).toBeVisible({ timeout: 30_000 });
  });

  // Bekende bug (fase C): de v2-renderer (alle nieuwe CV's) injecteert geen
  // click-to-edit-bridge, terwijl de UI "klik direct op de tekst" belooft.
  test.fixme('inline bewerken in de preview wordt opgeslagen (postMessage-bridge)', async ({ loggedInPage: page, user }) => {
    const cvId = await seedGeneratedCv(user);
    await page.goto(`/nl/cv/${cvId}`);
    const frame = page.frameLocator('iframe[title="CV Preview"]');
    const summary = frame.getByText(/Ervaren frontend developer/).first();
    await expect(summary).toBeVisible({ timeout: 30_000 });
    await summary.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Extra zin uit e2e.');
    // blur → postMessage naar parent → debounced PATCH
    await frame.locator('body').click({ position: { x: 5, y: 5 } });
    await expect
      .poll(async () => JSON.stringify((await getDoc(`users/${user.uid}/cvs/${cvId}`))?.generatedContent ?? ''), {
        timeout: 20_000,
      })
      .toContain('Extra zin uit e2e.');
  });

  test('PDF-route rendert het CV in de eigen stijl en kost geen credits', async ({ user }) => {
    const cvId = await seedGeneratedCv(user);
    const before = await credits(user.uid);
    const res = await api(user, `/api/cv/${cvId}/pdf`, { method: 'POST', body: JSON.stringify({}) });
    expect(res.status).toBe(200);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await credits(user.uid)).total).toBe(before.total);
  });

  test('motivatiebrief genereren (3 credits) en downloaden als PDF en DOCX', async ({ user }) => {
    const cvId = await seedGeneratedCv(user);
    const before = await credits(user.uid);
    const gen = await api(user, `/api/cv/${cvId}/motivation`, {
      method: 'POST',
      body: JSON.stringify({ language: 'nl' }),
    });
    expect(gen.status).toBe(200);
    const genJson = (await gen.json()) as { letter?: { fullText?: string } };
    expect(genJson.letter?.fullText?.length ?? 0).toBeGreaterThan(100);
    expect(before.total - (await credits(user.uid)).total).toBe(3);

    for (const format of ['pdf', 'docx'] as const) {
      const dl = await api(user, `/api/cv/${cvId}/motivation/download`, {
        method: 'POST',
        body: JSON.stringify({ format, letter: genJson.letter }),
      });
      expect(dl.status, `download ${format}`).toBe(200);
      const bytes = Buffer.from(await dl.arrayBuffer());
      expect(bytes.subarray(0, format === 'pdf' ? 5 : 2).toString()).toBe(format === 'pdf' ? '%PDF-' : 'PK');
    }
  });

  test('CV-chat streamt een antwoord en rekent per sessie af', async ({ user }) => {
    const cvId = await seedGeneratedCv(user);
    const cv = await getDoc<{ generatedContent: unknown; designTokens: unknown }>(`users/${user.uid}/cvs/${cvId}`);
    const before = await credits(user.uid);
    const body = (chargedCredits: number) =>
      JSON.stringify({
        id: 'e2e-chat-session-1',
        chargedCredits, // wordt door de server genegeerd
        context: {
          linkedInData: SAMPLE_PROFILE,
          jobVacancy: null,
          fitAnalysis: null,
          currentContent: cv!.generatedContent,
          currentTokens: cv!.designTokens,
          language: 'nl',
        },
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Maak mijn samenvatting krachtiger.' }] }],
      });
    const res = await api(user, '/api/cv/chat', { method: 'POST', body: body(999) });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('samenvatting');
    expect(before.total - (await credits(user.uid)).total).toBe(1);

    // Zelfde sessie, zelfde berichten → geen nieuwe afschrijving
    const again = await api(user, '/api/cv/chat', { method: 'POST', body: body(0) });
    expect(again.status).toBe(200);
    await again.text();
    expect(before.total - (await credits(user.uid)).total).toBe(1);
    expect((await mockAiRequests()).some((r) => r.stream)).toBeTruthy();
  });

  test('dispute: AI-gatekeeper keurt goed en regenereert gratis', async ({ user }) => {
    const cvId = await seedGeneratedCv(user);
    const before = await credits(user.uid);
    const res = await api(user, `/api/cv/${cvId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'De stijl is te rustig voor een creatieve rol, ik wil iets uitgesprokeners.',
        requestedLevel: 'creative',
      }),
    });
    const json = (await res.json()) as { status?: string; error?: string };
    expect(res.status, json.error).toBe(200);
    expect(json.status).toBe('approved');
    expect((await credits(user.uid)).total).toBe(before.total);
    const cv = await getDoc<{ disputeCount: number; creativityLevel: string; disputeLockAt?: unknown }>(
      `users/${user.uid}/cvs/${cvId}`,
    );
    expect(cv!.disputeCount).toBe(1);
    expect(cv!.creativityLevel).toBe('creative');
    expect(cv!.disputeLockAt).toBeUndefined();
    const disputes = await listDocs(`users/${user.uid}/cvs/${cvId}/disputes`);
    expect(disputes).toHaveLength(1);
  });
});
