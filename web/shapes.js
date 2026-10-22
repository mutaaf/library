// The library's shapes for aurora-field (github.com/mutaaf/aurora-field), drawn as SVG
// paths on a 100×100 board like Hearth's. Plain script, no modules. ES5.
(function () {
  function spines(x0, base, list) {
    var out = [], x = x0;
    for (var i = 0; i < list.length; i++) {
      var w = list[i][0], h = list[i][1];
      out.push('M' + x + ' ' + base + ' V' + (base - h) + ' H' + (x + w) + ' V' + base + ' Z');
      x += w + 1.2;
    }
    return out;
  }
  var top = spines(10, 46, [[6, 30], [5, 34], [7, 27], [5, 32], [6, 36], [8, 29], [5, 33], [6, 26], [7, 31], [5, 35]]);
  var low = spines(12, 88, [[7, 32], [5, 28], [6, 35], [8, 30], [5, 33], [6, 27], [7, 34], [5, 31], [6, 29]]);
  var PATHS = {
    // Two shelves of books on brass-lit planks.
    'lib-shelf': {
      paths: top.concat(['M6 46 H94 V50 H6 Z'], low, ['M6 88 H94 V92 H6 Z']),
      tone: top.map(function () { return 0; }).concat([1], low.map(function () { return 0; }), [1]),
    },
    // A book lying open, with lines of text on both pages.
    'lib-book': {
      paths: [
        'M50 30 C38 23 20 23 6 28 V80 C20 75 38 75 50 82 Z',
        'M50 30 C62 23 80 23 94 28 V80 C80 75 62 75 50 82 Z',
        'M50 30 V82',
        'M14 40 C24 36 34 36 44 40', 'M14 50 C24 46 34 46 44 50', 'M14 60 C24 56 34 56 44 60', 'M14 70 C22 66 30 66 36 69',
        'M56 40 C66 36 76 36 86 40', 'M56 50 C66 46 76 46 86 50', 'M56 60 C66 56 76 56 86 60',
      ],
      tone: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    // A balance: where I push back.
    'lib-scales': {
      paths: [
        'M48 22 H52 V86 H48 Z', 'M30 86 H70 V92 H30 Z', 'M16 30 L84 24 L84 27 L16 33 Z',
        'M18 33 L8 58', 'M18 33 L30 58', 'M82 27 L72 50', 'M82 27 L94 50',
        'M6 58 Q19 70 32 58 Z', 'M70 50 Q83 62 96 50 Z', 'M50 14 C53 14 55 16 55 19 C55 22 53 24 50 24 C47 24 45 22 45 19 C45 16 47 14 50 14 Z',
      ],
      tone: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    },
  };

  var done = false;
  window.LibraryShapes = {
    names: Object.keys(PATHS),
    register: function (AF) {
      if (done || !AF) return;
      done = true;
      Object.keys(PATHS).forEach(function (name) {
        AF.register(name, AF.fromSVG(PATHS[name].paths, { tone: PATHS[name].tone }));
      });
    },
  };
})();
