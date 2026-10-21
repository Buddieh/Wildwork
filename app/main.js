import { scorePersonality, scoreInterests } from "../questionnaire/scoring.js";
import { ANIMALS, DOMAINS, rankAnimals, typeCodes } from "./animals.js";
import { constellationSvg, starfield } from "./constellation.js";
import { matchJobs, workStyleProfile, interestLabel, personalityLabel, styleHighlights, WEIGHTS } from "./match.js";
import * as save from "./save.js";

const LANG = document.documentElement.lang === "fa" ? "fa" : "en";
const T = (await import(`./i18n/${LANG}.js`)).default;
const ROOT = new URL("../", import.meta.url);
const app = document.getElementById("app");
const STORE_KEY = "wildwork-v1";
const RIASEC_COLORS = { R: "#fb923c", I: "#38bdf8", A: "#f472b6", S: "#4ade80", E: "#fbbf24", C: "#a78bfa" };
const PAGE = 20;

let D;           // loaded data
let S = blank(); // the visitor's own state
let jobsPromise;
let keyHandler = null;

function blank() {
  return { person: {}, p: {}, i: {}, jobZone: null, pIndex: 0, iIndex: 0 };
}

// ---------- storage (best effort: private windows may block it) ----------
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) S = { ...blank(), ...JSON.parse(raw) }; } catch {}
}
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch {}
}

// ---------- data ----------
async function getJSON(path, optional = false) {
  const r = await fetch(new URL(path, ROOT));
  if (!r.ok) { if (optional) return null; throw new Error(`${path}: ${r.status}`); }
  return r.json();
}

async function loadData() {
  const [personality, norms, interests, wsMap, fa] = await Promise.all([
    getJSON("questionnaire/personality.json"),
    getJSON("questionnaire/norms-ipip-neo-120.json"),
    getJSON("questionnaire/interests.json"),
    getJSON("questionnaire/workstyles-map.json"),
    LANG === "fa" ? getJSON("questionnaire/fa.json") : null,
  ]);
  const ids = Object.keys(ANIMALS);
  const art = Object.fromEntries(await Promise.all(ids.map(async id => [id, await getJSON(`app/constellations/${id}.json`)])));
  personality.items.sort((a, b) => a.n - b.n);
  interests.items.sort((a, b) => a.n - b.n);
  return { personality, norms, interests, wsMap, art, fa };
}

let jobsMeta = {};
function loadJobs() {
  jobsPromise ||= (async () => {
    const [data, tr, today] = await Promise.all([getJSON("data/jobs.json"), LANG === "fa" ? getJSON("data/jobs-fa.json", true) : null,
      getJSON("questionnaire/items-today.json", true)]);
    data.today = today?.items || {};
    if (tr) for (const j of data.jobs) if (tr[j.code]) j.local = tr[j.code];
    jobsMeta = data.meta;
    return data;
  })();
  return jobsPromise;
}

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const html = (strings, ...vals) => strings.reduce((out, s, i) => out + s + (i < vals.length ? vals[i] ?? "" : ""), "");
const num = n => T.num(n);
const A = id => T.animals[id];

function render(markup) {
  app.innerHTML = markup;
  window.scrollTo(0, 0);
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
  document.body.append(t);
  setTimeout(() => t.remove(), 2400);
}

function go(hash) {
  if (location.hash === hash) route(); else location.hash = hash;
}

function personalityDone(st = S) { return D.personality.items.every(it => st.p[it.id]); }
function interestsDone(st = S) { return D.interests.items.every(it => st.i[it.id]) && st.jobZone; }

function art(id, opts = {}) {
  const a = D.art[id];
  const traitNames = Object.fromEntries(DOMAINS.map(d => [d, T.domains[d].name]));
  return constellationSvg(id, a, a.color, { title: A(id).name, traitNames, ...opts });
}

function itemText(it, kind) {
  if (LANG === "fa") return esc(D.fa[kind].items[it.id] || it.text);
  if (kind === "personality") return `<span class="muted">I</span> ${esc(it.text.charAt(0).toLowerCase() + it.text.slice(1))}`;
  return esc(it.text);
}
const scaleLabels = kind => (LANG === "fa" ? D.fa[kind].scale : (kind === "personality" ? D.personality : D.interests).scale.map(o => o.label));
const instructions = kind => (LANG === "fa" ? D.fa[kind].instructions : (kind === "personality" ? D.personality : D.interests).instructions);
const riasecName = id => T.riasec?.[id]?.name || D.interests.types.find(t => t.id === id).name;
const riasecSummary = id => T.riasec?.[id]?.summary || D.interests.types.find(t => t.id === id).summary;
const styleName = s => T.styles?.[s] || s;
const jobTitle = j => j.local?.title || j.title;

// ---------- results computation ----------
function computePersonality(st) {
  const res = scorePersonality(D.personality, D.norms, st.p, st.person);
  const z = Object.fromEntries(DOMAINS.map(d => [d, (res.domains[d].t - 50) / 10]));
  const pct = Object.fromEntries(DOMAINS.map(d => [d, res.domains[d].percentile]));
  return { res, z, pct, animals: rankAnimals(z) };
}

// ---------- share links ----------
// #/r/1.<age>.<sex m|f|x>.<jobZone>.<116 personality digits>.<60 interest digits>  (0 = unanswered)
function encodeShare(st) {
  const p = D.personality.items.map(it => st.p[it.id] || 0).join("");
  const i = D.interests.items.map(it => st.i[it.id] || 0).join("");
  const sex = st.person.sex === "male" ? "m" : st.person.sex === "female" ? "f" : "x";
  return `#/r/1.${st.person.age || ""}.${sex}.${st.jobZone || 0}.${p}.${interestsDone(st) ? i : ""}`;
}

