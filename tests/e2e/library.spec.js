// The PRD's acceptance tests (§14) that a browser can check, in both forms.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TITLES = ['Become an Effective Software Engineering Manager', 'An Elegant Puzzle', 'The Manager’s Path', 'Peopleware', 'Extreme Programming Explained', 'The Five Dysfunctions of a Team', 'Drive', 'Radical Candor', 'The 48 Laws of Power', 'Clean Code', 'Accelerate'];
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe('app form', () => {
  for (const [w, h] of [[320, 640], [390, 844], [1024, 768], [1440, 900]]) {
    test(`every book, no horizontal scroll at ${w}px`, async ({ page }) => {
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
    // Title and author matches come first; the analysis mentions him elsewhere too.
    await expect(page.locator('.bk:not([hidden])').first()).toHaveAttribute('data-slug', 'five-dysfunctions-of-a-team');
    await page.fill('#q', 'vulnerability trust');
    await expect(page.locator('.bk:not([hidden])').first()).toBeVisible();
    await page.fill('#q', 'zzzz-nothing');
    await expect(page.locator('#empty')).toBeVisible();
    await page.click('#clearAll');
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(TITLES.length);
    await page.click('#filterBtn');
    await page.locator('.chip', { hasText: 'Motivation' }).click();
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(1);
    await expect(page.locator('#filterCount')).toHaveText('1');
    await page.selectOption('#sort', 'year');
    await page.click('#resetFilters');
    await page.locator('.cat[data-cat="teams-people"]').click();
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(3);
    await page.click('#resetFilters');
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(TITLES.length);
    await expect(page.locator('.bk').first()).toHaveAttribute('data-slug', 'become-an-effective-software-engineering-manager');
  });

  test('a book opens at a stable URL with its labelled sections, and back returns', async ({ page }) => {
    await page.goto('/library/');
    await page.locator('.bk[data-slug="drive"] .bk-link').click();
    await expect(page).toHaveURL(/\/library\/drive\/$/);
    await expect(page.locator('h1')).toHaveText('Drive');
    await expect(page.locator('#thesis .claim')).toHaveText("Book's argument");
    await expect(page.locator('#why .claim')).toHaveText('My interpretation');
    await expect(page.locator('.side-card')).toBeVisible();
    // Tabs: one panel at a time, deep-linkable.
    await page.locator('#tab-takeaways').click();
    await expect(page.locator('#panel-takeaways')).toBeVisible();
    await expect(page.locator('#panel-overview')).toBeHidden();
    await expect(page).toHaveURL(/#panel-takeaways$/);
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
    await expect(page.locator('.lost-list a')).toHaveCount(TITLES.length);
  });

  for (const path of ['/library/', '/library/the-48-laws-of-power/']) {
    test(`no serious accessibility violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      // Measure settled colours, not mid-way through the scroll reveal.
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
      await page.addStyleTag({ content: '.reveal{transition:none!important}' });
      const r = await new AxeBuilder({ page }).analyze();
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(bad.map((v) => v.id + ': ' + v.nodes.length)).toEqual([]);
    });
  }
});

test.describe('work with me', () => {
  test('the nav and the hero lead to every way to connect', async ({ page }) => {
    await page.goto('/library/');
    await page.locator('.nav-cta').click();
    await expect(page.locator('#hire')).toBeInViewport();
    const hrefs = await page.locator('.hire-contact a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs.some((h) => h.startsWith('mailto:'))).toBe(true);
    expect(hrefs.some((h) => h.startsWith('tel:'))).toBe(true);
    expect(hrefs.some((h) => /linkedin\.com\/in\//.test(h))).toBe(true);
    await expect(page.locator('.hero a[href="#hire"]')).toBeVisible();
  });
  test('open Duo: on the right-hand page, and readable', async ({ page }) => {
    await page.setViewportSize({ width: 951, height: 669 });
    await page.goto('/library/?duo=open');
    await expect(page.locator('.colophon #hire')).toBeAttached();
    // Text on the dark cards stays light (a colophon rule once greyed it out).
    const dark = await page.locator('.colophon .hire p, .colophon .philo p').evaluateAll((ps) => ps.filter((p) => { const m = getComputedStyle(p).color.match(/\d+/g).map(Number); return m[0] + m[1] + m[2] < 300 && !(m[3] === 0); }).length);
    expect(dark).toBe(0);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('every book and every published section still renders', async ({ page }) => {
    await page.goto('/library/');
    await expect(page.locator('.bk-link:visible')).toHaveCount(TITLES.length);
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
    // Read down to the book's framework, the way a reader scrolls (the heading just below the tabs).
    await page.evaluate(() => { const f = document.getElementById('framework'); window.scrollTo({ top: f.getBoundingClientRect().top + scrollY - 110, behavior: 'instant' }); });
    await page.waitForTimeout(150);
    await page.setViewportSize({ width: 951, height: 669 }); // unfolded
    await expect(page.locator('html')).toHaveAttribute('data-fold', 'open');
    await expect(page.locator('#shelf')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-fold-anim', /./);
    // It lands just below the book's sticky tabs on the right-hand page.
    const rel = await page.evaluate(() => document.getElementById('framework').getBoundingClientRect().top - document.querySelector('.leaf-book .tabs').getBoundingClientRect().bottom);
    expect(rel).toBeGreaterThan(-4);
    expect(rel).toBeLessThan(160);
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
    // Every home section moves to the right-hand page; none is left stranded in the spread.
    await expect(page.locator('.colophon #portrait')).toBeAttached();
    await expect(page.locator('.bk-link').first()).toBeInViewport();
    expect(await page.evaluate(() => [...document.querySelector('main').children].filter((e) => !e.matches('.leaf, .gutter') && getComputedStyle(e).display !== 'none').map((e) => e.id || e.className))).toEqual([]);
  });

  test('closed, the home opens on the hero card', async ({ page }) => {
    await page.setViewportSize({ width: 382, height: 580 });
    await page.goto('/library/?duo=closed');
    await expect(page.locator('.night')).toBeVisible();
    const hero = await page.locator('.night').boundingBox();
    const shelf = await page.locator('#shelf').boundingBox();
    expect(hero.y).toBeLessThan(shelf.y);
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
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

test.describe('everything is clickable', () => {
  test('stats filter the shelf; themes filter the shelf; the loop selects; tags filter insights', async ({ page }) => {
    await page.goto('/library/');
    await page.locator('.stats a[data-filter="status:finished"]').click();
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(await page.locator('.bk[data-status="finished"]').count());
    await page.locator('.hub-map a[data-filter^="theme:"]').first().click();
    const n = await page.locator('.bk:not([hidden])').count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(TITLES.length);
    await page.locator('.loop-node[data-ph="3"]').click();
    await expect(page.locator('#ph-3')).toHaveClass(/on/);
    const tag = page.locator('.in-tag').first();
    await tag.click();
    await expect(tag).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#inFilter')).toBeVisible();
  });

  test('book form uses the iOS navigation bar and inset list', async ({ page }) => {
    await page.setViewportSize({ width: 382, height: 580 });
    await page.goto('/library/accelerate/?duo=closed');
    await expect(page.locator('.ios-back')).toBeVisible();
    await expect(page.locator('.nav')).toBeHidden();
    await page.locator('.ios-back').click();
    await expect(page).toHaveURL(/\/library\/(#books)?$/);
    await expect(page.locator('#shelf')).toHaveAttribute('data-view', 'list');
    const box = await page.locator('.bk-link').first().boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44); // HIG minimum target
  });
});

test('the Duo shows the philosophy and the rest, closed and open', async ({ page }) => {
  await page.setViewportSize({ width: 382, height: 580 });
  await page.goto('/library/?duo=auto');
  await page.locator('.ios-explore a[href="#philosophy"]').click();
  await expect(page.locator('#philosophy')).toBeInViewport();
  await expect(page.locator('#journey')).toBeAttached();
  await page.setViewportSize({ width: 951, height: 669 });
  await expect(page.locator('.colophon #philosophy')).toBeAttached();
  await expect(page.locator('.colophon #insights')).toBeAttached();
  await page.locator('.ios-explore a[href="#insights"]').click();
  await expect(page.locator('#insights')).toBeInViewport();
  await page.setViewportSize({ width: 382, height: 580 });
  await expect(page.locator('.colophon #philosophy')).toHaveCount(0);
  await expect(page.locator('#philosophy')).toBeVisible();
});
