// Page templates. Every page is complete HTML: the shelf and the book are both in the
// document, and CSS decides whether they read as an app page (everywhere) or as one page /
// a two-page spread (the iPhone Duo, closed / open). See docs/DESIGN.md.
import { esc, inline, md } from '../md.mjs';
import { CATEGORIES, CLAIMS, KINDS, STATUS } from '../schema.mjs';

export const BASE = '/library/';
export const ORIGIN = 'https://mutaafaziz.com';
const SITE_DESC = 'The Leadership Library: the books that shape how I think about engineering, leadership and teams, with my analysis, ratings, takeaways and the questions I ask my own teams.';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const authorsText = (a) => (a.length < 3 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const shortAuthors = (a) => a.map((n) => n.split(' ').slice(-1)[0]).join(' & ');
const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const fmtMonth = (m) => MONTHS[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const statusKey = (b) => (b.reading ? b.reading.status : 'shelf');
const statusText = (b) => (b.reading ? STATUS[b.reading.status] : 'On the shelf');
const coverVars = (c) => '--cv-bg:' + c.bg + ';--cv-ink:' + c.ink + ';--cv-foil:' + c.foil;
const claim = (c) => '<p class="claim claim-' + c + '">' + esc(CLAIMS[c]) + '</p>';
const isNum = (n) => typeof n === 'number';

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
  <header class="nav nav-${page}" id="nav">
    <a class="mono" href="${BASE}" aria-label="MA, The Leadership Library home"><span aria-hidden="true">M<i>A</i></span></a>
    <nav aria-label="Library">
      <a class="nav-link" href="${BASE}"${page === 'home' ? ' aria-current="page"' : ''}>Home</a>
      <a class="nav-link" href="${h}#books">Library</a>
      <a class="nav-link" href="${h}#journey">Journey</a>
      <a class="nav-link" href="${h}#themes">Themes</a>
      <a class="nav-link" href="${h}#insights">Insights</a>
      <a class="nav-link" href="/#control">About</a>
    </nav>
    <form class="nav-search" role="search" action="${BASE}#books" method="get">
      <svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4.5 4.5"/></svg>
      <label class="vh" for="q">Search books, ideas or topics</label>
      <input type="search" id="q" name="q" placeholder="Search books, ideas, or topics…" autocomplete="off" enterkeyhint="search">
    </form>
    <a class="avatar" href="/" aria-label="MA, Mutaaf Aziz at mutaafaziz.com"><span aria-hidden="true">MA</span></a>
  </header>`;
}

function foot() {
  return `<footer class="foot">
    <a href="/">← mutaafaziz.com</a>
    <span>Code MIT · <a href="https://github.com/mutaaf/library">github.com/mutaaf/library</a> · cover images via <a href="https://openlibrary.org">Open Library</a> · particles by <a href="https://github.com/mutaaf/aurora-field">aurora-field</a></span>
  </footer>`;
}

function scripts(page) {
  const sky = page === 'home' ? `\n  <script src="${BASE}vendor/aurora-field.min.js" defer></script>\n  <script src="${BASE}shapes.js?v=__V__" defer></script>` : '';
  return sky + `\n  <script src="${BASE}library.js?v=__V__" defer blocking="render"></script>`;
}

// A cover: the real image when we have one, over a typographic cover that shows if the
// image is missing or fails (onerror removes it).
function cover(b, size, id) {
  const img = b.coverImage ? `<img src="${BASE}${esc(b.coverImage.file)}" alt="" loading="${size === 'lg' ? 'eager' : 'lazy'}" decoding="async" onerror="this.remove()">` : '';
  return `<span class="cover cover-${size}${b.coverImage ? ' has-img' : ''}"${id ? ` id="${id}"` : ''} data-type="${b.cover.type}" style="${coverVars(b.cover)}" aria-hidden="true"><span class="cv-rule"></span><span class="cv-title">${esc(b.title)}</span><span class="cv-author">${esc(shortAuthors(b.authors))}</span>${img}</span>`;
}

function stars(r, label) {
  if (!isNum(r)) return '';
  return `<span class="stars" style="--r:${r}" role="img" aria-label="${label ? esc(label) + ': ' : ''}${r} out of 5"><span aria-hidden="true">★★★★★</span></span>`;
}

function badge(b) {
  return `<span class="badge-st st-${statusKey(b)}">${esc(statusText(b))}</span>`;
}

function searchText(b) {
  return [b.title, b.subtitle, b.authors.join(' '), CATEGORIES[b.category], b.themes.map((t) => t.name).join(' '), b.oneLine && b.oneLine.text, b.framework && b.framework.items.map((i) => i.name + ' ' + i.gist).join(' '), b.sections.map((s) => s.body).join(' '), b.ideas.map((i) => i.title + ' ' + i.summary).join(' '), b.reflections.map((r) => r.title + ' ' + r.body).join(' ')]
    .filter(Boolean).join(' ').toLowerCase().replace(/[*_[\]()>#`]/g, ' ').replace(/\s+/g, ' ');
}

