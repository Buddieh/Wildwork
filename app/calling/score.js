// Scoring for the Calling test: one number per occupation for "how much of a typical day you'd spend on what you love,
// in conditions that energize you, for something you care about". Four parts, each standardized across occupations for
// this person before weighting, so the weights mean what they say whatever each part's raw spread:
//   love     the interest areas you love (cards, your top four, hobbies you'd want as work, everyday life), weighted by
//            how central each area is to the job, minus a penalty when an area you said "definitely not" to is central
//   hooks    what you enjoy about the things you love (making, figuring out, helping…), matched to the job's activities
//   energy   what gives or drains your energy, matched to the job's working conditions; drains count 1.5 times
//   meaning  what you want work to be for, in your order
// Reactions to the day-in-the-life snapshots then pull similar jobs up or push them down. Evidence from several days
// combines like independent chances (1 - (1 - a)(1 - b)…), so it adds up but can never exceed one full pull. A job
// whose own snapshot the person reacted to takes that reaction as it is, whatever they said about similar ones.

import { AREAS, AREA_INDEX, HOOKS, HOOK_INDEX, HOBBIES, AS_WORK, LIFE, SLIDERS, MEANING, MEANING_WEIGHTS } from "./content.js";
import { DAYS } from "./days.js";
import { fitBand } from "../match.js";

export const WEIGHTS = { love: 0.5, hooks: 0.15, energy: 0.2, meaning: 0.15 };
export const CUSTOM = 255;          // hobby index for "something else", described by up to three interest areas
const CARD_WEIGHT = [0, 3, 1, 0, 0, 0]; // unanswered, love, like, not really, definitely not, not sure
const NO_PENALTY = 3;                // a central "definitely not" area cancels at least a full "love", and as much as your strongest love
const TOP_BONUS = [1.5, 1, 0.6, 0.3];
const HOBBY_SCALE = 2;
const LIFE_SCALE = 0.8;
const KEPT_HOOKS = 0.7;              // a hobby you'd keep as a hobby still shows what hooks you, a little less
const LIFE_HOOKS = 0.5;
const DRAIN = 1.5;
export const REACTIONS = { 1: 1, 2: 0.1, 3: -1.2 }; // love it, could be OK, not for me: the pull at full similarity
const SAME_DAY = 0.8;                // snapshots this similar to one already shown are skipped
const GOOD = ["top", "strong", "good"]; // jobs listed in a direction are in the top quarter for this person
const LEADS = ["top", "strong"];        // and a direction's best job is in the top tenth
const CENTRAL = (3.7 - 1) / 6;          // an interest area rated 3.7 of 7 or more is central to a job
const FIRST_LOVES = 3;                  // each of the top three loves gets a direction, if it has one, before the rest

function standardize(values) {
  let n = 0, m = 0;
  for (const v of values) if (v != null) { n++; m += v; }
  if (!n) return values.map(() => 0);
  m /= n;
  let ss = 0;
  for (const v of values) if (v != null) ss += (v - m) ** 2;
  const sd = Math.sqrt(ss / n);
  return values.map(v => (v == null || !sd ? 0 : (v - m) / sd));
}

// Centered, unit-length copy of a vector, so the correlation of two jobs is a dot product.
function unit(xs) {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  const c = xs.map(x => x - m);
  const len = Math.hypot(...c) || 1;
  return Float64Array.from(c, x => x / len);
}
const dot = (a, b) => { let s = 0; for (let k = 0; k < a.length; k++) s += a[k] * b[k]; return s; };

