// The honesty and safety rules, as tests: drafts never render, bad content fails loudly,
// Markdown can't inject markup, and the real catalog is exactly the nine books.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from '../src/content.mjs';
import { validateBook } from '../src/schema.mjs';
import { md, inline } from '../src/md.mjs';
import { book, home } from '../src/render/page.mjs';
import { build } from '../src/build.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'test', 'fixtures');

test('drafts never reach a rendered page; published blocks do', () => {
  const { pub } = load(FIX);
  const b = pub.bySlug.get('sample-book');
  const html = home(pub, {}) + book(pub, b);
  for (const s of ['PUBLISHED-THESIS-TEXT', 'PUBLISHED-IDEA', 'PUBLISHED-REFLECTION-TITLE', 'PUBLISHED-REFLECTION-BODY']) assert.ok(html.includes(s), s);
  for (const s of ['DRAFT-WHY-SECRET', 'DRAFT-CHALLENGE-SECRET', 'DRAFT-IDEA-TITLE', 'DRAFT-IDEA-SECRET', 'DRAFT-REFLECTION-TITLE', 'DRAFT-REFLECTION-SECRET']) assert.ok(!html.includes(s), s);
  // A drafted reading entry (status, rating) is never shown.
  assert.equal(b.reading, null);
  assert.ok(!html.includes('(my rating)') && !html.includes('side-card'));
  assert.ok(html.includes('PUBLISHED-FRAMEWORK-ITEM') && !html.includes('DRAFT-PULLQUOTE-SECRET'));
});

test('the real catalog: every book once, honest reading data, no unverified links', () => {
  const { all, pub } = load(ROOT);
  // The shelf grows through the "Add a book" form, so no fixed count: at least the
  // original eleven, every one listed once.
  assert.ok(pub.books.length >= 11);
  assert.equal(new Set(pub.books.map((b) => b.title)).size, pub.books.length);
  for (const b of all.books) {
    // Owner decision 2026-10-22: personal sections and reading data are published in the
    // owner's voice, but every reading entry must say whether the owner has confirmed it.
    if (b.reading) assert.equal(typeof b.reading.confirmed, 'boolean', b.slug + ' reading.confirmed');
    for (const s of b.sections) if (s.claim === 'book') assert.ok(['thesis', 'note'].includes(s.kind) || s.kind === 'thesis', b.slug + ': a personal section kind is labelled as the book');
    for (const r of b.resources) assert.ok(r.verifiedAt, b.slug + ' has an unverified link');
    if (b.coverImage) assert.ok(b.coverImage.url.startsWith('https://covers.openlibrary.org/'), b.slug + ' cover source');
  }
  assert.equal(pub.bySlug.get('radical-candor').authors.join(), 'Kim Scott');
  assert.deepEqual(pub.bySlug.get('accelerate').authors, ['Nicole Forsgren', 'Jez Humble', 'Gene Kim']);
  assert.equal(pub.bySlug.get('clean-code').authors.join(), 'Robert C. Martin');
  // Every book the philosophy cites is on the shelf.
  const ph = JSON.parse(readFileSync(path.join(ROOT, 'content/philosophy.json'), 'utf8'));
  for (const n of [ph.core].concat(ph.loop)) for (const s of n.books) assert.ok(pub.bySlug.has(s), 'philosophy cites ' + s);
});

test('build output contains no draft text and valid JSON-LD', () => {
  const { all } = load(ROOT);
  const pub = build({ quiet: true });
  const files = [];
  const walk = (d) => readdirSync(d).forEach((f) => { const p = path.join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p); });
  walk(path.join(ROOT, 'dist', 'library'));
  assert.equal(files.length, 1 + pub.books.length + 1);
  const drafts = [];
  for (const b of all.books) {
    b.sections.filter((s) => s.visibility === 'draft' && s.body.trim()).forEach((s) => drafts.push(s.body.trim().slice(0, 60)));
    b.ideas.filter((i) => i.visibility === 'draft').forEach((i) => drafts.push(i.summary.slice(0, 60)));
  }
  all.connections.filter((c) => c.visibility === 'draft' && c.explanation.trim()).forEach((c) => drafts.push(c.explanation.trim().slice(0, 60)));
  all.reflections.filter((r) => r.visibility === 'draft' && r.body.trim()).forEach((r) => drafts.push(r.body.trim().slice(0, 60)));
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    for (const d of drafts) assert.ok(!html.includes(d), path.relative(ROOT, f) + ' leaks a draft: ' + d);
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (ld) {
      const data = JSON.parse(ld[1]);
      assert.ok(!JSON.stringify(data).includes('Rating'), 'no ratings in structured data');
    }
  }
  const one = JSON.parse(readFileSync(path.join(ROOT, 'dist/library/peopleware/index.html'), 'utf8').match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(one.mainEntity['@type'], 'Book');
  assert.equal(one.mainEntity.isbn, pub.bySlug.get('peopleware').isbn13);
});

test('schema rejects the mistakes that matter', () => {
  const good = JSON.parse(readFileSync(path.join(FIX, 'content/books/sample-book.json'), 'utf8'));
  const themes = new Set(['craft']);
  const file = 'content/books/sample-book.json';
  assert.deepEqual(validateBook(good, file, themes), []);
  const bad = (patch) => validateBook(Object.assign(structuredClone(good), patch), file, themes);
  assert.match(bad({ isbn13: '9780000000001' }).join(), /ISBN/);
  assert.match(bad({ cover: { bg: '#777777', ink: '#888888', foil: '#B48A48', type: 'serif' } }).join(), /contrast/);
  const rd = (r) => bad({ reading: Object.assign({ status: 'finished', finishedAt: '2024-10', confirmed: false, visibility: 'published' }, r) }).join();
  assert.equal(rd({}), '');
  assert.match(rd({ rating: 6 }), /half steps/);
  assert.match(rd({ rating: 4.3 }), /half steps/);
  assert.match(rd({ finishedAt: undefined }), /finished book/);
  assert.match(rd({ confirmed: undefined }), /confirmed/);
  assert.match(rd({ startedAt: '2025-01', finishedAt: '2024-10' }), /finishes before it starts/);
  assert.match(bad({ category: 'misc' }).join(), /category/);
  assert.match(bad({ sections: [{ kind: 'why', claim: 'interpretation', visibility: 'published', body: '' }] }).join(), /cannot be empty/);
  assert.match(bad({ resources: [{ label: 'PDF', url: 'https://x.example/b.pdf', provider: 'x', format: 'ebook', accessType: 'buy', isFullText: true, verifiedAt: '2026-10-22' }] }).join(), /full text/);
  assert.match(bad({ resources: [{ label: 'x', url: 'http://x.example', provider: 'x', format: 'web', accessType: 'buy', isFullText: false, verifiedAt: '2026-10-22' }] }).join(), /https/);
  assert.match(bad({ themes: ['nope'] }).join(), /themes/);
});

test('Markdown escapes markup and unsafe links', () => {
  assert.equal(md('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.ok(!/href|javascript/.test(inline('[x](javascript:alert(1))')));
  assert.equal(inline('[x](data:text/html,hi)'), 'x');
  assert.equal(inline('[x](https://a.example/"onmouseover=1)'), '<a href="https://a.example/&quot;onmouseover=1" rel="noopener" target="_blank">x</a>');
  assert.equal(inline('[shelf](/library/drive/)'), '<a href="/library/drive/">shelf</a>');
  assert.equal(md('- **a**\n- *b*'), '<ul><li><strong>a</strong></li><li><em>b</em></li></ul>');
});
