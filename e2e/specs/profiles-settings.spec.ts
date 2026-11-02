import { test, expect } from '../support/fixtures';
import { createUser, credits, getDoc, listDocs, resetEmulators, signUp } from '../support/emulator';
import { api, SAMPLE_PROFILE } from '../support/api';
import { BASE_URL } from '../env';

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('Profielen', () => {
  test('profiel aanmaken, tonen, bewerken en verwijderen', async ({ loggedInPage: page, user }) => {
    const create = await api(user, '/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ name: 'Mijn profiel', parsedData: SAMPLE_PROFILE }),
    });
    const created = (await create.json()) as { profile?: { id: string }; id?: string; error?: string };
    expect(create.status, created.error).toBe(200);
    const id = created.profile?.id ?? created.id!;

    await page.goto('/nl/profiles');
    await expect(page.getByText('Mijn profiel', { exact: true })).toBeVisible();

    await page.goto(`/nl/profiles/${id}`);
    await expect(page.locator('input[value="Sanne de Vries"]').first()).toBeVisible();

    const del = await api(user, `/api/profiles/${id}`, { method: 'DELETE' });
    expect(del.status).toBe(200);
    expect(await getDoc(`users/${user.uid}/profiles/${id}`)).toBeNull();
  });

  test('avatar: PNG wordt geaccepteerd, SVG geweigerd', async ({ user }) => {
    const png = new FormData();
    png.append('file', new Blob([new Uint8Array(PNG)], { type: 'image/png' }), 'a.png');
    const ok = await api(user, '/api/cv/avatar', { method: 'POST', body: png });
    const okJson = (await ok.json()) as { url?: string; error?: string };
    expect(ok.status, okJson.error).toBe(200);
    expect(okJson.url).toContain('avatars');

    const svg = new FormData();
    svg.append('file', new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: 'image/svg+xml' }), 'a.svg');
    const bad = await api(user, '/api/cv/avatar', { method: 'POST', body: svg });
    expect(bad.status).toBe(400);
  });
});

test.describe('Instellingen en credits', () => {
  test('LLM-modus wisselen en eigen API-key opslaan (versleuteld)', async ({ user }) => {
    const mode = await api(user, '/api/settings/llm-mode', { method: 'PATCH', body: JSON.stringify({ mode: 'own-key' }) });
    expect(mode.status).toBe(200);
    const key = await api(user, '/api/settings/api-key', {
      method: 'POST',
      body: JSON.stringify({ provider: 'anthropic', apiKey: 'sk-ant-e2e-test-key-1234567890', model: 'claude-opus-4-7' }),
    });
    expect([200, 400]).toContain(key.status); // 400 als de key live gevalideerd wordt
    const doc = await getDoc<{ llmMode: string; apiKey?: { encryptedKey?: string } }>(`users/${user.uid}`);
    expect(doc!.llmMode).toBe('own-key');
    if (key.status === 200) {
      expect(doc!.apiKey?.encryptedKey).toBeTruthy();
      expect(doc!.apiKey?.encryptedKey).not.toContain('sk-ant-e2e');
    }
  });

  test('data-export bevat geen API-key-ciphertext', async ({ user }) => {
    const res = await api(user, '/api/settings/export');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('encryptedKey');
  });

  test('account verwijderen ruimt Auth en Firestore op', async ({ user }) => {
    const res = await api(user, '/api/settings/account', { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(await getDoc(`users/${user.uid}`)).toBeNull();
    // inloggen met dezelfde gegevens lukt niet meer
    const login = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true }) },
    );
    expect(login.ok).toBeFalsy();
  });

  test('credits-pagina toont saldo; checkout zonder Mollie faalt netjes', async ({ loggedInPage: page, user }) => {
    await page.goto('/nl/credits');
    await expect(page.getByText('15').first()).toBeVisible();
    const res = await api(user, '/api/mollie/checkout', { method: 'POST', body: JSON.stringify({ packageId: 'pack_5' }) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBeTruthy();
    expect(json.error).not.toMatch(/MOLLIE_API_KEY|stack|at /);
  });

  test('zonder credits wordt een AI-actie geweigerd (402) zonder negatief saldo', async () => {
    await resetEmulators();
    const poor = await createUser({ free: 0 });
    const res = await api(poor, '/api/cv/job/parse', {
      method: 'POST',
      body: JSON.stringify({ rawText: 'Vacature: frontend developer bij Acme in Utrecht met React-ervaring.' }),
    });
    expect(res.status).toBe(402);
    expect((await credits(poor.uid)).total).toBe(0);
  });

  test('parallelle AI-calls met 1 credit: maximaal één slaagt', async () => {
    await resetEmulators();
    const user = await createUser({ free: 1 });
    const calls = await Promise.all(
      Array.from({ length: 5 }, () =>
        api(user, '/api/cv/job/parse', {
          method: 'POST',
          body: JSON.stringify({ rawText: 'Vacature: frontend developer bij Acme in Utrecht met React-ervaring.' }),
        }),
      ),
    );
    const ok = calls.filter((r) => r.status === 200).length;
    expect(ok).toBeLessThanOrEqual(1);
    expect((await credits(user.uid)).total).toBeGreaterThanOrEqual(0);
  });

  test('nieuwe gebruiker via init-user krijgt starter-credits', async () => {
    await resetEmulators();
    const fresh = await signUp(`fresh${Date.now()}@e2e.test`, 'Test-wachtwoord-123!');
    const res = await fetch(`${BASE_URL}/api/auth/init-user`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${fresh.idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ageConfirmed: true }),
    });
    expect(res.status).toBe(200);
    expect((await credits(fresh.uid)).free).toBe(10);
    const tx = await listDocs(`users/${fresh.uid}/transactions`);
    expect(Array.isArray(tx)).toBeTruthy();
  });
});