// Everything about the jobs that doesn't depend on the person, computed once.
export function prepare(calling, jobsData) {
  const byCode = new Map(jobsData.jobs.map(j => [j.code, j]));
  const ctxNames = calling.meta.context.map(c => c[0]);
  const actIds = calling.meta.acts.map(a => a[0]);
  if (calling.meta.areas.length !== AREAS.length) throw new Error("calling.json has a different set of interest areas");
  const rows = calling.jobs.filter(c => c.areas && byCode.has(c.code));
  const raw = {
    act: id => { const k = actIds.indexOf(id); if (k < 0) throw new Error(`unknown work activity ${id}`); return rows.map(c => c.acts?.[k] ?? null); },
    ctx: name => { const k = ctxNames.indexOf(name); if (k < 0) throw new Error(`unknown work context ${name}`); return rows.map(c => c.context?.[k] ?? null); },
    style: name => rows.map(c => byCode.get(c.code).workStyles?.[name] ?? null),
    home: () => rows.map(c => c.home),
    ai: key => rows.map(c => byCode.get(c.code).ai?.[key] ?? null),
  };
  const cache = new Map();
  const z = (kind, name) => {
    const key = `${kind}:${name}`;
    if (!cache.has(key)) cache.set(key, standardize(raw[kind](name)));
    return cache.get(key);
  };
  const feature = list => rows.map((_, i) => list.reduce((s, [kind, name, w]) => s + w * z(kind, name)[i], 0));

  const jobs = rows.map((c, i) => {
    const s = Float64Array.from(c.areas, v => Math.max(0, Math.min(1, (v - 1) / 6)));
    return {
      i, code: c.code, job: byCode.get(c.code), s, tasks: c.tasks || [], home: c.home,
      shape: { s: unit([...s]), acts: c.acts ? unit(c.acts) : null },
      top: s.indexOf(Math.max(...s)),
    };
  });
  const meaningZ = MEANING.map(m => {
    const idx = m.areas.map(k => AREA_INDEX[k]);
    const f = m.f.length ? feature(m.f.map(([kind, name]) => [kind, name, 1 / m.f.length])) : null;
    return standardize(jobs.map((j, i) => (idx.length ? m.areaW * Math.max(...idx.map(a => j.s[a])) : 0) + (f ? m.featW * f[i] : 0)));
  });
  const row = new Map(jobs.map(j => [j.code, j.i]));
  const dayRow = DAYS.map(([code]) => row.get(code) ?? -1);
  const rowDay = new Map(dayRow.map((r, d) => [r, d]).filter(([r]) => r >= 0));
  return {
    jobs, row, dayRow, rowDay, meaningZ,
    // Each hook and slider is itself standardized, so one made of several ratings doesn't outweigh one made of a single one.
    hookF: HOOKS.map(h => standardize(feature(h.f))),
    sliderF: SLIDERS.map(s => standardize(feature(s.f))),
    meta: calling.meta,
  };
}

// How alike two jobs are: mostly their interest-area profile, partly their work activities.
export function similarity(model, a, b) {
  const x = model.jobs[a].shape, y = model.jobs[b].shape;
  const areas = dot(x.s, y.s);
  return x.acts && y.acts ? 0.7 * areas + 0.3 * dot(x.acts, y.acts) : areas;
}

// What the person's answers say, before any job comes into it.
export function profile(st) {
  const w = new Float64Array(AREAS.length);
  const hookW = new Float64Array(HOOKS.length);
  const cards = st.cards || {};
  const blocked = a => cards[a] === 4;
  for (let a = 0; a < AREAS.length; a++) w[a] = CARD_WEIGHT[cards[a] || 0];
  (st.top || []).forEach((a, r) => { if (a != null && !blocked(a)) w[a] += TOP_BONUS[r]; });
  for (const h of st.hobbies || []) {
    const areas = h.i === CUSTOM ? Object.fromEntries((h.areas || []).map(a => [AREAS[a].key, 1])) : HOBBIES[h.i]?.a || {};
    const work = AS_WORK[(h.work || 0) - 1];
    if (work) for (const [k, v] of Object.entries(areas)) { const a = AREA_INDEX[k]; if (!blocked(a)) w[a] += HOBBY_SCALE * work.areas * v; }
    for (const k of h.hooks || []) hookW[k] += h.work === 3 ? KEPT_HOOKS : 1;
  }
  LIFE.forEach((q, qi) => {
    for (const o of st.life?.[qi] || []) {
      const opt = q.options[o];
      if (!opt) continue;
      for (const [k, v] of Object.entries(opt.a)) { const a = AREA_INDEX[k]; if (!blocked(a)) w[a] += LIFE_SCALE * q.weight * v; }
      for (const [k, v] of Object.entries(opt.h)) hookW[HOOK_INDEX[k]] += LIFE_HOOKS * q.weight * v;
    }
  });
  const no = Object.keys(cards).filter(a => cards[a] === 4).map(Number);
  const slider = SLIDERS.map((s, k) => {
    const v = (st.sliders?.[k] || 3) - 3; // -2 .. 2
    return s.kind === "uni" && v < 0 ? DRAIN * v : v;
  });
  const meaning = new Float64Array(MEANING.length);
  (st.meaning || []).forEach((m, r) => { if (m != null) meaning[m] = MEANING_WEIGHTS[r] || 0; });
  // How the person rated each area's card. Hobbies and everyday answers add weight, but only the card says "love".
  const feel = AREAS.map((_, a) => (cards[a] === 1 ? "love" : cards[a] === 2 ? "like" : ""));
  return { w, hookW, no, noPenalty: Math.max(NO_PENALTY, ...w), slider, meaning, feel };
}

