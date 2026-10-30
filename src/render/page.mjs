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
// --cv-wash: the most saturated of the three, the colour Apple Music would pull from the art.
const sat = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return Math.max(...c) - Math.min(...c); };
const wash = (c) => [c.bg, c.ink, c.foil].sort((x, y) => sat(y) - sat(x))[0];
const coverVars = (c) => '--cv-bg:' + c.bg + ';--cv-ink:' + c.ink + ';--cv-foil:' + c.foil + ';--cv-wash:' + wash(c);
const claim = (c) => '<p class="claim claim-' + c + '">' + esc(CLAIMS[c]) + '</p>';
const isNum = (n) => typeof n === 'number';

// The <head> script runs before first paint: it decides the form (app, Duo closed, Duo
// open) and the posture (tabletop, when a foldable is half-folded with its hinge across the
// screen) so the page never flashes the wrong layout. library.js keeps both current.
// ?duo=open|closed|auto|off and ?posture=tabletop|auto|off emulate them (per tab).
// ES5 on purpose, like the personal site.
export const FORM_SCRIPT = `(function(){var d=document.documentElement,o=null,p=null;d.className+=' js';
try{var q=/[?&]duo=(open|closed|auto|off)\\b/.exec(location.search);if(q)sessionStorage.setItem('lib-duo',q[1]);o=sessionStorage.getItem('lib-duo');
var r=/[?&]posture=(tabletop|auto|off)\\b/.exec(location.search);if(r)sessionStorage.setItem('lib-posture',r[1]);p=sessionStorage.getItem('lib-posture')}catch(e){}
var mm=function(m){return!!(window.matchMedia&&matchMedia(m).matches)};
window.libPosture=function(){if(p==='off')return'';if(p==='tabletop')return'tabletop';return mm('(vertical-viewport-segments: 2)')?'tabletop':''};
var s=window.screen||{},a=Math.min(s.width||0,s.height||0),b=Math.max(s.width||0,s.height||0);
var iduo=/iPhone/.test(navigator.userAgent)&&__DUO_TEST__;
window.libForm=function(){var seg=mm('(horizontal-viewport-segments: 2)');
if(o==='off'||window.libPosture()||!(o||iduo||seg))return'';if(o==='open'||o==='closed')return o;
if(seg)return'open';
return innerWidth>=600&&innerWidth>innerHeight*1.1?'open':'closed'};
var f=window.libForm();if(f){d.className+=' duo';d.setAttribute('data-fold',f)}
var t=window.libPosture();if(t)d.setAttribute('data-posture',t);
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
  <meta name="theme-color" content="#000000">
  <meta name="color-scheme" content="light">
  <link rel="icon" href="${BASE}icon.svg" type="image/svg+xml">
  <link rel="preload" href="${BASE}fonts/instrument-serif-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${BASE}fonts/geist.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${BASE}library.css?v=__V__">
  <script>__FORM_SCRIPT__</script>
${jsonld ? '  <script type="application/ld+json">' + JSON.stringify(jsonld).replace(/</g, '\\u003c') + '</script>\n' : ''}</head>`;
}

function nav(page) {
  const h = page === 'home' ? '' : BASE;
  return `<a class="skip" href="#main">Skip to content</a>
  <header class="nav nav-${page}" id="nav">
    <a class="mono" href="${BASE}" aria-label="MA, The Leadership Library home"><span aria-hidden="true">MA</span></a>
    <nav aria-label="Library">
      <a class="nav-link" href="${BASE}"${page === 'home' ? ' aria-current="page"' : ''}>Home</a>
      <a class="nav-link" href="${h}#philosophy">Philosophy</a>
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
    <a class="nav-cta" href="${h}#hire">Work with me</a>
    <a class="avatar" href="/" aria-label="MA, Mutaaf Aziz at mutaafaziz.com"><span aria-hidden="true">MA</span></a>
  </header>`;
}

function foot() {
  return `<footer class="foot">
    <a href="/">← mutaafaziz.com</a>
    <span>Code MIT · <a href="https://github.com/mutaaf/library">github.com/mutaaf/library</a> · cover images via <a href="https://openlibrary.org">Open Library</a> · <a href="/ads/privacy/">Ads &amp; privacy</a></span>
  </footer>`;
}

