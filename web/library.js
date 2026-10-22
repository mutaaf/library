// mutaafaziz.com/library: progressive enhancement. Without this file every page still
// reads top to bottom. ES5 on purpose (old devices are part of the audience).
// Sections: form (fold/unfold) · open-book transitions · shelf tools · sky.
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
  function captureAnchor() {
    var box = scroller();
    var top = box ? box.getBoundingClientRect().top : 0;
    var nodes = document.querySelectorAll('.book-hero, .sec, .idea, .refl, .bk:not([hidden]), .colophon');
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (r.height && r.bottom > top + 72) return { el: nodes[i], off: r.top - top };
    }
    return null;
  }
  function restoreAnchor(a) {
    if (!a || !a.el.getClientRects().length) return;
    var box = scroller();
    var top = box ? box.getBoundingClientRect().top : 0;
    // Land just below the sticky contents bar, or where the reader had it, whichever is lower.
    var toc = document.querySelector('.toc');
    var floor = toc && toc.getClientRects().length ? toc.offsetHeight + 12 : 0;
    var delta = a.el.getBoundingClientRect().top - top - Math.max(floor, Math.min(a.off, 120));
    if (box) box.scrollTop += delta;
    else window.scrollTo(0, window.pageYOffset + delta);
  }
  function setForm(f) {
    if (f) { root.classList.add('duo'); root.setAttribute('data-fold', f); }
    else { root.classList.remove('duo'); root.removeAttribute('data-fold'); }
  }
  var pending = 0;
  function checkForm() {
    pending = 0;
    if (!window.libForm) return;
    var next = window.libForm(), prev = fold();
    if (next === prev) return;
    var anchor = captureAnchor();
    var dir = prev === 'open' ? 'closing' : next === 'open' ? 'opening' : '';
    var update = function () { setForm(next); defaultView(); restoreAnchor(anchor); sky(); };
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
    var c = scope.querySelectorAll('.spine, .cover');
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
    var list = $('books');
    var items = [].slice.call(list.children);
    var q = $('q');
    var caption = $('caption');
    var DEFAULT_CAPTION = matchMedia('(hover: hover)').matches ? 'Point at a spine to read its title.' : 'Tap a spine to open the book.';
    var narrow = function () { return window.matchMedia('(max-width: 699px)').matches; };

    // Shelf / Grid / List. The book form always starts on the shelf; the app form starts on
    // Grid on phones. A choice the visitor makes sticks (this browser only).
    defaultView = function () {
      var saved = store.get('lib-view');
      setView(saved || (!isDuo() && narrow() ? 'grid' : 'shelf'));
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
    var state = { q: '', theme: [], status: [], author: '', sort: 'rank' };
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
          (!state.author || li.getAttribute('data-author') === state.author);
        li.hidden = !ok;
        if (ok) shown++;
      });
      items.slice().sort(cmp[state.sort] || cmp.rank).forEach(function (li) { list.appendChild(li); });
      var n = state.theme.length + state.status.length + (state.author ? 1 : 0);
      var badge = $('filterCount');
      badge.hidden = !n;
      badge.textContent = n;
      $('empty').hidden = shown > 0;
      $('resultLine').textContent = shown === items.length && !words.length ? '' : 'Showing ' + shown + ' of ' + items.length + ' books';
    };
    var typing = 0;
    q.addEventListener('input', function () { clearTimeout(typing); typing = setTimeout(function () { read(); apply(); }, 90); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Escape' && q.value) { q.value = ''; read(); apply(); } });
    shelf.querySelector('.filters').addEventListener('change', function () { read(); glide(apply); });
    var reset = function () {
      q.value = '';
      boxes('theme').concat(boxes('status')).forEach(function (i) { i.checked = false; });
      $('author').value = '';
      $('sort').value = 'rank';
      read();
      glide(apply);
    };
    $('resetFilters').addEventListener('click', reset);
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

  // ================= THE SKY (app form, home page only) =================
  // Hearth's pattern: a sticky aurora-field behind the hero and the story; the step in the
  // middle of the screen picks the shape. Started lazily, never in the book form.
  var field = null;
  var LABELS = { 'lib-shelf': 'the shelf', 'lib-book': 'the argument', mind: 'the interpretation', teams: 'the team', 'lib-scales': 'the critique' };
  function sky() {
    var canvas = $('field');
    if (!canvas) return;
    if (isDuo()) { if (field && field.pause) field.pause(); return; }
    if (field) { if (field.play) field.play(); return; }
    if (!window.AuroraField || !window.LibraryShapes) return;
    window.LibraryShapes.register(window.AuroraField);
    var label = $('shapeLabel');
    try {
      field = window.AuroraField.create(canvas, {
        shapes: window.LibraryShapes.names.concat(['mind', 'teams']),
        rotation: ['lib-shelf', 'lib-book', 'lib-scales'],
        initial: 'lib-shelf',
        palette: { preset: 'ember', point: [242, 235, 221], accent: [215, 176, 108] },
        cycle: 5600,
        depth: 2.6,
        stage: $('stage'),
        count: function (w) { return w > 760 ? 8000 : 3600; },
        interactive: false,
        onShape: function (n) { if (LABELS[n] && label) label.textContent = LABELS[n]; },
      });
    } catch (e) { field = null; }
  }
  sky();

  var steps = [].slice.call(document.querySelectorAll('.step'));
  var hero = document.querySelector('.hero');
  if (steps.length && 'IntersectionObserver' in window) {
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target === hero) { steps.forEach(function (s) { s.classList.remove('active'); }); current = null; return; }
        steps.forEach(function (s) { s.classList.toggle('active', s === e.target); });
        var n = e.target.getAttribute('data-shape');
        if (field && n !== current) { current = n; field.setShape(n, { pin: 60000 }); }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
    if (hero) io.observe(hero);
  } else root.classList.add('no-io');

  var nav = $('nav');
  if (nav && document.querySelector('.page-home')) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.pageYOffset > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