export function score(model, st) {
  const p = profile(st);
  const n = model.jobs.length, A = AREAS.length;
  const love = new Array(n), hooks = new Array(n), energy = new Array(n), meaning = new Array(n);
  for (let i = 0; i < n; i++) {
    const s = model.jobs[i].s;
    let L = 0;
    for (let a = 0; a < A; a++) L += p.w[a] * s[a];
    if (p.no.length) L -= p.noPenalty * Math.max(...p.no.map(a => s[a] ** 2));
    love[i] = L;
    let H = 0;
    for (let k = 0; k < p.hookW.length; k++) if (p.hookW[k]) H += p.hookW[k] * model.hookF[k][i];
    hooks[i] = H;
    let E = 0;
    for (let k = 0; k < p.slider.length; k++) if (p.slider[k]) E += p.slider[k] * model.sliderF[k][i];
    energy[i] = E;
    let M = 0;
    for (let k = 0; k < p.meaning.length; k++) if (p.meaning[k]) M += p.meaning[k] * model.meaningZ[k][i];
    meaning[i] = M;
  }
  const z = { love: standardize(love), hooks: standardize(hooks), energy: standardize(energy), meaning: standardize(meaning) };
  const up = new Float64Array(n).fill(1), down = new Float64Array(n).fill(1); // chance that no day speaks for / against
  const full = REACTIONS[1];
  for (const d of st.days || []) {
    const k = model.dayRow[d.i], pull = REACTIONS[d.r];
    if (k == null || k < 0 || !pull) continue;
    for (let i = 0; i < n; i++) {
      const sim = similarity(model, i, k);
      if (sim <= 0) continue;
      if (pull > 0) up[i] *= 1 - (pull / full) * sim ** 3; else down[i] *= 1 - sim ** 3;
    }
  }
  const tryOn = Float64Array.from(up, (u, i) => full * (1 - u) + REACTIONS[3] * (1 - down[i]));
  for (const d of st.days || []) { const k = model.dayRow[d.i]; if (k >= 0 && d.r in REACTIONS) tryOn[k] = REACTIONS[d.r]; }
  const ranked = model.jobs.map((j, i) => ({
    i, code: j.code, job: j.job,
    parts: { love: z.love[i], hooks: z.hooks[i], energy: z.energy[i], meaning: z.meaning[i] },
    tryOn: tryOn[i],
    score: WEIGHTS.love * z.love[i] + WEIGHTS.hooks * z.hooks[i] + WEIGHTS.energy * z.energy[i] + WEIGHTS.meaning * z.meaning[i] + tryOn[i],
  }));
  // Where each job stands on each part among all jobs for this person (0-100), for the small bars on job cards.
  for (const key of Object.keys(z)) {
    const sorted = [...z[key]].sort((a, b) => a - b);
    const flat = sorted[0] === sorted[sorted.length - 1];
    for (const r of ranked) r.parts[key + "Pct"] = flat ? null : (100 * lowerBound(sorted, r.parts[key])) / (sorted.length - 1);
  }
  ranked.sort((a, b) => b.score - a.score);
  ranked.forEach((r, k) => { r.rank = k + 1; r.band = fitBand(k + 1, ranked.length); });
  return { profile: p, ranked, byRow: Object.fromEntries(ranked.map(r => [r.i, r])) };
}

function lowerBound(sorted, x) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
}

// The interest areas central to a job: its top three, and any rated 3.7 of 7 or more.
function centralTo(s) {
  const third = [...s].sort((x, y) => y - x)[2];
  return a => s[a] >= third || s[a] >= CENTRAL;
}

