// Page templates. Every page is complete HTML: the shelf and the book are both in the
// document, and CSS decides whether they read as an app page (everywhere) or as one page /
// a two-page spread (the iPhone Duo, closed / open). See docs/DESIGN.md.
import { esc, inline, md } from '../md.mjs';
import { CLAIMS, KINDS, STATUS } from '../schema.mjs';

export const BASE = '/library/';
export const ORIGIN = 'https://mutaafaziz.com';
const SITE_DESC = 'The Leadership Library: books on engineering leadership, organizations and growth, each with a labelled summary of its argument and my own notes as I write them.';

const authorsText = (a) => (a.length < 3 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const shortAuthors = (a) => a.map((n) => n.split(' ').slice(-1)[0]).join(' & ');
const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const statusText = (b) => (b.readingStatus ? STATUS[b.readingStatus] : 'On the shelf');
const coverVars = (c) => '--cv-bg:' + c.bg + ';--cv-ink:' + c.ink + ';--cv-foil:' + c.foil;
const claim = (c) => '<p class="claim claim-' + c + '">' + esc(CLAIMS[c]) + '</p>';

// The <head> script runs before first paint: it decides the form (app, Duo closed, Duo
// open) so the page never flashes the wrong layout. library.js keeps it current on resize.
// ES5 on purpose, like the personal site.
export const FORM_SCRIPT = `(function(){var d=document.documentElement,o=null;d.className+=' js';
try{var q=/[?&]duo=(open|closed|auto|off)\\b/.exec(location.search);if(q)sessionStorage.setItem('lib-duo',q[1]);o=sessionStorage.getItem('lib-duo')}catch(e){}
var s=window.screen||{},a=Math.min(s.width||0,s.height||0),b=Math.max(s.width||0,s.height||0);
var seg=window.matchMedia&&matchMedia('(horizontal-viewport-segments: 2)').matches;
var duo=o==='open'||o==='closed'||o==='auto'||(o!=='off'&&(seg||(/iPhone/.test(navigator.userAgent)&&__DUO_TEST__)));
window.libForm=function(){if(!duo)return'';if(o==='open'||o==='closed')return o;
if(window.matchMedia&&matchMedia('(horizontal-viewport-segments: 2)').matches)return'open';
return innerWidth>=600&&innerWidth>innerHeight*1.1?'open':'closed'};
var f=window.libForm();if(f){d.className+=' duo';d.setAttribute('data-fold',f)}
if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)d.className+=' still'})();`;

function head({ title, description, canonical, jsonld, type }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${ORIGIN + canonical}">
  <meta property="og:type" content="${type || 'website'}">
  <meta property="og:site_name" content="The Leadership Library">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${ORIGIN + canonical}">
  <meta name="theme-color" content="#F2EBDD" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#14100D" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="${BASE}icon.svg" type="image/svg+xml">
  <link rel="preload" href="${BASE}fonts/instrument-serif-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${BASE}fonts/atkinson-next.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${BASE}library.css?v=__V__">
  <script>__FORM_SCRIPT__</script>
${jsonld ? '  <script type="application/ld+json">' + JSON.stringify(jsonld).replace(/</g, '\\u003c') + '</script>\n' : ''}</head>`;
}

function nav(page) {
  const h = page === 'home' ? '' : BASE;
  return `<a class="skip" href="#main">Skip to content</a>
  <header class="nav" id="nav">
    <a class="wordmark" href="${BASE}" aria-label="The Leadership Library home"><span class="glyph" aria-hidden="true"><i></i><i></i><i></i></span>library</a>
    <nav aria-label="Library">
      <a class="nav-link" href="${h}#shelf">Shelf</a>
      <a class="nav-link" href="${h}#how">How I read</a>
      <a class="nav-cta" href="${h}#shelf">Browse</a>
    </nav>
  </header>`;
}

function foot() {
  return `<footer class="foot">
    <a href="/">← mutaafaziz.com</a>
    <span>Code MIT · <a href="https://github.com/mutaaf/library">github.com/mutaaf/library</a> · particles by <a href="https://github.com/mutaaf/aurora-field">aurora-field</a></span>
  </footer>`;
}

function scripts(page) {
  const sky = page === 'home' ? `\n  <script src="${BASE}vendor/aurora-field.min.js" defer></script>\n  <script src="${BASE}shapes.js?v=__V__" defer></script>` : '';
  return sky + `\n  <script src="${BASE}library.js?v=__V__" defer blocking="render"></script>`;
}

function cover(b, size) {
  return `<span class="cover cover-${size}" data-type="${b.cover.type}" style="${coverVars(b.cover)}" aria-hidden="true"><span class="cv-rule"></span><span class="cv-title">${esc(b.title)}</span><span class="cv-author">${esc(shortAuthors(b.authors))}</span></span>`;
}

function searchText(b) {
  return [b.title, b.subtitle, b.authors.join(' '), b.themes.map((t) => t.name).join(' '), b.oneLine && b.oneLine.text, b.sections.map((s) => s.body).join(' '), b.ideas.map((i) => i.title + ' ' + i.summary).join(' '), b.reflections.map((r) => r.title + ' ' + r.body).join(' ')]
    .filter(Boolean).join(' ').toLowerCase().replace(/[*_[\]()>#`]/g, ' ').replace(/\s+/g, ' ');
}