function decodeShare(code) {
  const [v, age, sex, jz, p, i = ""] = code.split(".");
  if (v !== "1" || !/^[0-5]+$/.test(p) || p.length !== D.personality.items.length) return null;
  const st = blank();
  st.person = { age: age ? +age : undefined, sex: sex === "m" ? "male" : sex === "f" ? "female" : undefined };
  D.personality.items.forEach((it, k) => { if (+p[k]) st.p[it.id] = +p[k]; });
  if (i.length === D.interests.items.length && /^[0-5]+$/.test(i)) D.interests.items.forEach((it, k) => { if (+i[k]) st.i[it.id] = +i[k]; });
  st.jobZone = +jz || null;
  return st;
}

// Compact all-digit form of the state for the star code: age (3 base-6 digits), sex, job zone, answers.
function encodeDigits(st) {
  const age = Math.max(0, Math.min(215, st.person.age || 0)).toString(6).padStart(3, "0");
  const sex = st.person.sex === "male" ? 1 : st.person.sex === "female" ? 2 : 0;
  return age + sex + (st.jobZone || 0) + D.personality.items.map(it => st.p[it.id] || 0).join("") + D.interests.items.map(it => st.i[it.id] || 0).join("");
}

function decodeDigits(d) {
  const nP = D.personality.items.length, nI = D.interests.items.length;
  if (d.length !== 5 + nP + nI || !/^[0-5]+$/.test(d)) return null;
  const st = blank();
  const age = parseInt(d.slice(0, 3), 6);
  st.person = { age: age || undefined, sex: d[3] === "1" ? "male" : d[3] === "2" ? "female" : undefined };
  st.jobZone = +d[4] || null;
  D.personality.items.forEach((it, k) => { if (+d[5 + k]) st.p[it.id] = +d[5 + k]; });
  D.interests.items.forEach((it, k) => { if (+d[5 + nP + k]) st.i[it.id] = +d[5 + nP + k]; });
  return st;
}

function starCard(st) {
  const answered = Object.keys(st.p).length + Object.keys(st.i).length;
  const total = D.personality.items.length + D.interests.items.length;
  if (!personalityDone(st)) {
    return { svg: null, color: "#fbbf24", eyebrow: T.save.cardEyebrow, title: T.save.progressTitle, subtitle: T.save.progress(num(answered), num(total)), seed: String(answered) };
  }
  const { pct, animals } = computePersonality(st);
  const id = animals[0].id, a = D.art[id];
  return {
    svg: constellationSvg(id, a, a.color, { percentiles: pct, size: 800, disc: false }),
    color: a.color, eyebrow: T.save.cardEyebrow, title: T.animal.the(A(id).name),
    subtitle: interestsDone(st) ? A(id).tagline : T.save.progress(num(answered), num(total)), seed: id + answered,
  };
}