// The interest areas that make a job attractive to this person, biggest first: how much each area you care about
// contributes, with a little credit for areas you didn't mention so that every job has a direction.
function areaPulls(p, s) {
  return AREAS.map((_, a) => [a, p.no.includes(a) ? 0 : (Math.max(p.w[a], 0) + 0.5) * s[a]]).sort((x, y) => y[1] - x[1]);
}

// Directions: groups of jobs that turn the same love, or the same pair of loves, into work. A job can only stand for an
// area that is central to it (one of its top three, or rated at least 3.7 of 7), and only for an area the person likes
// or loves. A direction's place is the mean score of its three best jobs, and no single love leads more than two.
// Each of the top three loves first gets its best direction, if it has one, so that likes boosted by other answers
// can't crowd out every love; the remaining places go by score, and the chosen directions are shown in score order.
export function directions(model, res, pass = () => true, max = 6) {
  const p = res.profile, groups = new Map();
  for (const r of res.ranked) {
    if (!pass(r) || !GOOD.includes(r.band)) continue;
    const s = model.jobs[r.i].s, central = centralTo(s);
    const pulls = areaPulls(p, s).filter(([a]) => central(a));
    if (pulls.length < 2 || p.w[pulls[0][0]] < 1) continue;
    const [[a, ca], [b, cb]] = pulls;
    const pair = p.w[b] >= 1 && cb >= 0.6 * ca;
    const key = pair ? [a, b].sort((x, y) => x - y).join("+") : String(a);
    if (!groups.has(key)) groups.set(key, { key, areas: pair ? [a, b].sort((x, y) => p.w[y] - p.w[x]) : [a], jobs: [] });
    groups.get(key).jobs.push(r);
  }
  const all = [...groups.values()].map(g => ({ ...g, score: g.jobs.slice(0, 3).reduce((s, r) => s + r.score, 0) / Math.min(3, g.jobs.length) }))
    .sort((x, y) => y.score - x.score);
  const out = [], lead = new Map();
  // A single love needs at least two jobs to count as a direction; a niche where two loves meet can be one job.
  const fits = g => LEADS.includes(g.jobs[0].band) && !(g.areas.length === 1 && g.jobs.length < 2)
    && (lead.get(g.areas[0]) || 0) < 2 && !out.includes(g);
  const take = g => { lead.set(g.areas[0], (lead.get(g.areas[0]) || 0) + 1); out.push(g); };
  const loves = AREAS.map((_, a) => a).filter(a => p.feel[a] === "love").sort((x, y) => p.w[y] - p.w[x]).slice(0, FIRST_LOVES);
  for (const a of loves) {
    if (out.length >= max || out.some(g => g.areas.includes(a))) continue;
    const g = all.find(g => g.areas.includes(a) && fits(g));
    if (g) take(g);
  }
  for (const g of all) {
    if (out.length >= max) break;
    if (fits(g)) take(g);
  }
  return out.sort((x, y) => y.score - x.score);
}

// Loves among the person's top five that no direction is named after, each with the best job in reach built on it
// (undefined if there is none), so a love missing from the directions doesn't go unexplained.
export function unplaced(model, res, dirs, st, pass = () => true) {
  const named = new Set(dirs.flatMap(g => g.areas));
  return summary(st).areas.filter(a => !named.has(a))
    .map(a => ({ area: a, r: res.ranked.find(r => pass(r) && centralTo(model.jobs[r.i].s)(a)) }));
}

// The next day-in-the-life snapshot to show: mostly the best-scoring job not yet tried (skipping near-copies of ones
// already shown), and every third one from an interest area not tried yet, so a blind spot can show up.
export function nextDay(model, st, pass = () => true) {
  const res = score(model, st);
  const shown = new Set((st.days || []).map(d => d.i));
  const shownRows = [...shown].map(d => model.dayRow[d]).filter(k => k >= 0);
  const triedAreas = new Set(shownRows.map(k => model.jobs[k].top));
  const explore = shown.size % 3 === 2;
  let fallback = null;
  for (const r of res.ranked) {
    const d = model.rowDay.get(r.i);
    if (d == null || shown.has(d) || !pass(r)) continue;
    fallback ??= d;
    if (shownRows.some(k => similarity(model, r.i, k) >= SAME_DAY)) continue;
    if (explore && triedAreas.has(model.jobs[r.i].top)) continue;
    return d;
  }
  return fallback;
}

