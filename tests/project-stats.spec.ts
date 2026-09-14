import { test, expect } from './fixtures';
import {
  formatRepositoryCount,
  parseRepositoryStats,
  repositoryApiUrl,
  STATS_CACHE_MS,
  STATS_CACHE_PREFIX,
} from '../src/lib/repository-stats';

const API = 'https://api.github.com/repos/**';
const REPO = 'anshajk/mcp_boilerplate';
const widgetSelector = `[data-github-repo="${REPO}"]`;

test('repository counts are validated rather than defaulting to zero', () => {
  expect(parseRepositoryStats({ stargazers_count: 0, forks_count: 1 })).toEqual({
    stars: 0,
    forks: 1,
  });
  for (const payload of [
    null,
    {},
    { stargazers_count: 3 },
    { stargazers_count: '3', forks_count: 1 },
    { stargazers_count: -1, forks_count: 1 },
    { stargazers_count: 3, forks_count: 0.5 },
    { stargazers_count: 3, forks_count: 1, private: true },
  ]) {
    expect(() => parseRepositoryStats(payload)).toThrow();
  }
  expect(formatRepositoryCount(1, 'fork')).toBe('1 fork');
  expect(formatRepositoryCount(1234, 'star')).toBe('1,234 stars');
  expect(repositoryApiUrl(REPO)).toBe(`https://api.github.com/repos/${REPO}`);
  expect(() => repositoryApiUrl('https://example.com/anything')).toThrow();
});

test('refreshes stars and forks without sending authentication', async ({ page }) => {
  const requests: string[] = [];
  await page.route(API, async (route) => {
    const headers = await route.request().allHeaders();
    expect(headers.authorization).toBeUndefined();
    requests.push(route.request().url());
    await route.fulfill({ json: { stargazers_count: 1234, forks_count: 17 } });
  });
  await page.goto('/');

  const widget = page.locator(widgetSelector);
  await expect(widget).toHaveAttribute('data-github-source', 'live');
  await expect(widget.locator('[data-repo-stars]')).toHaveText('1,234 stars');
  await expect(widget.locator('[data-repo-forks]')).toHaveText('17 forks');
  await expect(widget.locator('[data-repo-stars]')).toHaveAttribute(
    'href', `https://github.com/${REPO}/stargazers`
  );
  await expect(widget.locator('[data-repo-forks]')).toHaveAttribute(
    'href', `https://github.com/${REPO}/forks`
  );
  expect(new Set(requests).size).toBe(requests.length);
});

test('preserves the understated count thresholds independently', async ({ page }) => {
  await page.route(API, (route) => {
    const url = route.request().url();
    const stats = url.endsWith('/mcp_boilerplate')
      ? { stargazers_count: 2, forks_count: 1 }
      : url.endsWith('/a2a_boilerplate')
        ? { stargazers_count: 3, forks_count: 0 }
        : { stargazers_count: 0, forks_count: 0 };
    return route.fulfill({ json: stats });
  });
  await page.goto('/');
  const mcp = page.locator(widgetSelector);
  await expect(mcp).toHaveAttribute('data-github-source', 'live');
  await expect(mcp.locator('[data-repo-stars]')).toBeHidden();
  await expect(mcp.locator('[data-repo-forks]')).toBeVisible();
  await expect(mcp.locator('[data-repo-forks]')).toHaveText('1 fork');

  const a2a = page.locator('[data-github-repo="anshajk/a2a_boilerplate"]');
  await expect(a2a).toHaveAttribute('data-github-source', 'live');
  await expect(a2a.locator('[data-repo-stars]')).toBeVisible();
  await expect(a2a.locator('[data-repo-forks]')).toBeHidden();

  const rag = page.locator('[data-github-repo="anshajk/ragApp"]');
  await expect(rag).toHaveAttribute('data-github-source', 'live');
  await expect(rag).toBeHidden();
});

test('reuses fresh browser counts on reload', async ({ page }) => {
  let requests = 0;
  await page.route(API, (route) => {
    requests += 1;
    return route.fulfill({ json: { stargazers_count: 80, forks_count: 8 } });
  });
  await page.goto('/');
  const widgets = page.locator('[data-github-repo]');
  for (const widget of await widgets.all()) {
    await expect(widget).toHaveAttribute('data-github-source', 'live');
  }
  const firstLoadRequests = requests;
  expect(firstLoadRequests).toBeGreaterThan(0);
  await page.reload();
  for (const widget of await widgets.all()) {
    await expect(widget).toHaveAttribute('data-github-source', 'cache');
  }
  expect(requests).toBe(firstLoadRequests);
});

test('refreshes expired counts when the page becomes visible again', async ({ page }) => {
  await page.clock.install();
  let stars = 50;
  await page.route(API, (route) =>
    route.fulfill({ json: { stargazers_count: stars, forks_count: 4 } })
  );
  await page.goto('/');
  const widget = page.locator(widgetSelector);
  await expect(widget.locator('[data-repo-stars]')).toHaveText('50 stars');

  stars = 51;
  await page.clock.fastForward(STATS_CACHE_MS + 1);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(widget.locator('[data-repo-stars]')).toHaveText('51 stars');
});

for (const failure of ['rate-limit', 'invalid-response', 'network'] as const) {
  test(`keeps the build-time fallback on ${failure}`, async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    await page.route(API, (route) => {
      if (failure === 'network') return route.abort('failed');
      if (failure === 'rate-limit') {
        return route.fulfill({ status: 403, json: { message: 'API rate limit exceeded' } });
      }
      return route.fulfill({ json: { stargazers_count: 'invalid', forks_count: 0 } });
    });
    await page.goto('/');
    await expect.poll(() => warnings.some((text) => text.includes('keeping displayed counts'))).toBe(true);
    const widget = page.locator(widgetSelector);
    const source = await widget.getAttribute('data-github-source');
    expect(['build', 'unavailable']).toContain(source);
    const stars = await widget.getAttribute('data-stars');
    const forks = await widget.getAttribute('data-forks');
    if (stars !== null && forks !== null) {
      await expect(widget.locator('[data-repo-stars]')).toHaveText(
        formatRepositoryCount(Number(stars), 'star')
      );
      await expect(widget.locator('[data-repo-forks]')).toHaveText(
        formatRepositoryCount(Number(forks), 'fork')
      );
    } else {
      await expect(widget).toBeHidden();
    }
  });
}

test('ignores malformed cached counts and fetches valid data', async ({ page }) => {
  await page.addInitScript(
    ({ key }) => localStorage.setItem(key, '{"stats":"invalid"}'),
    { key: `${STATS_CACHE_PREFIX}${REPO}` }
  );
  await page.goto('/');
  const widget = page.locator(widgetSelector);
  await expect(widget).toHaveAttribute('data-github-source', 'live');
  await expect(widget.locator('[data-repo-stars]')).toHaveText('42 stars');
});

test('live updates still work when browser storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await page.goto('/');
  const widget = page.locator(widgetSelector);
  await expect(widget).toHaveAttribute('data-github-source', 'live');
  await expect(widget.locator('[data-repo-forks]')).toHaveText('7 forks');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('retains build-time counts or an unobtrusive unavailable state', async ({ page }) => {
    await page.goto('/');
    const widgets = page.locator('[data-github-repo]');
    expect(await widgets.count()).toBeGreaterThan(0);
    for (const widget of await widgets.all()) {
      const source = await widget.getAttribute('data-github-source');
      expect(['build', 'unavailable']).toContain(source);
      if (source === 'unavailable') await expect(widget).toBeHidden();
    }
  });
});
