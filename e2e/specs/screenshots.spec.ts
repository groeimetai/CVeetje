/**
 * Visuele snapshots van de belangrijkste ingelogde pagina's (desktop + mobiel).
 * Draait alleen met SCREENSHOTS=1:  SCREENSHOTS=1 npx playwright test screenshots
 * Output: test-results/screenshots/*.png
 *
 * Geen `networkidle`: Firestore houdt een long-poll open, dus die state wordt
 * nooit bereikt. We wachten op de content (h1/main) plus een korte settle.
 */
import { test } from '../support/fixtures';
import { createUser, resetEmulators, type TestUser } from '../support/emulator';
import { seedGeneratedCv } from '../support/api';
import { loginViaUi } from '../support/fixtures';

test.skip(process.env.SCREENSHOTS !== '1', 'alleen met SCREENSHOTS=1');
test.describe.configure({ mode: 'serial' });

const PAGES = ['/nl/dashboard', '/nl/cv', '/nl/cv/new', '/nl/profiles', '/nl/applications', '/nl/credits', '/nl/settings', '/nl/templates'];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

let user: TestUser;
let cvId: string;

test.beforeAll(async () => {
  await resetEmulators();
  user = await createUser();
  cvId = await seedGeneratedCv(user);
});

for (const vp of VIEWPORTS) {
  test(`screenshots ${vp.name}`, async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.addInitScript(() => localStorage.setItem('cveetje-cookie-consent', 'declined'));
    const page = await context.newPage();
    await loginViaUi(page, user);
    for (const p of [...PAGES, `/nl/cv/${cvId}`]) {
      await page.goto(p, { waitUntil: 'domcontentloaded' });
      await page.locator('main').first().waitFor({ timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
      const name = p.replace(/^\/nl\/?/, '').replace(/\//g, '_') || 'home';
      await page.screenshot({ path: `test-results/screenshots/${vp.name}-${name.slice(0, 40)}.png` });
    }
    await context.close();
  });
}
