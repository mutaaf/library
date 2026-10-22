// Validates content/ before anything is rendered. Every error names the file and the
// field, so a bad edit fails the build with a message the owner can act on.
// The shape is documented in docs/CONTENT.md; keep the two in step.

export const VISIBILITY = ['draft', 'published'];
export const CLAIMS = { book: "Book's argument", interpretation: 'My interpretation', application: 'My application', critique: 'My critique', context: 'Context' };
export const KINDS = { why: "Why it's on my shelf", thesis: 'What this book is about', applications: 'How I apply it', diagnostic: 'Questions for your team', agree: 'Where I agree', challenge: 'Where I push back', takeaways: 'Takeaways', pairs: 'Read it with', skip: 'Who should skip it', note: 'Context' };
export const CATEGORIES = { 'engineering-leadership': 'Engineering Leadership', 'teams-people': 'Teams & People', 'strategy-influence': 'Strategy & Influence', 'personal-growth': 'Personal Growth' };
export const STATUS = { wishlist: 'Planned', queued: 'Planned', reading: 'In progress', finished: 'Completed', revisiting: 'Revisiting' };
export const COVER_TYPES = ['serif', 'grotesk', 'slab', 'mono'];
export const ACCESS = ['sample', 'borrow', 'buy', 'free-authorized'];
export const FORMATS = ['print', 'ebook', 'audio', 'web'];
export const EXPERIMENT_STATUS = ['planned', 'running', 'done', 'dropped'];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

export class ContentError extends Error {}

