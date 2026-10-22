// How the page recognises an iPhone Duo before first paint (the <head> script in
// src/render/page.mjs). It only runs when the user agent says iPhone; `a` and `b` are the
// short and long sides of `screen` in CSS pixels.
//
// No other iPhone has a screen 600pt or wider on its short side, so that means the Duo's
// inner display. The cover display is matched by its measured size. Measurements come
// from the iPhone Duo simulator (Xcode 27.1, iOS 27.1); see docs/DESIGN.md § Measured.
export const DUO_SCREENS = {
  closed: [466, 678], // cover display: 1398×2034 px at 3× (measured 2026-10-22)
  open: [669, 951], // inner display: 2007×2853 px at 3× (framebuffer; covered by a>=600 anyway)
};

export const DUO_TEST = '(' + ['a>=600']
  .concat(Object.values(DUO_SCREENS).filter(Boolean).map((s) => `(Math.abs(a-${s[0]})<=2&&Math.abs(b-${s[1]})<=2)`))
  .join('||') + ')';
