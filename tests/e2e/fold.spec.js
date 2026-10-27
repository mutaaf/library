// Foldables: every posture the web can see (docs/FOLDABLES.md). Real hinge geometry comes
// from Chromium's display-feature emulation (CDP), which drives the Viewport Segments API
// exactly as a Galaxy Fold, Pixel Fold or Surface Duo does; the ?posture=tabletop
// emulation runs in both engines.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const box = (page, sel) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; });
// A hinge: orientation 'horizontal' is a fold across the screen (tabletop), 'vertical' one
// down the middle (book). Without a feature the device is flat.
async function device(page, width, height, feature) {
  const c = await page.context().newCDPSession(page);
  await c.send('Emulation.setDeviceMetricsOverride', Object.assign({ width, height, deviceScaleFactor: 1, mobile: true }, feature ? { displayFeature: feature } : {}));
  return (f) => c.send('Emulation.setDeviceMetricsOverride', Object.assign({ width, height, deviceScaleFactor: 1, mobile: true }, f ? { displayFeature: f } : {}));
}

test.describe('measured hinges (Chromium)', () => {
  test.beforeEach(({ browserName }) => test.skip(browserName !== 'chromium', 'display-feature emulation is Chromium DevTools'));

  test('tabletop: the head on the top screen, the list that drives it on the bottom one', async ({ page }) => {
    await device(page, 840, 700, { orientation: 'horizontal', offset: 350, maskLength: 20 });
    await page.goto('/library/');
    await expect(page.locator('html')).toHaveAttribute('data-posture', 'tabletop');
    // The stage covers the top screen and the hinge; the page starts below the hinge.
    const st = await box(page, '#stage');
    expect(st.top).toBe(0);
    expect(st.bottom).toBe(370);
    expect((await box(page, '.night')).top).toBeGreaterThanOrEqual(370);
    await expect(page.locator('#stage .pt-bust')).toBeVisible();
    await expect(page.locator('#stage .pt-bust')).toHaveClass(/shelved/);
    // Tap a row on the bottom screen; the book comes out of the head on the top one.
    const row = page.locator('.pt-list button').nth(1);
    await row.scrollIntoViewIfNeeded();
    expect((await row.boundingBox()).y).toBeGreaterThanOrEqual(370);
    await row.click();
    await expect(page.locator('#stage .pt-out')).toHaveCount(1);
    await expect(page.locator('#stage #pt-say b')).toHaveText(await row.getAttribute('data-line'));
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('tabletop: a book open on the table follows where you are', async ({ page }) => {
    await device(page, 840, 700, { orientation: 'horizontal', offset: 350, maskLength: 0 });
    await page.goto('/library/peopleware/');
    await expect(page.locator('#stage .stage-title')).toHaveText(await page.locator('h1').textContent());
    await expect(page.locator('.hero-cover')).toBeHidden();
    const first = await page.locator('#stage-now').textContent();
    const bar0 = await page.locator('#stage-bar').evaluate((e) => getComputedStyle(e).transform);
    await page.mouse.wheel(0, 1600);
    await expect(page.locator('#stage-now')).not.toHaveText(first);
    await expect.poll(() => page.locator('#stage-bar').evaluate((e) => getComputedStyle(e).transform)).not.toBe(bar0);
    // Key ideas are numbered on the page; the stage names them without the number.
    await page.locator('#tab-ideas').click();
    await page.locator('.panel.on .idea h4').nth(1).scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await expect(page.locator('#stage-now')).not.toHaveText(/^(\d|Key)/);
  });

  test('folding and flattening while reading: the page follows, nothing reloads', async ({ page }) => {
    const set = await device(page, 840, 700, null);
    await page.goto('/library/');
    await page.evaluate(() => { window.__same = true; });
    await expect(page.locator('html')).not.toHaveAttribute('data-posture', /./);
    await expect(page.locator('#portrait .pt-bust')).toBeAttached();
    await set({ orientation: 'horizontal', offset: 350, maskLength: 0 });
    await expect(page.locator('html')).toHaveAttribute('data-posture', 'tabletop');
    await expect(page.locator('#stage .pt-bust')).toBeAttached();
    await set(null);
    await expect(page.locator('html')).not.toHaveAttribute('data-posture', /./);
    await expect(page.locator('#portrait .pt-bust')).toBeAttached();
    // Opened like a book: the spread.
    await set({ orientation: 'vertical', offset: 420, maskLength: 0 });
    await expect(page.locator('html')).toHaveAttribute('data-fold', 'open');
    expect(await page.evaluate(() => window.__same)).toBe(true);
  });

  test('book posture: each page is exactly one screen and the gutter is the hinge', async ({ page }) => {
    await device(page, 1114, 720, { orientation: 'vertical', offset: 540, maskLength: 34 });
    await page.goto('/library/accelerate/');
    await expect(page.locator('html')).toHaveAttribute('data-fold', 'open');
    const l = await box(page, '.leaf-shelf'), r = await box(page, '.leaf-book');
    expect(l.left).toBe(0);
    expect(l.right).toBe(540);
    expect(r.left).toBe(574);
    expect(r.right).toBe(1114);
  });
});

test.describe('tabletop, emulated (any engine)', () => {
  test('a flip phone half-open: the stage on top, nothing crosses the fold, still accessible', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/library/?posture=tabletop');
    await expect(page.locator('html')).toHaveAttribute('data-posture', 'tabletop');
    const st = await box(page, '#stage');
    expect(Math.abs(st.bottom - 457.5), JSON.stringify(st)).toBeLessThan(2);
    await expect(page.locator('#stage .pt-bust')).toBeVisible();
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    // Measure settled colours: the scroll-driven rail paused, every finite animation done.
    await page.addStyleTag({ content: '.rail li { animation: none !important; }' });
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect.getComputedTiming().iterations === Infinity));
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id + ': ' + v.nodes.length)).toEqual([]);
    // The filter sheet opens on the bottom screen and never climbs over the fold.
    await page.locator('#filterBtn').scrollIntoViewIfNeeded();
    await page.locator('#filterBtn').click();
    await expect(page.locator('#filters')).toBeVisible();
    await page.waitForFunction(() => document.getElementById('filters').getAnimations().every((a) => a.playState !== 'running'));
    expect((await box(page, '#filters')).top).toBeGreaterThanOrEqual(st.bottom);
    await page.keyboard.press('Escape');
    await page.goto('/library/drive/');
    await expect(page.locator('#stage .stage-title')).toHaveText('Drive');
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    await page.goto('/library/nothing-here/');
    expect((await box(page, 'main')).top).toBeLessThan(200); // the 404 has no stage, so no split
    await page.goto('/library/?posture=off');
    await expect(page.locator('html')).not.toHaveAttribute('data-posture', /./);
    await expect(page.locator('#stage')).toBeHidden();
  });
});

test.describe('cover screens', () => {
  for (const [w, h] of [[280, 653], [344, 882]]) {
    test(w + 'px wide: nothing runs off the side', async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      for (const url of ['/library/', '/library/drive/', '/library/?duo=closed', '/library/five-dysfunctions-of-a-team/?duo=closed']) {
        await page.goto(url);
        expect(await noOverflow(page), url).toBeLessThanOrEqual(0);
      }
      await page.goto('/library/?duo=auto');
    });
  }
});