function check(errors, where) {
  return function (ok, field, msg) {
    if (!ok) errors.push(where + ': ' + field + ' ' + msg);
    return ok;
  };
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isHttps = (v) => { try { return new URL(v).protocol === 'https:'; } catch { return false; } };

function block(t, b, field, claims) {
  if (!t(b && typeof b === 'object', field, 'must be an object')) return;
  t(VISIBILITY.includes(b.visibility), field + '.visibility', 'must be draft or published');
  t(claims.includes(b.claim), field + '.claim', 'must be one of ' + claims.join(', '));
}

export function validateBook(book, file, themeSlugs) {
  const errors = [];
  const t = check(errors, file);
  t(isStr(book.slug) && SLUG.test(book.slug), 'slug', 'must be lowercase words joined by hyphens');
  t(file.endsWith('/' + book.slug + '.json'), 'slug', 'must match the file name');
  t(isStr(book.title), 'title', 'is required');
  if (book.subtitle !== undefined) t(isStr(book.subtitle), 'subtitle', 'must be text when present');
  t(Array.isArray(book.authors) && book.authors.length > 0 && book.authors.every(isStr), 'authors', 'must be a non-empty list of names');
  t(Number.isInteger(book.firstPublishedYear) && book.firstPublishedYear > 1400 && book.firstPublishedYear <= new Date().getFullYear(), 'firstPublishedYear', 'must be a plausible year');
  if (book.isbn13 !== undefined) t(/^97[89]\d{10}$/.test(book.isbn13) && isbnOk(book.isbn13), 'isbn13', 'must be a valid ISBN-13');
  t(book.verified && DATE.test(book.verified.on) && Array.isArray(book.verified.sources) && book.verified.sources.length > 0 && book.verified.sources.every(isHttps), 'verified', 'needs a date and at least one https source');
  t(Array.isArray(book.themes) && book.themes.length > 0 && book.themes.every((s) => themeSlugs.has(s)), 'themes', 'must list themes from content/themes.json');
  t(Number.isInteger(book.featuredRank) && book.featuredRank > 0, 'featuredRank', 'must be a positive integer');
  t(Object.hasOwn(CATEGORIES, book.category), 'category', 'must be one of ' + Object.keys(CATEGORIES).join(', '));
  if (book.pages !== undefined) t(Number.isInteger(book.pages) && book.pages > 20 && book.pages < 2000, 'pages', 'must be a plausible page count');
  if (book.coverImage !== undefined) t(book.coverImage && /^covers\/[a-z0-9-]+\.(jpg|png|webp)$/.test(book.coverImage.file) && isStr(book.coverImage.source) && isHttps(book.coverImage.url), 'coverImage', 'needs file (covers/<slug>.jpg), source and an https url');
  const rd = book.reading;
  if (rd !== undefined && t(rd && typeof rd === 'object', 'reading', 'must be an object')) {
    t(Object.hasOwn(STATUS, rd.status), 'reading.status', 'must be one of ' + Object.keys(STATUS).join(', '));
    t(VISIBILITY.includes(rd.visibility), 'reading.visibility', 'must be draft or published');
    t(typeof rd.confirmed === 'boolean', 'reading.confirmed', 'must say whether the owner confirmed it');
    ['startedAt', 'finishedAt'].forEach((k) => { if (rd[k] !== undefined) t(MONTH.test(rd[k]), 'reading.' + k, 'must be YYYY-MM'); });
    if (rd.startedAt && rd.finishedAt) t(rd.startedAt <= rd.finishedAt, 'reading', 'finishes before it starts');
    if (rd.rating !== undefined) t(typeof rd.rating === 'number' && rd.rating >= 1 && rd.rating <= 5 && rd.rating * 2 === Math.round(rd.rating * 2), 'reading.rating', 'must be 1–5 in half steps');
    if (rd.recommended !== undefined) t(typeof rd.recommended === 'boolean', 'reading.recommended', 'must be true or false');
    if (rd.status === 'finished') t(!!rd.finishedAt, 'reading.finishedAt', 'is needed for a finished book (it places it on the journey)');
  }
  if (book.framework !== undefined) {
    block(t, book.framework, 'framework', Object.keys(CLAIMS));
    t(isStr(book.framework.title) && Array.isArray(book.framework.items) && book.framework.items.length >= 2 && book.framework.items.every((x) => isStr(x.name) && isStr(x.gist)), 'framework', 'needs a title and 2+ items with name and gist');
  }
  if (book.pullQuote !== undefined) {
    block(t, book.pullQuote, 'pullQuote', Object.keys(CLAIMS));
    t(isStr(book.pullQuote.text) && book.pullQuote.text.length <= 160, 'pullQuote.text', 'must be 1–160 characters');
  }
  const c = book.cover || {};
  t(HEX.test(c.bg) && HEX.test(c.ink) && HEX.test(c.foil), 'cover', 'needs bg, ink and foil as #rrggbb');
  t(COVER_TYPES.includes(c.type), 'cover.type', 'must be one of ' + COVER_TYPES.join(', '));
  if (HEX.test(c.bg) && HEX.test(c.ink)) t(contrast(c.bg, c.ink) >= 4.5, 'cover', 'ink on bg must reach 4.5:1 contrast (is ' + contrast(c.bg, c.ink).toFixed(2) + ')');
  block(t, book.oneLine, 'oneLine', ['book', 'interpretation']);
  if (book.oneLine) t(isStr(book.oneLine.text) && book.oneLine.text.length <= 140, 'oneLine.text', 'must be 1–140 characters');
  t(Array.isArray(book.sections), 'sections', 'must be a list');
  (book.sections || []).forEach((s, i) => {
    const f = 'sections[' + i + ']';
    block(t, s, f, Object.keys(CLAIMS));
    t(Object.hasOwn(KINDS, s.kind), f + '.kind', 'must be one of ' + Object.keys(KINDS).join(', '));
    t(typeof s.body === 'string', f + '.body', 'must be text (empty is fine for a draft)');
    if (s.visibility === 'published') t(isStr(s.body), f + '.body', 'cannot be empty when published');
  });
  t(Array.isArray(book.ideas), 'ideas', 'must be a list');
  (book.ideas || []).forEach((d, i) => {
    const f = 'ideas[' + i + ']';
    block(t, d, f, Object.keys(CLAIMS));
    t(isStr(d.title) && isStr(d.summary), f, 'needs a title and a summary');
  });
  t(Array.isArray(book.resources), 'resources', 'must be a list (empty is fine)');
  (book.resources || []).forEach((r, i) => {
    const f = 'resources[' + i + ']';
    t(isStr(r.label) && isHttps(r.url) && isStr(r.provider), f, 'needs a label, an https url and a provider');
    t(FORMATS.includes(r.format), f + '.format', 'must be one of ' + FORMATS.join(', '));
    t(ACCESS.includes(r.accessType), f + '.accessType', 'must be one of ' + ACCESS.join(', '));
    t(typeof r.isFullText === 'boolean', f + '.isFullText', 'must be true or false');
    t(!(r.isFullText && r.accessType !== 'free-authorized' && r.accessType !== 'borrow'), f + '.isFullText', 'full text is only allowed for authorized free or library copies');
    t(DATE.test(r.verifiedAt), f + '.verifiedAt', 'must be the date you checked the link');
  });
  t(typeof book.assistantDrafted === 'boolean', 'assistantDrafted', 'must be true or false');
  t(DATE.test(book.updatedAt), 'updatedAt', 'must be YYYY-MM-DD');
  return errors;
}

export function validateThemes(themes, file) {
  const errors = [];
  const t = check(errors, file);
  if (!t(Array.isArray(themes), '', 'must be a list')) return errors;
  const seen = new Set();
  themes.forEach((th, i) => {
    t(isStr(th.slug) && SLUG.test(th.slug) && !seen.has(th.slug), '[' + i + '].slug', 'must be a unique slug');
    t(isStr(th.name), '[' + i + '].name', 'is required');
    seen.add(th.slug);
  });
  return errors;
}

export function validateConnections(conns, file, bookSlugs, themeSlugs) {
  const errors = [];
  const t = check(errors, file);
  if (!t(Array.isArray(conns), '', 'must be a list')) return errors;
  conns.forEach((c, i) => {
    const f = '[' + i + ']';
    t(bookSlugs.has(c.from) && bookSlugs.has(c.to) && c.from !== c.to, f, 'must join two different books that exist');
    t(themeSlugs.has(c.theme), f + '.theme', 'must be a theme from content/themes.json');
    block(t, c, f, ['interpretation', 'critique', 'context']);
    t(typeof c.explanation === 'string', f + '.explanation', 'must be text');
    if (c.visibility === 'published') t(isStr(c.explanation), f + '.explanation', 'cannot be empty when published');
  });
  return errors;
}

export function validateReflection(r, file, bookSlugs) {
  const errors = [];
  const t = check(errors, file);
  t(bookSlugs.has(r.book), 'book', 'folder must be a book slug');
  t(DATE.test(r.date), 'date', 'file name must start YYYY-MM-DD');
  t(VISIBILITY.includes(r.visibility), 'visibility', 'must be draft or published');
  if (r.visibility === 'published') t(isStr(r.body), 'body', 'cannot be empty when published');
  return errors;
}

export function validateExperiment(x, file, bookSlugs) {
  const errors = [];
  const t = check(errors, file);
  t(bookSlugs.has(x.book), 'book', 'folder must be a book slug');
  t(isStr(x.hypothesis) && isStr(x.action), 'hypothesis/action', 'are required');
  t(EXPERIMENT_STATUS.includes(x.status), 'status', 'must be one of ' + EXPERIMENT_STATUS.join(', '));
  t(VISIBILITY.includes(x.visibility), 'visibility', 'must be draft or published');
  ['startedAt', 'completedAt'].forEach((k) => { if (x[k] !== undefined) t(DATE.test(x[k]), k, 'must be YYYY-MM-DD'); });
  return errors;
}

function isbnOk(s) {
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(s[i]) * (i % 2 ? 3 : 1);
  return sum % 10 === 0;
}

function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