function shelfItem(b, current) {
  const here = current && current.slug === b.slug;
  return `<li class="bk${here ? ' is-here' : ''}" data-slug="${b.slug}" data-themes="${b.themes.map((t) => t.slug).join(' ')}" data-status="${b.readingStatus || 'shelf'}" data-author="${esc(b.authors[0])}" data-year="${b.firstPublishedYear}" data-rank="${b.featuredRank}" data-updated="${b.updatedAt}" data-title="${esc(b.title.replace(/^The /, ''))}" data-search="${esc(searchText(b))}" style="${coverVars(b.cover)};--h:${(b.title.length % 5) * 4 + 86}%;--w:${(b.authors.join('').length % 4) * 6 + 40}px">
        <a class="bk-link" href="${BASE}${b.slug}/"${here ? ' aria-current="page"' : ''}>
          ${cover(b, 'sm')}
          <span class="spine" data-type="${b.cover.type}" aria-hidden="true"><span class="sp-title">${esc(b.title)}</span><span class="sp-author">${esc(shortAuthors(b.authors))}</span></span>
          <span class="bk-meta"><b class="bk-title">${esc(b.title)}</b><span class="bk-by">${esc(authorsText(b.authors))} · ${b.firstPublishedYear}</span>${b.oneLine ? `<span class="bk-line">${esc(b.oneLine.text)}</span>` : ''}<span class="bk-status">${esc(statusText(b))}</span></span>
        </a>
      </li>`;
}