function shelfItem(b, current) {
  const here = current && current.slug === b.slug;
  const r = b.reading && b.reading.rating;
  return `<li class="bk${here ? ' is-here' : ''}" data-slug="${b.slug}" data-category="${b.category}" data-themes="${b.themes.map((t) => t.slug).join(' ')}" data-status="${statusKey(b)}" data-author="${esc(b.authors[0])}" data-year="${b.firstPublishedYear}" data-rank="${b.featuredRank}" data-rating="${isNum(r) ? r : 0}" data-updated="${b.updatedAt}" data-title="${esc(b.title.replace(/^The /, ''))}" data-search="${esc(searchText(b))}" style="${coverVars(b.cover)};--h:${(b.title.length % 5) * 4 + 86}%;--w:${(b.authors.join('').length % 4) * 6 + 40}px">
        <a class="bk-link" href="${BASE}${b.slug}/"${here ? ' aria-current="page"' : ''}>
          ${cover(b, 'sm')}
          <span class="spine" data-type="${b.cover.type}" aria-hidden="true"><span class="sp-title">${esc(b.title)}</span><span class="sp-author">${esc(shortAuthors(b.authors))}</span></span>
          <span class="bk-meta"><b class="bk-title">${esc(b.title)}</b><span class="bk-by">${esc(authorsText(b.authors))}</span>${b.oneLine ? `<span class="bk-line">${esc(b.oneLine.text)}</span>` : ''}<span class="bk-foot">${badge(b)}${stars(r, 'My rating')}</span></span>
        </a>
      </li>`;
}

