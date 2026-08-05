import { test, expect } from '@playwright/test';
import { PAGES } from './pages';

/**
 * Walks every element that renders its own text and compares it against the
 * first opaque background behind it, which is the part a static token audit
 * cannot do: a token that passes on the parchment canvas can still fail on
 * soft stone or on the black footer.
 */
function auditContrast() {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const luminance = (r: number, g: number, b: number) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

  const parse = (value: string) => {
    const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return {
      r: Number(m[1]),
      g: Number(m[2]),
      b: Number(m[3]),
      a: m[4] === undefined ? 1 : Number(m[4]),
    };
  };

  const hidden = (el: Element) => {
    let node: Element | null = el;
    while (node) {
      if (node.getAttribute('aria-hidden') === 'true') return true;
      node = node.parentElement;
    }
    return false;
  };

  const failures: string[] = [];

  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    const ownText = Array.from(el.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
    );
    if (!ownText || hidden(el)) continue;

    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    if (Number(style.opacity) === 0) continue;

    const fg = parse(style.color);
    if (!fg || fg.a === 0) continue;

    let bg = { r: 255, g: 255, b: 255, a: 1 };
    let node: Element | null = el;
    while (node) {
      const candidate = parse(getComputedStyle(node).backgroundColor);
      if (candidate && candidate.a === 1) {
        bg = candidate;
        break;
      }
      node = node.parentElement;
    }

    const l1 = luminance(fg.r, fg.g, fg.b);
    const l2 = luminance(bg.r, bg.g, bg.b);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    const size = parseFloat(style.fontSize);
    const weight = Number.parseInt(style.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;

    if (ratio < required - 0.005) {
      const label = el.textContent?.trim().slice(0, 30) ?? '';
      failures.push(
        `${el.tagName.toLowerCase()}.${el.className} — ${style.color} on rgb(${bg.r},${bg.g},${bg.b}) = ${ratio.toFixed(2)}:1, needs ${required}:1 — "${label}"`
      );
    }
  }

  return failures;
}

for (const path of PAGES) {
  test(`text meets WCAG AA contrast on ${path}`, async ({ page }) => {
    await page.goto(path);
    expect(await page.evaluate(auditContrast)).toEqual([]);
  });

  test(`landmarks and alt text are sound on ${path}`, async ({ page }) => {
    await page.goto(path);

    await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);

    const untitled = await page.locator('img:not([alt])').count();
    expect(untitled, 'every image needs an alt attribute').toBe(0);

    const namelessLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a'))
        .filter(
          (a) =>
            !a.textContent?.trim() &&
            !a.getAttribute('aria-label') &&
            !a.querySelector('img[alt]:not([alt=""])')
        )
        .map((a) => a.getAttribute('href') ?? '(no href)')
    );
    expect(namelessLinks, 'links need an accessible name').toEqual([]);
  });
}
