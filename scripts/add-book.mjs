// Adds a book from a title, an ISBN or a link: looks it up on Open Library, writes
// content/books/<slug>.json and its cover, and leaves every personal field to the owner.
//
//   npm run add -- "The Manager's Path"        (or an ISBN, or an Amazon / Goodreads /
//   npm run add -- 9781491973899                Open Library link; "Title by Author" works)
//   node scripts/add-book.mjs --issue body.md  (the "Add a book" issue form; see
//                                               .github/workflows/add-book.yml)
//   node scripts/add-book.mjs --remove <slug>  (takes a book back out)
//
// Only facts come from Open Library (title, authors, year, publisher, ISBN, pages, cover),
// with their sources recorded in `verified`. Status, dates, rating and the words on the
// page come only from the owner (the issue form); without them the book goes up as
// "On the shelf" with a one-line placeholder kept as a draft (AGENTS.md §0.1).
import { appendFileSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, contrast } from '../src/schema.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OL = 'https://openlibrary.org';
const UA = { 'User-Agent': 'LeadershipLibrary/1.0 (https://mutaafaziz.com/library/)' };

// Cover palettes the shelf already uses (each passes 4.5:1); a new book takes one by slug.
const PALETTES = [
  ['#2F5A8C', '#FFFFFF', '#D9E6F2'], ['#0E1726', '#F4F1EA', '#E86A4A'], ['#F7F5F0', '#B3122A', '#1A1A1A'],
  ['#F4F3EF', '#1F2A44', '#B3262B'], ['#A3201F', '#F5EBDD', '#E8CFA0'], ['#EEF0EC', '#3A2A20', '#8C3B2E'],
  ['#1F3A8C', '#F2D27A', '#D2232A'], ['#0F6FA8', '#FFFFFF', '#9FD3F0'], ['#3B3E42', '#F2F4F5', '#3FB6E3'],
  ['#EFEDE6', '#1A1A1A', '#6E6A60'],
];
const STATUS_LABELS = { 'Want to read': 'wishlist', 'Up next': 'queued', 'Reading now': 'reading', Finished: 'finished', Revisiting: 'revisiting' };
const DEFAULT_THEME = { 'engineering-leadership': 'management-craft', 'teams-people': 'team-culture', 'strategy-influence': 'power-and-influence', 'personal-growth': 'motivation' };

export class AddError extends Error {}

// ── The issue form ─────────────────────────────────────────────────────────────────────
// GitHub renders a form as "### Label\n\nvalue" blocks; an empty field is "_No response_".
export function parseIssue(body) {
  const f = {};
  for (const part of body.replace(/\r/g, '').split(/^### /m).slice(1)) {
    const nl = part.indexOf('\n');
    const v = part.slice(nl + 1).trim();
    f[part.slice(0, nl).trim()] = v === '_No response_' ? '' : v;
  }
  const checked = (s) => (s || '').split('\n').filter((l) => /^- \[x\]/i.test(l)).map((l) => l.replace(/^- \[x\]\s*/i, '').trim());
  return {
    book: f['Book'] || '',
    authors: (f['Authors (only if Open Library gets them wrong)'] || '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean),
    status: f['Reading status'] || '',
    started: f['Started (YYYY-MM)'] || '',
    finished: f['Finished (YYYY-MM)'] || '',
    rating: f['Your rating'] || '',
    recommended: checked(f['Recommend it?']).length > 0,
    category: f['Shelf'] || '',
    themes: checked(f['Themes']),
    oneLine: f['In one line (your words)'] || '',
    why: f["Why it's on your shelf (your words)"] || '',
    takeaway: f['Your takeaway (your words)'] || '',
  };
}

export function slugify(s) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 8).join('-');
}

