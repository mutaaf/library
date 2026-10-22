// Loads content/, validates it, and returns two views: `all` (for the draft-leak test)
// and `pub`, the only thing the renderer ever sees. Drafts are removed here, once, so
// no template can leak one by forgetting a check.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ContentError, validateBook, validateConnections, validateExperiment, validateReflection, validateThemes } from './schema.mjs';
import { frontmatter } from './md.mjs';

const isPub = (x) => x && x.visibility === 'published';

function json(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new ContentError(file + ': ' + e.message);
  }
}

function list(dir, ext) {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(ext)).sort() : [];
}

export function load(root) {
  const C = path.join(root, 'content');
  const rel = (f) => path.relative(root, f);
  const errors = [];

  const themesFile = path.join(C, 'themes.json');
  const themes = json(themesFile);
  errors.push(...validateThemes(themes, rel(themesFile)));
  const themeSlugs = new Set(themes.map((t) => t.slug));

  const books = list(path.join(C, 'books'), '.json').map((f) => {
    const file = path.join(C, 'books', f);
    const b = json(file);
    errors.push(...validateBook(b, rel(file), themeSlugs));
    if (b.coverImage && b.coverImage.file && !existsSync(path.join(C, b.coverImage.file))) errors.push(rel(file) + ': coverImage.file ' + b.coverImage.file + ' is missing from content/');
    return b;
  });
  const bookSlugs = new Set(books.map((b) => b.slug));

  const connFile = path.join(C, 'connections.json');
  const connections = existsSync(connFile) ? json(connFile) : [];
  errors.push(...validateConnections(connections, rel(connFile), bookSlugs, themeSlugs));

  const reflections = [];
  const experiments = [];
  for (const slug of bookSlugs) {
    const rdir = path.join(C, 'reflections', slug);
    for (const f of list(rdir, '.md')) {
      const file = path.join(rdir, f);
      const { attrs, body } = frontmatter(readFileSync(file, 'utf8'));
      const r = { book: slug, id: f.replace(/\.md$/, ''), date: f.slice(0, 10), title: attrs.title || '', visibility: attrs.visibility, tags: (attrs.tags || '').split(',').map((s) => s.trim()).filter(Boolean), body };
      errors.push(...validateReflection(r, rel(file), bookSlugs));
      reflections.push(r);
    }
    const xdir = path.join(C, 'experiments', slug);
    for (const f of list(xdir, '.json')) {
      const file = path.join(xdir, f);
      const x = Object.assign({ book: slug, id: f.replace(/\.json$/, '') }, json(file));
      errors.push(...validateExperiment(x, rel(file), bookSlugs));
      experiments.push(x);
    }
  }
  // Reflection folders for books that don't exist are a typo worth failing on.
  for (const d of ['reflections', 'experiments']) {
    const dir = path.join(C, d);
    if (existsSync(dir)) for (const s of readdirSync(dir)) if (!s.startsWith('.') && !bookSlugs.has(s)) errors.push('content/' + d + '/' + s + ': no book has this slug');
  }

  const ranks = books.map((b) => b.featuredRank);
  if (new Set(ranks).size !== ranks.length) errors.push('content/books: featuredRank values must be unique');

  if (errors.length) throw new ContentError('Content has ' + errors.length + ' problem(s):\n  ' + errors.join('\n  '));

  const all = { themes, books, connections, reflections, experiments };
  return { all, pub: publicView(all) };
}

export function publicView(all) {
  const themeBySlug = new Map(all.themes.map((t) => [t.slug, t]));
  const books = all.books
    .slice()
    .sort((a, b) => a.featuredRank - b.featuredRank)
    .map((b) => ({
      slug: b.slug,
      title: b.title,
      subtitle: b.subtitle,
      authors: b.authors,
      firstPublishedYear: b.firstPublishedYear,
      edition: b.edition,
      publisher: b.publisher,
      isbn13: b.isbn13,
      themes: b.themes.map((s) => themeBySlug.get(s)),
      featuredRank: b.featuredRank,
      reading: isPub(b.reading) ? { status: b.reading.status, startedAt: b.reading.startedAt, finishedAt: b.reading.finishedAt, rating: b.reading.rating, recommended: b.reading.recommended, confirmed: b.reading.confirmed } : null,
      readingStatus: isPub(b.reading) ? b.reading.status : null,
      pages: b.pages,
      category: b.category,
      coverImage: b.coverImage,
      framework: isPub(b.framework) ? b.framework : null,
      pullQuote: isPub(b.pullQuote) ? b.pullQuote : null,
      cover: b.cover,
      oneLine: isPub(b.oneLine) ? b.oneLine : null,
      sections: b.sections.filter(isPub),
      ideas: b.ideas.filter(isPub),
      resources: b.resources,
      assistantDrafted: b.assistantDrafted,
      updatedAt: b.updatedAt,
      reflections: all.reflections.filter((r) => r.book === b.slug && isPub(r)).sort((x, y) => (x.id < y.id ? 1 : -1)),
      experiments: all.experiments.filter((x) => x.book === b.slug && isPub(x)),
    }));
  const bySlug = new Map(books.map((b) => [b.slug, b]));
  // Connections are bidirectional. The link itself is public; its explanation only when published.
  for (const b of books) {
    b.connections = all.connections
      .filter((c) => c.from === b.slug || c.to === b.slug)
      .map((c) => ({ book: bySlug.get(c.from === b.slug ? c.to : c.from), theme: themeBySlug.get(c.theme), explanation: isPub(c) ? c.explanation : '', claim: c.claim }));
  }
  const usedThemes = all.themes.filter((t) => books.some((b) => b.themes.includes(t)));
  return { books, themes: usedThemes, bySlug };
}