// The Marquee ad loader (owner decision 2026-10-30; AGENTS.md §0.8). Same origin and a
// root-relative path, so the local and e2e servers never touch the network (it 404s there).
const ADS = `\n  <script async src="/ads/v1/ads.js" data-app="library"></script>`;
// A sponsor slot: takes no space until Marquee fills it (see .mq in web/library.css).
const slot = (id) => `<aside class="mq mq-${id}" data-marquee="${id}" aria-label="Sponsor"></aside>`;

function scripts(page) {
  return `\n  <script src="${BASE}library.js?v=__V__" defer blocking="render"></script>` + (page === 'home' || page === 'book' ? ADS : '');
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
  // On a book page in the open Duo the shelf is the split view's sidebar, so it carries the
  // way back to the library's root (iPadOS: the sidebar's own back button). Hidden elsewhere.
  return `<${Tag} class="shelf leaf leaf-shelf" id="shelf" aria-labelledby="shelf-title" data-view="grid">
      ${current ? `<a class="shelf-back" href="${BASE}"><svg viewBox="0 0 12 20" aria-hidden="true"><path d="M10 2L2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Library</a>` : ''}
      <span class="anchor" id="books"></span>
      <header class="shelf-head">
        <div><h2 id="shelf-title">${current ? 'The shelf' : 'All Books'}</h2><p class="shelf-sub">Explore the full collection, organized by themes and categories.</p></div>
      </header>
      <label class="ios-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4.5 4.5"/></svg><span class="vh">Search</span><input type="search" id="q2" placeholder="Search" autocomplete="off" enterkeyhint="search"></label>
      ${current ? '' : `<nav class="ios-explore" aria-label="Explore">
        <a href="#portrait"><span class="ie-ic" style="--c:#5856D6">❙</span><span>Who My Shelf Says I Am</span></a>
        <a href="#philosophy"><span class="ie-ic" style="--c:#0071E3">◎</span><span>My Leadership Philosophy</span></a>
        <a href="#how"><span class="ie-ic" style="--c:#FF9500">❝</span><span>How I Read</span></a>
        <a href="#journey"><span class="ie-ic" style="--c:#30B0C7">↝</span><span>My Reading Journey</span></a>
        <a href="#themes"><span class="ie-ic" style="--c:#FF3B30">✦</span><span>Key Themes</span></a>
        <a href="#insights"><span class="ie-ic" style="--c:#AF52DE">✎</span><span>Latest Insights</span></a>
        <a href="#hire"><span class="ie-ic" style="--c:#34A853">✉</span><span>Work With Me</span></a>
      </nav>`}
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
          <li class="stk" style="${coverVars(b.cover)};--t:${t}px;--len:${len}px;--shift:${shift}px;--turn:${turn}deg;--i:${i}" data-peek-title="${esc(b.title)}" data-peek-by="${esc(authorsText(b.authors))}" data-peek-line="${esc((b.pullQuote || b.oneLine || { text: '' }).text)}" data-peek-status="${esc(statusText(b))}" data-peek-rating="${b.reading && isNum(b.reading.rating) ? b.reading.rating : ''}" data-peek-cover="${b.coverImage ? BASE + esc(b.coverImage.file) : ''}"><a class="stk-link" href="${BASE}${b.slug}/"><span class="stk-face" data-type="${b.cover.type}"><span class="stk-title">${esc(b.title)}</span><span class="stk-author">${esc(b.authors.length > 1 ? shortAuthors(b.authors) : b.authors[0])}</span></span><span class="stk-top" aria-hidden="true">${img}</span><span class="stk-pages" aria-hidden="true"></span><span class="vh"> by ${esc(authorsText(b.authors))}</span></a></li>`;
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
  const item = (k, v, l, href, f) => `<li><a href="${href}"${f ? ` data-filter="${f}"` : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${icon[k]}</svg><b data-count="${v}">${v}</b><span>${l}</span></a></li>`;
  return `<ul class="stats" aria-label="The library in numbers">${item('books', pub.books.length, 'Books', '#books', 'all')}${item('done', n('finished'), 'Completed', '#books', 'status:finished')}${item('prog', n('reading') + n('revisiting'), 'In progress', '#books', 'status:reading,revisiting')}${item('idea', insights, 'Key insights', '#themes')}${item('note', notes, 'Personal notes', '#insights')}</ul>`;
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
        <div class="track-nav"><button type="button" class="tn-btn" data-scroll="-1" aria-label="Earlier books">‹</button><button type="button" class="tn-btn" data-scroll="1" aria-label="Later books">›</button></div>
        <div class="track-wrap" tabindex="0" aria-label="Reading timeline, scrolls sideways"><div class="track" style="--n:${N}">
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
        <a class="hub-core" href="#philosophy"><b>High-performing teams</b></a>
        <ul>${nodes.map((n, i) => `
          <li style="--x:${pos[i].x.toFixed(2)}%;--y:${pos[i].y.toFixed(2)}%;--c:${n.c}"><a href="${BASE}${n.books[0].slug}/" data-filter="theme:${n.t.slug}" data-theme-name="${esc(n.t.name)}"><span class="hub-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n.t.slug] || '<circle cx="12" cy="12" r="5"/>'}</svg></span><span class="hub-t"><b>${esc(n.t.name)}</b><span>(${esc(n.books[0].title.replace(/^The /, '').replace(/^Become an Effective Software Engineering Manager$/, 'Effective SE Manager').replace(/ Explained$/, ''))})</span></span></a></li>`).join('')}
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
          <li data-tags="${esc(r.tags.join('|'))}"><a href="${BASE}${b.slug}/#r-${r.id}">${cover(b, 'xs')}<span class="in-body"><b>${esc(r.title || b.title)}</b><span class="in-text">${esc(excerpt(r.body))}</span><span class="in-from">From: ${esc(b.title)}</span></span><span class="in-side"><time datetime="${r.date}">${esc(fmtDate(r.date))}</time></span></a>${r.tags[0] ? `<button type="button" class="in-tag" data-tag="${esc(r.tags[0])}" aria-pressed="false">${esc(r.tags[0])}</button>` : ''}</li>`;
  return `<section class="insights" id="insights" aria-labelledby="insights-title">
      <header><h2 id="insights-title">Latest Insights</h2><p class="in-filter" id="inFilter" hidden><span></span> <button type="button" class="in-clear">Show all</button></p><a class="in-count" href="#insights-all">View all <span aria-hidden="true">→</span></a></header>
      <ol class="in-list">${all.slice(0, 4).map(item).join('')}</ol>
      ${all.length > 4 ? `<details class="in-more" id="insights-all"><summary>All ${all.length} insights</summary><ol class="in-list">${all.slice(4).map(item).join('')}</ol></details>` : ''}
    </section>`;
}

// My leadership philosophy: a loop (alignment → systems → autonomy → learning) running on
// trust, each idea tied to the books on the shelf that shaped it. Content: content/philosophy.json.
function philosophy(pub, ph) {
  if (!ph) return '';
  const shaped = (slugs) => {
    const bs = (slugs || []).map((s) => pub.bySlug.get(s)).filter(Boolean);
    return bs.length ? `<p class="ph-books"><span>Shaped by</span>${bs.map((b) => `<a href="${BASE}${b.slug}/" title="${esc(b.title)}">${cover(b, 'xs')}<span class="vh">${esc(b.title)}</span></a>`).join('')}</p>` : '';
  };
  const pos = ['top', 'right', 'bottom', 'left'];
  return `<section class="philo" id="philosophy" aria-labelledby="philo-title">
      <div class="philo-copy">
        <p class="kicker">${esc(ph.kicker)}</p>
        <h2 id="philo-title">${esc(ph.headline)}</h2>
        <p class="philo-lede">${esc(ph.lede)}</p>
        <p class="philo-close">${esc(ph.closing)}</p>
      </div>
      <div class="loop" role="group" aria-label="The loop: tap a stage">
        <svg viewBox="0 0 400 400" aria-hidden="true"><circle class="loop-ring" cx="200" cy="200" r="150"/><circle class="loop-flow" cx="200" cy="200" r="150" pathLength="100"/>${[45, 135, 225, 315].map((a) => `<path class="loop-arrow" d="M0 -7 L9 0 L0 7 Z" transform="rotate(${a} 200 200) translate(200 50) rotate(0)"/>`).join('')}</svg>
        <button type="button" class="loop-core" data-ph="0" aria-controls="ph-0"><b>${esc(ph.core.name)}</b></button>
        ${ph.loop.map((n, i) => `<button type="button" class="loop-node loop-${pos[i]}" data-ph="${i + 1}" aria-controls="ph-${i + 1}"><span>${i + 1}</span><b>${esc(n.name)}</b></button>`).join('')}
      </div>
      <ol class="philo-cards">
        <li class="ph-card ph-core" id="ph-0" data-ph="0"><p class="ph-n">The foundation</p><h3>${esc(ph.core.name)}</h3><p>${esc(ph.core.text)}</p>${shaped(ph.core.books)}</li>
        ${ph.loop.map((n, i) => `<li class="ph-card" id="ph-${i + 1}" data-ph="${i + 1}"><p class="ph-n">${String(i + 1).padStart(2, '0')}</p><h3>${esc(n.name)}</h3><p>${esc(n.text)}</p>${shaped(n.books)}</li>`).join('\n        ')}
      </ol>
    </section>`;
}

// The portrait: "you can tell who someone is by the books on their shelf", taken literally.
// The books stand side by side, each as thick as its page count, and the shelf is cut into
// the shape of a head. Each spine is a trait. Content: content/portrait.json.
const HEAD = 'M132 452 C134 420 132 392 122 372 C86 350 52 302 46 236 C38 140 96 56 196 46 C282 38 344 96 350 168 C352 188 350 202 354 214 C362 232 380 258 384 272 C386 282 378 286 366 288 C370 296 372 304 366 310 C372 316 370 324 362 328 C368 340 366 358 352 366 C336 374 310 372 290 370 C276 372 268 392 266 452 Z';
function portrait(pub, pt) {
  if (!pt) return '';
  const books = pub.books.filter((b) => pt.traits[b.slug]);
  if (!books.length) return '';
  const x0 = 40, x1 = 392, gap = 2.5;
  const total = books.reduce((n, b) => n + (b.pages || 260), 0);
  const room = x1 - x0 - gap * (books.length - 1);
  let x = x0;
  const spines = books.map((b, i) => {
    const w = (room * (b.pages || 260)) / total;
    const cx = x + w / 2, fs = Math.max(8, Math.min(13, w * 0.42));
    const g = `<g class="pt-sp" data-pt="${i}" style="--i:${i}"><rect x="${x.toFixed(1)}" y="30" width="${w.toFixed(1)}" height="430" fill="${b.cover.bg}"/>`
      + `<rect x="${x.toFixed(1)}" y="96" width="${w.toFixed(1)}" height="3" fill="${b.cover.foil}"/><rect x="${x.toFixed(1)}" y="103" width="${w.toFixed(1)}" height="1.5" fill="${b.cover.foil}"/>`
      + `<rect x="${x.toFixed(1)}" y="404" width="${w.toFixed(1)}" height="2" fill="${b.cover.foil}"/>`
      + `<text x="${cx.toFixed(1)}" y="250" transform="rotate(90 ${cx.toFixed(1)} 250)" fill="${b.cover.ink}" font-size="${fs.toFixed(1)}">${esc(b.title.toUpperCase())}</text>`
      + `<rect class="pt-shade" x="${x.toFixed(1)}" y="30" width="${w.toFixed(1)}" height="430"/></g>`;
    x += w + gap;
    return g;
  });
  return `<section class="portrait" id="portrait" aria-labelledby="pt-title">
      <div class="pt-copy">
        <p class="kicker">${esc(pt.kicker)}</p>
        <h2 id="pt-title">${esc(pt.headline)}</h2>
        <p class="pt-lede">${esc(pt.lede)}</p>
      </div>
      <figure class="pt-bust">
        <svg viewBox="0 0 430 470" role="img" aria-label="A head in profile, made of the spines of the ${books.length} books on my shelf">
          <defs><filter id="pt-lift" x="-50%" y="-10%" width="200%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="9" flood-color="#000" flood-opacity=".32"/></filter><clipPath id="pt-head"><path d="${HEAD}"/></clipPath><linearGradient id="pt-light" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient></defs>
          <g clip-path="url(#pt-head)">${spines.join('')}<rect x="0" y="0" width="430" height="470" fill="url(#pt-light)" pointer-events="none"/></g>
          <path class="pt-outline" d="${HEAD}"/>
          <g class="pt-pull" filter="url(#pt-lift)" aria-hidden="true"></g>
        </svg>
        <div class="pt-plank" aria-hidden="true"></div>
        <figcaption class="pt-say" id="pt-say" aria-live="polite"><span class="pt-say-k">Tap a spine</span><b>Each book gives something away.</b></figcaption>
      </figure>
      <ol class="pt-list">
        ${books.map((b, i) => `<li><button type="button" data-pt="${i}" data-href="${BASE}${b.slug}/" data-title="${esc(b.title)}" data-line="${esc(pt.traits[b.slug].line)}" style="--c:${b.cover.bg};--f:${b.cover.foil};--w:${wash(b.cover)}" aria-pressed="false"><i aria-hidden="true"></i><b>${esc(pt.traits[b.slug].short)}</b><span>${esc(b.title)}</span><em class="pt-line">${esc(pt.traits[b.slug].line)}</em></button></li>`).join('\n        ')}
      </ol>
      <p class="pt-close">${esc(pt.closing)}</p>
    </section>`;
}

// Work with me: the résumé, for the people hiring. Every line is the owner's own résumé
// wording (content/hire.json); this only lays it out.
function hire(h) {
  if (!h) return '';
  const c = h.contact;
  const ic = {
    mail: '<path d="M3 5h18v14H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3.5 6l8.5 7 8.5-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    in: '<path d="M4 9h3.6v11H4zM5.8 3.5a2.1 2.1 0 110 4.2 2.1 2.1 0 010-4.2zM9.9 9h3.4v1.6c.5-.9 1.7-1.9 3.6-1.9 3.6 0 4.3 2.4 4.3 5.4V20h-3.6v-5.2c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V20H9.9z" fill="currentColor"/>',
    tel: '<path d="M6.6 3.5l3 3.4-1.8 2.4a12 12 0 006.9 6.9l2.4-1.8 3.4 3-1.6 3.1C11.4 20.3 3.7 12.6 3.5 5.1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    doc: '<path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12h6M9 16h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ic[k]}</svg>`;
  return `<section class="hire" id="hire" aria-labelledby="hire-title">
      <header class="hire-head">
        <p class="kicker">${esc(h.kicker)}</p>
        <h2 id="hire-title">${esc(h.name)}</h2>
        <p class="hire-tag">${esc(h.headline)}</p>
        <p class="hire-lede">${esc(h.summary)}</p>
        <p class="hire-seek">${esc(h.seeking)} <span>${esc(h.where)}</span></p>
      </header>
      <ul class="hire-nums" aria-label="By the numbers">${h.numbers.map((x) => `<li><b>${esc(x.n)}</b><span>${esc(x.label)}</span></li>`).join('')}</ul>
      <ol class="hire-roles" aria-label="Experience">${h.roles.map((r) => `
        <li><p class="hr-when">${esc(r.when)}</p><h3>${esc(r.org)}</h3><p class="hr-title">${esc(r.title)}</p><p class="hr-what">${esc(r.what)}</p></li>`).join('')}
      </ol>
      <ul class="hire-creds" aria-label="Credentials">${h.credentials.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="hire-contact">
        <a class="cta" href="mailto:${esc(c.email)}">${svg('mail')}Email me</a>
        <a class="hire-btn" href="${esc(c.linkedin)}" rel="noopener" target="_blank">${svg('in')}LinkedIn <span aria-hidden="true">↗</span></a>
        <a class="hire-btn" href="tel:${esc(c.phone)}">${svg('tel')}${esc(c.phoneLabel)}</a>
        <a class="hire-btn" href="${BASE}${esc(h.resume)}" download>${svg('doc')}Download résumé <span>PDF</span></a>
      </div>
      <p class="hire-direct"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a><span aria-hidden="true"> · </span><a href="${esc(c.site)}">${esc(c.site.replace(/^https?:\/\//, ''))}</a></p>
    </section>`;
}

// ── Read Now (2026-10-27, owner: "pop culture app … light mode default"): Apple Music's
// Recently Added row, the App Store's What's New, its tab bar and mini-player. Order and
// counts come only from addedAt (the day a book joined); updatedAt only says "updated".
const titles = (bs) => (bs.length > 2 ? esc(bs[0].title) + ', ' + esc(bs[1].title) + ' and ' + (bs.length - 2) + ' more' : bs.map((b) => esc(b.title)).join(' and '));

function fresh(pub) {
  const order = pub.books.slice().sort((a, b) => (a.addedAt === b.addedAt ? a.featuredRank - b.featuredRank : a.addedAt < b.addedAt ? 1 : -1));
  const days = [...new Set(pub.books.flatMap((b) => (b.updatedAt > b.addedAt ? [b.addedAt, b.updatedAt] : [b.addedAt])))].sort().reverse().slice(0, 4);
  const log = days.map((d) => {
    const added = order.filter((b) => b.addedAt === d), touched = order.filter((b) => b.updatedAt === d && b.addedAt !== d);
    const total = pub.books.filter((b) => b.addedAt <= d).length;
    const lines = (added.length ? '<b>New on the shelf</b><span>' + titles(added) + '</span>' : '') + (touched.length ? '<b>' + touched.length + (touched.length === 1 ? ' book' : ' books') + ' updated</b><span>' + titles(touched) + '</span>' : '');
    return `<li><time datetime="${d}">${fmtDate(d)}</time>${lines}<i class="wn-v">${total} ${total === 1 ? 'book' : 'books'}</i></li>`;
  }).join('');
  return `<section class="fresh" id="new" aria-labelledby="new-title">
      <header class="row-head"><h2 id="new-title">Recently Added</h2><a class="cta-link" href="#books">See all <span aria-hidden="true">›</span></a></header>
      <ol class="rail">${order.slice(0, 12).map((b, i) => `<li style="--i:${i}"><a href="${BASE}${b.slug}/">${cover(b, 'md')}<b>${esc(b.title)}</b><span>${esc(shortAuthors(b.authors))}</span>${b.addedAt === order[0].addedAt && b.addedAt > pub.books.map((x) => x.addedAt).sort()[0] ? '<i class="rail-new"><span class="vh">, </span>New</i>' : ''}</a></li>`).join('')}</ol>
      <aside class="whats-new" aria-labelledby="wn-title"><h3 id="wn-title">What’s New</h3><ol>${log}</ol></aside>
    </section>`;
}

// The hero's colour: four blurred blobs from the most saturated cover colours, drifting.
function mesh(pub) {
  const cs = [...new Set(pub.books.map((b) => wash(b.cover)))].sort((x, y) => sat(y) - sat(x)).slice(0, 4);
  return `<div class="mesh" aria-hidden="true">${cs.map((c) => `<i style="--c:${c}"></i>`).join('')}</div>`;
}

const TAB_ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V20h-5v-6h-6v6H4z"/>',
  books: '<path d="M5 4h4v16H5zM10.5 4h4v16h-4z"/><path d="m16 5.2 3.6-1 3 15.4-3.6 1z" transform="translate(-2.4 0)"/>',
  journey: '<path d="M3 19 9 9l4 6 3-4 5 8z"/><circle cx="17" cy="6" r="2"/>',
  themes: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="18" r="2"/><path d="m7 7 3 3m4 0 3-3m-7 7-2.6 3.4M14 14l2.6 2.6"/>',
  hire: '<path d="M4 8h16v11H4z"/><path d="M9 8V5h6v3M4 13h16"/>',
};
// The stage: the top screen of a foldable in tabletop posture (web/fold.css). On a book it
// is the book, open on the table, with where you are in it; on the home, library.js moves
// the portrait's head up here and the list that drives it stays on the bottom screen.
// Hidden, and never shown, without JS or a fold.
function stage(b) {
  if (!b) return '<div class="stage" id="stage" hidden></div>';
  const r = b.reading;
  return `<div class="stage" id="stage" hidden><div class="stage-book" aria-hidden="true" style="${coverVars(b.cover)}">
    <div class="stage-cover">${cover(b, 'md')}</div>
    <div class="stage-copy"><p class="stage-k">Open on the table</p><b class="stage-title">${esc(b.title)}</b><span class="stage-by">${esc(authorsText(b.authors))}</span>${r && isNum(r.rating) ? `<span class="stage-rate">${'★'.repeat(Math.round(r.rating))}<span>${r.rating.toFixed(1)}</span></span>` : ''}
      <p class="stage-now"><span class="stage-now-k">Now</span><span id="stage-now">Overview</span></p><span class="stage-bar"><i id="stage-bar"></i></span></div>
  </div></div>`;
}

