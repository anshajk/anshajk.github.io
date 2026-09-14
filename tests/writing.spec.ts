import { test, expect } from './fixtures';
import { getLatestPosts } from '../src/lib/feed';

const BLOG_URL = 'https://compute.anshaj.dev';
const ORIGINAL_CURATED_URLS = [
  'what-is-mcp',
  'rag-architects-handbook',
  'evaluating-agentic-systems',
  'multi-agent-systems',
].map((slug) => `${BLOG_URL}/p/${slug}`);

test('writing offers the curated learning path in reading order', async ({ page }) => {
  const response = await page.goto('/writing/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('main h1')).toHaveText('Writing');
  await expect(
    page.getByRole('region', { name: 'Writing', exact: true }).locator('p.prose')
  ).toHaveText(
    'Full articles live on The Compute Blog. This page is a guide to where to begin.'
  );

  const collection = page.getByRole('region', { name: 'Start here', exact: true });
  await expect(collection.getByRole('heading', { level: 2 })).toHaveText('Start here');
  const items = collection.locator('ol > li');
  expect(await items.count()).toBeGreaterThan(0);

  const hrefs: string[] = [];
  for (const item of await items.all()) {
    await expect(item.getByRole('heading', { level: 3 })).toHaveText(/\S/);
    await expect(item.getByRole('link')).toHaveCount(1);
    await expect(item.getByRole('link')).toHaveAttribute(
      'href',
      /^https:\/\/compute\.anshaj\.dev\/p\/.+/
    );
    hrefs.push((await item.getByRole('link').getAttribute('href'))!);
    await expect(item.locator('.learning-path__topic')).toHaveText(/\S/);
    await expect(item.locator('.learning-path__summary')).toHaveText(/\S/);
  }
  expect(new Set(hrefs).size, 'curated links must be unique').toBe(hrefs.length);

  let previousIndex = -1;
  for (const url of ORIGINAL_CURATED_URLS) {
    const index = hrefs.indexOf(url);
    expect(index, `${url} remains in the learning path`).toBeGreaterThanOrEqual(0);
    expect(index, 'original curated links retain their relative order')
      .toBeGreaterThan(previousIndex);
    previousIndex = index;
  }

  await expect(page.locator('main').getByRole('link', {
    name: 'The Compute Blog',
    exact: true,
  })).toHaveAttribute('href', BLOG_URL);
});

test('writing has page-specific metadata and a canonical URL', async ({ page }) => {
  await page.goto('/writing/');
  await expect(page).toHaveTitle(/^Writing · .+/);
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /^https:\/\/[^/]+\/writing\/$/
  );

  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description).toMatch(/curated learning path/i);
  expect(description).toMatch(/recent posts/i);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    await page.title()
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    description!
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    /^https:\/\/[^/]+\/writing\/$/
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    await page.title()
  );
});

test('recent posts show a bounded feed list or an informative fallback', async ({ page }) => {
  await page.goto('/writing/');
  const recent = page.getByRole('region', { name: 'Recent posts', exact: true });
  await expect(recent).toBeVisible();
  await expect(recent).toContainText('Up to 20 recent entries');
  await expect(recent).toContainText('RSS feed');
  await expect(recent.getByRole('link', { name: 'Visit the full blog' }))
    .toHaveAttribute('href', BLOG_URL);

  // RSS is read at build time, not in the browser. Both static outcomes are valid.
  const posts = recent.locator('.writing__item');
  const count = await posts.count();
  expect(count).toBeLessThanOrEqual(20);
  if (count === 0) {
    await expect(recent.locator('.writing__fallback')).toContainText(
      'Recent posts are unavailable here right now.'
    );
    await expect(page.locator('#start-here ol > li').first()).toBeVisible();
    return;
  }

  await expect(recent.locator('.writing__fallback')).toHaveCount(0);
  const dates: number[] = [];
  for (const post of await posts.all()) {
    await expect(post.locator('.writing__link')).toHaveAttribute(
      'href',
      /^https:\/\/compute\.anshaj\.dev\/p\//
    );
    await expect(post.locator('.writing__title')).toHaveText(/\S/);
    await expect(post.locator('time')).toHaveText(/\S/);
    const datetime = await post.locator('time').getAttribute('datetime');
    const timestamp = Date.parse(datetime ?? '');
    expect(Number.isNaN(timestamp)).toBe(false);
    dates.push(timestamp);
    for (const summary of await post.locator('.writing__summary').all()) {
      await expect(summary).toHaveText(/\S/);
    }
  }
  expect(dates).toEqual([...dates].sort((a, b) => b - a));
});

