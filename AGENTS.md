# AGENTS.md: operating manual for the Leadership Library

Read this before changing anything. The design is in [docs/DESIGN.md](docs/DESIGN.md); the
content format is in [docs/CONTENT.md](docs/CONTENT.md).

## 0 · Invariants (breaking any of these fails review)

1. **Never invent the owner's reading life.** Do not invent reading status, ratings,
   opinions, anecdotes, quotes, page numbers or purchase links. Anything personal is
   written by the owner. Anything you draft goes in as `visibility: "draft"`, and a summary
   of a book's argument carries `assistantDrafted: true`, which the page discloses.
2. **Drafts never reach `dist/`.** `src/content.mjs` strips them once, in `publicView()`,
   and the renderer only ever sees that view. `test/content.test.mjs` greps the build for
   every draft string. Never render from `all`.
3. **Every block carries a claim label.** `claim` (book, interpretation, application,
   critique, context) renders as a visible label. Don't add prose that lacks one.
4. **Links only once verified.** A resource needs `verifiedAt`. Full text is allowed only
   when the copy is authorized free or a library loan. Never link an unauthorized PDF.
5. **Pages work without JavaScript.** Every page is complete HTML. `library.js` only
   enhances it: the form, transitions, the shelf tools and the sky.
6. **ES5 in `web/*.js`** (var, function, no arrows or template literals), like the
   personal site. Node code in `src/` and `test/` is modern ESM.
7. **Motion is springs on transform and opacity**, generated in `src/render/spring.mjs`.
   Under `prefers-reduced-motion` it is a crossfade of 150ms or less, or nothing.

## 1 · Map

```
content/            the library (books, reflections, experiments, themes, connections)
src/schema.mjs      validation; error messages name the file and the field
src/content.mjs     load → validate → publicView (drafts removed)
src/md.mjs          escape-first mini Markdown
src/render/page.mjs page templates + the <head> form script (FORM_SCRIPT)
src/duo.mjs         the iPhone Duo screen table used before first paint
src/build.mjs       → dist/library/** (+ dist/_headers)
scripts/add-book.mjs a book from a title/ISBN/link via Open Library (the Add a book issue
                    form + .github/workflows/add-book.yml; owner-only, pushes to main)
web/                library.css, library.js, shapes.js (aurora-field shapes), icon.svg
test/               node:test unit tests (+ fixtures/)
tests/e2e/          Playwright, WebKit + Chromium
```

## 2 · The two forms

- **The app form** is the default, and what every device gets without JS. It is Hearth's
  landing pattern: `.nav` pill, `.night` with a sticky `.sky` behind `.hero` and the
  `.story` steps, then the shelf, the `.closer` and the `.foot`. Keep its vocabulary in step
  with `hearth/site`.
- **The book form** applies when `html.duo` is set, with `data-fold="closed|open"`.
  - **Detection:** the `<head>` script sets it before paint. An iPhone user agent plus
    the screen table in `src/duo.mjs` means a Duo. So do two horizontal viewport segments
    (Chromium foldables).
  - **Fold changes:** `library.js` → `checkForm()` swaps the form inside a view transition
    (`data-fold-anim="opening|closing"` while it runs) and restores the reader's heading.
  - **Testing on a desktop:** use `?duo=open|closed|auto|off`. It's remembered for the tab
    in sessionStorage.

## 3 · Deploy

Merging to `main` deploys: Workers Builds (connected 2026-10-22) runs `npm run build`, then
`npx wrangler deploy`.
Pull requests get preview URLs. No tokens are kept in this repo or its CI. To roll back,
revert the PR (or `npx wrangler rollback`). Removing the route hands `/library` back to
the personal site.

## 4 · Definition of done

- [ ] `npm run check` is green (build, unit tests, e2e in WebKit and Chromium)
- [ ] Screenshots at 390px and 1440px in the app form, and closed and open in the book form
- [ ] No draft text in `dist/` (the test does this), and no new claim without a label
- [ ] If a book was added: metadata verified with sources, `assistantDrafted` set honestly
- [ ] If the page's facts changed, update the personal site's `llms.txt` line in its own PR