function tabbar(page, pub, here) {
  const h = page === 'home' ? '' : BASE;
  const now = pub.books.find((b) => b.reading && b.reading.status === 'reading') || pub.books.find((b) => b.reading && b.reading.status === 'revisiting');
  const mini = now && now !== here ? `<a class="mini" href="${BASE}${now.slug}/">${cover(now, 'xs')}<span class="mini-t"><b>${esc(now.title)}</b><span>${esc(statusText(now))} · ${esc(shortAuthors(now.authors))}</span></span><span class="mini-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></a>` : '';
  const tabs = [['home', page === 'home' ? '#main' : BASE, 'Home'], ['books', h + '#books', 'Library'], ['journey', h + '#journey', 'Journey'], ['themes', h + '#themes', 'Themes'], ['hire', h + '#hire', 'Hire me']];
  return `<div class="dock">${mini}<nav class="tabbar" aria-label="Sections">${tabs.map(([k, href, label]) => `<a href="${href}" data-dock="${k}"${k === 'home' && page === 'home' ? ' aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${TAB_ICONS[k]}</svg><span>${label}</span></a>`).join('')}</nav></div>`;
}

export function home(pub, opts = {}) {
  const site = opts.site || {};
  const featured = pub.books[0];
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'The Leadership Library', description: SITE_DESC, url: ORIGIN + BASE, author: Object.assign({ '@type': 'Person', name: 'Mutaaf Aziz', url: ORIGIN + '/' }, site.hire ? { jobTitle: site.hire.roles[0].title, worksFor: { '@type': 'Organization', name: site.hire.roles[0].org }, email: 'mailto:' + site.hire.contact.email, sameAs: [site.hire.contact.linkedin, site.hire.contact.site] } : {}), hasPart: pub.books.map((b) => ({ '@type': 'Book', name: b.title, url: ORIGIN + BASE + b.slug + '/', author: b.authors.map((n) => ({ '@type': 'Person', name: n })) })) };
  const ep = site.epigraph;
  const body = `
<body class="page-home has-stage">
  ${stage()}
  ${nav('home')}
  <div class="ios-bar"><span class="ios-back"></span><b class="ios-title" aria-hidden="true">Library</b></div>
  <main id="main" class="spread">
    <div class="night">
      ${mesh(pub)}
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="hero-eyebrow">The Leadership Library <span aria-hidden="true">·</span> Mutaaf Aziz</p>
          <h1 id="hero-title"><span class="vh">The Leadership Library: </span>Books that shape how I think. <span class="h1-dim">Lessons that shape how I lead.</span></h1>
          <p class="lede">A collection of books on engineering, leadership, teams, strategy and personal growth, with summaries, key ideas, my reflections, and how I’m applying them in real life.</p>
          <div class="ctas">
            <a class="cta" href="#books">Explore the Library</a>
            <a class="cta-link" href="#hire">Work with me <span aria-hidden="true">›</span></a>
          </div>
        </div>
        <div class="desk">
          ${stack(pub)}
        </div>
        ${ep ? `<blockquote class="epigraph"><p>${esc(ep.text)}</p><footer>— ${esc(ep.by)}</footer></blockquote>` : ''}
        <div class="stats-wrap">${counts(pub)}</div>
      </section>
    </div>
    ${fresh(pub)}
    ${portrait(pub, site.portrait)}
    ${philosophy(pub, site.philosophy)}
    <section class="how" id="how" aria-labelledby="how-title">
      <h2 id="how-title">How I read</h2>
      <p>Every block on a book’s page says whose claim it is.</p>
      <ol>
        <li><a href="${BASE}five-dysfunctions-of-a-team/#thesis">${claim('book')}<span>A summary of what the book argues, and its own model. Never a long quotation.</span><span class="how-go">See an example →</span></a></li>
        <li><a href="${BASE}drive/#why">${claim('interpretation')}<span>What I take from it, for engineering teams and for the AI agents I run.</span><span class="how-go">See an example →</span></a></li>
        <li><a href="${BASE}accelerate/#diagnostic">${claim('application')}<span>What I do with it, and the questions I ask my own teams.</span><span class="how-go">See an example →</span></a></li>
        <li><a href="${BASE}the-48-laws-of-power/#challenge">${claim('critique')}<span>Where it’s dated, overreaches, or is only true in some rooms.</span><span class="how-go">See an example →</span></a></li>
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
    ${journey(pub)}
    <div class="duo-row">
      ${themesHub(pub)}
      ${insights(pub)}
    </div>
    ${hire(site.hire)}
    <section class="closer" aria-labelledby="closer-title">
      <h2 id="closer-title">Reading is the slow part.</h2>
      <p>The shelf grows as I read. Nothing here pretends to be finished.</p>
      <div class="ctas"><a class="cta" href="/#control">About me</a><a class="cta-link" href="#books">Back to the books <span aria-hidden="true">›</span></a></div>
    </section>
  </main>
  ${slot('footer')}
  ${tabbar('home', pub)}
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
  // Name only what the page has: a book added with just its facts claims no analysis.
  const has = [b.sections.length || b.ideas.length || b.framework ? 'analysis' : '', b.reading && isNum(b.reading.rating) ? 'rating' : '', b.pullQuote || b.sections.some((s) => s.kind === 'takeaways') ? 'takeaways' : ''].filter(Boolean);
  const description = (b.pullQuote ? b.pullQuote.text + ' ' : b.oneLine ? b.oneLine.text + ' ' : '') + b.title + ' by ' + authorsText(b.authors) + (has.length ? ': my ' + (has.length > 1 ? has.slice(0, -1).join(', ') + ' and ' + has[has.length - 1] : has[0]) + ' in the Leadership Library.' : ', on the shelf in the Leadership Library.');
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: b.title + ' · The Leadership Library', url: ORIGIN + BASE + b.slug + '/', dateModified: b.updatedAt,
    mainEntity: Object.assign({ '@type': 'Book', name: b.title, author: b.authors.map((n) => ({ '@type': 'Person', name: n })), datePublished: String(b.firstPublishedYear) },
      b.subtitle ? { alternativeHeadline: b.subtitle } : {}, b.isbn13 ? { isbn: b.isbn13 } : {}, b.pages ? { numberOfPages: b.pages } : {}, b.edition ? { bookEdition: b.edition } : {}, b.publisher ? { publisher: { '@type': 'Organization', name: b.publisher } } : {}),
  };
  const meta = [b.firstPublishedYear, b.pages ? b.pages + ' pages' : '', b.edition || '', CATEGORIES[b.category]].filter(Boolean).map((x) => `<span>${esc(String(x))}</span>`).join('');
  const body = `
<body class="page-book has-stage" style="${coverVars(b.cover)}">
  <div class="progress" aria-hidden="true"><i></i></div>
  ${stage(b)}
  ${nav('book')}
  <div class="ios-bar"><a class="ios-back" href="${BASE}#books"><svg viewBox="0 0 12 20" aria-hidden="true"><path d="M10 2L2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Library</a><b class="ios-title" aria-hidden="true">${esc(b.title)}</b><button type="button" class="ios-share" data-share hidden aria-label="Share"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11v9h12v-9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button></div>
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
          <p class="book-ctas">${hasNotes ? `<a class="btn btn-dark" href="#panel-notes" data-tab="notes"><span class="play" aria-hidden="true"></span>Read my notes</a>` : ''}${buy ? `<a class="btn-ghost btn-out" href="${esc(buy.url)}" rel="noopener" target="_blank">Buy book <span aria-hidden="true">↗</span></a>` : ''}${borrow ? `<a class="btn-ghost btn-out" href="${esc(borrow.url)}" rel="noopener" target="_blank">Borrow <span aria-hidden="true">↗</span></a>` : ''}<button type="button" class="btn-ghost btn-out share" data-share hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11v9h12v-9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>Share</button></p>
          ${b.pullQuote ? `<blockquote class="pull"><p>${esc(b.pullQuote.text)}</p></blockquote>` : ''}
        </div>
      </header>
      <div class="book-body">
        <div class="tabs-bar"><nav class="tabs" role="tablist" aria-label="About this book">${tabs.map(([id, label], k) => `<a role="tab" id="tab-${id}" href="#panel-${id}" aria-controls="panel-${id}" aria-selected="${k === 0}" data-tab="${id}">${esc(label)}</a>`).join('')}</nav></div>
        <div class="book-grid">
          <div class="panels">${tabs.map(([id, label, html]) => `
            <div class="panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}"><h2 class="panel-h">${esc(label)}</h2>${html}</div>`).join('')}
          </div>
          ${side}
        </div>
        <p class="provenance">${b.assistantDrafted ? 'Drafted with AI assistance from the book and its published material, edited and published by me. ' : ''}Nothing here quotes the book at length; get the book itself for the real thing.${b.coverImage ? ` Cover image: ${esc(b.coverImage.source)}.` : ''} <a href="/ads/privacy/">Ads &amp; privacy</a>.</p>
        ${slot('inline')}
        <nav class="pager" aria-label="More books">
          <a class="pg pg-prev" href="${BASE}${prev.slug}/" rel="prev"><span class="kicker">Previous</span><b>${esc(prev.title)}</b></a>
          <a class="pg pg-next" href="${BASE}${next.slug}/" rel="next"><span class="kicker">Next</span><b>${esc(next.title)}</b></a>
        </nav>
      </div>
    </article>
  </main>
  ${tabbar('book', pub, b)}
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