async function share() {
  const url = location.href.split("#")[0] + encodeShare(S);
  const text = T.shareText(A(computePersonality(S).animals[0].id).name);
  try {
    if (navigator.share) { await navigator.share({ title: "Wildwork", text, url }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(url); toast(T.copied); }
  catch { prompt(T.copyPrompt, url); }
}

// ---------- the sky of all animals ----------
// Hand-placed so the figures feel scattered rather than gridded; x/y in % of the field, r = tilt in degrees.
const SKY = [
  ["owl", 9, 12, -6], ["fox", 33, 8, 4], ["dolphin", 58, 12, -8], ["wolf", 84, 9, 5],
  ["cat", 20, 36, 3], ["lion", 46, 34, -3], ["deer", 72, 37, 6], ["hummingbird", 90, 33, -10],
  ["octopus", 7, 60, 5], ["elephant", 33, 62, -4], ["panda", 58, 59, 3], ["meerkat", 84, 62, -5],
  ["hedgehog", 18, 86, -3], ["otter", 44, 88, 4], ["beaver", 69, 86, -4], ["raccoon", 92, 88, 6],
];

function skyField() {
  const bg = `<svg class="skyfield-bg" aria-hidden="true" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">${starfield(20251019, 1200, 900, { count: 520, band: true, scale: 1.5, twinkle: true })}</svg>`;
  return `<div class="skyfield" role="list">${bg}${SKY.map(([id, x, y, rot]) => html`
    <a class="sky-animal" role="listitem" href="#/animals/${id}" style="--x:${x}%;--y:${y}%;--rot:${rot}deg">
      ${art(id, { disc: false, size: 120 })}<span>${esc(A(id).name)}</span>
    </a>`).join("")}</div>`;
}

// ---------- screens ----------
function home() {
  const started = Object.keys(S.p).length > 0;
  const pDone = personalityDone();
  const iDone = interestsDone();
  let cta;
  if (iDone) cta = `<a class="btn primary" href="#/results">${T.home.results}</a><a class="btn ghost" href="#/animal">${T.home.myAnimal}</a>`;
  else if (pDone) cta = `<a class="btn primary" href="#/career">${T.home.continueI}</a><a class="btn ghost" href="#/animal">${T.home.myAnimal}</a>`;
  else if (started) cta = `<a class="btn primary" href="#/personality">${T.home.continueP(num(Object.keys(S.p).length), num(D.personality.items.length))}</a>`;
  else cta = `<a class="btn primary" href="#/start">${T.home.start}</a>`;
  if (started) cta += `<button class="btn ghost" data-act="reset">${T.home.reset}</button>`;

  render(html`
  <section class="hero">
    <p class="eyebrow">${T.home.eyebrow}</p>
    <h1>${T.home.title}</h1>
    <p class="lede">${T.home.lede}</p>
    <div class="row">${cta}</div>
    <p class="privacy small">${T.privacyHome}</p>
    ${started ? save.panel(T, S) : ""}
  </section>
  <section class="section">
    <h2>${T.home.skyTitle}</h2>
    <p class="muted">${T.home.skyLede}</p>
    ${skyField()}
  </section>
  <section class="steps">
    <div class="card"><p class="num">${T.home.part1}</p><h3>${T.home.part1Title}</h3><p class="muted">${T.home.part1Text}</p></div>
    <div class="card"><p class="num">${T.home.part2}</p><h3>${T.home.part2Title}</h3><p class="muted">${T.home.part2Text}</p></div>
  </section>
  ${started ? "" : save.panel(T, S)}
  ${LANG === "fa" ? `<p class="notice small">${T.faNotice}</p>` : ""}
  <p class="muted small">${T.home.saveNote} <a href="#/method">${T.nav.method}</a></p>
  `);
  save.bind(app, T, S, restore);
}

function restore(st) {
  S = { ...blank(), ...st };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch {}
  go(interestsDone() ? "#/results" : personalityDone() ? "#/animal" : "#/personality");
}

function start() {
  const { age, sex } = S.person;
  render(html`
  <section class="quiz stack">
    <h2>${T.start.title}</h2>
    <p class="muted">${T.start.why}</p>
    <div class="field"><label for="age">${T.start.age}</label><input id="age" type="number" inputmode="numeric" min="10" max="99" value="${age ?? ""}" placeholder="${T.start.optional}"></div>
    <fieldset class="field"><legend>${T.start.sex}</legend><div class="chips" id="sex">
      ${[["female", T.start.female], ["male", T.start.male], ["", T.start.skip]].map(([v, l]) => `<button class="chip" data-v="${v}" aria-pressed="${(sex || "") === v}">${l}</button>`).join("")}
    </div></fieldset>
    <div class="card">
      <h3>${T.start.howTitle}</h3>
      <p class="muted">${esc(instructions("personality"))}</p>
      <p class="muted small">${T.start.honest}</p>
    </div>
    <div class="row"><button class="btn primary" data-act="begin">${T.start.go}</button></div>
  </section>`);
  app.querySelectorAll("#sex .chip").forEach(b => b.onclick = () => {
    app.querySelectorAll("#sex .chip").forEach(x => x.setAttribute("aria-pressed", x === b));
  });
}

function optionButtons(kind, current) {
  return scaleLabels(kind).map((label, k) => `<button class="opt" data-v="${k + 1}" aria-pressed="${current === k + 1}"><span class="key">${num(k + 1)}</span>${esc(label)}</button>`).join("");
}

function quiz(kind) {
  const isP = kind === "personality";
  const items = isP ? D.personality.items : D.interests.items;
  const answers = isP ? S.p : S.i;
  const idxKey = isP ? "pIndex" : "iIndex";
  let idx = Math.min(S[idxKey] || 0, items.length - 1);
  // Resume at the first unanswered item.
  const firstOpen = items.findIndex(it => !answers[it.id]);
  if (firstOpen === -1) { finishQuiz(kind); return; }
  if (answers[items[idx].id]) idx = firstOpen;
  let locked = false;

  const draw = () => {
    const it = items[idx];
    const done = items.filter(x => answers[x.id]).length;
    app.innerHTML = html`
    <section class="quiz">
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${done}"><div style="width:${(100 * done) / items.length}%"></div></div>
      <p class="count"><span>${isP ? T.quiz.part1 : T.quiz.part2}</span><span>${T.quiz.of(num(idx + 1), num(items.length))}</span></p>
      <p class="prompt">${isP ? T.quiz.promptP : T.quiz.promptI}</p>
      <h2 class="item" id="item" aria-live="polite">${itemText(it, kind)}</h2>
      <div class="options" role="group" aria-labelledby="item">${optionButtons(kind, answers[it.id])}</div>
      <div class="quiz-nav">
        <button class="btn ghost" data-nav="back" ${idx === 0 ? "disabled" : ""}>${T.quiz.back}</button>
        <button class="btn ghost" data-nav="next" ${answers[it.id] ? "" : "disabled"}>${T.quiz.next}</button>
      </div>
      <p class="hint">${T.quiz.hint}</p>
    </section>`;
    app.querySelectorAll(".opt").forEach(b => b.onclick = () => choose(+b.dataset.v));
    app.querySelector('[data-nav="back"]').onclick = back;
    app.querySelector('[data-nav="next"]').onclick = next;
  };

  const choose = v => {
    if (locked) return;
    answers[items[idx].id] = v;
    S[idxKey] = idx;
    persist();
    app.querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", +b.dataset.v === v));
    locked = true;
    setTimeout(() => { locked = false; next(); }, 160);
  };
  const next = () => {
    if (!answers[items[idx].id]) return;
    if (idx + 1 < items.length) idx++;
    else {
      const gap = items.findIndex(x => !answers[x.id]);
      if (gap === -1) { finishQuiz(kind); return; }
      idx = gap;
    }
    S[idxKey] = idx; persist(); draw();
  };
  const back = () => { if (idx > 0) { idx--; S[idxKey] = idx; persist(); draw(); } };
  const prevKey = T.dir === "rtl" ? "ArrowRight" : "ArrowLeft", nextKey = T.dir === "rtl" ? "ArrowLeft" : "ArrowRight";

  keyHandler = e => {
    if (e.target.closest("input, textarea, select")) return;
    const k = e.key.replace(/[۱-۵]/, d => String("۰۱۲۳۴۵".indexOf(d)));
    if (k >= "1" && k <= "5") choose(+k);
    else if (e.key === prevKey) back();
    else if (e.key === nextKey || e.key === "Enter") next();
  };
  draw();
  window.scrollTo(0, 0);
  if (!isP) loadJobs();
}

document.addEventListener("keydown", e => keyHandler && keyHandler(e));

function finishQuiz(kind) {
  if (kind === "personality") {
    if (!personalityDone()) { go("#/personality"); return; }
    const { res } = computePersonality(S);
    if (res.quality.flagged && !S.qualityAck) { qualityCheck(res.quality); return; }
    go("#/animal");
  } else {
    if (!S.jobZone) { go("#/zone"); return; }
    go("#/results");
  }
}

function qualityCheck(q) {
  render(html`
  <section class="quiz stack">
    <h2>${T.quality.title}</h2>
    <p>${T.quality.body(q.longestSameAnswerRun > 10 ? num(q.longestSameAnswerRun) : 0)}</p>
    <p class="muted">${T.quality.options}</p>
    <div class="row">
      <a class="btn primary" href="#/personality-review">${T.quality.review}</a>
      <button class="btn" data-act="retake-p">${T.quality.retake}</button>
      <button class="btn ghost" data-act="ack-quality">${T.quality.anyway}</button>
    </div>
  </section>`);
}

function careerIntro() {
  if (!personalityDone()) { go("#/personality"); return; }
  if (Object.keys(S.i).length) { quiz("interests"); return; }
  render(html`
  <section class="quiz stack">
    <p class="eyebrow">${T.career.eyebrow}</p>
    <h2>${T.career.title}</h2>
    <p class="muted">${esc(instructions("interests"))}</p>
    <p class="muted small">${T.career.dated}</p>
    <div class="row"><button class="btn primary" data-act="begin-i">${T.career.go}</button></div>
  </section>`);
  loadJobs();
}

function zone() {
  const f = D.interests.filters.job_zone;
  const q = T.zoneQuestion || { question: f.question, options: f.options.map(o => o.label) };
  render(html`
  <section class="quiz stack">
    <p class="eyebrow">${T.career.zoneEyebrow}</p>
    <h2>${esc(q.question)}</h2>
    <p class="muted small">${T.career.zoneNote}</p>
    <div class="options">
      ${q.options.map((label, k) => `<button class="opt" data-z="${k + 1}" aria-pressed="${S.jobZone === k + 1}"><span class="key">${num(k + 1)}</span>${esc(label)}</button>`).join("")}
    </div>
  </section>`);
  app.querySelectorAll("[data-z]").forEach(b => b.onclick = () => { S.jobZone = +b.dataset.z; persist(); go("#/results"); });
}

function meter(r, color) {
  const [lo, hi] = r.band95;
  const side = T.dir === "rtl" ? "right" : "left";
  return `<div class="meter" aria-label="${T.pct(r.percentile)} ${T.percentile}"><span class="mid"></span><span class="band" style="${side}:${lo}%;width:${hi - lo}%;background:${color}"></span><span class="dot" style="${side}:${r.percentile}%;background:${color}"></span></div>`;
}

function traitBlock(res, d, color) {
  const dom = res.domains[d], info = T.domains[d];
  const facets = D.personality.facets.filter(f => f.domain === d);
  return html`
  <div class="trait" id="trait-${d}">
    <div class="trait-head"><h3>${info.name} <span class="plain">· ${info.plain}</span></h3>
      <span class="pct">${T.pct(dom.percentile)}<small>${T.percentile}</small></span></div>
    ${meter(dom, color)}
    <div class="poles"><span>${info.low}</span><span>${info.high}</span></div>
    <details class="facets"><summary>${T.animal.facets(num(facets.length))}</summary>
      ${facets.map(f => { const r = res.facets[f.id]; return r ? `
        <div class="facet"><span><span class="fn">${esc(T.facets[f.id].name)}</span><span class="fd">${esc(T.facets[f.id].desc)}</span></span>${meter(r, color)}<span class="fp">${num(Math.round(r.percentile))}</span></div>` : ""; }).join("")}
      <p class="muted small" style="margin-top:8px">${T.animal.band}</p>
    </details>
  </div>`;
}

function typesBlock(z) {
  const { mbti, identity, sloan } = typeCodes(z);
  const letter = l => `<span class="${l.borderline ? "faint" : ""}">${l.letter}</span>`;
  return html`
  <section class="section">
    <h2>${T.animal.typesTitle}</h2>
    <div class="types">
      <div class="card">
        <p class="eyebrow">${T.animal.mbtiLabel}</p>
        <p class="code" dir="ltr">${mbti.map(letter).join("")}-${letter(identity)}</p>
        <p class="muted small">${T.animal.mbtiNote}</p>
      </div>
      <div class="card">
        <p class="eyebrow">${T.animal.sloanLabel}</p>
        <p class="code" dir="ltr">${sloan.map(s => s.letter).join("")}</p>
        <p class="small">${sloan.map(s => esc(T.animal.sloanWords[s.letter.toUpperCase() === "C" && s.domain === "N" ? "C" : s.letter.toUpperCase()] ?? "")).join(T.results.list)}</p>
        <p class="muted small">${T.animal.sloanNote}</p>
      </div>
    </div>
  </section>`;
}

function animalScreen(st, shared) {
  if (!personalityDone(st)) { go("#/personality"); return; }
  const { res, z, pct, animals } = computePersonality(st);
  const top = animals[0], a = A(top.id), color = D.art[top.id].color;
  const blend = animals.filter(x => x.share >= 0.05).slice(0, 4);
  const proto = ANIMALS[top.id].proto;
  const why = Object.entries(proto).sort((x, y) => Math.abs(z[y[0]]) - Math.abs(z[x[0]]))
    .map(([d, s]) => T.animal.whyPart(T.domains[d].name, s > 0, T.pct(pct[d])));
  const sharedBanner = shared ? `<div class="banner"><span>${T.animal.sharedBanner}</span><a class="btn primary" href="#/">${T.animal.ownCta}</a></div>` : "";
  const group = T.animal.group(res.normGroup.sex, res.normGroup.age);

  render(html`
  ${sharedBanner}
  <section class="reveal">
    <div class="art">
      ${art(top.id, { size: 340, animate: true, percentiles: pct, interactive: true })}
      <p class="star-info small" id="star-info" aria-live="polite">${T.animal.starHint}</p>
    </div>
    <div>
      <p class="eyebrow">${shared ? T.animal.theirs : T.animal.yours}</p>
      <h1>${T.animal.the(a.name)}</h1>
      <p class="tagline">${a.tagline}</p>
      <div class="blend" aria-hidden="true">${blend.map(b => `<span style="width:${b.share * 100}%;background:${D.art[b.id].color}"></span>`).join("")}</div>
      <div class="blend-legend">${blend.map(b => `<span><i style="background:${D.art[b.id].color}"></i>${T.animal.share(num(Math.round(b.share * 100)), A(b.id).name)}</span>`).join("")}</div>
      <p style="margin-top:16px">${a.about}</p>
      <p class="muted small">${why.length ? T.animal.why(a.name, why) : T.animal.whyRaccoon}</p>
      ${res.quality.flagged ? `<p class="notice small">${T.quality.flagged} ${shared ? "" : `<a href="#/personality-review">${T.quality.review}</a>`}</p>` : ""}
    </div>
  </section>

  <section class="section lists">
    <div class="card"><h3>${T.animal.strengths}</h3><ul>${a.strengths.map(s => `<li>${s}</li>`).join("")}</ul></div>
    <div class="card"><h3>${T.animal.watch}</h3><ul>${a.watch.map(s => `<li>${s}</li>`).join("")}</ul></div>
  </section>

  <section class="section">
    <h2>${T.animal.traitsTitle(shared)}</h2>
    <p class="muted">${T.animal.traitsLede(group)}</p>
    <div class="card">${DOMAINS.map(d => traitBlock(res, d, color)).join("")}</div>
  </section>

  ${typesBlock(z)}

  <section class="section row">
    ${shared
      ? (interestsDone(st) ? `<a class="btn primary" href="${location.hash.replace("#/r/", "#/rj/")}">${T.animal.theirJobs}</a>` : "")
      : `${interestsDone() ? `<a class="btn primary" href="#/results">${T.animal.jobs}</a>` : `<a class="btn primary" href="#/career">${T.animal.next}</a>`}
         <button class="btn" data-act="share">${T.animal.shareBtn}</button>`}
    <a class="btn ghost" href="#/animals">${T.animal.meetAll}</a>
  </section>
  ${shared ? "" : save.panel(T, S)}`);

  // Bright trait stars: tapping one explains it and highlights its row below.
  const info = app.querySelector("#star-info");
  const showTrait = d => {
    app.querySelectorAll(".cl-trait").forEach(g => g.classList.toggle("active", g.dataset.trait === d));
    info.innerHTML = `${T.animal.starInfo(T.domains[d].name, T.domains[d].plain, T.pct(pct[d]))} <a href="#trait-${d}" data-jump="${d}">↓</a>`;
    app.querySelectorAll(".trait").forEach(el => el.classList.toggle("lit", el.id === `trait-${d}`));
  };
  app.querySelectorAll(".cl-trait").forEach(g => {
    g.addEventListener("click", () => showTrait(g.dataset.trait));
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showTrait(g.dataset.trait); } });
  });
  info.addEventListener("click", e => {
    const d = e.target.closest("[data-jump]")?.dataset.jump;
    if (d) { e.preventDefault(); document.getElementById(`trait-${d}`).scrollIntoView({ behavior: "smooth", block: "center" }); }
  });
  if (!shared) save.bind(app, T, S, restore);
}

function zoneFilterChips(active) {
  return [1, 2, 3, 4, 5].map(z => `<button class="chip" data-zone="${z}" aria-pressed="${active.has(z)}" title="${T.zones.long[z]}">${T.zones.short[z]}</button>`).join("");
}

async function resultsScreen(st, shared) {
  if (!personalityDone(st)) { go("#/personality"); return; }
  if (!interestsDone(st)) { go(shared ? "#/" : "#/career"); return; }
  render(`<p class="loading">${T.results.loading}</p>`);
  const jobsData = await loadJobs();
  const { res } = computePersonality(st);
  const interests = scoreInterests(D.interests, st.i);
  const styles = workStyleProfile(res, D.personality, D.wsMap);
  const matches = matchJobs(jobsData.jobs, interests.raw, styles);
  const order = Object.entries(interests.raw).sort((a, b) => b[1] - a[1]);
  const zones = new Set([1, 2, 3, 4, 5].filter(z => z <= (st.jobZone || 5)));
  let growingOnly = false, trendingOnly = false, query = "", shown = PAGE;

  const code = order.slice(0, 3).map(([k], i) => `${k}${interests.tiedWithNext[i] && i < 2 ? "<span class='muted'>=</span>" : ""}`).join("");

  render(html`
  ${shared ? `<div class="banner"><span>${T.animal.sharedBanner}</span><a class="btn primary" href="#/">${T.animal.ownCta}</a></div>` : ""}
  <section>
    <p class="eyebrow">${T.results.eyebrow(shared)}</p>
    <h1>${T.results.code} <span class="code" dir="ltr">${code}</span></h1>
    <p class="muted">${T.results.scale} ${order.slice(0, 3).map(([k]) => `<b>${riasecName(k)}</b>: ${esc((riasecSummary(k).split(":")[1] || riasecSummary(k)).trim())}`).join(". ")}.</p>
    ${interests.flat ? `<p class="notice small">${T.results.flat}</p>` : ""}
    ${interests.tiedWithNext.slice(0, 2).some(Boolean) && !interests.flat ? `<p class="muted small">${T.results.tie}</p>` : ""}
    <div class="card riasec">
      ${order.map(([k, v]) => `<div class="ri"><span class="n">${riasecName(k)}<small>${esc(riasecSummary(k).split(":")[0])}</small></span><div class="bar"><div style="width:${((v - 10) / 40) * 100}%;background:${RIASEC_COLORS[k]}"></div></div><span class="v">${num(Math.round(v))}</span></div>`).join("")}
    </div>
  </section>

  ${todaySection(st, jobsData, matches, shared)}

  <section class="section">
    <h2>${T.results.jobsTitle(shared)}</h2>
    <p class="muted">${T.results.jobsLede(num(WEIGHTS.interests * 100), num(WEIGHTS.personality * 100))}</p>
    <div class="filters">
      <div><p class="small muted" style="margin-bottom:6px">${T.results.prep}</p><div class="chips" id="zones">${zoneFilterChips(zones)}</div></div>
      <div class="row"><input type="search" id="q" placeholder="${T.results.search}" aria-label="${T.results.search}"><button class="chip" id="grow" aria-pressed="false">${T.results.growing}</button><button class="chip" id="trend" aria-pressed="false">${T.results.trending}</button></div>
    </div>
    <div class="jobs" id="jobs"></div>
    <div class="more" id="more"></div>
  </section>

  <section class="section row">
    <a class="btn" href="${shared ? location.hash.replace("#/rj/", "#/r/") : "#/animal"}">${T.results.myAnimal(shared)}</a>
    ${shared ? "" : `<button class="btn" data-act="share">${T.results.share}</button><button class="btn ghost" data-act="retake-i">${T.results.redo}</button>`}
  </section>
  ${shared ? "" : save.panel(T, S)}`);

  const list = app.querySelector("#jobs"), more = app.querySelector("#more");
  const drawJobs = () => {
    const q = query.trim().toLowerCase();
    const hit = m => [m.job.title, m.job.local?.title, ...m.job.modernTitles, ...(m.job.trendingTitles || []), ...(m.job.local?.modernTitles || [])].some(t => t && t.toLowerCase().includes(q));
    const filtered = matches.filter(m => zones.has(m.job.jobZone) && (!growingOnly || m.job.outlook?.bright) && (!trendingOnly || m.job.trendingTitles?.length) && (!q || hit(m)));
    list.innerHTML = filtered.slice(0, shown).map(m => jobCard(m, interests, styles)).join("") || `<p class="muted">${T.results.none}</p>`;
    more.innerHTML = filtered.length > shown ? `<button class="btn" id="more-btn">${T.results.more(num(filtered.length - shown))}</button>` : "";
    const mb = more.querySelector("#more-btn");
    if (mb) mb.onclick = () => { shown += PAGE; drawJobs(); };
  };
  app.querySelectorAll("#zones .chip").forEach(b => b.onclick = () => {
    const z = +b.dataset.zone;
    zones.has(z) ? zones.delete(z) : zones.add(z);
    b.setAttribute("aria-pressed", zones.has(z));
    shown = PAGE; drawJobs();
  });
  const grow = app.querySelector("#grow");
  grow.onclick = () => { growingOnly = !growingOnly; grow.setAttribute("aria-pressed", growingOnly); shown = PAGE; drawJobs(); };
  const trend = app.querySelector("#trend");
  trend.onclick = () => { trendingOnly = !trendingOnly; trend.setAttribute("aria-pressed", trendingOnly); shown = PAGE; drawJobs(); };
  const search = app.querySelector("#q");
  search.oninput = e => { query = e.target.value; shown = PAGE; drawJobs(); };
  // "These activities today": a job chip searches the list for that job, widening the preparation filter if needed.
  app.querySelectorAll("[data-find]").forEach(b => b.onclick = () => {
    const m = matches.find(x => x.job.code === b.dataset.find);
    if (!m) return;
    if (!zones.has(m.job.jobZone)) {
      zones.add(m.job.jobZone);
      app.querySelector(`#zones [data-zone="${m.job.jobZone}"]`)?.setAttribute("aria-pressed", "true");
    }
    growingOnly = trendingOnly = false;
    grow.setAttribute("aria-pressed", false); trend.setAttribute("aria-pressed", false);
    query = search.value = m.job.title; shown = PAGE; drawJobs();
    list.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  drawJobs();
  if (!shared) save.bind(app, T, S, restore);
}

function jobCard(m, interests, styles) {
  const j = m.job, L = j.local || {};
  const iPct = Math.max(0, Math.min(100, (m.interestR + 1) * 50));
  const pPct = m.personalityPct ?? 0;
  const jobTop = Object.entries(j.riasec).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const youTop = Object.entries(interests.raw).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const common = jobTop.filter(k => youTop.includes(k));
  const hl = styleHighlights(styles, j.workStyles);
  const level = z => T.results.levels[z >= 0.35 ? "high" : z <= -0.35 ? "low" : "average"];
  const titles = L.modernTitles || j.modernTitles;
  const trending = j.trendingTitles || [];
  const aka = titles.filter(t => t.toLowerCase() !== jobTitle(j).toLowerCase() && !trending.some(x => x.toLowerCase() === t.toLowerCase())).slice(0, 4);
  return html`
  <article class="job">
    <div class="job-top">
      <span class="rank">${num(m.rank)}</span>
      <div>
        <h3>${esc(jobTitle(j))}</h3>
        ${L.title ? `<p class="aka" dir="ltr">${esc(j.title)}</p>` : ""}
        ${trending.length ? `<p class="aka trend-titles"><span class="badge trend" title="${T.results.trendTitle}">${T.results.trendBadge}</span> <span dir="ltr">${trending.map(esc).join(", ")}</span></p>` : ""}
        ${aka.length ? `<p class="aka">${T.results.aka} ${aka.map(esc).join(T.results.list)}</p>` : ""}
        <div class="badges">
          ${j.outlook?.bright ? `<span class="badge grow" title="${T.results.growTitle}">${T.results.growBadge}</span>` : ""}
          ${j.outlook?.declining ? `<span class="badge shrink" title="${T.results.shrinkTitle}">${T.results.shrinkBadge}</span>` : ""}
          <span class="badge">${T.zones.long[j.jobZone]}</span>
        </div>
        ${outlookLine(j.outlook?.projection)}
        ${aiLine(j.ai)}
        <div class="fits">
          <div class="fit"><div class="lbl"><span>${T.results.interests}</span><b>${T.results.fit[interestLabel(m.interestR)]}</b></div><div class="bar"><div style="width:${iPct}%"></div></div></div>
          <div class="fit" title="${T.results.relTitle}"><div class="lbl"><span>${T.results.personality}</span><b>${T.results.fit[personalityLabel(m.personalityPct)]}</b></div><div class="bar"><div style="width:${pPct}%;background:#818cf8"></div></div></div>
        </div>
        <details><summary>${T.results.why}</summary>
          <div class="why">
            <p class="muted">${esc(L.description || j.description)}</p>
            <p><b>${T.results.interestsBold}</b> ${T.results.jobMostly(jobTop.map(riasecName).join(T.results.list), common.length ? common.map(riasecName).join(T.results.and) : "")}</p>
            ${hl.length ? `<p><b>${T.results.stylesHead}</b></p><ul>${hl.map(h => `<li>${T.results.styleLevel(esc(styleName(h.style)), level(h.z))}</li>`).join("")}</ul>` : `<p class="muted">${T.results.noStyles}</p>`}
            <a href="https://www.onetonline.org/link/summary/${j.code}" target="_blank" rel="noopener">${T.results.onet}</a>
          </div>
        </details>
      </div>
    </div>
  </article>`;
}

// The career-quiz activities this person liked most, each linked to occupations that do that work today. Shown only
// after the test so the validated item wording is never changed or primed.
function todaySection(st, jobsData, matches, shared) {
  const byCode = Object.fromEntries(matches.map(m => [m.job.code, m]));
  const liked = D.interests.items.filter(it => st.i[it.id] >= 4 && jobsData.today[it.id])
    .sort((a, b) => st.i[b.id] - st.i[a.id] || a.n - b.n).slice(0, 6);
  if (!liked.length) return "";
  const chip = m => {
    const j = m.job, modern = LANG === "fa" ? "" : j.trendingTitles?.[0] || "";
    return `<button class="chip today-job" data-find="${j.code}" title="${esc(T.results.todayFind)}">${esc(modern || jobTitle(j))}${modern ? ` <small>${esc(jobTitle(j))}</small>` : ""} <span class="muted">#${num(m.rank)}</span></button>`;
  };
  return html`
  <section class="section">
    <h2>${T.results.todayTitle}</h2>
    <p class="muted">${T.results.todayLede(shared)}</p>
    <ul class="today">
      ${liked.map(it => `<li><p class="act">${itemText(it, "interests")}</p><div class="chips">${jobsData.today[it.id].map(c => byCode[c]).filter(Boolean).map(chip).join("")}</div></li>`).join("")}
    </ul>
  </section>`;
}

// BLS projection figures for the card: growth over the period, openings a year, median pay (all US).
function outlookLine(p) {
  if (!p || p.changePct == null) return "";
  const period = jobsMeta.projections?.period || "";
  const sign = p.changePct > 0 ? "+" : p.changePct < 0 ? "−" : "";
  const parts = [`<b class="${p.changePct >= 5 ? "up" : p.changePct < 0 ? "down" : ""}">${T.results.growth(sign + num(Math.abs(p.changePct)))}</b>`];
  if (p.openings) parts.push(T.results.openings(T.big(Math.round(p.openings / 100) * 100)));
  if (p.wage) parts.push(T.results.wage(T.big(Math.round(p.wage / 10) * 10), p.wageAtLeast));
  return `<p class="outlook small" title="${esc(T.results.outlookTitle)}"><span class="muted">${T.results.outlookUS(period)}</span> ${parts.join(" · ")}${p.group === true ? `<br><span class="muted">${T.results.outlookShared}</span>` : p.group ? `<br><span class="muted">${T.results.outlookGroup}</span> <span dir="ltr">${esc(p.group)}</span>` : ""}</p>`;
}

// AI exposure from two research measures: what share of tasks AI could speed up, and how much of that is in use.
function aiLine(ai) {
  if (!ai || ai.potential == null) return "";
  const pct = x => num(Math.round(x * 100));
  const parts = [T.results.aiPotential(pct(ai.potential))];
  if (ai.observed != null) parts.push(T.results.aiObserved(pct(ai.observed)));
  return `<p class="outlook small ai" title="${esc(T.results.aiTitle)}"><span class="muted">${T.results.aiLabel}</span> ${parts.join(" · ")} <a href="#/method" class="muted">ⓘ</a></p>`;
}

function patternText(id) {
  const proto = ANIMALS[id].proto;
  const parts = Object.entries(proto).map(([d, s]) => T.gallery.patternPart(T.domains[d].name, s > 0));
  return parts.length ? parts.join(T.results.list) : T.gallery.balanced;
}

function gallery() {
  render(html`
  <section>
    <h1>${T.gallery.title}</h1>
    <p class="muted">${T.gallery.lede}</p>
    <div class="gallery">
      ${Object.keys(ANIMALS).map(id => `<a href="#/animals/${id}"><figure>${art(id, { size: 140 })}<figcaption>${esc(A(id).name)}<small>${esc(A(id).tagline)}</small></figcaption></figure></a>`).join("")}
    </div>
    <p class="section"><a class="btn primary" href="${personalityDone() ? "#/animal" : "#/start"}">${personalityDone() ? T.gallery.back : T.gallery.find}</a></p>
  </section>`);
}

function animalPage(id) {
  if (!ANIMALS[id]) { go("#/animals"); return; }
  const a = A(id);
  render(html`
  <section class="reveal">
    <div class="art">${art(id, { size: 340, animate: true, labels: false })}</div>
    <div>
      <p class="eyebrow">${T.gallery.pattern}: ${patternText(id)}</p>
      <h1>${T.animal.the(a.name)}</h1>
      <p class="tagline">${a.tagline}</p>
      <p>${a.about}</p>
    </div>
  </section>
  <section class="section lists">
    <div class="card"><h3>${T.animal.strengths}</h3><ul>${a.strengths.map(s => `<li>${s}</li>`).join("")}</ul></div>
    <div class="card"><h3>${T.animal.watch}</h3><ul>${a.watch.map(s => `<li>${s}</li>`).join("")}</ul></div>
  </section>
  <section class="section row">
    <a class="btn primary" href="${personalityDone() ? "#/animal" : "#/start"}">${personalityDone() ? T.gallery.back : T.gallery.find}</a>
    <a class="btn ghost" href="#/animals">${T.gallery.all}</a>
  </section>`);
}

function method() {
  render(`<section class="method">${T.method}</section>`);
}

// ---------- actions ----------
app.addEventListener("click", e => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (!act) return;
  if (act === "begin") {
    const age = parseInt(app.querySelector("#age").value, 10);
    const sex = app.querySelector('#sex [aria-pressed="true"]')?.dataset.v;
    S.person = { age: age >= 10 && age <= 99 ? age : undefined, sex: sex || undefined };
    persist(); go("#/personality");
  } else if (act === "begin-i") { quiz("interests"); }
  else if (act === "share") share();
  else if (act === "ack-quality") { S.qualityAck = true; persist(); go("#/animal"); }
  else if (act === "retake-p") { if (confirm(T.quality.retakeConfirm)) { S.p = {}; S.pIndex = 0; S.qualityAck = false; persist(); go("#/personality"); } }
  else if (act === "retake-i") { if (confirm(T.career.redoConfirm)) { S.i = {}; S.iIndex = 0; S.jobZone = null; persist(); go("#/career"); } }
  else if (act === "reset") { if (confirm(T.home.resetConfirm)) { S = blank(); persist(); go("#/"); } }
});