function isbn13ok(s) {
  if (!/^97[89]\d{10}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(s[i]) * (i % 2 ? 3 : 1);
  return sum % 10 === 0;
}
function isbn10to13(s) {
  const b = '978' + s.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(b[i]) * (i % 2 ? 3 : 1);
  return b + ((10 - (sum % 10)) % 10);
}

// What the owner typed → how to look it up: { isbn } | { work } | { title, author }.
export function interpret(input) {
  const s = input.trim().split('\n')[0].trim();
  if (!s) throw new AddError('The Book field is empty: give a title, an ISBN or a link.');
  const digits = s.replace(/[-\s]/g, '');
  if (/^97[89]\d{10}$/.test(digits)) return { isbn: digits };
  if (/^\d{9}[\dX]$/i.test(digits)) return { isbn: isbn10to13(digits) };
  if (/^https?:\/\//i.test(s)) {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, '');
    if (/openlibrary\.org$/.test(host)) {
      const w = u.pathname.match(/\/works\/(OL\d+W)/);
      if (w) return { work: w[1] };
      const e = u.pathname.match(/\/books\/(OL\d+M)/);
      if (e) return { edition: e[1] };
      const i = u.pathname.match(/\/isbn\/([\dX-]+)/i);
      if (i) return interpret(i[1]);
    }
    if (/(^|\.)amazon\./.test(host)) {
      const a = u.pathname.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i);
      if (a && /^\d{9}[\dX]$/i.test(a[1])) return { isbn: isbn10to13(a[1]) };
      const t = u.pathname.split('/').find((p) => p.includes('-') && !/^(dp|gp)$/.test(p));
      if (t) return { title: t.replace(/-/g, ' ') };
    }
    if (/goodreads\.com$/.test(host)) {
      const g = u.pathname.match(/\/book\/show\/\d+[.-]([^/?#]+)/);
      if (g) return { title: decodeURIComponent(g[1]).replace(/[_-]/g, ' ') };
    }
    throw new AddError("I can't read a book from " + host + ' links yet. Paste the title (or "Title by Author") or the ISBN instead.');
  }
  // The last " by " splits ("Death by Meeting by Patrick Lencioni"); lookup() retries the
  // whole string as a title if that finds nothing.
  const by = s.match(/^(.*)\s+by\s+(.+)$/i);
  return by ? { title: by[1].trim(), author: by[2].trim() } : { title: s };
}

// ── Open Library ──────────────────────────────────────────────────────────────────────
async function get(url) {
  const r = await fetch(url, { headers: UA, redirect: 'follow' });
  if (r.status === 404) return null;
  if (!r.ok) throw new AddError('Open Library answered ' + r.status + ' for ' + url + '. Try again in a minute.');
  return r.json();
}

const year = (d) => { const m = String(d || '').match(/\b(1[5-9]\d\d|20\d\d)\b/); return m ? Number(m[1]) : 0; };
const isEnglish = (e) => !e.languages || e.languages.some((l) => l.key === '/languages/eng');

// The edition the page describes: the one asked for, else the newest English one with an
// ISBN-13, a page count and a cover, as complete as Open Library has.
function pickEdition(editions) {
  const score = (e) => (isEnglish(e) ? 8 : 0) + ((e.isbn_13 || []).some(isbn13ok) ? 4 : 0) + (e.number_of_pages ? 2 : 0) + (e.covers && e.covers[0] > 0 ? 1 : 0);
  return editions.slice().sort((a, b) => score(b) - score(a) || year(b.publish_date) - year(a.publish_date))[0];
}

export async function lookup(q) {
  let work, edition, doc;
  if (q.isbn) {
    edition = await get(OL + '/isbn/' + q.isbn + '.json');
    if (!edition) throw new AddError('Open Library has no book with ISBN ' + q.isbn + '. Try the title instead.');
  } else if (q.edition) {
    edition = await get(OL + '/books/' + q.edition + '.json');
    if (!edition) throw new AddError('Open Library has no edition ' + q.edition + '. Try the title or ISBN.');
  }
  let workKey = edition ? edition.works && edition.works[0] && edition.works[0].key : q.work ? '/works/' + q.work : null;
  if (!workKey) {
    const p = new URLSearchParams({ title: q.title, fields: 'key,title,author_name,first_publish_year,edition_count', limit: '5' });
    if (q.author) p.set('author', q.author);
    const r = await get(OL + '/search.json?' + p);
    let docs = (r && r.docs) || [];
    if (q.author) {
      // "Death by Meeting" is a title, not "Death" by "Meeting": keep the split only when
      // the author it found really is the one typed.
      const last = q.author.toLowerCase().split(/\s+/).pop();
      docs = docs.filter((d) => (d.author_name || []).some((a) => a.toLowerCase().includes(last)));
      if (!docs.length) return lookup({ title: q.title + ' by ' + q.author });
    }
    if (!docs.length) throw new AddError('Open Library found nothing for "' + q.title + '"' + (q.author ? ' by ' + q.author : '') + '. Check the spelling, add "by Author", or use the ISBN.');
    // Search ranks by relevance; a work whose title is exactly what was typed wins.
    const want = slugify(q.title);
    doc = docs.find((d) => slugify(d.title) === want) || docs.find((d) => slugify(d.title).startsWith(want + '-')) || docs[0];
    workKey = doc.key;
  }
  work = await get(OL + workKey + '.json');
  if (!work) throw new AddError('Open Library has no work at ' + workKey + '.');
  if (!doc) {
    const r = await get(OL + '/search.json?' + new URLSearchParams({ q: 'key:' + workKey, fields: 'key,title,author_name,first_publish_year' }));
    doc = (r && r.docs && r.docs[0]) || {};
  }
  if (!edition) {
    const r = await get(OL + workKey + '/editions.json?limit=100');
    edition = r && r.entries && r.entries.length ? pickEdition(r.entries) : null;
  }
  let authors = doc.author_name;
  if (!authors || !authors.length) {
    authors = [];
    for (const a of work.authors || []) { const x = await get(OL + a.author.key + '.json'); if (x && x.name) authors.push(x.name); }
  }
  const isbn13 = edition && ((edition.isbn_13 || []).find(isbn13ok) || ((edition.isbn_10 || [])[0] && isbn10to13(edition.isbn_10[0])));
  const coverId = (edition && edition.covers || []).find((c) => c > 0) || (work.covers || []).find((c) => c > 0);
  const sources = [OL + workKey];
  if (isbn13) sources.unshift(OL + '/isbn/' + isbn13 + '.json');
  else if (edition) sources.unshift(OL + edition.key + '.json');
  let title = (work.title || doc.title || '').trim();
  let subtitle = ((edition && edition.title === work.title && edition.subtitle) || work.subtitle || '').trim();
  const colon = title.indexOf(': ');
  if (!subtitle && colon > 0) { subtitle = title.slice(colon + 2); title = title.slice(0, colon); }
  const firstYear = doc.first_publish_year || year(work.first_publish_date) || (edition && year(edition.publish_date));
  return {
    title: titleCase(title),
    subtitle: subtitle ? titleCase(subtitle) : undefined,
    authors: [...new Set(authors)],
    firstPublishedYear: firstYear || undefined,
    publisher: edition && edition.publishers && edition.publishers[0],
    isbn13: isbn13 && isbn13ok(isbn13) ? isbn13 : undefined,
    pages: edition && edition.number_of_pages > 20 && edition.number_of_pages < 2000 ? edition.number_of_pages : undefined,
    coverUrl: coverId ? 'https://covers.openlibrary.org/b/id/' + coverId + '-L.jpg' : isbn13 ? 'https://covers.openlibrary.org/b/isbn/' + isbn13 + '-L.jpg' : null,
    sources,
  };
}

// Open Library often stores titles in sentence case ("Thinking in systems"); shelves use
// title case. Titles that already carry capitals past the first word are left alone.
const SMALL = new Set('a an and as at but by for from in into nor of on or the to vs via with'.split(' '));
export function titleCase(s) {
  const w = s.split(' ');
  if (w.slice(1).some((x) => /^[A-Z]/.test(x))) return s;
  return w.map((x, i) => (i > 0 && i < w.length - 1 && SMALL.has(x.toLowerCase()) ? x.toLowerCase() : x.charAt(0).toUpperCase() + x.slice(1))).join(' ');
}

// ── The book file ─────────────────────────────────────────────────────────────────────
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const today = () => new Date().toISOString().slice(0, 10);

export function makeBook(meta, form, ctx) {
  if (!meta.title) throw new AddError('Open Library returned no title.');
  if (!meta.authors.length) throw new AddError('Open Library lists no author for "' + meta.title + '".');
  if (!meta.firstPublishedYear) throw new AddError('Open Library has no publication year for "' + meta.title + '".');
  if (form.authors && form.authors.length) meta = Object.assign({}, meta, { authors: form.authors });
  const slug = slugify(meta.title);
  if (ctx.slugs.includes(slug)) throw new AddError('"' + meta.title + '" is already on the shelf (content/books/' + slug + '.json).');

  const category = Object.keys(CATEGORIES).find((k) => CATEGORIES[k] === form.category) || 'engineering-leadership';
  const themes = form.themes.map((n) => { const t = ctx.themes.find((x) => x.name === n); if (!t) throw new AddError('Unknown theme "' + n + '".'); return t.slug; });
  if (!themes.length) themes.push(DEFAULT_THEME[category]);

  const h = [...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const [bg, ink, foil] = PALETTES[h % PALETTES.length];
  if (contrast(bg, ink) < 4.5) throw new AddError('palette ' + bg + ' fails contrast');

  const book = { slug, title: meta.title };
  if (meta.subtitle) book.subtitle = meta.subtitle;
  Object.assign(book, { authors: meta.authors, firstPublishedYear: meta.firstPublishedYear });
  if (meta.publisher) book.publisher = meta.publisher;
  if (meta.isbn13) book.isbn13 = meta.isbn13;
  if (meta.pages) book.pages = meta.pages;
  Object.assign(book, { verified: { on: today(), sources: meta.sources }, category, themes, featuredRank: ctx.nextRank });

  const status = STATUS_LABELS[form.status];
  if (!status && (parseFloat(form.rating) > 0 || form.recommended || form.started || form.finished)) throw new AddError('A rating, a recommendation or dates need a reading status; pick one (for example Finished).');
  if (status) {
    const rd = { status };
    for (const [k, v] of [['startedAt', form.started], ['finishedAt', form.finished]]) {
      if (!v) continue;
      if (!MONTH.test(v)) throw new AddError((k === 'startedAt' ? 'Started' : 'Finished') + ' must look like 2026-10, not "' + v + '".');
      rd[k] = v;
    }
    if (status === 'finished' && !rd.finishedAt) rd.finishedAt = today().slice(0, 7);
    const r = parseFloat(form.rating);
    if (r >= 1 && r <= 5) rd.rating = r;
    if (form.recommended) rd.recommended = true;
    Object.assign(rd, { confirmed: true, visibility: 'published' });
    book.reading = rd;
  }

  book.cover = { bg, ink, foil, type: category === 'engineering-leadership' ? 'grotesk' : 'serif' };
  if (meta.coverUrl && ctx.coverSaved) book.coverImage = { file: 'covers/' + slug + '.jpg', source: 'Open Library', url: meta.coverUrl };

  const words = (s) => s.replace(/\s+/g, ' ').trim();
  if (form.oneLine && words(form.oneLine).length > 140) throw new AddError('"In one line" is ' + words(form.oneLine).length + ' characters; keep it to 140.');
  book.oneLine = form.oneLine
    ? { text: words(form.oneLine), claim: 'interpretation', visibility: 'published' }
    : { text: ('Draft: one line on ' + meta.title + ', in your words.').slice(0, 140), claim: 'interpretation', visibility: 'draft' };
  const takeaway = form.takeaway && words(form.takeaway);
  if (takeaway && takeaway.length <= 160) book.pullQuote = { text: takeaway, claim: 'interpretation', visibility: 'published' };
  book.sections = [];
  if (form.why) book.sections.push({ kind: 'why', claim: 'interpretation', visibility: 'published', body: form.why.trim() });
  if (takeaway && takeaway.length > 160) book.sections.push({ kind: 'takeaways', claim: 'application', visibility: 'published', body: form.takeaway.trim() });
  Object.assign(book, { ideas: [], resources: [], assistantDrafted: false, updatedAt: today() });
  return book;
}

async function saveCover(url, file) {
  const r = await fetch(url + '?default=false', { headers: UA, redirect: 'follow' });
  const type = r.headers.get('content-type') || '';
  if (!r.ok || !type.startsWith('image/jpeg')) return false;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 4000) return false; // Open Library's blank placeholder
  writeFileSync(file, buf);
  return true;
}

export async function add(form) {
  const C = path.join(ROOT, 'content');
  const books = readdirSync(path.join(C, 'books')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(path.join(C, 'books', f), 'utf8')));
  const themes = JSON.parse(readFileSync(path.join(C, 'themes.json'), 'utf8'));
  const meta = await lookup(interpret(form.book));
  const slug = slugify(meta.title);
  const ctx = { slugs: books.map((b) => b.slug), themes, nextRank: Math.max(0, ...books.map((b) => b.featuredRank)) + 1, coverSaved: false };
  makeBook(meta, form, ctx); // fails before anything is written
  const coverFile = path.join(C, 'covers', slug + '.jpg');
  ctx.coverSaved = meta.coverUrl ? existsSync(coverFile) || (await saveCover(meta.coverUrl, coverFile)) : false;
  const book = makeBook(meta, form, ctx);
  writeFileSync(path.join(C, 'books', slug + '.json'), JSON.stringify(book, null, 2) + '\n');
  return book;
}

// Takes back a book this script added (the issue's "/remove" comment).
export function remove(slug) {
  const file = path.join(ROOT, 'content', 'books', slug + '.json');
  if (!SLUG_RE.test(slug) || !existsSync(file)) throw new AddError('No book at content/books/' + slug + '.json.');
  rmSync(file);
  rmSync(path.join(ROOT, 'content', 'covers', slug + '.jpg'), { force: true });
}
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--remove') {
    try { remove(args[1] || ''); console.log('✓ removed ' + args[1]); } catch (e) { console.error('✗ ' + e.message); process.exit(1); }
    process.exit(0);
  }
  const i = args.indexOf('--issue');
  const form = i >= 0 ? parseIssue(readFileSync(args[i + 1], 'utf8')) : Object.assign(parseIssue(''), { book: args.join(' ') });
  try {
    const b = await add(form);
    console.log('✓ ' + b.title + ' by ' + b.authors.join(', ') + ' → content/books/' + b.slug + '.json' + (b.coverImage ? ' (+ cover)' : ' (no cover on Open Library; the shelf draws one)'));
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'slug=' + b.slug + '\ntitle=' + b.title.replace(/\n/g, ' ') + '\n');
  } catch (e) {
    if (!(e instanceof AddError)) throw e;
    console.error('✗ ' + e.message);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'error=' + e.message.replace(/\n/g, ' ') + '\n');
    process.exit(1);
  }
}