function shelf(pub, current) {
  const authors = [...new Set(pub.books.map((b) => b.authors[0]))].sort((a, b) => a.split(' ').pop().localeCompare(b.split(' ').pop()));
  const statuses = [...new Set(pub.books.map(statusKey))];
  const cats = Object.keys(CATEGORIES).filter((c) => pub.books.some((b) => b.category === c));
  const Tag = current ? 'nav' : 'section';
  return `<${Tag} class="shelf leaf leaf-shelf" id="shelf" aria-labelledby="shelf-title" data-view="grid">
      <span class="anchor" id="books"></span>
      <header class="shelf-head">
        <div><h2 id="shelf-title">${current ? 'The shelf' : 'All Books'}</h2><p class="shelf-sub">Explore the full collection, organized by themes and categories.</p></div>
      </header>
      <div class="shelf-bar">
        <div class="cats" role="group" aria-label="Category">
          <button type="button" class="cat" data-cat="" aria-pressed="true">All <span>(${pub.books.length})</span></button>
          ${cats.map((c) => `<button type="button" class="cat" data-cat="${c}" aria-pressed="false">${esc(CATEGORIES[c])}</button>`).join('\n          ')}
        </div>
        <div class="tools">
          <div class="seg" role="group" aria-label="Show the books as">
            <button type="button" data-set-view="grid" aria-pressed="true" title="Grid"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z"/></svg><span class="vh">Grid</span></button>
            <button type="button" data-set-view="shelf" aria-pressed="false" title="Shelf"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h3v12H3zM7.5 6h3v10h-3zM12 3h2.6v13H12zM15.5 5.5l2.6-.7 2.4 10.4-2.6.7z"/></svg><span class="vh">Shelf</span></button>
            <button type="button" data-set-view="list" aria-pressed="false" title="List"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14v2H3zM3 9h14v2H3zM3 14h14v2H3z"/></svg><span class="vh">List</span></button>
          </div>
          <label class="sort"><span class="vh">Sort</span><select id="sort"><option value="rank">Sort: Curated</option><option value="rating">Sort: My rating</option><option value="title">Sort: Title</option><option value="year">Sort: Year</option><option value="updated">Sort: Recently updated</option></select></label>
          <button type="button" class="tool-btn" id="filterBtn" aria-controls="filters" aria-expanded="false">Filters<span class="badge" id="filterCount" hidden></span></button>
        </div>
      </div>
      <div class="filters" id="filters" role="dialog" aria-label="Filter and sort" hidden>
        <div class="sheet-grip" aria-hidden="true"></div>
        <fieldset><legend>Theme</legend><div class="chips">${pub.themes.map((t) => `<label class="chip"><input type="checkbox" name="theme" value="${t.slug}"><span>${esc(t.name)}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>Status</legend><div class="chips">${statuses.map((s) => `<label class="chip"><input type="checkbox" name="status" value="${s}"><span>${esc(s === 'shelf' ? 'On the shelf' : STATUS[s])}</span></label>`).join('')}</div></fieldset>
        <div class="selects">
          <label>Author<select id="author"><option value="">Any author</option>${authors.map((a) => `<option>${esc(a)}</option>`).join('')}</select></label>
        </div>
        <div class="sheet-actions"><button type="button" class="btn-ghost" id="resetFilters">Reset</button><button type="button" class="btn" id="doneFilters">Done</button></div>
      </div>
      <p class="shelf-caption" id="caption" aria-hidden="true"></p>
      <p class="status-line" id="resultLine" aria-live="polite"></p>
      <ol class="books" id="books-list">
      ${pub.books.map((b) => shelfItem(b, current)).join('\n      ')}
      </ol>
      <div class="empty" id="empty" hidden>
        <p class="kicker">Empty shelf</p>
        <p>Nothing matches that. Try an author's surname or a theme.</p>
        <button type="button" class="btn-ghost" id="clearAll">Clear search and filters</button>
      </div>
    </${Tag}>`;
}

// The hero's stack: the nine books lying on the table, real boxes in CSS 3D. A book's
// thickness comes from its page count; its top face is its cover; the end shows its pages.
function stack(pub) {
  const order = pub.books.slice().reverse();
  return `<ol class="stack" aria-label="The nine books">${order.map((b, i) => {
    const t = Math.round(Math.min(46, Math.max(26, (b.pages || 260) * 0.085)));
    const len = 300 + ((b.title.length * 11 + i * 7) % 46);
    const shift = (((i * 53) % 9) - 4) * 5;
    const turn = (((i * 37) % 5) - 2) * 0.9;
    const img = b.coverImage ? `<img src="${BASE}${esc(b.coverImage.file)}" alt="" loading="lazy" decoding="async">` : '';
    return `
          <li class="stk" style="${coverVars(b.cover)};--t:${t}px;--len:${len}px;--shift:${shift}px;--turn:${turn}deg;--i:${i}"><a class="stk-link" href="${BASE}${b.slug}/"><span class="stk-face" data-type="${b.cover.type}"><span class="stk-title">${esc(b.title)}</span><span class="stk-author">${esc(b.authors.length > 1 ? shortAuthors(b.authors) : b.authors[0])}</span></span><span class="stk-top" aria-hidden="true">${img}</span><span class="stk-pages" aria-hidden="true"></span><span class="vh"> by ${esc(authorsText(b.authors))}</span></a></li>`;
  }).join('')}
        </ol>`;
}

function counts(pub) {
  const n = (s) => pub.books.filter((b) => b.reading && b.reading.status === s).length;
  const insights = pub.books.reduce((k, b) => k + b.ideas.length + (b.framework ? b.framework.items.length : 0), 0);
  const notes = pub.books.reduce((k, b) => k + b.reflections.length + b.sections.filter((s) => s.claim !== 'book' && s.claim !== 'context').length, 0);
  const icon = {
    books: '<path d="M4 4h4v16H4zM9 4h4v16H9zM14.4 4.8l3.6-1 4 15.4-3.6 1z"/>',
    done: '<path d="M5 3h14v18l-7-4-7 4z"/><path d="M8.5 10l2.5 2.5 4.5-4.5" fill="none" stroke="var(--night)" stroke-width="2"/>',
    prog: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" fill="none" stroke="var(--night)" stroke-width="2"/>',
    idea: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    note: '<path d="M5 3h10l4 4v14H5z"/><path d="M8 11h8M8 15h6" stroke="var(--night)" stroke-width="1.6"/>',
  };
  const item = (k, v, l) => `<li><svg viewBox="0 0 24 24" aria-hidden="true">${icon[k]}</svg><b>${v}</b><span>${l}</span></li>`;
  return `<ul class="stats" aria-label="The library in numbers">${item('books', pub.books.length, 'Books')}${item('done', n('finished'), 'Completed')}${item('prog', n('reading') + n('revisiting'), 'In progress')}${item('idea', insights, 'Key insights')}${item('note', notes, 'Personal notes')}</ul>`;
}

function journey(pub) {
  const done = pub.books.filter((b) => b.reading && b.reading.status === 'finished' && b.reading.finishedAt).sort((a, b) => (a.reading.finishedAt < b.reading.finishedAt ? -1 : 1));
  const now = pub.books.filter((b) => b.reading && (b.reading.status === 'reading' || b.reading.status === 'revisiting'));
  const next = pub.books.filter((b) => b.reading && (b.reading.status === 'queued' || b.reading.status === 'wishlist'));
  const stops = done.map((b) => ({ b, k: 'finished', when: fmtMonth(b.reading.finishedAt) }))
    .concat(now.map((b) => ({ b, k: 'reading', when: b.reading.status === 'revisiting' ? 'Revisiting' : 'In progress' })))
    .concat(next.map((b) => ({ b, k: 'queued', when: 'Next' })));
  if (!stops.length) return '';
  const N = stops.length;
  const pts = stops.map((s, i) => ({ x: ((i + 0.5) / N) * 1000, y: i % 2 ? 120 : 150 }));
  let d = `M0 ${pts[0].y + 14}`;
  pts.forEach((p, i) => { const prev = i ? pts[i - 1] : { x: 0, y: pts[0].y + 14 }; const mx = (prev.x + p.x) / 2; d += ` C${mx.toFixed(1)} ${prev.y} ${mx.toFixed(1)} ${p.y} ${p.x.toFixed(1)} ${p.y}`; });
  const last = pts[N - 1];
  d += ` C${((last.x + 1000) / 2).toFixed(1)} ${last.y} ${((last.x + 1000) / 2).toFixed(1)} ${last.y - 24} 1000 ${last.y - 24}`;
  const nDone = done.length;
  return `<section class="journey" id="journey" aria-labelledby="journey-title">
      <div class="mtn" aria-hidden="true"><svg viewBox="0 0 1200 300" preserveAspectRatio="none"><path d="M0 300V170l90-60 70 40 110-95 90 70 80-50 120 105 90-70 130 80 100-90 120 85 90-45 110 70v80z" fill="#28313a"/><path d="M0 300V210l120-40 90 30 140-70 110 60 100-30 150 70 120-50 110 40 130-60 100 50 130-20v110z" fill="#1c2329"/><path d="M0 300v-50l160-20 200 25 220-30 240 30 200-25 180 20v50z" fill="#12171b"/></svg></div>
      <div class="journey-inner">
        <header class="journey-head">
          <div><h2 id="journey-title">My Reading Journey</h2><p>A timeline of books, insights, and how my thinking has evolved.</p></div>
          <div class="seg seg-dark" role="group" aria-label="Show">
            <button type="button" data-jf="" aria-pressed="true">All</button><button type="button" data-jf="finished" aria-pressed="false">Completed</button><button type="button" data-jf="reading" aria-pressed="false">In Progress</button><button type="button" data-jf="queued" aria-pressed="false">Planned</button>
          </div>
        </header>
        <div class="track-wrap"><div class="track" style="--n:${N}">
          <svg class="path" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/><path class="path-done" d="${d}" pathLength="1" style="--done:${Math.max(0, (nDone - 0.5) / N).toFixed(3)}"/></svg>
          <ol>${stops.map((s, i) => `
            <li class="stop stop-${s.k}" data-k="${s.k}" style="--x:${(pts[i].x / 10).toFixed(2)}%;--y:${pts[i].y}px"><a href="${BASE}${s.b.slug}/">${cover(s.b, 'xs')}<span class="dot" aria-hidden="true"></span><span class="stop-label"><b>${esc(s.b.title)}</b><span>${esc(s.when)}</span></span></a></li>`).join('')}
          </ol>
        </div></div>
      </div>
    </section>`;
}

const ICONS = {
  'trust-and-accountability': '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
  motivation: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  'feedback-and-coaching': '<path d="M4 5h16v10H9l-5 4z"/>',
  'engineering-excellence': '<path d="M9 7L4 12l5 5 1.4-1.4L6.8 12l3.6-3.6zm6 0l-1.4 1.4 3.6 3.6-3.6 3.6L15 17l5-5z"/>',
  'organizational-design': '<path d="M10 3h4v4h-4zM4 15h4v4H4zM16 15h4v4h-4zM11.2 7h1.6v4H18v4h-1.6v-2.4H7.6V15H6v-4h5.2z"/>',
  'power-and-influence': '<path d="M7 21h10v-2H7zm1-3h8l-1-5 2-2-1.5-4H14l-2-4-2 4H8.5L7 11l2 2z"/>',
  'team-culture': '<path d="M8 11a3 3 0 110-6 3 3 0 010 6zm8 0a3 3 0 110-6 3 3 0 010 6zM2 19c0-3 3-5 6-5s6 2 6 5zm12 0c0-2-1-3.5-2-4.3 1-.5 2.6-.7 4-.7 3 0 6 2 6 5z"/>',
  'leadership-progression': '<path d="M6 21V3h2v2h8V3h2v18h-2v-2H8v2zm2-4h8v-3H8zm0-5h8V9H8zm0-5h8V7H8z"/>',
  'management-craft': '<path d="M4 7h16v12H4zM9 4h6v3H9zM8 11h8v2H8zm0 3h5v2H8z"/>',
  'scaling-organizations': '<path d="M3 20h4v-6H3zm7 0h4V9h-4zm7 0h4V4h-4z"/>',
};
const THEME_COLORS = ['#C8553D', '#6E9E73', '#D9A441', '#4F7CAC', '#8E6BB0', '#C78B3C', '#3F8F8B', '#B4566F', '#5D7FA8', '#9A7B4F'];

function themesHub(pub) {
  let nodes = pub.themes.map((t, i) => ({ t, books: pub.books.filter((b) => b.themes[0].slug === t.slug).concat(pub.books.filter((b) => b.themes[0].slug !== t.slug && b.themes.some((x) => x.slug === t.slug))), c: THEME_COLORS[i % THEME_COLORS.length] })).filter((n) => n.books.length);
  // At most eight around the hub: the themes that carry the most books.
  const keep = new Set(nodes.slice().sort((x, y) => y.books.length - x.books.length).slice(0, 8));
  nodes = nodes.filter((n) => keep.has(n));
  const N = nodes.length;
  const pos = nodes.map((_, i) => { const a = -Math.PI / 2 + (i / N) * Math.PI * 2; return { x: 50 + Math.cos(a) * 37, y: 50 + Math.sin(a) * 38 }; });
  return `<section class="hub" id="themes" aria-labelledby="themes-title">
      <header><h2 id="themes-title">Key Themes Across Books</h2><p>How ideas from different books connect, complement, or challenge each other.</p></header>
      <div class="hub-map">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${pos.map((p) => `<line x1="50" y1="50" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}"/>`).join('')}</svg>
        <div class="hub-core"><b>High-performing teams</b></div>
        <ul>${nodes.map((n, i) => `
          <li style="--x:${pos[i].x.toFixed(2)}%;--y:${pos[i].y.toFixed(2)}%;--c:${n.c}"><a href="${BASE}${n.books[0].slug}/"><span class="hub-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n.t.slug] || '<circle cx="12" cy="12" r="5"/>'}</svg></span><span class="hub-t"><b>${esc(n.t.name)}</b><span>(${esc(n.books[0].title.replace(/^The /, '').replace(/^Become an Effective Software Engineering Manager$/, 'Effective SE Manager').replace(/ Explained$/, ''))})</span></span></a></li>`).join('')}
        </ul>
      </div>
    </section>`;
}

function excerpt(body) {
  return body.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_#>`]/g, '').trim().split(/\n\n/)[0];
}