// Short reasons for a job, from the parts that push it up (and the one that pulls it down most).
export function reasons(model, res, r, st) {
  const p = res.profile, j = model.jobs[r.i], out = { good: [], watch: [] };
  const loved = areaPulls(p, j.s).filter(([a]) => p.w[a] >= 1 && j.s[a] >= 0.3).slice(0, 2).map(([a]) => a);
  if (loved.length) out.good.push({ kind: "areas", areas: loved });
  const hobby = (st.hobbies || []).filter(h => h.work === 1 || h.work === 2).map(h => {
    const areas = h.i === CUSTOM ? Object.fromEntries((h.areas || []).map(a => [AREAS[a].key, 1])) : HOBBIES[h.i]?.a || {};
    return [h, Object.entries(areas).reduce((s, [k, v]) => s + v * j.s[AREA_INDEX[k]], 0)];
  }).filter(([, fit]) => fit >= 0.5).sort((x, y) => AS_WORK[y[0].work - 1].areas * y[1] - AS_WORK[x[0].work - 1].areas * x[1])[0];
  if (hobby) out.good.push({ kind: "hobby", hobby: hobby[0] });
  // Energy reasons only where the job clearly has a lot (or, for something that drains you, clearly little) of it.
  const energy = SLIDERS.map((s, k) => {
    const v = p.slider[k], f = model.sliderF[k][r.i];
    const clear = s.kind === "bi" ? Math.abs(f) >= 0.5 : f >= 0.5 || f <= -1;
    return { kind: "energy", slider: k, high: f > 0, v, c: v * f, clear };
  }).filter(e => e.v && e.clear).sort((x, y) => y.c - x.c);
  if (energy[0]?.c > 0) out.good.push(energy[0]);
  const worst = energy[energy.length - 1];
  if (worst?.c < 0) out.watch.push(worst);
  const no = p.no.filter(a => j.s[a] >= 0.5).sort((x, y) => j.s[y] - j.s[x])[0];
  if (no != null) out.watch.push({ kind: "no", area: no });
  const m = (st.meaning || []).slice(0, 3).find(c => c != null && model.meaningZ[c][r.i] >= 1);
  if (m != null) out.good.push({ kind: "meaning", card: m });
  const days = (st.days || []).map(d => [d, model.dayRow[d.i]]).filter(([, k]) => k >= 0)
    .map(([d, k]) => [d, k, similarity(model, r.i, k)]).sort((x, y) => y[2] - x[2]);
  // A snapshot tried for this very job speaks for itself; otherwise the closest one loved, and the closest turned down.
  const own = days.find(([, k]) => k === r.i), near = own ? [own] : days.filter(([, , sim]) => sim >= 0.6);
  const liked = near.find(([d]) => d.r === 1), disliked = near.find(([d]) => d.r === 3);
  if (liked) out.good.push({ kind: "day", day: liked[0].i, same: liked[1] === r.i });
  if (disliked) out.watch.push({ kind: "day", day: disliked[0].i, same: disliked[1] === r.i });
  return out;
}

// The person in a few lines: loves, hooks, energizers and drainers, and what work is for.
export function summary(st) {
  const p = profile(st);
  const loves = [...p.w].map((w, a) => [a, w]).filter(([a]) => p.feel[a] === "love").sort((x, y) => y[1] - x[1]).map(([a]) => a);
  const hooks = [...p.hookW].map((w, k) => [k, w]).filter(([, w]) => w > 0).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k]) => k);
  const v = k => (st.sliders?.[k] || 3) - 3;
  const energizers = SLIDERS.map((s, k) => k).filter(k => SLIDERS[k].kind === "uni" && v(k) === 2);
  const drainers = SLIDERS.map((s, k) => k).filter(k => SLIDERS[k].kind === "uni" && v(k) === -2);
  const leanings = SLIDERS.map((s, k) => k).filter(k => SLIDERS[k].kind === "bi" && v(k) !== 0);
  return { loves, areas: loves.slice(0, 5), hooks, energizers, drainers, leanings, meaning: (st.meaning || []).slice(0, 3), kept: (st.hobbies || []).filter(h => h.work === 3) };
}
