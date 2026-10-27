# Design

## Why it looks like this

**Read Now (2026-10-27):** the owner asked for "the most appealing and pop culture app …
light mode default" and picked Apple Music / Books. `web/music.css` is the last layer, over
both forms: the black bands turn white and `#F5F5F7`, the accent is Apple Music's red
(`#FA2D48` to look at, `#E0193F` under white text, `#D70F35` as text), the hero is a drifting
mesh of the most saturated cover colours (`--cv-wash`), and each book page is washed in its
own. New: Recently Added (a scroll-snap row) and What's New (from `addedAt`/`updatedAt`),
Settings-style squircle icons on each section, and on phones a tab bar with a Now Reading
mini-player. The aurora-field sky is retired: it draws additively and vanishes on white.

The portrait in spines (2026-10-27): the spines rise into the head when it is first seen; a tap
(on the head or a row) slides that book up out of the outline, dims the rest, tints the light
behind the head with the book's colour and says what it gives away; a drag across the head flips
through them like the index on an iOS list (a 6ms haptic tick where the device has one). Arrow
keys move through the rows; Escape puts the book back. Without JS every row shows its line.

**Studio (2026-10-23):** the owner asked for "extremely modern, Apple and Tesla inspired".
`web/studio.css` restyles the app form (scoped to `:root:not(.duo)`, built between
`library.css` and `duo.css`). Black full-bleed bands for the hero, philosophy, journey and
closer (Tesla); `#F5F5F7` and white bands, white cards and one blue `#0071E3` for the rest
(Apple). Geist (OFL, self-hosted) for everything; Instrument Serif only in quotes. The room
photo is gone from the hero; the stack of books is lit like a product shot instead. The Duo
keeps its HIG layer, retinted to system blue with SF Pro headings.

**v3 (2026-10-22):** the owner's mockup, literally. A generated photograph of a lamp-lit library (`web/room.jpg`) is the hero, with the nine books as 2.5D hardcovers on its table (true CSS 3D faces didn't paint reliably). The nav, nine-across covers and the Journey/Themes/Insights row follow the mockup; the page is light, only the photo and the Journey card are dark.


- **Owner's direction:** everywhere except the iPhone Duo, the library follows the same
  app pattern as Hearth and COLD GAS.
- **The Duo moment:** closing the phone closes the book.
- **Palette:** the PRD's ink `#151B20`, walnut `#473426`, parchment `#F2EBDD`, brass
  `#B48A48` and sage `#83947B`. Lamp-lit walnut is the dark mode.
- **Fonts** (self-hosted, OFL): Instrument Serif for display, Atkinson Hyperlegible Next for
  body and Fragment Mono for labels.
- **Covers** are typographic CSS objects, so cover art rights never come up. Their type
  scales with the cover through container query units.

## Forms

| Form | When | Layout |
|---|---|---|
| App | default, and no-JS | pill nav, a white hero over a drifting mesh of cover colours, Recently Added, the portrait in spines, the sections, then the shelf (Shelf / Grid / List; Grid default ≤600px), closer, footer. Book pages: dark cover hero, then labelled sections. |
| Book, closed | Duo cover display | One parchment page. `/library/` is the shelf of spines; a book's URL is that book, its hero a rounded card. |
| Book, open | Duo inner display (landscape, ≥600px wide) | A two-page spread: `grid-template-columns: 1fr 2px 1fr`, the gutter on the hinge. Shelf left, book right (a colophon on `/library/`). Each page scrolls on its own. On a book, the shelf keeps an iOS back button, "‹ Library", at its top: the way back to the root. |
| Tabletop | any foldable half-open with the hinge across the screen | The app form below the hinge; the top screen is a stage (the book open on the table, or the portrait's head). |

Portrait-open and Split View fall back to the closed layout. Chromium foldables spanning two
segments get the open layout, measured to the real hinge. Everything about foldables is in
[FOLDABLES.md](FOLDABLES.md).

## Motion

- **Springs:** `src/render/spring.mjs` turns UIKit-style springs (response, damping) into
  CSS `linear()` easings. There are three: `--spring` for page moves (0.55s, critically
  damped), `--spring-soft` for sheets, lifts and the shelf glide (0.42s, ζ 0.82) and
  `--spring-snap` (0.3s, ζ 0.9).
- **Opening a book:** a cross-document view transition.
  - The tapped spine or cover is named `lib-cover` at `pageswap` and morphs into the book's
    `#heroCover`. The shelf recedes and the page rises.
  - Going back (`types: back`) reverses it; the hero shrinks into its exact shelf slot.
  - In the open spread the shelf (`lib-shelf`) stays still, and only the right page
    (`lib-page`) turns.
- **Unfolding:** `checkForm()` wraps the change in `document.startViewTransition`.
  - The page that appears swings open from the hinge: `rotateY(±96° → 0)` with
    `transform-origin` on the gutter, under a perspective of 1600px.
  - The page that stays glides into its half.
- **Folding** reverses it. The reader's heading is recorded before the change and put back
  below the sticky contents bar afterwards.
- **Shelf / Grid / List and filtering:** books glide to their new places (one temporary
  view-transition name each).
- **The filter sheet** follows your finger on phones and flings closed past 90px or
  0.6px/ms.
- **Reduced motion:** a 120ms crossfade, nothing spatial. The mesh holds still; the portrait's spines are already in the head and its caption crossfades.

## Measured: iPhone Duo (Xcode 27.1 simulator, iOS 27.1, 2026-10-22)

| | Framebuffer | `screen` (CSS px) | Safari viewport |
|---|---|---|---|
| Cover display (closed) | 1398 × 2034 @3× | 466 × 678 | 382 × 580 (Safari's controls sit in a right-hand rail) |
| Inner display (open) | 2007 × 2853 @3× | 669 × 951 (landscape when open) | not measured |

**Detection:** `src/duo.mjs` matches the cover display by size. Any iPhone screen whose
short side is 600 or more is the inner display; no other iPhone comes close.

**The open form was not measured.** The simulator has no command-line fold control
(`simctl` has none, and powering displays on and off doesn't change the posture), and
DeviceHub's fold control needs a person. The open form is covered by WebKit tests at
951 × 669 (`?duo=auto`). It still needs a check on the device or in DeviceHub.