function insights(pub) {
  const all = [];
  pub.books.forEach((b) => b.reflections.forEach((r) => all.push({ b, r })));
  all.sort((x, y) => (x.r.id < y.r.id ? 1 : x.r.id > y.r.id ? -1 : x.b.featuredRank - y.b.featuredRank));
  if (!all.length) return '';
  const item = ({ b, r }) => `
          <li><a href="${BASE}${b.slug}/#r-${r.id}">${cover(b, 'xs')}<span class="in-body"><b>${esc(r.title || b.title)}</b><span class="in-text">${esc(excerpt(r.body))}</span><span class="in-from">From: ${esc(b.title)}</span></span><span class="in-side"><time datetime="${r.date}">${esc(fmtDate(r.date))}</time>${r.tags[0] ? `<span class="in-tag">${esc(r.tags[0])}</span>` : ''}</span></a></li>`;
  return `<section class="insights" id="insights" aria-labelledby="insights-title">
      <header><h2 id="insights-title">Latest Insights</h2><a class="in-count" href="#insights-all">View all <span aria-hidden="true">→</span></a></header>
      <ol class="in-list">${all.slice(0, 3).map(item).join('')}</ol>
      ${all.length > 3 ? `<details class="in-more" id="insights-all"><summary>All ${all.length} insights</summary><ol class="in-list">${all.slice(3).map(item).join('')}</ol></details>` : ''}
    </section>`;
}

