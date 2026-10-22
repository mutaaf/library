# Content format v2 (additions to CONTENT.md)

These fields are added to `content/books/<slug>.json`. Everything in CONTENT.md still holds
unless this file replaces it.

```jsonc
{
  "pages": 229,                                  // page count of the edition followed (verified)
  "category": "teams-people",                    // engineering-leadership | teams-people | strategy-influence | personal-growth
  "coverImage": {                                // optional; the real cover, self-hosted
    "file": "covers/five-dysfunctions-of-a-team.jpg",   // under content/, copied to dist/library/covers/
    "source": "Open Library",
    "url": "https://covers.openlibrary.org/b/isbn/9780787960759-L.jpg"
  },
  "cover": { "bg": "#B3262B", "ink": "#FFFFFF", "foil": "#F2D9A6", "type": "serif" }, // CSS cover echoing the real edition (contrast ≥ 4.5)
  "framework": {                                 // the book's own model, in its own terms
    "title": "The five dysfunctions", "claim": "book", "visibility": "published",
    "items": [ { "name": "Absence of trust", "gist": "Team members are unwilling to be vulnerable with one another." } ]
  },
  "pullQuote": { "text": "…", "claim": "interpretation", "visibility": "published" }, // the owner's one-line takeaway, ≤ 140 chars
  "reading": {                                   // replaces readingStatus + statusVisibility
    "status": "finished",                        // wishlist | queued | reading | finished | revisiting
    "startedAt": "2024-09", "finishedAt": "2024-10",   // YYYY-MM, optional
    "rating": 5,                                 // 1–5 in 0.5 steps, optional
    "recommended": true,                         // optional
    "confirmed": false,                          // false = proposed by the assistant, not yet confirmed by the owner
    "visibility": "published"
  }
}
```

Section `kind`s gain:
- `diagnostic`: questions to ask your own team (a Markdown list)
- `takeaways`: what to keep (a Markdown list)
- `skip`: who should skip it, and when it misleads
- `pairs`: what to read it with, and why

Render order:
1. why
2. thesis
3. framework
4. ideas
5. applications
6. diagnostic
7. agree
8. challenge
9. takeaways
10. pairs
11. skip
12. note

The order sits in a table of tabs: Overview (why, thesis, framework), Key ideas (ideas), My notes
(applications, agree, challenge, reflections), Takeaways (takeaways, diagnostic, pairs,
skip), Related (connections, resources).
