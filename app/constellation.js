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

// A realistic background sky as SVG markup for a w x h box: mostly faint stars, a few bright tinted ones with
// soft halos (the brightest with thin diffraction spikes), and optionally a faint Milky Way band with extra
// faint stars along it. circle: [cx, cy, r] keeps stars inside a disc. Deterministic for a given seed.
const TINTS = ["#ffffff", "#ffffff", "#ffffff", "#dbe6ff", "#c9d8ff", "#fff1dc", "#ffdcb4"];

export function starfield(seed, w, h, { count = 200, circle = null, band = false, scale = 1, twinkle = false } = {}) {
  const r = rng(seed);
  const uid = (seed >>> 0).toString(36);
  const inside = (x, y) => !circle || (x - circle[0]) ** 2 + (y - circle[1]) ** 2 < circle[2] ** 2;
  const out = [];
  // Milky Way: a tilted band through the box, drawn as a few overlapping soft ellipses.
  const angle = -25 - r() * 30, cx = w * (0.35 + r() * 0.3), cy = h * (0.35 + r() * 0.3);
  const along = Math.hypot(w, h), across = Math.min(w, h) * 0.16;
  if (band) {
    out.push(`<g transform="rotate(${angle.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})">` +
      [[0, 1, 0.2], [-0.18, 0.55, 0.14], [0.22, 0.7, 0.12]].map(([dx, k, o]) =>
        `<ellipse cx="${(cx + dx * along).toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(along * 0.42 * k).toFixed(1)}" ry="${(across * k).toFixed(1)}" fill="url(#mw-${uid})" opacity="${o}"/>`).join("") + `</g>`);
  }
  const rad = (angle * Math.PI) / 180, ux = Math.cos(rad), uy = Math.sin(rad);
  const total = count + (band ? Math.round(count * 0.6) : 0);
  for (let k = 0; k < total; k++) {
    let x, y;
    if (k >= count) {
      // Extra faint stars scattered along the band.
      const t = (r() - 0.5) * along, n = (r() + r() + r() - 1.5) * across * 0.9;
      x = cx + ux * t - uy * n; y = cy + uy * t + ux * n;
    } else { x = r() * w; y = r() * h; }
    if (x < 0 || y < 0 || x > w || y > h || !inside(x, y)) continue;
    // Brightness follows a steep power law, as in a real sky: many faint stars, very few bright ones.
    const b = k >= count ? r() * 0.35 : r() ** 3.2;
    const tint = b > 0.35 ? TINTS[Math.floor(r() * TINTS.length)] : "#fff";
    const rr = (0.28 + b * 1.5) * scale;
    const op = (0.25 + b * 0.75).toFixed(2);
    const tw = twinkle && b > 0.3 && r() < 0.5 ? ` class="bg-twinkle" style="--tw:${(2.5 + r() * 4).toFixed(1)}s;--twd:${(r() * 5).toFixed(1)}s"` : "";
    let star = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(2)}" fill="${tint}" opacity="${op}"/>`;
    if (b > 0.55) star = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(rr * 4.5).toFixed(2)}" fill="url(#bh-${uid})" opacity="${(b * 0.7).toFixed(2)}"/>` + star;
    if (b > 0.87) {
      const L = rr * 7;
      star += `<path d="M${(x - L).toFixed(1)} ${y.toFixed(1)}H${(x + L).toFixed(1)}M${x.toFixed(1)} ${(y - L).toFixed(1)}V${(y + L).toFixed(1)}" stroke="${tint}" stroke-width="${(0.25 * scale).toFixed(2)}" opacity=".45"/>`;
    }
    out.push(tw ? `<g${tw}>${star}</g>` : star);
  }
  return `<defs><radialGradient id="mw-${uid}"><stop offset="0" stop-color="#b9c6ff" stop-opacity=".9"/><stop offset=".6" stop-color="#8b9be0" stop-opacity=".35"/><stop offset="1" stop-color="#8b9be0" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="bh-${uid}"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
    (circle ? `<clipPath id="sc-${uid}"><circle cx="${circle[0]}" cy="${circle[1]}" r="${circle[2]}"/></clipPath>` : "") +
    `<g class="starfield"${circle ? ` clip-path="url(#sc-${uid})"` : ""}>${out.join("")}</g>`;
}

export function constellationSvg(id, def, color, { percentiles, size = 200, animate = false, labels = false, interactive = false, disc = true, title = "", traitNames = {} } = {}) {
  const r = rng(hash(id));
  const uid = `${id}-${Math.floor(r() * 1e9).toString(36)}`;
  const traitOf = Object.fromEntries(Object.entries(def.traits || {}).map(([t, i]) => [i, t]));

  const sky = disc ? starfield(hash(id) ^ 0x5bd1e995, 200, 200, { count: 120, circle: [100, 100, 96], band: true }) : "";

  const lines = def.lines.map(([a, b], k) => {
    const [x1, y1] = def.stars[a], [x2, y2] = def.stars[b];
    const style = animate ? ` style="animation-delay:${(0.5 + k * 0.07).toFixed(2)}s"` : "";
    return `<line class="cl-line" pathLength="1" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${style}/>`;
  }).join("");

  // Low-poly creases: the facet edges inside the body, drawn faint so the bright outline still carries the shape.
  // Each facet gets its own faint tint, lighter towards the top, like light falling on a low-poly model.
  const P = i => def.stars[i].slice(0, 2).join(",");
  // A 4th value of 1 marks a "marking" facet (panda patches, raccoon mask) that is filled much more strongly;
  // 2 marks a white one (the beaver's teeth).
  const facets = (def.tris || []).map(([a, b, c, mark]) => {
    const cy = (def.stars[a][1] + def.stars[b][1] + def.stars[c][1]) / 3;
    const o = mark ? 0.5 + r() * 0.15 : 0.05 + r() * 0.16 + (1 - cy / 200) * 0.1;
    // "pied" animals (the panda) have a pale body with near-black markings; "darkMarks" (the raccoon's mask
    // and tail rings) keeps the coloured body but makes the markings near-black.
    if (mark === 2) return `<polygon points="${P(a)} ${P(b)} ${P(c)}" fill="#fff" fill-opacity="${(0.75 + r() * 0.1).toFixed(3)}"/>`;
    if (mark && (def.pied || def.darkMarks)) return `<polygon points="${P(a)} ${P(b)} ${P(c)}" fill="#05070f" fill-opacity="${(0.82 + r() * 0.1).toFixed(3)}"/>`;
    if (def.pied) return `<polygon points="${P(a)} ${P(b)} ${P(c)}" fill="#fff" fill-opacity="${(o * 2).toFixed(3)}"/>`;
    return `<polygon points="${P(a)} ${P(b)} ${P(c)}" fill-opacity="${o.toFixed(3)}"/>`;
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
${facets ? `<g class="cl-facets" fill="${color}" stroke="${color}" stroke-width=".5" stroke-opacity=".4" stroke-linejoin="round">${facets}</g>` : ""}
<g stroke="${color}" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".7">${lines}</g>
${stars}
</svg>`;
}