test('homepage writing section and onward links always exist', async ({ page }) => {
  await page.goto('/');
  const writing = page.locator('section#writing');
  await expect(writing).toBeVisible();
  await expect(writing.getByRole('heading', { name: 'The Compute Blog' })).toBeVisible();
  const onward = writing.getByRole('link', { name: 'Explore writing' });
  await expect(onward).toHaveAttribute('href', '/writing/');
  await expect(writing.getByRole('link', { name: 'Visit the full blog' }))
    .toHaveAttribute('href', BLOG_URL);

  const count = await writing.locator('.writing__item').count();
  expect(count).toBeLessThanOrEqual(4);
  if (count === 0) {
    await expect(writing.locator('.writing__fallback')).toContainText(
      'Explore the Start here collection'
    );
  }

  await onward.click();
  await expect(page).toHaveURL(/\/writing\/$/);
  await expect(page.getByRole('heading', { name: 'Start here', exact: true })).toBeVisible();
});

async function withFeed(
  fetchImplementation: typeof fetch,
  assertions: () => Promise<void>
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImplementation;
  try {
    await assertions();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const rss = (items: string) => `<rss version="2.0"><channel>${items}</channel></rss>`;

test('feed reader sorts, limits and cleans recent entries without live RSS', async () => {
  const items = Array.from({ length: 25 }, (_, index) => {
    const day = index + 1;
    return `<item>
      <title>Post ${day} &amp; tools</title>
      <link>${BLOG_URL}/p/post-${day}</link>
      <description><![CDATA[<p>A <strong>useful</strong> summary &amp; context.</p>]]></description>
      <pubDate>${new Date(Date.UTC(2026, 0, day)).toUTCString()}</pubDate>
    </item>`;
  }).join('');

  await withFeed(async () => new Response(rss(items)), async () => {
    const recent = await getLatestPosts(20);
    expect(recent).toHaveLength(20);
    expect(recent.map((post) => post.url)).toEqual(
      Array.from({ length: 20 }, (_, index) => `${BLOG_URL}/p/post-${25 - index}`)
    );
    expect(recent[0].title).toBe('Post 25 & tools');
    expect(recent[0].summary).toBe('A useful summary & context.');
    expect(recent[0].date.toISOString()).toBe('2026-01-25T00:00:00.000Z');
    expect(await getLatestPosts()).toHaveLength(4);
  });
});

test('feed reader supports a single entry and rejects unusable entries', async () => {
  const valid = `<item>
    <title>A valid post</title>
    <link>${BLOG_URL}/p/valid</link>
    <description>A short summary.</description>
    <pubDate>Thu, 01 Jan 2026 00:00:00 GMT</pubDate>
  </item>`;
  const invalid = `
    <item><title>Missing URL</title><pubDate>1 Jan 2026</pubDate></item>
    <item><link>${BLOG_URL}/p/no-title</link><pubDate>1 Jan 2026</pubDate></item>
    <item><title>Bad date</title><link>${BLOG_URL}/p/bad-date</link><pubDate>unknown</pubDate></item>`;

  for (const items of [valid, valid + invalid]) {
    await withFeed(async () => new Response(rss(items)), async () => {
      const posts = await getLatestPosts(20);
      expect(posts).toHaveLength(1);
      expect(posts[0].url).toBe(`${BLOG_URL}/p/valid`);
    });
  }
});

for (const scenario of ['empty', 'http-error', 'network-error', 'timeout'] as const) {
  test(`feed reader returns a fallback-safe empty list for ${scenario}`, async () => {
    await withFeed(async () => {
      if (scenario === 'network-error') throw new TypeError('Network unavailable');
      if (scenario === 'timeout') throw new DOMException('Feed timed out', 'TimeoutError');
      if (scenario === 'http-error') return new Response('', { status: 503 });
      return new Response(rss(''));
    }, async () => {
      expect(await getLatestPosts(20)).toEqual([]);
    });
  });
}
