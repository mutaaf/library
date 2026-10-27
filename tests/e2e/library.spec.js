// The PRD's acceptance tests (§14) that a browser can check, in both forms.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync } from 'node:fs';

// The shelf grows through the "Add a book" form, so the expectations come from content/.
const BOOKS = readdirSync('content/books').filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync('content/books/' + f, 'utf8')));
const TITLES = BOOKS.map((b) => b.title);
const count = (fn) => BOOKS.filter(fn).length;
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
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(count((b) => b.themes.includes('motivation')));
    await expect(page.locator('#filterCount')).toHaveText('1');
    await page.selectOption('#sort', 'year');
    await page.click('#resetFilters');
    await page.locator('.cat[data-cat="teams-people"]').click();
    await expect(page.locator('.bk:not([hidden])')).toHaveCount(count((b) => b.category === 'teams-people'));
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

  // Desktop, and a phone: the tab bar and the Now Reading player only exist below 700px.
  for (const [path, w, h] of [['/library/', 1280, 720], ['/library/the-48-laws-of-power/', 1280, 720], ['/library/', 390, 844], ['/library/drive/', 390, 844]]) {
    test(`no serious accessibility violations on ${path} at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(path);
      // Measure settled colours, not mid-way through the scroll reveal.
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
      await page.addStyleTag({ content: '.reveal{transition:none!important} .rail li{animation:none!important}' });
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
    const pdf = await page.locator('.hire-contact a[download]').getAttribute('href');
    const res = await page.request.get(pdf);
    expect(res.status()).toBe(200);
    expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });
  test('open Duo: on the right-hand page, and readable', async ({ page }) => {
    await page.setViewportSize({ width: 951, height: 669 });
    await page.goto('/library/?duo=open');
    await expect(page.locator('.colophon #hire')).toBeAttached();
    // Text on the cards reaches 4.5:1 against the card behind it (a colophon rule once greyed it out).
    const faint = await page.locator('.colophon .hire p, .colophon .philo p').evaluateAll((ps) => {
      const rgb = (c) => c.match(/[\d.]+/g).map(Number);
      const lum = (c) => { const v = rgb(c).slice(0, 3).map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      // The nearest painted background: a solid colour, or a gradient's first stop.
      const bg = (el) => {
        for (; el; el = el.parentElement) {
          const st = getComputedStyle(el), g = /gradient/.test(st.backgroundImage) && st.backgroundImage.match(/rgba?\([^)]*\)/);
          if (g && rgb(g[0])[3] !== 0) return g[0];
          if (rgb(st.backgroundColor)[3] !== 0) return st.backgroundColor;
        }
        return 'rgb(255, 255, 255)';
      };
      return ps.filter((p) => { const c = getComputedStyle(p).color; if (rgb(c)[3] === 0 || !p.textContent.trim()) return false; const a = lum(c), b = lum(bg(p)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 4.5; }).map((p) => p.className + ': ' + p.textContent.slice(0, 30));
    });
    expect(faint).toEqual([]);
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
  test('the portrait still says what every book gives away', async ({ page }) => {
    await page.goto('/library/');
    await expect(page.locator('.pt-line:visible')).toHaveCount(await page.locator('.pt-sp').count());
  });
});

test.describe('the portrait in spines', () => {
  for (const [form, size, q] of [['app form', { width: 1280, height: 860 }, ''], ['phone', { width: 390, height: 844 }, ''], ['Duo, closed', { width: 382, height: 680 }, '?duo=closed'], ['Duo, open', { width: 951, height: 669 }, '?duo=open']]) {
    test(form + ': the spines arrive, a tap pulls one out, a drag flips through them', async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('/library/' + q);
      const pt = page.locator('#portrait');
      await pt.locator('svg').scrollIntoViewIfNeeded();
      await expect(pt).toHaveClass(/shelved/);
      await page.waitForFunction(() => [...document.querySelectorAll('.pt-sp')].every((g) => getComputedStyle(g).transform === 'none'));
      // Tap a spine in the head.
      const sp = pt.locator('.pt-sp').nth(2);
      await sp.click({ force: true });
      await expect(sp).toHaveClass(/on/);
      await expect(pt.locator('.pt-pull .pt-out')).toHaveCount(1);
      const row = pt.locator('.pt-list button').nth(2);
      await expect(row).toHaveAttribute('aria-pressed', 'true');
      await expect(pt.locator('#pt-say b')).toHaveText(await row.getAttribute('data-line'));
      await expect(pt.locator('#pt-say a')).toHaveAttribute('href', await row.getAttribute('data-href'));
      // The caption never runs into the list.
      const say = await pt.locator('#pt-say').boundingBox();
      const list = await pt.locator('.pt-list').boundingBox();
      if (say.x < list.x + list.width && list.x < say.x + say.width) expect(say.y + say.height).toBeLessThanOrEqual(list.y + 1);
      // Tap it again: back in the head.
      await sp.click({ force: true });
      await expect(pt).not.toHaveClass(/has-pick/);
      await expect(pt.locator('.pt-pull .pt-out')).toHaveCount(0);
      // Drag across the head: the book under the finger is the one pulled out.
      const box = await pt.locator('svg').boundingBox();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5, { steps: 12 });
      await page.mouse.up();
      const last = await pt.locator('.pt-sp.on').getAttribute('data-pt');
      expect(+last).toBeGreaterThan(4);
      // A row picks its spine; arrows move through them; Escape puts it back.
      await row.click();
      await expect(sp).toHaveClass(/on/);
      await row.focus(); // Safari doesn't focus a button on click; keyboard users arrive by Tab
      await page.keyboard.press('ArrowDown');
      await expect(pt.locator('.pt-sp').nth(3)).toHaveClass(/on/);
      await expect(pt.locator('.pt-list button').nth(3)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(pt).not.toHaveClass(/has-pick/);
      // Escape works from the head too, not only from the list.
      await sp.click({ force: true });
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press('Escape');
      await expect(pt).not.toHaveClass(/has-pick/);
    });
  }
});

test.describe('book form (iPhone Duo)', () => {
  test('closed is one page; opening keeps your place; the spread holds across books; closing again', async ({ page }) => {
    await page.setViewportSize({ width: 382, height: 580 }); // the Duo's cover display in Safari
    await page.goto('/library/peopleware/?duo=auto');
    await expect(page.locator('html')).toHaveAttribute('data-fold', 'closed');
    await expect(page.locator('#shelf')).toBeHidden();
    // A reader scrolls a page that has finished loading. Until the fonts and the cover are in,
    // the layout is still moving, and the place we aim for isn't where the page will keep it.
    await page.waitForLoadState('load');
    await page.evaluate(() => document.fonts.ready);
    // Read down to the book's framework, the way a reader scrolls (the heading just below the tabs).
    await page.evaluate(() => { const f = document.getElementById('framework'); window.scrollTo({ top: f.getBoundingClientRect().top + scrollY - 110, behavior: 'instant' }); });
    // The page notes the reader's place on the frame after a scroll; under load that frame can
    // come later than any fixed wait, so wait for the frames themselves.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
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
