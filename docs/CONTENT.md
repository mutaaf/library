# Content guide

Everything public on `/library` is built from the files in `content/`. Edit a file, open a
PR, merge it: Workers Builds rebuilds and deploys. The build validates every file
(`src/schema.mjs`) and fails with a message that names the file and the field.

## The one rule

**Whose claim is it?** Every block of prose carries a `claim`, shown on the page as its label:

| `claim` | Label on the page | Use for |
|---|---|---|
| `book` | Book's argument | what the book says, in summary (never a long quotation) |
| `interpretation` | My interpretation | what you take it to mean |
| `application` | My application | how you use it as a leader |
| `critique` | My critique | where you disagree or it falls short |
| `context` | Context | neutral editorial notes: editions, ethics caveats |

And every block carries a `visibility`: `draft` or `published`. **Drafts never reach the
build output**: the build drops them, and a test greps `dist/` for every draft string.

## `content/books/<slug>.json`

```jsonc
{
  "slug": "peopleware",                         // = file name, [a-z0-9-]+
  "title": "Peopleware",
  "subtitle": "Productive Projects and Teams",  // optional
  "authors": ["Tom DeMarco", "Timothy Lister"],
  "firstPublishedYear": 1987,
  "edition": "3rd edition, 2013",               // optional; the edition the summary follows
  "publisher": "Dorset House",                   // optional
  "isbn13": "9780321934116",                     // optional; only if verified, matches edition
  "verified": { "on": "2026-10-22", "sources": ["https://openlibrary.org/..."] },
  "themes": ["team-culture"],                    // slugs from content/themes.json; first = primary
  "featuredRank": 4,                             // curated order on the shelf, 1 = first
  "readingStatus": null,                         // null | wishlist | queued | reading | finished | revisiting
  "statusVisibility": "draft",                   // the status shows only when "published"
  "cover": { "bg": "#2E4A3F", "ink": "#F2EBDD", "foil": "#B48A48", "type": "serif" }, // type: serif | grotesk | slab | mono
  "oneLine": { "text": "…", "claim": "book", "visibility": "published" },  // shelf hover / list line, ≤ 120 chars
  "sections": [
    { "kind": "why",          "claim": "interpretation", "visibility": "draft",     "body": "" },
    { "kind": "thesis",       "claim": "book",           "visibility": "published", "body": "Markdown" },
    { "kind": "applications", "claim": "application",    "visibility": "draft",     "body": "" },
    { "kind": "agree",        "claim": "interpretation", "visibility": "draft",     "body": "" },
    { "kind": "challenge",    "claim": "critique",       "visibility": "draft",     "body": "" },
    { "kind": "note",         "claim": "context",        "visibility": "published", "body": "Markdown" }
  ],
  "ideas": [
    { "title": "…", "summary": "…", "caveat": "…", "example": "…", "claim": "book", "visibility": "published" }
  ],
  "resources": [
    // only links you have opened and checked; none is fine
    { "label": "Publisher page", "url": "https://…", "provider": "…", "format": "print|ebook|audio|web",
      "accessType": "sample|borrow|buy|free-authorized", "isFullText": false, "verifiedAt": "2026-10-22" }
  ],
  "assistantDrafted": true,                      // true → the page says the summary was drafted with AI assistance
  "updatedAt": "2026-10-22"
}
```

Section `kind`s render in this order: `why` (Why it's on my shelf), `thesis` (Core thesis),
ideas (Big ideas), `applications`, `agree` (Where I agree), `challenge` (Where I challenge
it), `note` (Context). A kind with nothing published is left out entirely.

Markdown: paragraphs, `*em*`, `**strong**`, `[links](https://…)`, `- lists`, `1. lists`,
`> quotes`. Nothing else; HTML is escaped.

## `content/reflections/<slug>/<YYYY-MM-DD>[-n].md`

```markdown
---
title: First read, chapter 3          # optional
visibility: draft                     # draft | published
tags: hiring, 1:1s                    # optional
---
Markdown body.
```

## `content/experiments/<slug>/<id>.json`

`{ "hypothesis", "action", "successSignal"?, "status": "planned|running|done|dropped",
"startedAt"?, "completedAt"?, "outcome"?, "visibility" }`

## `content/themes.json` and `content/connections.json`

Themes: `[{ "slug", "name", "description" }]`.
Connections: `[{ "from", "to", "theme", "explanation", "claim", "visibility" }]`. The link
between two books (via their shared theme) always shows; the `explanation` shows only when
published. Connections are bidirectional.
