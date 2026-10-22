// Springs as CSS linear() easings, so page motion settles the way UIKit's does.
// response = seconds for one undamped period (UIKit's "response"); damping = ζ (1 = no overshoot).
export function spring(response, damping, samples = 48) {
  const w = (2 * Math.PI) / response;
  const z = damping;
  const x = (t) => {
    if (z >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  };
  // Settle when within 0.1% and staying there.
  let duration = response;
  for (let t = response * 0.25; t < response * 6; t += 0.005) {
    let ok = true;
    for (let u = t; u < t + 0.25 * response; u += 0.01) if (Math.abs(1 - x(u)) > 0.001) { ok = false; break; }
    if (ok) { duration = t; break; }
  }
  const pts = [];
  for (let i = 0; i <= samples; i++) pts.push(i === samples ? 1 : +x((duration * i) / samples).toFixed(4));
  return { easing: 'linear(' + pts.join(', ') + ')', ms: Math.round(duration * 1000) };
}
