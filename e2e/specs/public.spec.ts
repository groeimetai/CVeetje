import { test, expect, collectErrors } from '../support/fixtures';
import { resetEmulators, seedJob } from '../support/emulator';

const PAGES = [
  '',
  '/about',
  '/ai-transparency',
  '/blog',
  '/compliance',
  '/cookies',
  '/cv-op-maat-maken',
  '/cv-stijlen',
  '/cv-template',
  '/cv-voorbeeld',
  '/faq',
  '/jobs',
  '/motivatiebrief-generator',
  '/privacy',
  '/sub-processors',
  '/terms',
  '/voor',
  '/login',
  '/register',
];

test.describe('Publieke pagina\'s', () => {
  for (const locale of ['nl', 'en']) {
    for (const p of PAGES) {
      test(`/${locale}${p} laadt zonder fouten`, async ({ page }) => {
        const errors = collectErrors(page);
        const res = await page.goto(`/${locale}${p}`);
        expect(res?.status(), `status /${locale}${p}`).toBeLessThan(400);
        await expect(page.locator('body')).toBeVisible();
        await page.waitForLoadState('networkidle');
        // Firebase-init op publieke pagina's mag geen fouten geven
        expect(errors.filter((e) => !/net::ERR|ERR_CONNECTION|Failed to fetch/.test(e))).toEqual([]);
      });
    }
  }

  test('detailpagina\'s van blog, cv-template, cv-voorbeeld en voor/[persona] laden', async ({ page }) => {
    for (const listPath of ['/nl/blog', '/nl/cv-template', '/nl/cv-voorbeeld', '/nl/voor']) {
      await page.goto(listPath);
      const prefix = listPath.replace('/nl', '');
      const link = page.locator(`a[href*="${prefix}/"]`).first();
      const href = await link.getAttribute('href');
      expect(href, `detail-link op ${listPath}`).toBeTruthy();
      const res = await page.goto(href!);
      expect(res?.status()).toBeLessThan(400);
    }
  });

  test('vacature-detail rendert beschrijving als tekst (geen HTML-injectie)', async ({ page }) => {
    await resetEmulators();
    const slug = await seedJob('xss-test-az-acme-999', {
      title: 'Tester </script><script>window.__pwned=1</script>',
      description: 'Beschrijving <img src=x onerror="window.__pwned=1"> einde',
    });
    let dialog = false;
    page.on('dialog', () => (dialog = true));
    const res = await page.goto(`/nl/jobs/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText('Beschrijving').first()).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    expect(dialog).toBe(false);
  });

  test('cookiebanner verschijnt en onthoudt de keuze', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/nl');
    const decline = page.getByRole('button', { name: 'Weigeren' });
    await expect(decline).toBeVisible();
    await decline.click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Weigeren' })).toHaveCount(0);
    await context.close();
  });

  test('SEO-endpoints en security-headers', async ({ request }) => {
    for (const p of ['/sitemap.xml', '/robots.txt', '/opengraph-image']) {
      const res = await request.get(p);
      expect(res.status(), p).toBe(200);
    }
    const res = await request.get('/nl');
    const csp = res.headers()['content-security-policy'];
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