export function home(pub, opts = {}) {
  const site = opts.site || {};
  const featured = pub.books[0];
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'The Leadership Library', description: SITE_DESC, url: ORIGIN + BASE, author: { '@type': 'Person', name: 'Mutaaf Aziz', url: ORIGIN + '/' }, hasPart: pub.books.map((b) => ({ '@type': 'Book', name: b.title, url: ORIGIN + BASE + b.slug + '/', author: b.authors.map((n) => ({ '@type': 'Person', name: n })) })) };
  const ep = site.epigraph;
  const body = `
<body class="page-home">
  ${nav('home')}
  <main id="main" class="spread">
    <div class="night">
      <picture class="room" aria-hidden="true"><source media="(max-width: 800px)" srcset="${BASE}room-800.jpg"><img src="${BASE}room.jpg" alt="" fetchpriority="high" decoding="async"></picture>
      <div class="room-shade" aria-hidden="true"></div>
      <div class="sky" aria-hidden="true">
        <canvas id="field"></canvas>
        <div class="stage" id="stage"></div>
      </div>
      <section class="hero" data-shape="lib-book" aria-labelledby="hero-title">
        <div class="hero-copy">
          <h1 id="hero-title">The Leadership Library</h1>
          <p class="hero-tag">Books that shape how I think. Lessons that shape how I lead.</p>
          <p class="lede">A collection of books on engineering, leadership, teams, strategy and personal growth, with summaries, key ideas, my reflections, and how I’m applying them in real life.</p>
          <div class="ctas">
            <a class="cta" href="#books">Explore the Library <span aria-hidden="true">→</span></a>
            <a class="cta-ghost" href="#how"><span class="play" aria-hidden="true"></span>How I read <span class="cta-note">1 min</span></a>
          </div>
        </div>
        <div class="desk">
          ${stack(pub)}
        </div>
        ${ep ? `<blockquote class="epigraph"><p>${esc(ep.text)}</p><footer>— ${esc(ep.by)}</footer></blockquote>` : ''}
        <div class="stats-wrap">${counts(pub)}</div>
      </section>
    </div>
    <section class="how" id="how" aria-labelledby="how-title">
      <h2 id="how-title">How I read</h2>
      <p>Every block on a book’s page says whose claim it is.</p>
      <ol>
        <li>${claim('book')}<span>A summary of what the book argues, and its own model. Never a long quotation.</span></li>
        <li>${claim('interpretation')}<span>What I take from it, for engineering teams and for the AI agents I run.</span></li>
        <li>${claim('application')}<span>What I do with it, and the questions I ask my own teams.</span></li>
        <li>${claim('critique')}<span>Where it’s dated, overreaches, or is only true in some rooms.</span></li>
      </ol>
    </section>
    ${shelf(pub, null)}
    <div class="gutter" aria-hidden="true"></div>
    <aside class="leaf leaf-book colophon" aria-labelledby="colo-title">
      <div class="colo-inner">
        <p class="kicker">The Leadership Library</p>
        <h1 id="colo-title">Books that shape how I think.</h1>
        <p class="colo-lede">Lessons that shape how I lead.</p>
        <div class="colo-orn" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <p>Pick a book from the shelf and it opens on this page: my status and rating, the book’s own model, my notes, and the questions I ask my teams.</p>
        <a class="colo-feature" href="${BASE}${featured.slug}/">${cover(featured, 'sm')}<span><span class="kicker">Start here</span><b>${esc(featured.title)}</b><span>${esc(authorsText(featured.authors))}</span></span></a>
      </div>
    </aside>
    <div class="duo-row">
      ${journey(pub)}
      ${themesHub(pub)}
      ${insights(pub)}
    </div>
    <section class="closer" aria-labelledby="closer-title">
      <h2 id="closer-title">Reading is the slow part.</h2>
      <p>The shelf grows as I read. Nothing here pretends to be finished.</p>
      <div class="ctas"><a class="cta" href="#books">Back to the books</a><a class="cta-ghost cta-ghost-dark" href="/">mutaafaziz.com</a></div>
    </section>
  </main>
  ${foot()}${scripts('home')}
</body>
</html>
`;
  return head({ title: 'The Leadership Library · Mutaaf Aziz', description: SITE_DESC, canonical: BASE, jsonld }) + body;
}