function shelf(pub, current) {
  const authors = [...new Set(pub.books.map((b) => b.authors[0]))].sort((a, b) => a.split(' ').pop().localeCompare(b.split(' ').pop()));
  const statuses = [...new Set(pub.books.map((b) => b.readingStatus || 'shelf'))];
  const reflections = pub.books.reduce((n, b) => n + b.reflections.length, 0);
  const reading = pub.books.filter((b) => b.readingStatus === 'reading').length;
  const Tag = current ? 'nav' : 'section';
  return `<${Tag} class="shelf leaf leaf-shelf" id="shelf" aria-labelledby="shelf-title" data-view="shelf">
      <header class="shelf-head">
        <p class="kicker">The shelf</p>
        <h2 id="shelf-title">${current ? 'The shelf' : 'Every book, one argument at a time.'}</h2>
        <ul class="counts" aria-label="The library in numbers">
          <li><b>${pub.books.length}</b> books</li>
          <li><b>${reading}</b> reading now</li>
          <li><b>${reflections}</b> ${reflections === 1 ? 'reflection' : 'reflections'}</li>
        </ul>
      </header>
      <div class="tools" role="search">
        <label class="search"><span class="vh">Search the library</span><svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4.5 4.5"/></svg><input type="search" id="q" placeholder="Search titles, authors, ideas" autocomplete="off" enterkeyhint="search"></label>
        <button type="button" class="tool-btn" id="filterBtn" aria-controls="filters" aria-expanded="false">Filters<span class="badge" id="filterCount" hidden></span></button>
        <div class="seg" role="group" aria-label="Show the shelf as">
          <button type="button" data-set-view="shelf" aria-pressed="true">Shelf</button>
          <button type="button" data-set-view="grid" aria-pressed="false">Grid</button>
          <button type="button" data-set-view="list" aria-pressed="false">List</button>
        </div>
      </div>
      <div class="filters" id="filters" role="dialog" aria-label="Filter and sort" hidden>
        <div class="sheet-grip" aria-hidden="true"></div>
        <fieldset><legend>Theme</legend><div class="chips">${pub.themes.map((t) => `<label class="chip"><input type="checkbox" name="theme" value="${t.slug}"><span>${esc(t.name)}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>Status</legend><div class="chips">${statuses.map((s) => `<label class="chip"><input type="checkbox" name="status" value="${s}"><span>${esc(s === 'shelf' ? 'On the shelf' : STATUS[s])}</span></label>`).join('')}</div></fieldset>
        <div class="selects">
          <label>Author<select id="author"><option value="">Any author</option>${authors.map((a) => `<option>${esc(a)}</option>`).join('')}</select></label>
          <label>Sort<select id="sort"><option value="rank">Curated</option><option value="title">Title</option><option value="year">Year published</option><option value="updated">Recently updated</option></select></label>
        </div>
        <div class="sheet-actions"><button type="button" class="btn-ghost" id="resetFilters">Reset</button><button type="button" class="btn" id="doneFilters">Done</button></div>
      </div>
      <p class="shelf-caption" id="caption" aria-hidden="true"></p>
      <p class="status-line" id="resultLine" aria-live="polite"></p>
      <ol class="books" id="books">
      ${pub.books.map((b) => shelfItem(b, current)).join('\n      ')}
      </ol>
      <div class="empty" id="empty" hidden>
        <p class="kicker">Empty shelf</p>
        <p>Nothing matches that. Try an author's surname or a theme.</p>
        <button type="button" class="btn-ghost" id="clearAll">Clear search and filters</button>
      </div>
      <div class="plank" aria-hidden="true"></div>
    </${Tag}>`;
}

export function home(pub, { version }) {
  const featured = pub.books[0];
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'The Leadership Library', description: SITE_DESC, url: ORIGIN + BASE, author: { '@type': 'Person', name: 'Mutaaf Aziz', url: ORIGIN + '/' }, hasPart: pub.books.map((b) => ({ '@type': 'Book', name: b.title, url: ORIGIN + BASE + b.slug + '/', author: b.authors.map((n) => ({ '@type': 'Person', name: n })) })) };
  const body = `
<body class="page-home">
  ${nav('home')}
  <main id="main" class="spread">
    <div class="night">
      <div class="sky" aria-hidden="true">
        <canvas id="field"></canvas>
        <div class="stage" id="stage"></div>
        <div class="sky-fade"></div>
      </div>
      <section class="hero" data-shape="lib-shelf" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="kicker">Books that shape how I think</p>
          <h1 id="hero-title">Lessons that shape how I&nbsp;lead.</h1>
          <p class="lede">The books on engineering, leadership and organizations I keep coming back to. Each one starts with a plain summary of its argument. My own interpretation, experiments and critique join it as I write them, dated and labelled.</p>
          <div class="ctas">
            <a class="cta" href="#shelf">Browse the shelf</a>
            <a class="cta-ghost" href="#how">How I read</a>
          </div>
          <ul class="proof" aria-label="Highlights">
            <li>${pub.books.length} books</li><li>${pub.themes.length} themes</li><li>Every claim labelled</li><li>No invented reviews</li>
          </ul>
        </div>
        <p class="shape-label" id="shapeLabel" aria-hidden="true">the shelf</p>
        <a class="scroll-cue" href="#how" aria-label="Scroll to how I read"><span></span></a>
      </section>
      <section class="story" id="how" aria-labelledby="how-title">
        <header class="story-head">
          <p class="kicker">How I read</p>
          <h2 id="how-title">Four voices, never blurred.</h2>
          <p>Every block on a book's page says whose claim it is. That way you always know what the book argues and what I think of it.</p>
        </header>
        <ol class="steps">
          <li class="step" data-shape="lib-book"><span class="step-n">01</span>${claim('book')}<h3>What the book argues</h3><p>A short summary in my own words. Never a long quotation, and never my opinion dressed up as the author's.</p></li>
          <li class="step" data-shape="mind"><span class="step-n">02</span>${claim('interpretation')}<h3>What I take from it</h3><p>What the idea means for engineering teams, and where it connects to other books on the shelf.</p></li>
          <li class="step" data-shape="teams"><span class="step-n">03</span>${claim('application')}<h3>What I try</h3><p>Experiments with a hypothesis and a signal to watch, then the outcome, whatever it was.</p></li>
          <li class="step" data-shape="lib-scales"><span class="step-n">04</span>${claim('critique')}<h3>Where I push back</h3><p>Where a book is dated, overreaches, or is only true in some rooms. A shelf of agreement teaches nothing.</p></li>
        </ol>
      </section>
    </div>
    ${shelf(pub, null)}
    <div class="gutter" aria-hidden="true"></div>
    <aside class="leaf leaf-book colophon" aria-labelledby="colo-title">
      <div class="colo-inner">
        <p class="kicker">The Leadership Library</p>
        <h1 id="colo-title">Books that shape how I think.</h1>
        <p class="colo-lede">Lessons that shape how I lead.</p>
        <div class="colo-orn" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <p>Pick a book from the shelf and it opens on this page. Each one starts with a labelled summary of its argument; my own notes join it as I write them.</p>
        <a class="colo-feature" href="${BASE}${featured.slug}/">${cover(featured, 'sm')}<span><span class="kicker">Start here</span><b>${esc(featured.title)}</b><span>${esc(authorsText(featured.authors))}</span></span></a>
      </div>
    </aside>
    <section class="closer" aria-labelledby="closer-title">
      <h2 id="closer-title">Reading is the slow part.</h2>
      <p>The shelf grows as I read. Nothing here pretends to be finished.</p>
      <div class="ctas"><a class="cta" href="#shelf">Back to the shelf</a><a class="cta-ghost cta-ghost-dark" href="/">mutaafaziz.com</a></div>
    </section>
  </main>
  ${foot()}${scripts('home')}
</body>
</html>
`;
  return head({ title: 'The Leadership Library · Mutaaf Aziz', description: SITE_DESC, canonical: BASE, jsonld }) + body;
}

function section(id, kind, s) {
  return `<section class="sec" id="${id}" aria-labelledby="${id}-h">${claim(s.claim)}<h2 id="${id}-h">${esc(KINDS[kind])}</h2><div class="prose">${md(s.body)}</div></section>`;
}

export function book(pub, b) {
  const by = (k) => b.sections.filter((s) => s.kind === k);
  const parts = [];
  const toc = [];
  const add = (id, label, html) => { parts.push(html); toc.push([id, label]); };
  for (const s of by('why')) add('why', 'Why', section('why', 'why', s));
  for (const s of by('thesis')) add('thesis', 'Thesis', section('thesis', 'thesis', s));
  if (b.ideas.length) {
    add('ideas', 'Big ideas', `<section class="sec" id="ideas" aria-labelledby="ideas-h"><h2 id="ideas-h">Big ideas</h2><ol class="ideas">${b.ideas.map((d, i) => `
          <li class="idea">${claim(d.claim)}<h3><span class="idea-n">${String(i + 1).padStart(2, '0')}</span>${esc(d.title)}</h3><p>${inline(d.summary)}</p>${d.caveat ? `<p class="caveat"><b>Caveat</b> ${inline(d.caveat)}</p>` : ''}${d.example ? `<p class="example"><b>On a team</b> ${inline(d.example)}</p>` : ''}</li>`).join('')}
        </ol></section>`);
  }
  for (const s of by('applications')) add('applications', 'Applications', section('applications', 'applications', s));
  const agree = by('agree'), challenge = by('challenge');
  if (agree.length || challenge.length) {
    add('critique', 'Agree / challenge', `<div class="pair" id="critique">${agree.map((s) => section('agree', 'agree', s)).join('')}${challenge.map((s) => section('challenge', 'challenge', s)).join('')}</div>`);
  }
  if (b.experiments.length) {
    add('experiments', 'Experiments', `<section class="sec" id="experiments" aria-labelledby="experiments-h">${claim('application')}<h2 id="experiments-h">Experiments I'm trying</h2><ul class="experiments">${b.experiments.map((x) => `
          <li class="exp exp-${x.status}"><p class="exp-status">${esc(x.status)}${x.startedAt ? ' · since ' + esc(fmtDate(x.startedAt)) : ''}</p><p><b>If</b> ${inline(x.hypothesis)}</p><p><b>Then I'll</b> ${inline(x.action)}</p>${x.successSignal ? `<p><b>Signal</b> ${inline(x.successSignal)}</p>` : ''}${x.outcome ? `<p><b>Outcome</b> ${inline(x.outcome)}</p>` : ''}</li>`).join('')}
        </ul></section>`);
  }
  if (b.reflections.length) {
    add('reflections', 'Reflections', `<section class="sec" id="reflections" aria-labelledby="reflections-h">${claim('interpretation')}<h2 id="reflections-h">My reflections</h2><ol class="timeline">${b.reflections.map((r) => `
          <li class="refl" id="r-${r.id}"><time datetime="${r.date}">${esc(fmtDate(r.date))}</time>${r.title ? `<h3>${esc(r.title)}</h3>` : ''}<div class="prose">${md(r.body)}</div>${r.tags.length ? `<p class="tags">${r.tags.map((t) => '<span>' + esc(t) + '</span>').join('')}</p>` : ''}</li>`).join('')}
        </ol></section>`);
  }
  for (const s of by('note')) add('note', 'Context', section('note', 'note', s));
  if (b.connections.length) {
    add('connections', 'Connections', `<section class="sec" id="connections" aria-labelledby="connections-h"><h2 id="connections-h">Connections to other books</h2><ul class="conns">${b.connections.map((c) => `
          <li><a class="conn" href="${BASE}${c.book.slug}/">${cover(c.book, 'xs')}<span><span class="conn-theme">${esc(c.theme.name)}</span><b>${esc(c.book.title)}</b><span class="conn-by">${esc(authorsText(c.book.authors))}</span></span></a>${c.explanation ? `${claim(c.claim)}<p>${inline(c.explanation)}</p>` : ''}</li>`).join('')}
        </ul></section>`);
  }
  if (b.resources.length) {
    add('get', 'Read · borrow · buy', `<section class="sec" id="get" aria-labelledby="get-h"><h2 id="get-h">Read, borrow or buy</h2><ul class="res">${b.resources.map((r) => `
          <li><a href="${esc(r.url)}" rel="noopener" target="_blank">${esc(r.label)}</a><span>${esc(r.provider)} · ${esc(r.format)} · ${esc(r.accessType === 'free-authorized' ? 'free, authorized' : r.accessType)}${r.isFullText ? ' · full text' : r.accessType === 'sample' ? ' · sample only' : ''} · checked ${esc(fmtDate(r.verifiedAt))}</span></li>`).join('')}
        </ul></section>`);
  }

  const i = pub.books.indexOf(b);
  const prev = pub.books[(i - 1 + pub.books.length) % pub.books.length];
  const next = pub.books[(i + 1) % pub.books.length];
  const description = (b.oneLine ? b.oneLine.text + ' ' : '') + 'A labelled summary of ' + b.title + ' by ' + authorsText(b.authors) + ', in the Leadership Library.';
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: b.title + ' · The Leadership Library', url: ORIGIN + BASE + b.slug + '/', dateModified: b.updatedAt,
    mainEntity: Object.assign({ '@type': 'Book', name: b.title, author: b.authors.map((n) => ({ '@type': 'Person', name: n })), datePublished: String(b.firstPublishedYear) },
      b.subtitle ? { alternativeHeadline: b.subtitle } : {}, b.isbn13 ? { isbn: b.isbn13 } : {}, b.edition ? { bookEdition: b.edition } : {}, b.publisher ? { publisher: { '@type': 'Organization', name: b.publisher } } : {}),
  };
  const body = `
<body class="page-book" style="${coverVars(b.cover)}">
  ${nav('book')}
  <main id="main" class="spread">
    ${shelf(pub, b)}
    <div class="gutter" aria-hidden="true"></div>
    <article class="leaf leaf-book book" aria-labelledby="book-title">
      <header class="book-hero">
        <div class="hero-cover">${cover(b, 'lg').replace('class="cover cover-lg"', 'class="cover cover-lg" id="heroCover"')}</div>
        <div class="hero-copy">
          <a class="back" href="${BASE}#shelf"><span aria-hidden="true">‹</span> Shelf</a>
          <p class="kicker">${esc(b.themes[0].name)}</p>
          <h1 id="book-title">${esc(b.title)}</h1>
          ${b.subtitle ? `<p class="book-sub">${esc(b.subtitle)}</p>` : ''}
          <p class="book-by">by ${esc(authorsText(b.authors))}</p>
          <dl class="facts">
            <div><dt>First published</dt><dd>${b.firstPublishedYear}</dd></div>
            ${b.edition ? `<div><dt>Edition</dt><dd>${esc(b.edition)}</dd></div>` : ''}
            <div><dt>Status</dt><dd><span class="vh">Reading status: </span>${esc(statusText(b))}</dd></div>
            <div><dt>Updated</dt><dd><time datetime="${b.updatedAt}">${esc(fmtDate(b.updatedAt))}</time></dd></div>
          </dl>
        </div>
      </header>
      <div class="book-body">
        ${toc.length > 2 ? `<nav class="toc" aria-label="On this page">${toc.map(([id, l]) => `<a href="#${id}">${esc(l)}</a>`).join('')}</nav>` : ''}
        ${parts.join('\n        ')}
        <p class="provenance">${b.assistantDrafted ? 'The summary of the book’s argument was drafted with AI assistance from the book’s published material. ' : ''}Sections labelled <i>My interpretation</i>, <i>My application</i> or <i>My critique</i> appear only once I’ve written them. Nothing here quotes the book at length; get the book itself for the real thing.</p>
        <nav class="pager" aria-label="More books">
          <a class="pg pg-prev" href="${BASE}${prev.slug}/" rel="prev"><span class="kicker">Previous</span><b>${esc(prev.title)}</b></a>
          <a class="pg pg-next" href="${BASE}${next.slug}/" rel="next"><span class="kicker">Next</span><b>${esc(next.title)}</b></a>
        </nav>
      </div>
    </article>
  </main>
  ${foot()}${scripts('book')}
</body>
</html>
`;
  return head({ title: b.title + ' by ' + authorsText(b.authors) + ' · The Leadership Library', description, canonical: BASE + b.slug + '/', jsonld, type: 'article' }) + body;
}

export function notFound(pub) {
  return head({ title: 'Not on the shelf · The Leadership Library', description: SITE_DESC, canonical: BASE }).replace('<link rel="canonical"', '<meta name="robots" content="noindex">\n  <link rel="canonical"') + `
<body class="page-404">
  ${nav('book')}
  <main id="main" class="lost">
    <p class="kicker">404</p>
    <h1>That book isn't on the shelf.</h1>
    <p>It may have moved, or it was never here. These are:</p>
    <ul class="lost-list">${pub.books.map((b) => `<li><a href="${BASE}${b.slug}/">${esc(b.title)}</a> <span>${esc(authorsText(b.authors))}</span></li>`).join('')}</ul>
  </main>
  ${foot()}
</body>
</html>
`;
}

export function sitemap(pub) {
  const urls = [{ loc: ORIGIN + BASE, lastmod: pub.books.map((b) => b.updatedAt).sort().pop() }].concat(pub.books.map((b) => ({ loc: ORIGIN + BASE + b.slug + '/', lastmod: b.updatedAt })));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n') + '\n</urlset>\n';
}
