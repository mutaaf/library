// The PRD's acceptance tests (§14) that a browser can check, in both forms.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TITLES = ['Become an Effective Software Engineering Manager', 'An Elegant Puzzle', 'The Manager’s Path', 'Peopleware', 'Extreme Programming Explained', 'The Five Dysfunctions of a Team', 'Drive', 'Radical Candor', 'The 48 Laws of Power'];
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe('app form', () => {
  for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1440, 900]]) {
    test(`all nine books, no horizontal scroll at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/library/');
      for (const t of TITLES) await expect(page.locator('.bk-title', { hasText: t }).first()).toBeAttached();
      expect(await noOverflow(page)).toBeLessThanOrEqual(0);
      await page.goto('/library/the-48-laws-of-power/');
      expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test('search, filters and sort combine and reset', async ({ page }) => {
    await page.goto('/library/');
    await page.fill('#q', 'lencioni');
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(1);
    await page.fill('#q', 'zzzz-nothing');
    await expect(page.locator('#empty')).toBeVisible();
    await page.click('#clearAll');
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(9);
    await page.click('#filterBtn');
    await page.locator('.chip', { hasText: 'Motivation' }).click();
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(1);
    await expect(page.locator('#filterCount')).toHaveText('1');
    await page.selectOption('#sort', 'year');
    await page.click('#resetFilters');
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(9);
    await expect(page.locator('.bk').first()).toHaveAttribute('data-slug', 'become-an-effective-software-engineering-manager');
  });

  test('a book opens at a stable URL with its labelled sections, and back returns', async ({ page }) => {
    await page.goto('/library/');
    await page.locator('[data-set-view="grid"]').click();
    await page.locator('.bk[data-slug="drive"] .bk-link').click();
    await expect(page).toHaveURL(/\/library\/drive\/$/);
    await expect(page.locator('h1')).toHaveText('Drive');
    await expect(page.locator('#thesis .claim')).toHaveText("Book's argument");
    await expect(page.locator('#why')).toHaveCount(0); // a draft section is left out, not empty
    await page.goBack();
    await expect(page).toHaveURL(/\/library\/$/);
  });

  test('keyboard only: reach a book and open it', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'desktop Safari skips links on Tab by default');
    await page.goto('/library/peopleware/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip')).toBeFocused();
    const next = page.locator('.pg-next');
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/extreme-programming-explained/);
  });

  test('unknown pages 404 with a way back', async ({ page }) => {
    const res = await page.goto('/library/not-a-book/');
    expect(res.status()).toBe(404);
    await expect(page.locator('.lost-list a')).toHaveCount(9);
  });

  for (const path of ['/library/', '/library/the-48-laws-of-power/']) {
    test(`no serious accessibility violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const r = await new AxeBuilder({ page }).analyze();
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(bad.map((v) => v.id + ': ' + v.nodes.length)).toEqual([]);
    });
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('every book and every published section still renders', async ({ page }) => {
    await page.goto('/library/');
    await expect(page.locator('.bk-link:visible')).toHaveCount(9);
    for (const t of TITLES) await expect(page.locator('.bk-link', { hasText: t }).first()).toBeVisible();
    await page.goto('/library/radical-candor/');
    await expect(page.locator('#thesis')).toBeVisible();
    await expect(page.locator('.idea').first()).toBeVisible();
  });
});

test.describe('book form (iPhone Duo)', () => {
  test('closed is one page; opening keeps your place; the spread holds across books; closing again', async ({ page }) => {
    await page.setViewportSize({ width: 382, height: 580 }); // the Duo's cover display in Safari
    await page.goto('/library/peopleware/?duo=auto');
    await expect(page.locator('html')).toHaveAttribute('data-fold', 'closed');
    await expect(page.locator('#shelf')).toBeHidden();
    await page.locator('#ideas').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.getElementById('ideas').scrollIntoView());
    await page.setViewportSize({ width: 951, height: 669 }); // unfolded
    await expect(page.locator('html')).toHaveAttribute('data-fold', 'open');
    await expect(page.locator('#shelf')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-fold-anim', /./);
    const rel = await page.evaluate(() => document.getElementById('ideas').getBoundingClientRect().top - document.querySelector('.leaf-book').getBoundingClientRect().top);
    expect(rel).toBeGreaterThan(-4);
    expect(rel).toBeLessThan(140);
    // The hinge sits in the middle.
    const g = await page.locator('.gutter').boundingBox();
    expect(Math.abs(g.x + g.width / 2 - 951 / 2)).toBeLessThan(3);
    await page.locator('.bk[data-slug="drive"] .bk-link').click();
    await expect(page).toHaveURL(/\/library\/drive\//);
    await expect(page.locator('html')).toHaveAttribute('data-fold', 'open');
    await expect(page.locator('.bk[data-slug="drive"]')).toHaveClass(/is-here/);
    await page.setViewportSize({ width: 382, height: 580 });
    await expect(page.locator('html')).toHaveAttribute('data-fold', 'closed');
    await expect(page.locator('h1')).toHaveText('Drive');
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('the open home is shelf left, colophon right', async ({ page }) => {
    await page.setViewportSize({ width: 951, height: 669 });
    await page.goto('/library/?duo=open');
    const shelf = await page.locator('#shelf').boundingBox();
    const colo = await page.locator('.colophon').boundingBox();
    expect(shelf.x).toBeLessThan(colo.x);
    await expect(page.locator('.night')).toBeHidden();
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no fold animation, no sky', async ({ page }) => {
    await page.setViewportSize({ width: 382, height: 580 });
    await page.goto('/library/?duo=auto');
    await expect(page.locator('html')).toHaveClass(/still/);
    await page.evaluate(() => { window.__anim = []; new MutationObserver(() => window.__anim.push(document.documentElement.getAttribute('data-fold-anim'))).observe(document.documentElement, { attributes: true, attributeFilter: ['data-fold-anim'] }); });
    await page.setViewportSize({ width: 951, height: 669 });
    await expect(page.locator('html')).toHaveAttribute('data-fold', 'open');
    expect(await page.evaluate(() => window.__anim)).toEqual([]);
  });
});
