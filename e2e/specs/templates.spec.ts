import { readFileSync } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { test, expect } from '../support/fixtures';
import { credits, getDoc } from '../support/emulator';
import { api, SAMPLE_PROFILE } from '../support/api';
import type { TestUser } from '../support/emulator';

const FIXTURES = path.join(__dirname, '..', '..', 'test-templates');

async function uploadTemplate(user: TestUser, file: string, mime: string, bytes?: Buffer) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes ?? readFileSync(path.join(FIXTURES, file)))], { type: mime }), file);
  form.append('name', `E2E ${file}`);
  return api(user, '/api/templates', { method: 'POST', body: form });
}

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

test.describe('Templates', () => {
  test('DOCX uploaden, preview-bestand ophalen, vullen en gratis als PDF opnieuw ophalen', async ({ user }) => {
    test.setTimeout(180_000);
    const up = await uploadTemplate(user, 'docx-table-experience.docx', DOCX);
    const upJson = (await up.json()) as { template?: { id: string }; error?: string };
    expect(up.status, upJson.error).toBe(200);
    const id = upJson.template!.id;

    // Preview-bestand via de nieuwe server-route (geen signed URL meer nodig)
    const file = await api(user, `/api/templates/${id}/file`);
    expect(file.status).toBe(200);
    expect(Buffer.from(await file.arrayBuffer()).subarray(0, 2).toString()).toBe('PK');

    const before = await credits(user.uid);
    const fill = await api(user, `/api/templates/${id}/fill?format=docx`, {
      method: 'POST',
      body: JSON.stringify({ profileData: SAMPLE_PROFILE, useAI: true, language: 'nl' }),
    });
    expect(fill.status, await fill.clone().text().then((t) => t.slice(0, 200))).toBe(200);
    expect(Buffer.from(await fill.arrayBuffer()).subarray(0, 2).toString()).toBe('PK');
    expect(before.total - (await credits(user.uid)).total).toBe(3);

    // Receipt maakt PDF-redownload gratis
    const receipt = await getDoc<{ refills: number }>(`users/${user.uid}/templateFills/${id}`);
    expect(receipt?.refills).toBe(0);
    const pdf = await api(user, `/api/templates/${id}/fill?format=pdf&skipCredit=true`, {
      method: 'POST',
      body: JSON.stringify({ profileData: SAMPLE_PROFILE, useAI: true, language: 'nl' }),
    });
    expect(pdf.status).toBe(200);
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
    expect(before.total - (await credits(user.uid)).total).toBe(3);
  });

  test('skipCredit zonder betaalde fill wordt gewoon afgerekend', async ({ user }) => {
    test.setTimeout(120_000);
    const up = await uploadTemplate(user, 'docx-label-value.docx', DOCX);
    const id = ((await up.json()) as { template: { id: string } }).template.id;
    const before = await credits(user.uid);
    const fill = await api(user, `/api/templates/${id}/fill?format=docx&skipCredit=true`, {
      method: 'POST',
      body: JSON.stringify({ profileData: SAMPLE_PROFILE, useAI: true, language: 'nl' }),
    });
    expect(fill.status).toBe(200);
    expect(before.total - (await credits(user.uid)).total).toBe(3);
  });

  test('zip-bomb DOCX wordt geweigerd', async ({ user }) => {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<Types/>');
    zip.file('word/document.xml', Buffer.alloc(60 * 1024 * 1024, 0x41));
    const bomb = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const res = await uploadTemplate(user, 'bomb.docx', DOCX, bomb);
    expect(res.status).toBe(400);
  });

  test('templates-pagina toont de geüploade template en de preview', async ({ loggedInPage: page, user }) => {
    await uploadTemplate(user, 'docx-table-experience.docx', DOCX);
    await page.goto('/nl/templates');
    await expect(page.getByText('E2E docx-table-experience.docx')).toBeVisible();
  });
});
