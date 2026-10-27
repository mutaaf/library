// The "Add a book" form: what the owner types is read correctly, only the owner's words
// are published, and the form's choices stay in step with content/. No network here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { interpret, makeBook, parseIssue, slugify, titleCase } from '../scripts/add-book.mjs';
import { CATEGORIES, validateBook } from '../src/schema.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const themes = JSON.parse(readFileSync(path.join(ROOT, 'content/themes.json'), 'utf8'));
const meta = { title: 'Thinking in Systems', subtitle: 'A Primer', authors: ['Donella H. Meadows'], firstPublishedYear: 2008, publisher: 'Chelsea Green', isbn13: '9781603580557', pages: 218, coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg', sources: ['https://openlibrary.org/works/OL3737036W'] };
const ctx = { slugs: ['drive'], themes, nextRank: 12, coverSaved: true };
const blank = parseIssue('');

const issue = (o) => Object.entries(o).map(([k, v]) => '### ' + k + '\n\n' + v + '\n').join('\n');

test('reads the issue form', () => {
  const f = parseIssue(issue({ Book: 'Thinking in Systems', 'Reading status': 'Finished', 'Finished (YYYY-MM)': '2026-09', 'Started (YYYY-MM)': '_No response_', 'Your rating': '4.5', 'Recommend it?': '- [X] I recommend this book', Shelf: 'Personal Growth', Themes: '- [ ] Management craft\n- [x] Motivation\n- [X] Team culture', 'In one line (your words)': 'Systems beat goals.', "Why it's on your shelf (your words)": '_No response_', 'Your takeaway (your words)': '_No response_', 'Authors (only if Open Library gets them wrong)': 'Donella H. Meadows' }));
  assert.equal(f.book, 'Thinking in Systems');
  assert.equal(f.started, '');
  assert.equal(f.recommended, true);
  assert.deepEqual(f.themes, ['Motivation', 'Team culture']);
  assert.deepEqual(f.authors, ['Donella H. Meadows']);
});

test('understands titles, ISBNs and links', () => {
  assert.deepEqual(interpret('978-1-60358-055-7'), { isbn: '9781603580557' });
  assert.deepEqual(interpret('1603580557'), { isbn: '9781603580557' });
  assert.deepEqual(interpret('High Output Management by Andrew Grove'), { title: 'High Output Management', author: 'Andrew Grove' });
  assert.deepEqual(interpret('Death by Meeting by Patrick Lencioni'), { title: 'Death by Meeting', author: 'Patrick Lencioni' });
  assert.deepEqual(interpret('https://www.amazon.com/Staff-Engineer/dp/1736417916/ref=x'), { isbn: '9781736417911' });
  assert.deepEqual(interpret('https://www.goodreads.com/book/show/40121378-atomic-habits'), { title: 'atomic habits' });
  assert.deepEqual(interpret('https://openlibrary.org/works/OL3737036W/Thinking_in_Systems'), { work: 'OL3737036W' });
  assert.throws(() => interpret('https://example.com/book'), /Paste the title/);
  assert.equal(slugify('The Manager’s Path'), 'the-managers-path');
  assert.equal(titleCase('Thinking in systems'), 'Thinking in Systems');
  assert.equal(titleCase('The Manager’s Path'), 'The Manager’s Path');
});

test('facts only: no status, no words, and the placeholder stays a draft', () => {
  const b = makeBook(meta, blank, ctx);
  assert.deepEqual(validateBook(b, 'content/books/' + b.slug + '.json', new Set(themes.map((t) => t.slug))), []);
  assert.equal(b.reading, undefined);
  assert.equal(b.oneLine.visibility, 'draft');
  assert.equal(b.sections.length, 0);
  assert.equal(b.assistantDrafted, false);
  assert.equal(b.featuredRank, 12);
  assert.equal(b.coverImage.file, 'covers/thinking-in-systems.jpg');
});

test("the owner's words are published as theirs", () => {
  const f = Object.assign({}, blank, { status: 'Finished', rating: '4.5', recommended: true, category: 'Personal Growth', themes: ['Motivation'], oneLine: 'Systems beat goals.', why: 'It changed how I plan.', takeaway: 'Fix the structure, not the people.' });
  const b = makeBook(meta, f, ctx);
  assert.deepEqual(validateBook(b, 'content/books/' + b.slug + '.json', new Set(themes.map((t) => t.slug))), []);
  assert.equal(b.reading.status, 'finished');
  assert.match(b.reading.finishedAt, /^\d{4}-\d{2}$/);
  assert.equal(b.reading.confirmed, true);
  assert.equal(b.category, 'personal-growth');
  assert.deepEqual(b.themes, ['motivation']);
  assert.equal(b.oneLine.visibility, 'published');
  assert.equal(b.pullQuote.text, 'Fix the structure, not the people.');
  assert.equal(b.sections[0].kind, 'why');
  assert.throws(() => makeBook(meta, Object.assign({}, blank, { status: 'Reading now', started: 'Sept' }), ctx), /Started must look like/);
  assert.throws(() => makeBook(Object.assign({}, meta, { title: 'Drive' }), blank, ctx), /already on the shelf/);
  assert.throws(() => makeBook(meta, Object.assign({}, blank, { rating: '4.5' }), ctx), /need a reading status/);
});

test('the issue form offers every theme and shelf, and nothing else', () => {
  const y = readFileSync(path.join(ROOT, '.github/ISSUE_TEMPLATE/add-book.yml'), 'utf8');
  const themeBlock = y.split('label: Themes')[1].split('- type:')[0];
  assert.deepEqual([...themeBlock.matchAll(/- label: (.+)/g)].map((m) => m[1].trim()), themes.map((t) => t.name));
  for (const name of Object.values(CATEGORIES)) assert.ok(y.includes(JSON.stringify(name)), 'Shelf option ' + name);
  for (const label of ['Book', 'Reading status', 'Finished (YYYY-MM)', 'Started (YYYY-MM)', 'Your rating', 'Recommend it?', 'Shelf', 'Themes', 'In one line (your words)', "Why it's on your shelf (your words)", 'Your takeaway (your words)', 'Authors (only if Open Library gets them wrong)']) {
    assert.ok(y.includes('label: ' + label + '\n'), 'form field ' + label);
  }
});
