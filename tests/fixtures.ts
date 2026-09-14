import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('https://api.github.com/repos/**', (route) =>
      route.fulfill({
        json: { stargazers_count: 42, forks_count: 7 },
      })
    );
    await use(page);
  },
});

export { expect };