// ---------- router ----------
function route() {
  keyHandler = null;
  const h = location.hash.replace(/^#/, "") || "/";
  const shared = h.match(/^\/(r|rj)\/(.+)$/);
  if (shared) {
    const st = decodeShare(shared[2]);
    if (!st) { render(`<p class="loading">${T.brokenLink}</p>`); return; }
    return shared[1] === "r" ? animalScreen(st, true) : resultsScreen(st, true);
  }
  const animal = h.match(/^\/animals\/([a-z]+)$/);
  if (animal) return animalPage(animal[1]);
  switch (h) {
    case "/start": return start();
    case "/personality": return quiz("personality");
    case "/personality-review": return reviewQuiz();
    case "/animal": return animalScreen(S, false);
    case "/career": return careerIntro();
    case "/zone": return zone();
    case "/results": return resultsScreen(S, false);
    case "/animals": return gallery();
    case "/method": return method();
    default: return home();
  }
}

// Step through answered items from the start so they can be changed, then return to the animal.
function reviewQuiz() {
  const items = D.personality.items;
  let idx = 0;
  const draw = () => {
    const it = items[idx];
    app.innerHTML = html`
    <section class="quiz">
      <div class="progress"><div style="width:${(100 * (idx + 1)) / items.length}%"></div></div>
      <p class="count"><span>${T.quiz.reviewing}</span><span>${T.quiz.of(num(idx + 1), num(items.length))}</span></p>
      <p class="prompt">${T.quiz.promptP}</p>
      <h2 class="item">${itemText(it, "personality")}</h2>
      <div class="options">${optionButtons("personality", S.p[it.id])}</div>
      <div class="quiz-nav"><button class="btn ghost" data-nav="back" ${idx === 0 ? "disabled" : ""}>${T.quiz.back}</button><button class="btn ghost" data-nav="done">${T.quiz.doneReviewing}</button><button class="btn ghost" data-nav="next">${T.quiz.next}</button></div>
    </section>`;
    app.querySelectorAll(".opt").forEach(b => b.onclick = () => { S.p[it.id] = +b.dataset.v; persist(); step(1); });
    app.querySelector('[data-nav="back"]').onclick = () => step(-1);
    app.querySelector('[data-nav="next"]').onclick = () => step(1);
    app.querySelector('[data-nav="done"]').onclick = () => { S.qualityAck = true; persist(); go("#/animal"); };
  };
  const step = d => { idx += d; if (idx >= items.length) { S.qualityAck = true; persist(); go("#/animal"); return; } idx = Math.max(0, idx); draw(); };
  keyHandler = e => {
    if (e.key >= "1" && e.key <= "5") { S.p[items[idx].id] = +e.key; persist(); step(1); }
    else if (e.key === "ArrowLeft") step(T.dir === "rtl" ? 1 : -1);
    else if (e.key === "ArrowRight") step(T.dir === "rtl" ? -1 : 1);
  };
  draw();
  window.scrollTo(0, 0);
}

function chrome() {
  document.querySelector(".sky").innerHTML = `<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">${starfield(7, 1600, 1000, { count: 380, band: true, scale: 1.6 })}</svg>`;
  document.querySelector(".top nav").innerHTML = `<a href="#/animals">${T.nav.animals}</a><a href="#/method">${T.nav.method}</a><a href="${new URL(T.langSwitch.href, ROOT).href}" lang="${LANG === "fa" ? "en" : "fa"}">${T.langSwitch.label}</a>`;
  document.querySelector(".brand").href = "#/";
  document.querySelector(".foot").innerHTML = `<p>${T.footer.ipip}</p><p>${T.footer.onet}</p><p>${T.footer.privacy}</p>`;
}

try {
  D = await loadData();
} catch (err) {
  render(`<p class="loading">${T.loadError}</p>`);
  console.error(err);
  throw err;
}
chrome();
save.init({ encode: encodeDigits, decode: decodeDigits, card: starCard });
load();
window.addEventListener("hashchange", route);
route();
