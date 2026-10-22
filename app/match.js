// Job matching: interests (RIASEC profile correlation, 70%) + personality (facets -> O*NET work styles, 30%).
// Both parts are standardized across all occupations for this person before weighting, so 70/30 means
// what it says regardless of how spread out each raw score happens to be.

export const WEIGHTS = { interests: 0.7, personality: 0.3 };
const RIASEC = ["R", "I", "A", "S", "E", "C"];

function pearson(a, b) {
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}

function standardizeAcross(values) {
  const xs = values.filter(v => v != null);
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) || 1;
  return values.map(v => (v == null ? 0 : (v - m) / sd));
}

// Person's score on each work style, in z units. Facet z-scores are shrunk toward the mean by their
// reliability (Kelley's estimate of the true score), so weak facets like Cooperation count for less.
export function workStyleProfile(personalityResult, personality, map) {
  const alpha = Object.fromEntries(personality.facets.map(f => [f.id, f.alpha]));
  const out = {};
  for (const [style, parts] of Object.entries(map.map)) {
    const zs = parts.map(([facet, sign]) => {
      const f = personalityResult.facets[facet];
      return f == null ? null : sign * alpha[facet] * (f.t - 50) / 10;
    }).filter(v => v != null);
    out[style] = zs.length ? zs.reduce((s, x) => s + x, 0) / zs.length : 0;
  }
  return out;
}

// Weighted mean of the person's style z-scores, weighted by how much each style helps (or, if negative,
// hurts) performance in the job: high where the job needs it and low where it gets in the way scores well.
function personalityFit(styles, jobStyles) {
  let num = 0, den = 0;
  for (const [s, w] of Object.entries(jobStyles)) {
    if (styles[s] == null) continue;
    num += w * styles[s];
    den += Math.abs(w);
  }
  return den ? num / den : null;
}

export function matchJobs(jobs, interestRaw, styles) {
  const person = RIASEC.map(k => interestRaw[k]);
  const interest = jobs.map(j => pearson(person, RIASEC.map(k => j.riasec[k])));
  const pers = jobs.map(j => (j.workStyles && Object.keys(j.workStyles).length ? personalityFit(styles, j.workStyles) : null));
  const zi = standardizeAcross(interest), zp = standardizeAcross(pers);
  const scored = jobs.map((job, i) => ({
    job,
    interestR: interest[i],
    personalityFit: pers[i],
    score: WEIGHTS.interests * zi[i] + WEIGHTS.personality * zp[i],
  }));
  // Personality fit is shown relative to this person's other options: most work styles help in most jobs,
  // so an absolute value mostly reflects the person's overall level rather than which jobs suit them best.
  const sortedP = pers.filter(v => v != null).sort((a, b) => a - b);
  for (const s of scored) {
    if (s.personalityFit == null) { s.personalityPct = null; continue; }
    let lo = 0, hi = sortedP.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sortedP[mid] < s.personalityFit) lo = mid + 1; else hi = mid; }
    s.personalityPct = (100 * lo) / Math.max(1, sortedP.length - 1);
  }
  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => { s.rank = i + 1; s.band = fitBand(i + 1, scored.length); });
  return scored;
}

// Matches are shown in bands rather than exact ranks: retaking the test with ordinary measurement error swaps about
// a third of the top 20, so the difference between #3 and #9 means nothing. Cut-offs are shares of all occupations.
export const BANDS = [["top", 0.03], ["strong", 0.10], ["good", 0.25], ["some", 0.5], ["weak", 1]];
export function fitBand(rank, n) {
  return BANDS.find(([, share]) => rank <= Math.max(1, Math.round(share * n)))[0];
}

// Job families = SOC major groups (first two digits of the O*NET code). A family's place is the mean score of its three
// best matches, so one lucky job doesn't carry a family and big families don't win just by being big.
export function jobFamilies(scored) {
  const fam = new Map();
  for (const s of scored) {
    const k = s.job.code.slice(0, 2);
    if (!fam.has(k)) fam.set(k, []);
    fam.get(k).push(s); // scored is already best-first
  }
  return [...fam].map(([code, jobs]) => {
    const top = jobs.slice(0, 3);
    return { code, jobs, score: top.reduce((t, s) => t + s.score, 0) / top.length };
  }).sort((a, b) => b.score - a.score);
}

export function interestLabel(r) {
  if (r >= 0.8) return "Excellent";
  if (r >= 0.6) return "Strong";
  if (r >= 0.35) return "Moderate";
  return "Weak";
}

// pct: where this job's personality fit ranks among all occupations for this person (0-100).
export function personalityLabel(pct) {
  if (pct == null) return "Not rated";
  if (pct >= 85) return "Excellent";
  if (pct >= 65) return "Strong";
  if (pct >= 35) return "Moderate";
  return "Weak";
}

// The job's most important work styles and where the person stands on each.
export function styleHighlights(styles, jobStyles, n = 4) {
  return Object.entries(jobStyles || {})
    .filter(([s]) => styles[s] != null)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([s, w]) => ({ style: s, weight: w, z: styles[s] }));
}
