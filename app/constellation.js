// Draws an animal as a constellation: stars joined by lines, on a night-sky disc.
// def: { stars: [[x, y], ...] in a 200x200 box, lines: [[i, j], ...], traits: { N, E, O, A, C: star index } }
// percentiles: { N, E, O, A, C } 0-100, sizes the five trait stars; omit for a neutral drawing.

const TRAIT_ORDER = ["O", "C", "E", "A", "N"];

// Small deterministic jitter so the background sky is the same on every render of an animal.
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h;
}

export function constellationSvg(id, def, color, { percentiles, size = 200, animate = false, labels = false, title = "" } = {}) {
  const r = rng(hash(id));
  const uid = `${id}-${Math.floor(r() * 1e6)}`;
  const traitOf = Object.fromEntries(Object.entries(def.traits || {}).map(([t, i]) => [i, t]));
  const sky = Array.from({ length: 34 }, () => {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 92;
    return `<circle cx="${(100 + Math.cos(a) * d).toFixed(1)}" cy="${(100 + Math.sin(a) * d).toFixed(1)}" r="${(0.4 + r() * 0.7).toFixed(2)}" fill="#fff" opacity="${(0.25 + r() * 0.4).toFixed(2)}"/>`;
  }).join("");

  const lines = def.lines.map(([a, b], k) => {
    const [x1, y1] = def.stars[a], [x2, y2] = def.stars[b];
    const style = animate ? ` style="animation-delay:${(0.35 + k * 0.06).toFixed(2)}s"` : "";
    return `<line class="cl-line" pathLength="1" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${style}/>`;
  }).join("");

  const stars = def.stars.map(([x, y], i) => {
    const t = traitOf[i];
    const delay = animate ? ` style="animation-delay:${(i * 0.04).toFixed(2)}s"` : "";
    if (!t) return `<circle class="cl-star" cx="${x}" cy="${y}" r="2.4"${delay}/>`;
    const p = percentiles ? percentiles[t] : 50;
    const rad = 2.8 + (p / 100) * 5.2;
    const glow = 6 + (p / 100) * 12;
    const label = labels
      ? `<text class="cl-label" x="${x}" y="${y - rad - 5}" text-anchor="middle">${t}</text>`
      : "";
    return `<g class="cl-trait" data-trait="${t}"${delay}><circle cx="${x}" cy="${y}" r="${glow.toFixed(1)}" fill="url(#glow-${uid})"/><circle cx="${x}" cy="${y}" r="${rad.toFixed(1)}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${(rad * 0.55).toFixed(1)}" fill="${color}"/>${label}</g>`;
  }).join("");

  return `<svg class="constellation${animate ? " animate" : ""}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${title}">
<defs>
<radialGradient id="sky-${uid}" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#1f2a4d"/><stop offset="1" stop-color="#0b1022"/></radialGradient>
<radialGradient id="glow-${uid}"><stop offset="0" stop-color="${color}" stop-opacity=".85"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
</defs>
<circle cx="100" cy="100" r="99" fill="url(#sky-${uid})"/>
${sky}
<g stroke="${color}" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".95">${lines}</g>
<g fill="#fff">${stars}</g>
</svg>`;
}

export { TRAIT_ORDER };
