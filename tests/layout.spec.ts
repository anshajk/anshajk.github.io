import { test, expect } from './fixtures';
import { PAGES } from './pages';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'wide', width: 1512, height: 950 },
];

for (const path of PAGES) {
  for (const viewport of VIEWPORTS) {
    test(`no horizontal overflow on ${path} at ${viewport.name} (${viewport.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(path);

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const offenders = Array.from(document.body.querySelectorAll('*'))
          .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          offenders: offenders.slice(0, 5),
        };
      });

      expect(overflow.offenders).toEqual([]);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });
  }
}

/**
 * Regression guard for the writing rows collapsing on desktop: a base grid
 * placement was overriding its own min-width reset, which stacked the arrow
 * into the title column. On wide viewports the row must read
 * date -> body -> arrow, all on one line.
 */
test('writing rows read date, body then arrow on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const row = page.locator('.writing__link').first();
  test.skip(
    (await row.count()) === 0,
    'writing section absent — the feed was unreachable at build time'
  );

  const date = await row.locator('.writing__date').boundingBox();
  const body = await row.locator('.writing__body').boundingBox();
  const arrow = await row.locator('.writing__arrow').boundingBox();

  expect(date && body && arrow).toBeTruthy();
  if (!date || !body || !arrow) return;

  expect(date.x, 'date sits left of the body').toBeLessThan(body.x);
  expect(body.x, 'body sits left of the arrow').toBeLessThan(arrow.x);
  expect(
    Math.abs(date.y - body.y),
    'date and body share the same row'
  ).toBeLessThan(12);
  expect(
    body.width,
    'body fills the row rather than being squeezed into a column'
  ).toBeGreaterThan(400);
});

test('every section anchored from the nav exists', async ({ page }) => {
  await page.goto('/');

  const targets = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href^="/#"], a[href^="#"]'))
      .map((a) => (a.getAttribute('href') ?? '').split('#')[1])
      .filter(Boolean)
  );

  const missing: string[] = [];
  for (const id of new Set(targets)) {
    if ((await page.locator(`#${id}`).count()) === 0) missing.push(id);
  }
  expect(missing, 'nav anchors must resolve to a section').toEqual([]);
});

test('the home page ships the metadata that link previews need', async ({
  page,
}) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /^https:\/\/.+\.png$/
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image'
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /.{50,}/
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

  const og = await page.request.get('/og.png');
  expect(og.status(), 'the Open Graph image must actually exist').toBe(200);
});