function section(id, kind, s) {
  return `<section class="sec sec-${kind}" id="${id}" aria-labelledby="${id}-h">${claim(s.claim)}<h3 id="${id}-h">${esc(KINDS[kind])}</h3><div class="prose">${md(s.body)}</div></section>`;
}

export function book(pub, b) {
  const by = (k) => b.sections.filter((s) => s.kind === k);
  const sec = (k) => by(k).map((s, i) => section(k + (i ? '-' + i : ''), k, s)).join('');
  const tabs = [];
  const tab = (id, label, html) => { if (html.trim()) tabs.push([id, label, html]); };

  const fw = b.framework ? `<section class="sec sec-framework" id="framework" aria-labelledby="framework-h">${claim(b.framework.claim)}<h3 id="framework-h">${esc(b.framework.title)}</h3><ol class="fw">${b.framework.items.map((x, i) => `<li style="--c:${THEME_COLORS[i % THEME_COLORS.length]}"><span class="fw-n">${i + 1}</span><b>${esc(x.name)}</b><span>${inline(x.gist)}</span></li>`).join('')}</ol></section>` : '';
  tab('overview', 'Overview', sec('why') + sec('thesis') + fw + sec('note'));
  tab('ideas', 'Key Ideas', b.ideas.length ? `<section class="sec" id="key-ideas" aria-labelledby="ideas-h"><h3 id="ideas-h">Key ideas</h3><ol class="ideas">${b.ideas.map((d, i) => `
          <li class="idea">${claim(d.claim)}<h4><span class="idea-n">${String(i + 1).padStart(2, '0')}</span>${esc(d.title)}</h4><p>${inline(d.summary)}</p>${d.caveat ? `<p class="caveat"><b>Caveat</b> ${inline(d.caveat)}</p>` : ''}${d.example ? `<p class="example"><b>On a team</b> ${inline(d.example)}</p>` : ''}</li>`).join('')}
        </ol></section>` : '');
  const pair = by('agree').length || by('challenge').length ? `<div class="pair">${sec('agree')}${sec('challenge')}</div>` : '';
  const exps = b.experiments.length ? `<section class="sec" id="experiments" aria-labelledby="experiments-h">${claim('application')}<h3 id="experiments-h">Experiments I'm running</h3><ul class="experiments">${b.experiments.map((x) => `
          <li class="exp exp-${x.status}"><p class="exp-status">${esc(x.status)}${x.startedAt ? ' · since ' + esc(fmtDate(x.startedAt)) : ''}</p><p><b>If</b> ${inline(x.hypothesis)}</p><p><b>Then I'll</b> ${inline(x.action)}</p>${x.successSignal ? `<p><b>Signal</b> ${inline(x.successSignal)}</p>` : ''}${x.outcome ? `<p><b>Outcome</b> ${inline(x.outcome)}</p>` : ''}</li>`).join('')}
        </ul></section>` : '';
  const refl = b.reflections.length ? `<section class="sec" id="reflections" aria-labelledby="reflections-h">${claim('interpretation')}<h3 id="reflections-h">My reflections</h3><ol class="timeline">${b.reflections.map((r) => `
          <li class="refl" id="r-${r.id}"><time datetime="${r.date}">${esc(fmtDate(r.date))}</time>${r.title ? `<h4>${esc(r.title)}</h4>` : ''}<div class="prose">${md(r.body)}</div>${r.tags.length ? `<p class="tags">${r.tags.map((t) => '<span>' + esc(t) + '</span>').join('')}</p>` : ''}</li>`).join('')}
        </ol></section>` : '';
  tab('notes', 'My Notes', sec('applications') + pair + exps + refl);
  tab('takeaways', 'Takeaways', sec('takeaways') + sec('diagnostic') + sec('pairs') + sec('skip'));
  const conns = b.connections.length ? `<section class="sec" id="connections" aria-labelledby="connections-h"><h3 id="connections-h">Related books</h3><ul class="conns">${b.connections.map((c) => `
          <li><a class="conn" href="${BASE}${c.book.slug}/">${cover(c.book, 'xs')}<span><span class="conn-theme">${esc(c.theme.name)}</span><b>${esc(c.book.title)}</b><span class="conn-by">${esc(authorsText(c.book.authors))}</span></span></a>${c.explanation ? `${claim(c.claim)}<p>${inline(c.explanation)}</p>` : ''}</li>`).join('')}
        </ul></section>` : '';
  const res = b.resources.length ? `<section class="sec" id="get" aria-labelledby="get-h"><h3 id="get-h">Read, borrow or buy</h3><ul class="res">${b.resources.map((r) => `
          <li><a href="${esc(r.url)}" rel="noopener" target="_blank">${esc(r.label)} <span aria-hidden="true">↗</span></a><span>${esc(r.provider)} · ${esc(r.format)} · ${esc(r.accessType === 'free-authorized' ? 'free, authorized' : r.accessType)}${r.isFullText ? ' · full text' : r.accessType === 'sample' ? ' · sample only' : ''} · link checked ${esc(fmtDate(r.verifiedAt))}</span></li>`).join('')}
        </ul></section>` : '';
  tab('related', 'Related Books', conns + res);

  const rd = b.reading;
  const side = rd ? `<aside class="side-card" aria-label="My reading">
          <div><p class="sc-l">My status</p><p class="sc-st st-${rd.status}"><svg class="sc-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(STATUS[rd.status])}</p>${rd.finishedAt ? `<p class="sc-sub">Read in ${esc(fmtMonth(rd.finishedAt))}</p>` : rd.startedAt ? `<p class="sc-sub">Started ${esc(fmtMonth(rd.startedAt))}</p>` : ''}</div>
          ${isNum(rd.rating) ? `<div><p class="sc-l">My rating</p>${stars(rd.rating, 'My rating')}</div>` : ''}
          ${typeof rd.recommended === 'boolean' ? `<div><p class="sc-l">Recommended</p><p class="sc-rec rec-${rd.recommended ? 'yes' : 'no'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21h4V9H2zm20-11a2 2 0 00-2-2h-6.3l1-4.6V3a1.5 1.5 0 00-.4-1L13 1 7.6 6.4A2 2 0 007 8v11a2 2 0 002 2h9a2 2 0 001.8-1.2l3-7.1c.1-.2.2-.5.2-.7z"/></svg>${rd.recommended ? 'Yes' : 'Not for everyone'}</p></div>` : ''}
        </aside>` : '';
  const buy = b.resources.find((r) => r.accessType === 'buy');
  const borrow = b.resources.find((r) => r.accessType === 'borrow');
  const hasNotes = tabs.some((t) => t[0] === 'notes');

  const i = pub.books.indexOf(b);
  const prev = pub.books[(i - 1 + pub.books.length) % pub.books.length];
  const next = pub.books[(i + 1) % pub.books.length];
  const description = (b.pullQuote ? b.pullQuote.text + ' ' : b.oneLine ? b.oneLine.text + ' ' : '') + b.title + ' by ' + authorsText(b.authors) + ': my analysis, rating and takeaways in the Leadership Library.';
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: b.title + ' · The Leadership Library', url: ORIGIN + BASE + b.slug + '/', dateModified: b.updatedAt,
    mainEntity: Object.assign({ '@type': 'Book', name: b.title, author: b.authors.map((n) => ({ '@type': 'Person', name: n })), datePublished: String(b.firstPublishedYear) },
      b.subtitle ? { alternativeHeadline: b.subtitle } : {}, b.isbn13 ? { isbn: b.isbn13 } : {}, b.pages ? { numberOfPages: b.pages } : {}, b.edition ? { bookEdition: b.edition } : {}, b.publisher ? { publisher: { '@type': 'Organization', name: b.publisher } } : {}),
  };
  const meta = [b.firstPublishedYear, b.pages ? b.pages + ' pages' : '', b.edition || '', CATEGORIES[b.category]].filter(Boolean).map((x) => `<span>${esc(String(x))}</span>`).join('');
  const body = `
<body class="page-book" style="${coverVars(b.cover)}">
  ${nav('book')}
  <main id="main" class="spread">
    ${shelf(pub, b)}
    <div class="gutter" aria-hidden="true"></div>
    <article class="leaf leaf-book book" aria-labelledby="book-title">
      <header class="book-hero">
        <a class="back" href="${BASE}#books"><span aria-hidden="true">←</span> Back to Library</a>
        <div class="hero-cover">${cover(b, 'lg', 'heroCover')}</div>
        <div class="hero-copy">
          <p class="chips-row">${b.themes.map((t) => `<span>${esc(t.name)}</span>`).join('')}</p>
          <h1 id="book-title">${esc(b.title)}</h1>
          ${b.subtitle ? `<p class="book-sub">${esc(b.subtitle)}</p>` : ''}
          <p class="book-by">${esc(authorsText(b.authors))}</p>
          <p class="book-meta">${meta}</p>
          ${rd && isNum(rd.rating) ? `<p class="book-rating">${stars(rd.rating, 'My rating')}<span>${rd.rating.toFixed(1)} (my rating)</span></p>` : ''}
          <p class="book-ctas">${hasNotes ? `<a class="btn btn-dark" href="#panel-notes" data-tab="notes"><span class="play" aria-hidden="true"></span>Read my notes</a>` : ''}${buy ? `<a class="btn-ghost btn-out" href="${esc(buy.url)}" rel="noopener" target="_blank">Buy book <span aria-hidden="true">↗</span></a>` : ''}${borrow ? `<a class="btn-ghost btn-out" href="${esc(borrow.url)}" rel="noopener" target="_blank">Borrow <span aria-hidden="true">↗</span></a>` : ''}</p>
          ${b.pullQuote ? `<blockquote class="pull"><p>${esc(b.pullQuote.text)}</p></blockquote>` : ''}
        </div>
      </header>
      <div class="book-body">
        <nav class="tabs" role="tablist" aria-label="About this book">${tabs.map(([id, label], k) => `<a role="tab" id="tab-${id}" href="#panel-${id}" aria-controls="panel-${id}" aria-selected="${k === 0}" data-tab="${id}">${esc(label)}</a>`).join('')}</nav>
        <div class="book-grid">
          <div class="panels">${tabs.map(([id, label, html]) => `
            <div class="panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}"><h2 class="panel-h">${esc(label)}</h2>${html}</div>`).join('')}
          </div>
          ${side}
        </div>
        <p class="provenance">${b.assistantDrafted ? 'Drafted with AI assistance from the book and its published material, edited and published by me. ' : ''}Nothing here quotes the book at length; get the book itself for the real thing.${b.coverImage ? ` Cover image: ${esc(b.coverImage.source)}.` : ''}</p>
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
