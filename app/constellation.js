// Draws an animal as a constellation: stars of different brightness joined by faint lines, on a night-sky disc.
// def: { stars: [[x, y, mag?], ...] in a 200x200 box (mag 1 = brightest .. 4 = faintest, default 3),
//        lines: [[i, j], ...], traits: { N, E, O, A, C: star index } }
// percentiles: { N, E, O, A, C } 0-100, sizes the five trait stars; omit for a neutral drawing.
// interactive: trait stars become focusable buttons (the page handles clicks via [data-trait]).

const MAG_R = [0, 2.9, 2.2, 1.6, 1.1];

// Small deterministic generator so the background sky is the same on every render of an animal.
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h;
}

export function constellationSvg(id, def, color, { percentiles, size = 200, animate = false, labels = false, interactive = false, disc = true, title = "", traitNames = {} } = {}) {
  const r = rng(hash(id));
  const uid = `${id}-${Math.floor(r() * 1e9).toString(36)}`;
  const traitOf = Object.fromEntries(Object.entries(def.traits || {}).map(([t, i]) => [i, t]));

  const sky = disc ? Array.from({ length: 40 }, () => {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 94;
    return `<circle cx="${(100 + Math.cos(a) * d).toFixed(1)}" cy="${(100 + Math.sin(a) * d).toFixed(1)}" r="${(0.35 + r() * 0.6).toFixed(2)}" fill="#fff" opacity="${(0.2 + r() * 0.4).toFixed(2)}"/>`;
  }).join("") : "";

  const lines = def.lines.map(([a, b], k) => {
    const [x1, y1] = def.stars[a], [x2, y2] = def.stars[b];
    const style = animate ? ` style="animation-delay:${(0.5 + k * 0.07).toFixed(2)}s"` : "";
    return `<line class="cl-line" pathLength="1" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${style}/>`;
  }).join("");

  const stars = def.stars.map(([x, y, mag = 3], i) => {
    const t = traitOf[i];
    const delay = animate ? `animation-delay:${(i * 0.05).toFixed(2)}s;` : "";
    if (!t) {
      const rad = MAG_R[mag] || MAG_R[3];
      const tw = r() < 0.35 ? ` cl-twinkle" style="${delay}--tw:${(2.5 + r() * 3).toFixed(1)}s;--twd:${(r() * 4).toFixed(1)}s` : `" style="${delay}`;
      const halo = mag <= 2 ? `<circle cx="${x}" cy="${y}" r="${rad * 3}" fill="url(#halo-${uid})"/>` : "";
      return `<g class="cl-star${tw}">${halo}<circle cx="${x}" cy="${y}" r="${rad}" fill="#fff"/></g>`;
    }
    const p = percentiles ? percentiles[t] : 50;
    const rad = 2.6 + (p / 100) * 4.6;
    const glow = 7 + (p / 100) * 13;
    const label = labels ? `<text class="cl-label" x="${x}" y="${y - rad - 6}" text-anchor="middle">${t}</text>` : "";
    const name = traitNames[t] || t;
    const attrs = interactive
      ? ` tabindex="0" role="button" aria-label="${name}${percentiles ? `, ${Math.round(p)}th percentile` : ""}"`
      : "";
    return `<g class="cl-trait${interactive ? " cl-hit" : ""}" data-trait="${t}"${attrs} style="${delay}">${interactive ? `<circle cx="${x}" cy="${y}" r="16" fill="transparent"/>` : ""}<circle class="cl-glow" cx="${x}" cy="${y}" r="${glow.toFixed(1)}" fill="url(#glow-${uid})"/><circle cx="${x}" cy="${y}" r="${rad.toFixed(1)}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${(rad * 0.5).toFixed(1)}" fill="${color}"/>${label}</g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" class="constellation${animate ? " animate" : ""}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${title}">
<defs>
<radialGradient id="sky-${uid}" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#1f2a4d"/><stop offset="1" stop-color="#0b1022"/></radialGradient>
<radialGradient id="glow-${uid}"><stop offset="0" stop-color="${color}" stop-opacity=".9"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
<radialGradient id="halo-${uid}"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
${disc ? `<circle cx="100" cy="100" r="99" fill="url(#sky-${uid})"/>` : ""}
${sky}
<g stroke="${color}" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".7">${lines}</g>
${stars}
</svg>`;
}
