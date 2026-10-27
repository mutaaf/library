// mutaafaziz.com/library: progressive enhancement. Without this file every page still
// reads top to bottom. ES5 on purpose (old devices are part of the audience).
// Sections: form (fold/unfold) · open-book transitions · shelf tools · tab bar.
(function () {
  var root = document.documentElement;
  var still = root.classList.contains('still');
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set: function (k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} },
  };
  var shelf = $('shelf');
  var defaultView = function () {}; // the shelf section replaces this
  var isDuo = function () { return root.classList.contains('duo'); };
  var fold = function () { return isDuo() ? root.getAttribute('data-fold') : ''; };

  // ================= FORM: the Duo folds and unfolds =================
  // libForm() (from <head>) says which form the page should be in right now. When it
  // changes, wrap the switch in a view transition: the page that appears swings open from
  // the hinge, the page that stays glides into its half (library.css § MOTION), and the
  // reader lands on the same heading they were reading.
  function scroller() {
    if (fold() !== 'open') return null;
    return document.querySelector('.page-home') ? shelf : document.querySelector('.leaf-book');
  }
  // The sticky bar at the top of the reading pane (the book's tabs in the book form).
  function stickyFloor() {
    var bar = document.querySelector('.duo .tabs');
    return bar && bar.getClientRects().length ? bar.offsetHeight + 12 : 0;
  }
  // The reader's place: the first block that starts below the sticky bar, i.e. the next
  // thing they're about to read, and how far down the pane it sits.
  function captureAnchor() {
    var box = scroller();
    var top = (box ? box.getBoundingClientRect().top : 0) + stickyFloor() - 8;
    var nodes = document.querySelectorAll('.book-hero, .sec, .fw li, .idea, .refl, .bk:not([hidden]), .colophon');
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (r.height && r.top >= top) return { el: nodes[i], off: r.top - top + 8 };
    }
    return null;
  }
  function restoreAnchor(a) {
    if (!a || !a.el.getClientRects().length) return;
    var box = scroller();
    var top = (box ? box.getBoundingClientRect().top : 0) + stickyFloor();
    var delta = a.el.getBoundingClientRect().top - top - Math.max(0, Math.min(a.off, 120));
    if (box) box.scrollTop += delta;
    else window.scrollTo(0, window.pageYOffset + delta);
  }
  function setForm(f) {
    if (f) { root.classList.add('duo'); root.setAttribute('data-fold', f); }
    else { root.classList.remove('duo'); root.removeAttribute('data-fold'); }
  }
  // The reader's place, kept current while they scroll. A fold reflows the page before the
  // resize event arrives (WebKit), so measuring then would pick the wrong heading. That
  // reflow also clamps the scroll position, which fires a scroll event of its own; so a
  // place only counts if it was measured at the width the current form was laid out for.
  var lastAnchor = null, tracking = 0, formWidth = window.innerWidth;
  document.addEventListener('scroll', function () {
    if (!tracking) tracking = requestAnimationFrame(function () { tracking = 0; if (window.innerWidth === formWidth) lastAnchor = captureAnchor(); });
  }, { capture: true, passive: true });
  var pending = 0;
  function checkForm() {
    pending = 0;
    if (!window.libForm) return;
    var next = window.libForm(), prev = fold();
    if (next === prev) { formWidth = window.innerWidth; return; }
    var anchor = lastAnchor || captureAnchor();
    var dir = prev === 'open' ? 'closing' : next === 'open' ? 'opening' : '';
    var update = function () { setForm(next); formWidth = window.innerWidth; defaultView(); arrange(); restoreAnchor(anchor); lastAnchor = anchor; };
    if (!dir || still || !document.startViewTransition) { update(); return; }
    root.setAttribute('data-fold-anim', dir);
    var done = function () { root.removeAttribute('data-fold-anim'); };
    try {
      var t = document.startViewTransition(update);
      t.finished.then(done, done);
    } catch (e) { update(); done(); }
  }
  window.addEventListener('resize', function () { if (!pending) pending = requestAnimationFrame(checkForm); });
  if (window.matchMedia) {
    var segs = matchMedia('(horizontal-viewport-segments: 2)');
    if (segs.addEventListener) segs.addEventListener('change', checkForm);
  }

  // In the open Duo the home's right-hand page carries the portrait, the philosophy, how I
  // read, the journey, themes and insights, and work with me (under the colophon); folded or in the app form
  // they go back where they came from.
  var moved = [];
  function arrange() {
    var right = document.querySelector('.page-home .colophon');
    if (!right) return;
    if (!moved.length) {
      ['new', 'portrait', 'philosophy', 'how', 'journey'].map($).concat([document.querySelector('.duo-row'), $('hire')]).forEach(function (el) {
        if (!el) return;
        var mark = document.createComment('home-slot');
        el.parentNode.insertBefore(mark, el);
        moved.push({ el: el, mark: mark });
      });
    }
    var open = fold() === 'open';
    moved.forEach(function (m) {
      if (open && m.el.parentNode !== right) right.appendChild(m.el);
      else if (!open && m.el.parentNode === right) m.mark.parentNode.insertBefore(m.el, m.mark.nextSibling);
    });
  }
  arrange();

  // ================= OPENING A BOOK: cross-document view transitions =================
  // The cover (or the spine, on the shelf) you tapped becomes the book page's hero cover;
  // going back, the hero shrinks into its slot. Only one element carries the name, so we
  // set it at the last moment (pageswap) and on arrival (pagereveal).
  var tapped = null;
  function slugOf(url) {
    var m = /\/library\/([a-z0-9-]+)\/?$/.exec(String(url).split(/[?#]/)[0]);
    return m ? m[1] : '';
  }
  function visibleArt(scope) {
    if (!scope) return null;
    var c = scope.querySelectorAll('.spine, .cover, .stk-face');
    for (var i = 0; i < c.length; i++) {
      var r = c[i].getBoundingClientRect();
      if (r.width && r.bottom > 0 && r.top < window.innerHeight) return c[i];
    }
    return null;
  }
  function name(el, n) { if (el) el.style.viewTransitionName = n; }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    tapped = a && slugOf(a.href) ? a : null;
  }, true);
  // "Back" means leaving a book for the shelf, however you got there (link, swipe, button).
  function isBack(fromUrl, toUrl) { return !!slugOf(fromUrl) && !slugOf(toUrl); }
  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition || !e.activation) return;
    var to = e.activation.entry && e.activation.entry.url;
    if (fold() === 'open') store.set('lib-shelf-top', String(shelf ? shelf.scrollTop : 0), true);
    if (isBack(location.href, to)) {
      if (e.viewTransition.types) e.viewTransition.types.add('back');
      return; // the hero (#heroCover) already carries the name
    }
    var hero = $('heroCover');
    if (hero) name(hero, 'none');
    if (tapped && slugOf(tapped.href) === slugOf(to)) name(visibleArt(tapped), 'lib-cover');
  });
  window.addEventListener('pagereveal', function (e) {
    if (fold() === 'open' && shelf) {
      var top = +store.get('lib-shelf-top', true);
      if (top) shelf.scrollTop = top;
    }
    if (!e.viewTransition || !window.navigation || !navigation.activation) return;
    var from = navigation.activation.from && navigation.activation.from.url;
    if (!from || !isBack(from, location.href)) return;
    if (e.viewTransition.types) e.viewTransition.types.add('back');
    var li = document.querySelector('.bk[data-slug="' + slugOf(from) + '"]');
    var art = visibleArt(li);
    name(art, 'lib-cover');
    e.viewTransition.finished.then(function () { name(art, ''); }, function () { name(art, ''); });
  });

  // ================= THE SHELF: views, search, filters, sort =================
  if (shelf) {
    var list = $('books-list');
    var items = [].slice.call(list.children);
    var q = $('q');
    var caption = $('caption');
    var DEFAULT_CAPTION = matchMedia('(hover: hover)').matches ? 'Point at a spine to read its title.' : 'Tap a spine to open the book.';
    var narrow = function () { return window.matchMedia('(max-width: 699px)').matches; };

    // Shelf / Grid / List. The book form always starts on the shelf; the app form starts on
    // Grid on phones. A choice the visitor makes sticks (this browser only).
    defaultView = function () {
      var saved = store.get('lib-view');
      setView(saved || (isDuo() ? 'list' : 'grid'));
    };
    var setView = function (v) {
      shelf.setAttribute('data-view', v);
      [].forEach.call(shelf.querySelectorAll('[data-set-view]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-view') === v)); });
      if (caption && v === 'shelf' && !caption.innerHTML) caption.textContent = DEFAULT_CAPTION;
    };
    defaultView();

    // Books glide to their new places (a same-document view transition, one name each).
    var glide = function (change) {
      if (still || !document.startViewTransition) { change(); return; }
      items.forEach(function (li) { li.style.viewTransitionName = 'bk-' + li.getAttribute('data-slug'); li.style.viewTransitionClass = 'bk'; });
      var clear = function () { items.forEach(function (li) { li.style.viewTransitionName = ''; li.style.viewTransitionClass = ''; }); };
      try { document.startViewTransition(change).finished.then(clear, clear); } catch (e) { change(); clear(); }
    };
    [].forEach.call(shelf.querySelectorAll('[data-set-view]'), function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-set-view');
        store.set('lib-view', v);
        glide(function () { setView(v); });
      });
    });

    // Caption: the spine you point at (the shelf view hides titles on the spines' faces).
    var describe = function (li) {
      if (!caption || shelf.getAttribute('data-view') !== 'shelf') return;
      if (!li) { caption.textContent = DEFAULT_CAPTION; return; }
      var meta = li.querySelector('.bk-meta');
      caption.innerHTML = '';
      var b = document.createElement('b');
      b.textContent = meta.querySelector('.bk-title').textContent;
      caption.appendChild(b);
      var line = meta.querySelector('.bk-line');
      caption.appendChild(document.createTextNode(meta.querySelector('.bk-by').textContent + (line ? ' · ' + line.textContent : '') + ' · ' + meta.querySelector('.bk-status').textContent));
    };
    list.addEventListener('mouseover', function (e) { describe(e.target.closest && e.target.closest('.bk')); });
    list.addEventListener('focusin', function (e) { describe(e.target.closest && e.target.closest('.bk')); });
    list.addEventListener('mouseleave', function () { describe(null); });

    // Search and filters combine; Reset clears them all.
    var state = { q: '', cat: '', theme: [], status: [], author: '', sort: 'rank' };
    var boxes = function (n) { return [].slice.call(shelf.querySelectorAll('input[name="' + n + '"]')); };
    var read = function () {
      state.q = q.value.trim().toLowerCase();
      state.theme = boxes('theme').filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
      state.status = boxes('status').filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
      state.author = $('author').value;
      state.sort = $('sort').value;
    };
    var cmp = {
      rank: function (a, b) { return a.getAttribute('data-rank') - b.getAttribute('data-rank'); },
      rating: function (a, b) { return (b.getAttribute('data-rating') - a.getAttribute('data-rating')) || cmp.rank(a, b); },
      title: function (a, b) { return a.getAttribute('data-title').localeCompare(b.getAttribute('data-title')); },
      year: function (a, b) { return a.getAttribute('data-year') - b.getAttribute('data-year'); },
      updated: function (a, b) { return a.getAttribute('data-updated') < b.getAttribute('data-updated') ? 1 : a.getAttribute('data-updated') > b.getAttribute('data-updated') ? -1 : cmp.rank(a, b); },
    };
    var apply = function () {
      var words = state.q.split(/\s+/).filter(Boolean), shown = 0;
      items.forEach(function (li) {
        var text = li.getAttribute('data-search');
        var themes = li.getAttribute('data-themes').split(' ');
        var ok = words.every(function (w) { return text.indexOf(w) !== -1; }) &&
          (!state.theme.length || state.theme.some(function (t) { return themes.indexOf(t) !== -1; })) &&
          (!state.status.length || state.status.indexOf(li.getAttribute('data-status')) !== -1) &&
          (!state.author || li.getAttribute('data-author') === state.author) &&
          (!state.cat || li.getAttribute('data-category') === state.cat);
        li.hidden = !ok;
        if (ok) shown++;
      });
      var score = function (li) {
        if (!words.length) return 0;
        var head = (li.getAttribute('data-title') + ' ' + li.getAttribute('data-author')).toLowerCase();
        return words.every(function (w) { return head.indexOf(w) !== -1; }) ? 1 : 0;
      };
      items.slice().sort(function (a, b) { return (score(b) - score(a)) || (cmp[state.sort] || cmp.rank)(a, b); }).forEach(function (li) { list.appendChild(li); });
      var n = state.theme.length + state.status.length + (state.author ? 1 : 0);
      var badge = $('filterCount');
      badge.hidden = !n;
      badge.textContent = n;
      $('empty').hidden = shown > 0;
      var line = $('resultLine');
      line.textContent = shown === items.length && !words.length ? '' : 'Showing ' + shown + ' of ' + items.length + ' books ';
      if (line.textContent) {
        var clr = document.createElement('button');
        clr.type = 'button'; clr.className = 'rl-clear'; clr.textContent = 'Show all';
        clr.addEventListener('click', reset);
        line.appendChild(clr);
      }
      [].forEach.call(shelf.querySelectorAll('.cat'), function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-cat') === state.cat)); });
    };
    var typing = 0;
    q.addEventListener('input', function () { clearTimeout(typing); typing = setTimeout(function () { read(); apply(); }, 90); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Escape' && q.value) { q.value = ''; read(); apply(); } });
    // The book form's own search field (iOS style) drives the same search.
    var q2 = $('q2');
    if (q2) q2.addEventListener('input', function () { q.value = q2.value; clearTimeout(typing); typing = setTimeout(function () { read(); apply(); }, 90); });
    var form = q.form;
    if (form && document.querySelector('.page-home')) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        read(); apply();
        var books = $('books'); if (books) books.scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
      });
      var m = /[?&]q=([^&#]*)/.exec(location.search);
      if (m) { q.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); read(); apply(); }
    }
    shelf.querySelector('.filters').addEventListener('change', function () { read(); glide(apply); });
    var reset = function () {
      q.value = '';
      boxes('theme').concat(boxes('status')).forEach(function (i) { i.checked = false; });
      $('author').value = '';
      $('sort').value = 'rank';
      state.cat = '';
      read();
      glide(apply);
    };
    $('resetFilters').addEventListener('click', reset);
    // Filters from elsewhere on the page: the hero's stats, the themes hub.
    window.libFilter = function (spec) {
      q.value = '';
      state.cat = '';
      boxes('theme').concat(boxes('status')).forEach(function (i) { i.checked = false; });
      $('author').value = '';
      var parts = String(spec || '').split(':'), vals = (parts[1] || '').split(',');
      if (parts[0] === 'status' || parts[0] === 'theme') boxes(parts[0]).forEach(function (i) { i.checked = vals.indexOf(i.value) !== -1; });
      read();
      glide(apply);
    };
    [].forEach.call(shelf.querySelectorAll('.cat'), function (c) {
      c.addEventListener('click', function () { state.cat = c.getAttribute('data-cat'); read(); glide(apply); });
    });
    $('clearAll').addEventListener('click', function () { reset(); q.focus(); });

    // Filters: an inline panel on wide screens, a bottom sheet you can drag away on phones.
    var panel = $('filters'), btn = $('filterBtn'), scrim = null;
    var springEase = getComputedStyle(root).getPropertyValue('--spring-soft').trim() || 'ease-out';
    var springMs = parseInt(getComputedStyle(root).getPropertyValue('--spring-soft-ms'), 10) || 420;
    var isSheet = function () { return narrow() && panel.parentNode && !panel.hidden; };
    var openPanel = function () {
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      if (narrow()) {
        scrim = document.createElement('div');
        scrim.className = 'sheet-scrim';
        scrim.addEventListener('click', closePanel);
        document.body.appendChild(scrim);
        panel.setAttribute('aria-modal', 'true');
        panel.classList.remove('sheet-in');
        void panel.offsetWidth;
        panel.classList.add('sheet-in');
        var first = panel.querySelector('input, select, button');
        if (first) first.focus({ preventScroll: true });
      }
    };
    var closePanel = function () {
      if (panel.hidden) return;
      var finish = function () {
        panel.hidden = true;
        panel.style.setProperty('--drag', '0px');
        panel.removeAttribute('aria-modal');
        panel.classList.remove('sheet-in');
        btn.setAttribute('aria-expanded', 'false');
        if (scrim) { scrim.parentNode.removeChild(scrim); scrim = null; }
      };
      if (scrim && !still && panel.animate) {
        scrim.classList.add('out');
        var from = getComputedStyle(panel).transform;
        panel.animate([{ transform: from === 'none' ? 'translateY(0)' : from }, { transform: 'translateY(100%)' }], { duration: Math.round(springMs * 0.7), easing: springEase, fill: 'forwards' }).onfinish = function () { finish(); panel.getAnimations().forEach(function (a) { a.cancel(); }); };
      } else finish();
      if (scrim || narrow()) btn.focus({ preventScroll: true });
    };
    btn.addEventListener('click', function () { if (panel.hidden) openPanel(); else closePanel(); });
    $('doneFilters').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
    // Drag the sheet down from its grip (or from anywhere, once its content is at the top).
    var drag = null;
    panel.addEventListener('pointerdown', function (e) {
      if (!isSheet() || (panel.scrollTop > 0 && !e.target.closest('.sheet-grip')) || e.target.closest('input, select, button, label')) return;
      drag = { y: e.clientY, t: Date.now(), dy: 0 };
      panel.setPointerCapture(e.pointerId);
      panel.style.transition = 'none';
    });
    panel.addEventListener('pointermove', function (e) {
      if (!drag) return;
      drag.dy = Math.max(0, e.clientY - drag.y);
      panel.style.setProperty('--drag', drag.dy + 'px');
    });
    var endDrag = function () {
      if (!drag) return;
      var v = drag.dy / Math.max(1, Date.now() - drag.t);
      var dy = drag.dy;
      drag = null;
      panel.style.transition = '';
      if (dy > 90 || v > 0.6) { closePanel(); return; }
      if (panel.animate && !still) panel.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'translateY(0)' }], { duration: springMs, easing: springEase });
      panel.style.setProperty('--drag', '0px');
    };
    panel.addEventListener('pointerup', endDrag);
    panel.addEventListener('pointercancel', endDrag);
  }

  // ================= BOOK TABS =================
  // Without JS every panel reads top to bottom. With it: one panel at a time, deep-linkable
  // (#panel-notes, or the id of anything inside a panel), arrow keys between tabs.
  var tabs = [].slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  if (tabs.length) {
    var show = function (id, focus, anim) {
      var found = false;
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tab') === id;
        if (on) found = true;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var p = $('panel-' + t.getAttribute('data-tab'));
        if (p) { p.classList.toggle('on', on); p.classList.toggle('anim', on && !!anim); }
        if (on && focus) t.focus();
      });
      return found;
    };
    var fromHash = function () {
      var h = location.hash.slice(1);
      if (!h) return false;
      var el = $(h);
      var panel = el && (el.classList.contains('panel') ? el : el.closest && el.closest('.panel'));
      if (!panel) return false;
      show(panel.id.replace('panel-', ''));
      if (el !== panel) el.scrollIntoView();
      return true;
    };
    if (!fromHash()) show(tabs[0].getAttribute('data-tab'));
    window.addEventListener('hashchange', fromHash);
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-tab]');
      if (!a) return;
      e.preventDefault();
      show(a.getAttribute('data-tab'), false, true);
      if (history.replaceState) history.replaceState(null, '', '#panel-' + a.getAttribute('data-tab'));
      if (!a.closest('.tabs')) { var bar = document.querySelector('.tabs'); if (bar) bar.scrollIntoView({ block: 'start' }); }
    });
    document.querySelector('.tabs').addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      e.preventDefault();
      var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      show(n.getAttribute('data-tab'), true, true);
    });
  }

  // ================= READING JOURNEY FILTER =================
  [].forEach.call(document.querySelectorAll('[data-jf]'), function (b, _, all) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-jf');
      [].forEach.call(all, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      [].forEach.call(document.querySelectorAll('.stop'), function (s) { s.classList.toggle('dim', !!k && s.getAttribute('data-k') !== k); });
    });
  });

  // ================= INTERACTIONS =================
  // Everything visible does something: stats filter, books peek, the loop plays, themes
  // filter the shelf, tags filter the insights, the timeline drags, questions copy.
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var toast = function (msg) {
    var t = $('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('on'); }, 1800);
  };
  var scrollToId = function (id) { var el = $(id); if (el) el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' }); };

  // Links that filter the shelf (hero stats, themes hub).
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-filter]');
    if (!a || !window.libFilter || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    window.libFilter(a.getAttribute('data-filter'));
    var name = a.getAttribute('data-theme-name');
    if (name) toast('Showing books on ' + name);
    scrollToId('books');
  });

  // Numbers count up the first time they're seen.
  var counters = [].slice.call(document.querySelectorAll('[data-count]'));
  if (counters.length && !still && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, to = +el.getAttribute('data-count'), t0 = performance.now();
        var step = function (t) { var k = Math.min(1, (t - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
        el.textContent = '0';
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  // Peek: point at a book in the stack and its card appears.
  var stks = [].slice.call(document.querySelectorAll('.stk'));
  if (stks.length && fine) {
    var peek = document.createElement('div');
    peek.className = 'peek';
    peek.setAttribute('aria-hidden', 'true');
    document.body.appendChild(peek);
    var show = function (li) {
      var d = function (k) { return li.getAttribute('data-peek-' + k) || ''; };
      var r = d('rating');
      peek.innerHTML = '';
      if (d('cover')) { var im = document.createElement('img'); im.src = d('cover'); im.alt = ''; peek.appendChild(im); }
      var box = document.createElement('div');
      var h = document.createElement('b'); h.textContent = d('title'); box.appendChild(h);
      var by = document.createElement('span'); by.className = 'pk-by'; by.textContent = d('by'); box.appendChild(by);
      var meta = document.createElement('span'); meta.className = 'pk-meta'; meta.textContent = d('status') + (r ? '  ·  ' + '★★★★★'.slice(0, Math.round(r)) + ' ' + r : ''); box.appendChild(meta);
      if (d('line')) { var ln = document.createElement('span'); ln.className = 'pk-line'; ln.textContent = '“' + d('line') + '”'; box.appendChild(ln); }
      peek.appendChild(box);
      var rc = li.getBoundingClientRect();
      peek.style.left = Math.max(12, rc.left - 300) + 'px';
      peek.style.top = Math.max(70, Math.min(innerHeight - 220, rc.top - 40)) + 'px';
      peek.classList.add('on');
    };
    var hide = function () { peek.classList.remove('on'); };
    stks.forEach(function (li) {
      li.addEventListener('mouseenter', function () { show(li); });
      li.addEventListener('mouseleave', hide);
      li.addEventListener('focusin', function () { show(li); });
      li.addEventListener('focusout', hide);
    });
  }

  // The philosophy loop: tap a stage (or its card); it walks the loop on its own until you do.
  var phBtns = [].slice.call(document.querySelectorAll('.loop [data-ph]'));
  if (phBtns.length) {
    var phCards = [].slice.call(document.querySelectorAll('.ph-card'));
    var cur = 0, auto = !still, timer = 0;
    var select = function (i, user) {
      cur = i;
      phBtns.forEach(function (b) { var on = +b.getAttribute('data-ph') === i; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
      phCards.forEach(function (c) { c.classList.toggle('on', +c.getAttribute('data-ph') === i); });
      if (user) { auto = false; clearInterval(timer); }
    };
    phBtns.forEach(function (b) { b.addEventListener('click', function () { select(+b.getAttribute('data-ph'), true); }); });
    phCards.forEach(function (c) { c.addEventListener('click', function (e) { if (!e.target.closest('a')) select(+c.getAttribute('data-ph'), true); }); });
    select(0);
    if (auto && 'IntersectionObserver' in window) {
      var pio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          clearInterval(timer);
          if (e.isIntersecting && auto) timer = setInterval(function () { select(cur % 4 + 1); }, 3200);
        });
      }, { threshold: 0.4 });
      pio.observe(document.querySelector('.loop'));
    }
  }

  // Insights: a tag shows every insight that carries it.
  var inItems = [].slice.call(document.querySelectorAll('.insights li[data-tags]'));
  if (inItems.length) {
    var inFilter = $('inFilter'), more = document.querySelector('.in-more');
    var byTag = function (tag) {
      inItems.forEach(function (li) { li.hidden = !!tag && li.getAttribute('data-tags').split('|').indexOf(tag) === -1; });
      [].forEach.call(document.querySelectorAll('.in-tag'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tag') === tag)); });
      if (more) more.open = !!tag || more.open;
      inFilter.hidden = !tag;
      if (tag) inFilter.firstChild.textContent = 'Tagged “' + tag + '”';
    };
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.in-tag');
      if (b) { byTag(b.getAttribute('aria-pressed') === 'true' ? '' : b.getAttribute('data-tag')); return; }
      if (e.target.closest && e.target.closest('.in-clear')) byTag('');
    });
  }

  // Covers lean toward the pointer.
  if (fine && !still) {
    document.addEventListener('pointermove', function (e) {
      var a = e.target.closest && e.target.closest('.shelf[data-view="grid"] .bk-link, .ph-card, .conn');
      if (!a) return;
      var r = a.getBoundingClientRect();
      a.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -7 + 'deg');
      a.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 9 + 'deg');
      a.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      a.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      a.classList.add('tilt');
    });
    document.addEventListener('pointerout', function (e) {
      var a = e.target.closest && e.target.closest('.tilt');
      if (a && !a.contains(e.relatedTarget)) { a.classList.remove('tilt'); a.style.removeProperty('--rx'); a.style.removeProperty('--ry'); }
    });
  }

  // Sections rise into place as they arrive (only what starts below the fold).
  if (!still && 'IntersectionObserver' in window) {
    var rev = [].slice.call(document.querySelectorAll('.philo-copy, .loop, .ph-card, .how li, .shelf-head, .journey-head, .stop, .hub, .insights, .closer, .sec, .idea, .fw li'))
      .filter(function (el) { return el.getBoundingClientRect().top > innerHeight; });
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rev.forEach(function (el, i) { el.classList.add('reveal'); el.style.setProperty('--d', (i % 6) * 60 + 'ms'); rio.observe(el); });
  }

  // The timeline: drag it, or use the arrows.
  var tw = document.querySelector('.track-wrap');
  if (tw) {
    [].forEach.call(document.querySelectorAll('[data-scroll]'), function (b) {
      b.addEventListener('click', function () { tw.scrollBy({ left: +b.getAttribute('data-scroll') * tw.clientWidth * 0.7, behavior: still ? 'auto' : 'smooth' }); });
    });
    var dr = null;
    tw.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') dr = { x: e.clientX, s: tw.scrollLeft, moved: false }; });
    window.addEventListener('pointermove', function (e) { if (!dr) return; var dx = e.clientX - dr.x; if (Math.abs(dx) > 4) dr.moved = true; tw.scrollLeft = dr.s - dx; tw.classList.toggle('dragging', dr.moved); });
    window.addEventListener('pointerup', function () { if (dr && dr.moved) { var stop = function (e) { e.preventDefault(); e.stopPropagation(); tw.removeEventListener('click', stop, true); }; tw.addEventListener('click', stop, true); } dr = null; tw.classList.remove('dragging'); });
  }

  // Book page: reading progress, copyable questions, the native share sheet.
  var bar = document.querySelector('.progress i');
  if (bar) {
    var prog = function () {
      var box = fold() === 'open' ? document.querySelector('.leaf-book') : null;
      var y = box ? box.scrollTop : window.pageYOffset, h = box ? box.scrollHeight - box.clientHeight : document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
    };
    document.addEventListener('scroll', prog, { capture: true, passive: true });
    prog();
  }
  [].forEach.call(document.querySelectorAll('.sec-diagnostic li'), function (li) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'copy'; b.setAttribute('aria-label', 'Copy this question');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/></svg>';
    b.addEventListener('click', function () {
      var text = li.textContent.trim();
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Question copied'); }, function () {});
    });
    li.appendChild(b);
  });
  [].forEach.call(document.querySelectorAll('[data-share]'), function (share) {
    if (!navigator.share && !navigator.clipboard) return;
    share.hidden = false;
    if (!navigator.share && share.lastChild.nodeType === 3) share.lastChild.textContent = 'Copy link';
    share.addEventListener('click', function () {
      var title = document.title, url = location.href.split('#')[0];
      if (navigator.share) navigator.share({ title: title, url: url }).catch(function () {});
      else navigator.clipboard.writeText(url).then(function () { toast('Link copied'); });
    });
  });

  // The iOS navigation bar (book form): the large title scrolls away, the inline title stays.
  var iosBar = document.querySelector('.ios-bar');
  var big = document.querySelector('#book-title, #shelf-title');
  if (iosBar && big && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { iosBar.classList.toggle('show', !es[0].isIntersecting && es[0].boundingClientRect.top < 80); }, { threshold: 0, rootMargin: '-56px 0px 0px 0px' }).observe(big);
  }

  // The phone tab bar follows the reader: the tab for the section in the middle of the
  // screen lights up, Home above the shelf.
  var docks = [].slice.call(document.querySelectorAll('.tabbar a[data-dock]'));
  if (docks.length && document.querySelector('.page-home') && 'IntersectionObserver' in window) {
    var spots = { books: $('books') && $('books').parentNode, journey: $('journey'), themes: document.querySelector('.duo-row'), hire: $('hire') };
    var lit = function (k) { docks.forEach(function (a) { if (a.getAttribute('data-dock') === k) a.setAttribute('aria-current', k === 'home' ? 'page' : 'true'); else a.removeAttribute('aria-current'); }); };
    var seen = {};
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.getAttribute('data-spot')] = e.isIntersecting; });
      var k = 'home';
      ['books', 'journey', 'themes', 'hire'].forEach(function (s) { if (seen[s]) k = s; });
      lit(k);
    }, { rootMargin: '-50% 0px -50% 0px' });
    Object.keys(spots).forEach(function (k) { if (spots[k]) { spots[k].setAttribute('data-spot', k); tio.observe(spots[k]); } });
  }

  var nav = $('nav');
  if (nav && document.querySelector('.page-home')) {
    var night = document.querySelector('.night');
    var onScroll = function () {
      var y = window.pageYOffset, past = y > (night ? night.offsetHeight - 80 : 24);
      nav.classList.toggle('scrolled', past);
      nav.classList.toggle('floating', !past && y > 24); // dark glass while still over the photo
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
