// Builds dist/library/** from content/ and web/. Zero dependencies at build time beyond
// the font and aurora-field files copied out of node_modules.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from './content.mjs';
import { ContentError } from './schema.mjs';
import { FORM_SCRIPT, book, home, notFound, sitemap } from './render/page.mjs';
import { spring } from './render/spring.mjs';
import { DUO_TEST } from './duo.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'library');
const NM = path.join(ROOT, 'node_modules');

export function build({ quiet } = {}) {
  const { all, pub } = load(ROOT);
  const siteFile = path.join(ROOT, 'content', 'site.json');
  const site = existsSync(siteFile) ? JSON.parse(readFileSync(siteFile, 'utf8')) : {};
  rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
  mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
  mkdirSync(path.join(OUT, 'vendor'), { recursive: true });

  // Springs for the page motion, as CSS custom properties (see web/library.css).
  const page = spring(0.55, 1), soft = spring(0.42, 0.82), snap = spring(0.3, 0.9);
  const springs = `:root{--spring:${page.easing};--spring-ms:${page.ms}ms;--spring-soft:${soft.easing};--spring-soft-ms:${soft.ms}ms;--spring-snap:${snap.easing};--spring-snap-ms:${snap.ms}ms}\n`;
  const css = springs + readFileSync(path.join(ROOT, 'web', 'library.css'), 'utf8');
  const js = readFileSync(path.join(ROOT, 'web', 'library.js'), 'utf8');
  const shapes = readFileSync(path.join(ROOT, 'web', 'shapes.js'), 'utf8');
  const version = createHash('sha256').update(css + js + shapes).digest('hex').slice(0, 10);

  writeFileSync(path.join(OUT, 'library.css'), css);
  writeFileSync(path.join(OUT, 'library.js'), js);
  writeFileSync(path.join(OUT, 'shapes.js'), shapes);
  cpSync(path.join(ROOT, 'web', 'icon.svg'), path.join(OUT, 'icon.svg'));
  if (existsSync(path.join(ROOT, 'content', 'covers'))) cpSync(path.join(ROOT, 'content', 'covers'), path.join(OUT, 'covers'), { recursive: true });
  cpSync(path.join(NM, 'aurora-field', 'dist', 'aurora-field.min.js'), path.join(OUT, 'vendor', 'aurora-field.min.js'));
  const fonts = {
    'instrument-serif-400.woff2': '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
    'instrument-serif-400-italic.woff2': '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2',
    'atkinson-next.woff2': '@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2',
    'atkinson-next-italic.woff2': '@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-italic.woff2',
    'fragment-mono-400.woff2': '@fontsource/fragment-mono/files/fragment-mono-latin-400-normal.woff2',
  };
  for (const [to, from] of Object.entries(fonts)) cpSync(path.join(NM, from), path.join(OUT, 'fonts', to));

  const fill = (html) => html.replace('__FORM_SCRIPT__', FORM_SCRIPT.replace('__DUO_TEST__', DUO_TEST)).replace(/__V__/g, version);
  writeFileSync(path.join(OUT, 'index.html'), fill(home(pub, { version, site })));
  for (const b of pub.books) {
    mkdirSync(path.join(OUT, b.slug), { recursive: true });
    writeFileSync(path.join(OUT, b.slug, 'index.html'), fill(book(pub, b)));
  }
  writeFileSync(path.join(OUT, '404.html'), fill(notFound(pub)));
  writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap(pub));
  writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /library/\nSitemap: https://mutaafaziz.com/library/sitemap.xml\n');
  // no-transform keeps Cloudflare from rewriting the pages (as Hearth does).
  writeFileSync(
    path.join(ROOT, 'dist', '_headers'),
    '/library/*\n  Cache-Control: no-transform, max-age=300\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n' +
      '/library/fonts/*\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable\n' +
      '/library/vendor/*\n  ! Cache-Control\n  Cache-Control: public, max-age=86400\n' +
      '/library/covers/*\n  ! Cache-Control\n  Cache-Control: public, max-age=604800\n',
  );
  if (!quiet) {
    console.log(`✓ built ${pub.books.length} books → dist/library (v${version})`);
    // Reading facts proposed for the owner and not yet confirmed: listed on every build.
    const open = all.books.filter((b) => b.reading && b.reading.visibility === 'published' && !b.reading.confirmed);
    if (open.length) console.log(`! ${open.length} published reading entr${open.length === 1 ? 'y is' : 'ies are'} unconfirmed (reading.confirmed: false): ` + open.map((b) => b.slug).join(', '));
  }
  return pub;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    build();
  } catch (e) {
    if (e instanceof ContentError) { console.error('✗ ' + e.message); process.exit(1); }
    throw e;
  }
}
