// Reference scoring for the Wildwork questionnaires. No dependencies; runs in the browser or Node.
// personality: personality.json, norms: norms-ipip-neo-120.json, interests: interests.json

const NORMAL_Z95 = 1.96;

// Abramowitz & Stegun 7.1.26 erf approximation, error < 1.5e-7.
export function normalCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t *
    Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export function ageBand(age) {
  if (age == null) return "21-40";
  if (age < 21) return "<21";
  if (age <= 40) return "21-40";
  if (age <= 60) return "41-60";
  return ">60";
}

// sex: "male" | "female" | anything else -> combined norms
export function pickNormGroup(norms, { sex, age } = {}) {
  const s = sex === "male" || sex === "female" ? sex : "combined";
  return norms.groups.find(g => g.sex === s && g.age === ageBand(age));
}

function standardize(raw, { mean, sd }, alpha) {
  const t = 50 + 10 * (raw - mean) / sd;
  // Standard error of measurement in T units gives a 95% band around the observed score.
  const sem = 10 * Math.sqrt(1 - alpha);
  return {
    raw,
    t: round1(t),
    percentile: round1(100 * normalCdf((t - 50) / 10)),
    band95: [round1(100 * normalCdf((t - NORMAL_Z95 * sem - 50) / 10)), round1(100 * normalCdf((t + NORMAL_Z95 * sem - 50) / 10))],
  };
}

const round1 = x => Math.round(x * 10) / 10;

function pearson(a, b) {
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}

function longestRun(values) {
  let best = 0, run = 0, prev;
  for (const v of values) { run = v === prev ? run + 1 : 1; prev = v; best = Math.max(best, run); }
  return best;
}

// answers: { P001: 1..5, ... } (unanswered items may be missing)
export function scorePersonality(personality, norms, answers, person = {}) {
  const group = pickNormGroup(norms, person);
  const keyed = id => {
    const item = personality.items.find(i => i.id === id);
    const a = answers[id];
    return a == null ? null : item.keyed === "-" ? 6 - a : a;
  };

  const facets = {}, halves = [[], []];
  for (const f of personality.facets) {
    const vals = f.items.map(keyed);
    const known = vals.filter(v => v != null);
    // Prorate a facet with one missing item; more than one missing leaves it unscored.
    const raw = known.length >= 3 ? known.reduce((s, v) => s + v, 0) * 4 / known.length : null;
    facets[f.id] = raw == null ? null : standardize(raw, group.facets[f.id], f.alpha);
    if (known.length === 4) { halves[0].push(vals[0] + vals[2]); halves[1].push(vals[1] + vals[3]); }
  }

  const domains = {};
  for (const d of personality.domains) {
    const fs = personality.facets.filter(f => f.domain === d.id).map(f => facets[f.id]);
    domains[d.id] = fs.includes(null) ? null : standardize(fs.reduce((s, f) => s + f.raw, 0), group.domains[d.id], d.alpha);
  }

  // Response-quality checks after Johnson (2005, J. Research in Personality 39, 103-129).
  // Individual reliability: odd/even half-facet correlation across facets (Spearman-Brown corrected).
  const r = pearson(halves[0], halves[1]);
  const individualReliability = round1(100 * (2 * r) / (1 + r)) / 100;
  const ordered = personality.items.map(i => answers[i.id]).filter(v => v != null);
  const quality = {
    answered: ordered.length,
    longestSameAnswerRun: longestRun(ordered),
    individualReliability,
  };
  quality.flagged = individualReliability < 0.3 || quality.longestSameAnswerRun > 10 || quality.answered < 110;

  return { normGroup: { sex: group.sex, age: group.age }, domains, facets, quality };
}

// answers: { I001: 1..5, ... }
export function scoreInterests(interests, answers) {
  const raw = {};
  for (const t of interests.types) {
    const vals = interests.items.filter(i => i.type === t.id).map(i => answers[i.id]).filter(v => v != null);
    raw[t.id] = vals.length >= 8 ? round1(vals.reduce((s, v) => s + v, 0) * 10 / vals.length) : null;
  }
  const scored = Object.entries(raw).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]);
  const all = Object.values(raw).filter(v => v != null);
  const mean = all.reduce((s, v) => s + v, 0) / all.length;
  return {
    raw,                                                     // 10-50 per type
    relative: Object.fromEntries(scored.map(([k, v]) => [k, round1(v - mean)])),
    code: scored.slice(0, 3).map(([k]) => k).join(""),
    // Heuristic: scores within 3 points are close to measurement error, so show them as tied.
    tiedWithNext: scored.slice(0, 3).map(([, v], i) => scored[i + 1] ? v - scored[i + 1][1] <= 3 : false),
    flat: Math.max(...all) - Math.min(...all) < 6,
  };
}
