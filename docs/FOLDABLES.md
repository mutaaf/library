# Foldables: the reference

How the Leadership Library handles every shape a foldable can take, what each one looks like,
how the page knows, and how to check it. The code is `web/fold.css` (the last CSS layer), the
`<head>` script in `src/render/page.mjs` (`FORM_SCRIPT`) and `web/library.js` (form, posture,
stage). The tests are `tests/e2e/fold.spec.js` and `tests/e2e/library.spec.js`.

**The rule over all of it: no line of text ever crosses a hinge.**

## The postures

| Posture | The device | What the page does | How it knows |
|---|---|---|---|
| **Flat, one screen** | any phone, a foldable's cover screen, a foldable opened flat | The app form (phones get the tab bar and Now Reading). Nothing overflows down to 280px wide. | the default |
| **Duo, closed** | iPhone Duo cover display | The book form: one page, iOS navigation, inset lists. | iPhone user agent + the screen table in `src/duo.mjs` |
| **Book** (hinge down the middle) | iPhone Duo open; Galaxy Fold, Pixel Fold or Surface Duo half-open like a book | A two-page spread: the shelf on the left, the book on the right, each scrolling on its own. With a reported hinge, each page is exactly one segment and the gutter is exactly the hinge (`env(viewport-segment-*)`); toasts sit on the right page, never across the fold. On a book, "‹ Library" at the top of the left page goes back to the root. | `(horizontal-viewport-segments: 2)`; on the Duo, a landscape inner display |
| **Tabletop** (hinge across the middle) | a Fold or Pixel Fold half-open in landscape like a laptop; a Galaxy Z Flip or Razr half-open | The top screen is a **stage** to look at; the bottom screen is where you read and tap. On a book: the book "open on the table" (cover, title, rating, the section you're on and how far through you are). On the home: the portrait's head, driven by its list on the bottom screen: tap a row below and the book slides out of the head above. The filter sheet and the book peek stay on the bottom screen. | `(vertical-viewport-segments: 2)` → `html[data-posture="tabletop"]` |

Tabletop takes the app form even on a Duo: a half-folded screen is a stage and a desk, not a
spread.

## Changing posture while reading

Folding, unfolding, half-folding and flattening never reload the page. `library.js` listens to
`(horizontal-viewport-segments: 2)`, `(vertical-viewport-segments: 2)`, `(device-posture:
folded)`, the Device Posture API's `change` event and `resize`, and `checkForm()` re-decides
both the form and the posture:

- **Opening and closing the book** swings the page that appears open from the hinge (a view
  transition, `data-fold-anim="opening|closing"`).
- **Half-folding into tabletop** lifts the stage like a laptop lid from the hinge
  (`data-fold-anim="lid-up"`); flattening lays it back down (`lid-down`).
- **The reader's place is kept:** the heading you were reading is put back where you were
  reading it, below the sticky bar, and in tabletop below the stage.
- **The portrait's head** moves to the stage and back (`arrange()`), keeping whichever book
  you'd pulled out.

Under reduced motion there is no transition: the change is instant.

## Geometry

- Measured values only come from `env(viewport-segment-*)` inside the matching
  `*-viewport-segments` media query. WebKit drops a whole declaration that uses the two-index
  `env()` form, fallback included, so defaults (the middle of the screen) are set outside the
  query and replaced inside it.
- Tabletop: `--tt-top` is where the top screen ends, `--tt-bot` where the bottom one starts.
  The stage covers the top screen and paints the hinge between them dark, so nothing scrolls
  through the gap. The body starts at `--tt-bot`; the nav sits at the top of the bottom screen.
- Book: `grid-template-columns: env(viewport-segment-width 0 0) calc(env(viewport-segment-left 1
  0) - env(viewport-segment-right 0 0)) env(viewport-segment-width 1 0)`.

## Checking it

- **On a desktop, any browser:** `?duo=open|closed|auto|off` and `?posture=tabletop|auto|off`
  (remembered for the tab; `auto` hands back to the device). Tabletop emulated puts the hinge
  in the middle.
- **`?fold=debug`** draws each viewport segment with its size, and names the form and posture
  the page chose. Bring it to any new foldable first.
- **Chrome DevTools:** device toolbar → a foldable (Galaxy Z Fold, Surface Duo) → the posture
  buttons; or Sensors → Device posture.
- **In tests, real hinge geometry** comes from Chromium's DevTools protocol, which drives the
  Viewport Segments API exactly as a device does:

  ```js
  const c = await page.context().newCDPSession(page);
  await c.send('Emulation.setDeviceMetricsOverride', { width: 840, height: 700, deviceScaleFactor: 1, mobile: true,
    displayFeature: { orientation: 'horizontal', offset: 350, maskLength: 20 } }); // tabletop, 20px hinge
  ```

  `orientation: 'horizontal'` is a fold across the screen (tabletop); `'vertical'` is one down
  the middle (book). Calling it again without `displayFeature` flattens the device, live.

## What `fold.spec.js` proves

- **Tabletop, measured:** the stage ends exactly at the bottom of the hinge, nothing on the
  page starts above it, and a tap on the bottom screen pulls the book out on the top one.
- **Tabletop, a book:** the stage names the book and follows the section you scroll to.
- **Live changes:** flat, then tabletop, then flat, then book, with no reload.
- **Book, measured** (the original Surface Duo, Chrome DevTools' preset: 540 + 34 + 540): each page is exactly one screen and the
  gutter is exactly the hinge.
- **Overlays in tabletop:** the filter sheet opens on the bottom screen and never reaches
  above the hinge.
- **A flip phone half-open,** in WebKit and Chromium: the split is right, nothing overflows,
  and axe finds no serious issues.
- **Cover screens** at 280 and 344px: nothing runs off the side, in both forms.

## Not yet measured

- **Real devices.** Every hinge above was checked with Chromium's display-feature emulation,
  the same API a device feeds, and with `?posture=tabletop`; none on a Galaxy Fold or Flip,
  a Pixel Fold, a Razr or a Surface Duo yet. The posture table says what each should get
  if, as Chrome documents, it reports its hinge as viewport segments. Check one with
  `?fold=debug` and record it here.

- **The iPhone Duo's open display, and whether iOS reports viewport segments** (see
  docs/DESIGN.md § Measured). iOS has no Device Posture API, so a Duo held half-open
  in portrait shows the closed layout until Safari reports a hinge.
- **The Device Posture API's JavaScript side** isn't exposed in the test browsers.
  `(device-posture: folded)` is used as a signal to re-check, never alone to decide a layout,
  because "folded" says nothing about where the hinge is.
