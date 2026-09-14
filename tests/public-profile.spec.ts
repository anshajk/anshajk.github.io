import { test, expect } from './fixtures';
import { PAGES } from './pages';

test('shows Microsoft advancement and current AI capabilities', async ({ page }) => {
  await page.goto('/');
  const introduction = page.locator('.hero__subtitle');
  await expect(introduction).toContainText('Machine Learning Engineer II at Microsoft');
  await expect(introduction).toContainText('production AI agents and cloud data platforms');
  await expect(introduction).toContainText('evaluation, and safety guardrails');
  const about = page.locator('#about');
  await expect(about.getByRole('heading', { level: 2 })).toHaveText('Engineering reliable AI systems');
  await expect(about).toContainText('backend and data engineering needed for reliable deployment');
  await expect(about).not.toContainText(/notebook|prototype/i);
  const microsoft = page.locator('.timeline__item').first();
  await expect(microsoft.locator('.timeline__role')).toHaveText('Machine Learning Engineer II');
  for (const topic of ['MCP-enabled planning agents', 'Agentic RAG and human review', 'Multi-agent risk monitoring', 'Evaluations and guardrails']) {
    await expect(microsoft.locator('.timeline__highlight-title').filter({ hasText: topic })).toBeVisible();
  }
  await expect(microsoft).toContainText('Microsoft Agent Framework');
  await expect(microsoft).toContainText('Azure OpenAI');
});

for (const path of PAGES) {
  test(`publishes only the approved contact alias on ${path}`, async ({ page }) => {
    await page.goto(path);
    const contacts = await page.locator('a[href^="mailto:"], a[href^="tel:"]').evaluateAll(
      (links) => links.map((link) => link.getAttribute('href'))
    );
    expect(contacts.length).toBeGreaterThan(0);
    expect(
      contacts.filter((contact) => contact !== 'mailto:contact@anshaj.dev').length,
      'Contact links must use only the approved public alias'
    ).toBe(0);
    const emails = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
      const matches: string[] = [];
      while (walker.nextNode()) {
        matches.push(...(walker.currentNode.textContent?.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? []));
      }
      return matches;
    });
    expect(
      emails.filter((email) => email !== 'contact@anshaj.dev').length,
      'Page text and metadata must not introduce other contact email addresses'
    ).toBe(0);

    const schemas: unknown[] = await page.locator('script[type="application/ld+json"]').evaluateAll(
      (scripts) => scripts.map((script) => JSON.parse(script.textContent ?? 'null'))
    );
    function checkContacts(value: unknown) {
      if (Array.isArray(value)) {
        value.forEach(checkContacts);
      } else if (value !== null && typeof value === 'object') {
        for (const [key, field] of Object.entries(value)) {
          if (key === 'email') {
            expect(field === 'mailto:contact@anshaj.dev', 'Structured email must use the public alias').toBe(true);
          }
          expect(key).not.toBe('telephone');
          checkContacts(field);
        }
      }
    }
    schemas.forEach(checkContacts);
    await expect(page.locator('a[href*="resume.tex"], a[href*=".resume-build"]')).toHaveCount(0);
  });
}
