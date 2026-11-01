// The Calling test: an experimental test, separate from the animal and career quizzes, that turns what a person loves
// doing into one score for every occupation (see score.js). Static like the rest of the site: answers stay in this
// browser unless the person saves a calling map or code.

import EN from "../i18n/en.js";
import T from "./text.js";
import { AREAS, HOOKS, HOBBY_GROUPS, HOBBIES, AS_WORK, LIFE, LIFE_MAX, SLIDERS, UNI_SCALE, BI_SCALE, MEANING, CARD_SCALE, TOP_MAX, HOBBY_MAX, HOOKS_PER_HOBBY, DAYS_TOTAL } from "./content.js";
import { DAYS } from "./days.js";
import { prepare, score, directions, unplaced, nextDay, reasons, summary, CUSTOM } from "./score.js";
import { starfield } from "../constellation.js";
import * as save from "./save.js";

const ROOT = new URL("../../", import.meta.url);
const app = document.getElementById("app");
const STORE_KEY = "wildwork-calling-v1";
const PAGE = 10;
const SHOWN = 2; // jobs shown per direction before "show all"
const REASONS = { good: 3, watch: 2 }; // at most this many reasons on a job card
const GOOD_FIRST = ["areas", "day", "hobby", "energy", "meaning"], WATCH_FIRST = ["no", "energy", "day"];
const N = { areas: AREAS.length, sliders: SLIDERS.length, meaning: MEANING.length, days: DAYS_TOTAL };
const CUSTOM_AREAS = 3;

let S = blank();   // the visitor's own answers
let keyHandler = null;
let fromBack = false; // set when "Back" leaves a screen, so the previous screen opens at its last item
let modelPromise;
let jobsMeta = {};

function blank() {
  return { hobbies: [], lovesSet: false, life: LIFE.map(() => []), lifeAt: 0, cards: {}, top: [], topSet: false, sliders: {}, meaning: [], meaningSet: false, have: null, zone: null, days: [] };
}
const hasAnswers = st => st.lovesSet || st.hobbies.length > 0 || st.lifeAt > 0 || Object.keys(st.cards).length > 0 || Object.keys(st.sliders).length > 0 || st.meaning.length > 0 || st.days.length > 0;

// ---------- storage (best effort: private windows may block it) ----------
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) S = { ...blank(), ...JSON.parse(raw) }; } catch {}
}
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch {}
}

// ---------- data ----------
async function getJSON(path) {
  const r = await fetch(new URL(path, ROOT));
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

// The job data is only needed from the workdays on, so it loads in the background once the person is under way.
function loadModel() {
  modelPromise ||= (async () => {
    const [calling, jobs] = await Promise.all([getJSON("data/calling.json"), getJSON("data/jobs.json")]);
    jobsMeta = jobs.meta;
    return prepare(calling, jobs);
  })().catch(err => { modelPromise = null; throw err; });
  return modelPromise;
}

async function withModel() {
  const hash = location.hash;
  const wait = setTimeout(() => render(`<p class="loading">${T.dataLoading}</p>`), 150);
  try {
    const model = await loadModel();
    return location.hash === hash ? model : null;
  } catch (err) {
    console.error(err);
    render(`<p class="loading">${T.loadError}</p>`);
    return null;
  } finally { clearTimeout(wait); }
}

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const html = (strings, ...vals) => strings.reduce((out, s, i) => out + s + (i < vals.length ? vals[i] ?? "" : ""), "");
const lower = s => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const order = (list, keys) => [...list].sort((x, y) => keys.indexOf(x.kind) - keys.indexOf(y.kind));
const hobbyName = h => (h.i === CUSTOM ? h.name || T.loves.otherDefault : HOBBIES[h.i]?.name || T.loves.otherDefault);

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
function goBack(hash) { fromBack = true; go(hash); }

// A fixed shuffle, the same for everyone, so cards from one family of work don't come in a run.
function shuffled(list, seed) {
  const out = [...list];
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const CARD_ORDER = shuffled(AREAS.map((_, a) => a), 20261029);
const MEANING_ORDER = shuffled(MEANING.map((_, m) => m), 41);

// ---------- steps ----------
// Each part of the test is one or more steps; a step opens once every step before it is done.
const STEPS = [
  { key: "loves", part: 0, hash: "#/loves", done: st => st.lovesSet },
  { key: "hooks", part: 0, hash: "#/hooks", done: st => st.hobbies.every(h => h.work && h.hooks?.length) },
  { key: "life", part: 0, hash: "#/life", done: st => st.lifeAt >= LIFE.length },
  { key: "cards", part: 1, hash: "#/cards", done: st => AREAS.every((_, a) => st.cards[a]) },
  { key: "top", part: 1, hash: "#/top", done: st => st.topSet },
  { key: "energy", part: 2, hash: "#/energy", done: st => SLIDERS.every((_, k) => st.sliders[k]) },
  { key: "meaning", part: 3, hash: "#/meaning", done: st => st.meaningSet && st.meaning.length >= 3 },
  { key: "training", part: 4, hash: "#/training", done: st => st.have && st.zone },
  { key: "days", part: 4, hash: "#/days", done: st => st.days.length >= DAYS_TOTAL || st.daysOut },
];
const firstOpen = (st = S) => STEPS.find(s => !s.done(st));
const partDone = (k, st = S) => STEPS.filter(s => s.part === k).every(s => s.done(st));
const reachable = key => STEPS.slice(0, STEPS.findIndex(s => s.key === key)).every(s => s.done(S));
function advance() { go(firstOpen()?.hash || "#/results"); }
function guard(key) {
  if (reachable(key)) return true;
  advance();
  return false;
}

function head(part, right, done, total) {
  return `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><div style="width:${(100 * done) / total}%"></div></div>
    <p class="count"><span>${T.part(part + 1, T.parts[part].name)}</span><span>${right}</span></p>`;
}

const optButtons = (labels, current, attr = "v") =>
  labels.map((label, k) => `<button class="opt" data-${attr}="${k + 1}" aria-pressed="${current === k + 1}"><span class="key">${k + 1}</span>${esc(label)}</button>`).join("");

// ---------- intro ----------
function intro() {
  const started = hasAnswers(S), next = firstOpen();
  let cta;
  if (!started) cta = `<a class="btn primary" href="#/loves">${T.intro.start}</a>`;
  else if (next) cta = `<a class="btn primary" href="${next.hash}">${T.intro.continue(T.parts[next.part].name)}</a>`;
  else cta = `<a class="btn primary" href="#/results">${T.intro.results}</a>`;
  if (started) cta += `<button class="btn ghost" data-act="reset">${T.intro.reset}</button>`;
  render(html`
  <section class="hero">
    <p class="eyebrow">${T.intro.eyebrow}</p>
    <h1>${T.intro.title}</h1>
    <p class="lede">${T.intro.lede}</p>
    <div class="row">${cta}</div>
    <p class="privacy small">${EN.privacyHome}</p>
  </section>
  <section class="section">
    <h2>${T.intro.partsTitle}</h2>
    <ol class="parts">
      ${T.parts.map((p, k) => {
        const first = STEPS.find(s => s.part === k), done = partDone(k);
        return `<li class="${done ? "done" : ""}"><span class="pnum" aria-hidden="true">${done ? "✓" : k + 1}</span><div><h3>${esc(p.name)} <span class="muted small">· ${p.time}</span></h3><p class="muted small">${esc(p.text(N))}</p>${done && reachable(first.key) ? `<a class="small" href="${first.hash}">${T.intro.change}</a>` : ""}</div></li>`;
      }).join("")}
    </ol>
    <p class="notice small">${T.intro.note}</p>
  </section>
  ${save.panel(T, started)}
  <p class="muted small">${T.intro.saveNote} <a href="#/method">${T.nav.method}</a></p>`);
  save.bind(app, T, S, restore);
  if (started) loadModel().catch(() => {});
}

// ---------- part 1: what you love ----------
function lovesScreen() {
  const n = () => S.hobbies.length;
  const chip = (h, i) => `<button class="chip" data-h="${i}" aria-pressed="${S.hobbies.some(x => x.i === i)}">${esc(h.name)}</button>`;
  const mine = () => S.hobbies.map((h, k) => (h.i === CUSTOM ? `<button class="chip" data-c="${k}" aria-pressed="true">${esc(hobbyName(h))}</button>` : "")).join("");
  // On a phone the groups start closed, except ones with a pick, so the list doesn't run for screens.
  const wide = matchMedia("(min-width: 760px)").matches;
  const inGroup = gi => S.hobbies.filter(h => h.i !== CUSTOM && HOBBIES[h.i]?.g === gi).length;
  render(html`
  <section class="quiz wide">
    ${head(0, `<span id="count">${T.loves.picked(n(), HOBBY_MAX)}</span>`, 0, 3)}
    <h2>${T.loves.title}</h2>
    <p class="muted">${T.loves.lede}</p>
    <input type="search" class="find" id="find" placeholder="${T.loves.find}" aria-label="${T.loves.find}" autocomplete="off">
    <div class="groups">${HOBBY_GROUPS.map((g, gi) => `<details class="group" data-g="${gi}"${wide || inGroup(gi) ? " open" : ""}><summary class="group-name">${esc(g)}<span class="gcount">${inGroup(gi) || ""}</span></summary><div class="chips">${HOBBIES.map((h, i) => (h.g === gi && !h.retired ? chip(h, i) : "")).join("")}</div></details>`).join("")}</div>
    <p class="muted small" id="nohit" hidden>${T.loves.none}</p>
    <div class="mine"><div class="chips" id="mine">${mine()}<button class="chip other" data-other>${T.loves.other}</button></div></div>
    <form class="card stack other-form" id="other" hidden>
      <h3>${T.loves.otherTitle}</h3>
      <label class="field"><span>${T.loves.otherName}</span><input name="name" maxlength="60" placeholder="${T.loves.otherPlaceholder}" autocomplete="off"></label>
      <p class="small">${T.loves.otherAreas(CUSTOM_AREAS)}</p>
      <div class="chips" id="other-areas">${AREAS.map((a, k) => `<button type="button" class="chip" data-a="${k}" aria-pressed="false">${esc(a.name)}</button>`).join("")}</div>
      <p class="small muted">${T.loves.otherNote}</p>
      <div class="row"><button class="btn primary" type="submit">${T.loves.otherAdd}</button><button class="btn ghost" type="button" data-cancel>${T.loves.otherCancel}</button></div>
    </form>
    <div class="dock">
      <button class="btn ghost" data-nav="back">${T.back}</button>
      <button class="btn primary" data-nav="next">${n() ? T.next : T.loves.skip}</button>
    </div>
  </section>`);
  const count = app.querySelector("#count"), nextBtn = app.querySelector('[data-nav="next"]');
  const form = app.querySelector("#other"), otherAreas = new Set();
  const refresh = () => {
    count.textContent = T.loves.picked(n(), HOBBY_MAX);
    nextBtn.textContent = n() ? T.next : T.loves.skip;
    app.querySelector("#mine").innerHTML = mine() + `<button class="chip other" data-other>${T.loves.other}</button>`;
    persist();
  };
  const full = () => { if (n() < HOBBY_MAX) return false; toast(T.loves.max(HOBBY_MAX)); return true; };
  app.querySelector(".quiz").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.h != null) {
      const i = +b.dataset.h, k = S.hobbies.findIndex(x => x.i === i);
      if (k >= 0) S.hobbies.splice(k, 1);
      else if (full()) return;
      else S.hobbies.push({ i, work: 0, hooks: [] });
      b.setAttribute("aria-pressed", k < 0);
      const g = b.closest("[data-g]");
      g.querySelector(".gcount").textContent = inGroup(+g.dataset.g) || "";
      refresh();
    } else if (b.dataset.c != null) {
      S.hobbies.splice(+b.dataset.c, 1);
      refresh();
    } else if (b.dataset.other != null) {
      if (full()) return;
      form.hidden = false;
      form.querySelector("input").focus();
    } else if (b.dataset.a != null) {
      const a = +b.dataset.a;
      if (otherAreas.has(a)) otherAreas.delete(a);
      else if (otherAreas.size >= CUSTOM_AREAS) { toast(T.loves.otherAreas(CUSTOM_AREAS)); return; }
      else otherAreas.add(a);
      b.setAttribute("aria-pressed", otherAreas.has(a));
    } else if (b.dataset.cancel != null) {
      form.hidden = true;
    } else if (b.dataset.nav === "back") {
      go("#/");
    } else if (b.dataset.nav === "next") {
      S.lovesSet = true; persist(); advance();
    }
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!otherAreas.size) { toast(T.loves.otherNeed); return; }
    if (full()) return;
    const name = new FormData(form).get("name").trim();
    S.hobbies.push({ i: CUSTOM, name: name || undefined, areas: [...otherAreas], work: 0, hooks: [] });
    otherAreas.clear();
    form.reset(); form.hidden = true;
    form.querySelectorAll("[data-a]").forEach(x => x.setAttribute("aria-pressed", false));
    refresh();
  });
  app.querySelector("#find").addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase();
    let hits = 0;
    app.querySelectorAll(".group[data-g]").forEach(g => {
      let any = false;
      g.querySelectorAll("[data-h]").forEach(c => { const hit = !q || c.textContent.toLowerCase().includes(q); c.hidden = !hit; any ||= hit; });
      g.hidden = !any; hits += any;
      g.open = q ? any : wide || inGroup(+g.dataset.g) > 0;
    });
    app.querySelector("#nohit").hidden = hits > 0;
  });
}

function hooksScreen() {
  if (!guard("hooks")) return;
  const list = S.hobbies;
  if (!list.length) { advance(); return; }
  let k = fromBack ? list.length - 1 : Math.max(0, list.findIndex(h => !(h.work && h.hooks?.length)));
  const ok = h => h.work && h.hooks.length;
  const draw = () => {
    const h = list[k];
    h.hooks ||= [];
    render(html`
    <section class="quiz">
      ${head(0, T.hooks.count(k + 1, list.length), 1, 3)}
      <p class="prompt">${T.hooks.prompt}</p>
      <h2 class="item">${esc(hobbyName(h))}</h2>
      <p class="muted small">${T.hooks.pick(HOOKS_PER_HOBBY)}</p>
      <div class="chips" id="hooks">${HOOKS.map((x, j) => `<button class="chip" data-k="${j}" aria-pressed="${h.hooks.includes(j)}">${esc(x.name)}</button>`).join("")}</div>
      <h3 class="sub-q">${T.hooks.work}</h3>
      <div class="options">${optButtons(AS_WORK.map(w => w.label), h.work, "w")}</div>
      <div class="quiz-nav"><button class="btn ghost" data-nav="back">${T.back}</button><button class="btn primary" data-nav="next" ${ok(h) ? "" : "disabled"}>${T.next}</button></div>
    </section>`);
    const nextBtn = app.querySelector('[data-nav="next"]');
    app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
      const j = +b.dataset.k, at = h.hooks.indexOf(j);
      if (at >= 0) h.hooks.splice(at, 1);
      else if (h.hooks.length >= HOOKS_PER_HOBBY) { toast(T.hooks.pick(HOOKS_PER_HOBBY)); return; }
      else h.hooks.push(j);
      b.setAttribute("aria-pressed", at < 0);
      nextBtn.disabled = !ok(h); persist();
    });
    app.querySelectorAll("[data-w]").forEach(b => b.onclick = () => {
      h.work = +b.dataset.w;
      app.querySelectorAll("[data-w]").forEach(x => x.setAttribute("aria-pressed", x === b));
      nextBtn.disabled = !ok(h); persist();
    });
    app.querySelector('[data-nav="back"]').onclick = () => { if (k > 0) { k--; draw(); } else goBack("#/loves"); };
    nextBtn.onclick = next;
  };
  const next = () => {
    if (!ok(list[k])) { toast(T.hooks.need); return; }
    if (k + 1 < list.length) { k++; draw(); } else advance();
  };
  keyHandler = e => {
    if (e.key >= "1" && e.key <= String(AS_WORK.length)) app.querySelector(`[data-w="${e.key}"]`)?.click();
    else if (e.key === "Enter") next();
  };
  draw();
}

function lifeScreen() {
  if (!guard("life")) return;
  let q = fromBack ? LIFE.length - 1 : S.lifeAt >= LIFE.length ? 0 : S.lifeAt;
  const draw = () => {
    const sel = S.life[q] ||= [];
    render(html`
    <section class="quiz">
      ${head(0, T.life.count(q + 1, LIFE.length), 2, 3)}
      <h2 class="item">${esc(LIFE[q].q)}</h2>
      <p class="muted small">${T.life.pick(LIFE_MAX)}</p>
      <div class="picks">${LIFE[q].options.map((o, j) => (o.retired ? "" : `<button class="pick" data-o="${j}" aria-pressed="${sel.includes(j)}">${esc(o.t)}</button>`)).join("")}</div>
      <div class="quiz-nav"><button class="btn ghost" data-nav="back">${T.back}</button><button class="btn primary" data-nav="next">${sel.length ? T.next : T.skip}</button></div>
    </section>`);
    const nextBtn = app.querySelector('[data-nav="next"]');
    app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => {
      const j = +b.dataset.o, at = sel.indexOf(j);
      if (at >= 0) sel.splice(at, 1);
      else if (sel.length >= LIFE_MAX) { toast(T.life.pick(LIFE_MAX)); return; }
      else sel.push(j);
      b.setAttribute("aria-pressed", at < 0);
      nextBtn.textContent = sel.length ? T.next : T.skip;
      persist();
    });
    app.querySelector('[data-nav="back"]').onclick = () => {
      if (q > 0) { q--; draw(); } else goBack(S.hobbies.length ? "#/hooks" : "#/loves");
    };
    nextBtn.onclick = () => {
      S.lifeAt = Math.max(S.lifeAt, q + 1); persist();
      if (q + 1 < LIFE.length) { q++; draw(); } else advance();
    };
  };
  draw();
  loadModel().catch(() => {});
}

// ---------- part 2: what draws you ----------
// One quick card per interest area, in a fixed shuffled order, then the top four.
function sequence({ items, answers, part, labels, prompt, item, extra = () => "", lede, back, after, extraOpt }) {
  let idx = fromBack ? items.length - 1 : Math.max(0, items.findIndex(x => !answers[x]));
  let locked = false;
  const total = items.length;
  const draw = () => {
    const x = items[idx], done = items.filter(y => answers[y]).length;
    const scale = labels(x);
    app.innerHTML = html`
    <section class="quiz">
      ${head(part, T.of(idx + 1, total), done, total)}
      ${idx === 0 && !done ? `<p class="muted small lede">${lede}</p>` : ""}
      <p class="prompt">${prompt(x)}</p>
      <h2 class="item" id="item" aria-live="polite">${esc(item(x))}</h2>
      ${extra(x)}
      <div class="options" role="group" aria-labelledby="item">${optButtons(scale, answers[x])}</div>
      ${extraOpt ? `<button class="opt unsure" data-v="${scale.length + 1}" aria-pressed="${answers[x] === scale.length + 1}"><span class="key">${scale.length + 1}</span>${esc(extraOpt)}</button>` : ""}
      <div class="quiz-nav">
        <button class="btn ghost" data-nav="back">${T.back}</button>
        <button class="btn ghost" data-nav="next" ${answers[x] ? "" : "disabled"}>${T.next}</button>
      </div>
      <p class="hint">${T.hint(`1–${scale.length + (extraOpt ? 1 : 0)}`)}</p>
    </section>`;
    app.querySelectorAll(".opt").forEach(b => b.onclick = () => choose(+b.dataset.v));
    app.querySelector('[data-nav="back"]').onclick = prev;
    app.querySelector('[data-nav="next"]').onclick = next;
  };
  const choose = v => {
    if (locked) return;
    answers[items[idx]] = v;
    after?.(items[idx], v);
    persist();
    app.querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", +b.dataset.v === v));
    locked = true;
    setTimeout(() => { locked = false; next(); }, 160);
  };
  const next = () => {
    if (!answers[items[idx]]) return;
    if (idx + 1 < total) idx++;
    else {
      const gap = items.findIndex(y => !answers[y]);
      if (gap === -1) { advance(); return; }
      idx = gap;
    }
    draw();
  };
  const prev = () => { if (idx > 0) { idx--; draw(); } else goBack(back); };
  const max = labels(items[0]).length + (extraOpt ? 1 : 0);
  keyHandler = e => {
    if (e.key >= "1" && e.key <= String(max)) choose(+e.key);
    else if (e.key === "ArrowLeft") prev();
    else if (e.key === "ArrowRight" || e.key === "Enter") next();
  };
  draw();
  window.scrollTo(0, 0);
}

function cardsScreen() {
  if (!guard("cards")) return;
  sequence({
    items: CARD_ORDER, answers: S.cards, part: 1, back: "#/life",
    labels: () => CARD_SCALE.slice(0, 4).map(c => c.label), extraOpt: CARD_SCALE[4].label,
    prompt: () => T.cards.prompt, item: a => AREAS[a].name, lede: T.cards.lede(N.areas),
    extra: a => `<p class="examples-label small muted">${T.cards.examples}</p><ul class="examples">${AREAS[a].acts.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`,
    // An area that's no longer loved or liked can't stay in the top four.
    after: (a, v) => { if (v > 2) S.top = S.top.filter(x => x !== a); },
  });
  loadModel().catch(() => {});
}

function topScreen() {
  if (!guard("top")) return;
  const loved = AREAS.map((_, a) => a).filter(a => S.cards[a] === 1), liked = AREAS.map((_, a) => a).filter(a => S.cards[a] === 2);
  const pool = loved.length < TOP_MAX ? [...loved, ...liked] : loved;
  S.top = S.top.filter(a => pool.includes(a));
  if (pool.length < 2) {
    S.top = pool; S.topSet = true; persist();
    if (fromBack) go("#/cards"); else advance();
    return;
  }
  const draw = () => {
    app.innerHTML = html`
    <section class="quiz">
      ${head(1, T.of(S.top.length, TOP_MAX), N.areas, N.areas)}
      <h2>${T.top.title}</h2>
      <p class="muted">${T.top.lede(TOP_MAX)}</p>
      ${loved.length < TOP_MAX && liked.length ? `<p class="muted small">${T.top.likedToo}</p>` : ""}
      <div class="picks ranked">${pool.map(a => { const r = S.top.indexOf(a); return `<button class="pick" data-a="${a}" aria-pressed="${r >= 0}"><span class="rank" aria-hidden="true">${r >= 0 ? r + 1 : ""}</span>${esc(AREAS[a].name)}</button>`; }).join("")}</div>
      <div class="quiz-nav"><button class="btn ghost" data-nav="back">${T.back}</button><button class="btn primary" data-nav="next">${S.top.length ? T.next : T.skip}</button></div>
    </section>`;
    app.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
      const a = +b.dataset.a, at = S.top.indexOf(a);
      if (at >= 0) S.top.splice(at, 1);
      else if (S.top.length >= TOP_MAX) { toast(T.top.lede(TOP_MAX)); return; }
      else S.top.push(a);
      persist(); draw();
    });
    app.querySelector('[data-nav="back"]').onclick = () => goBack("#/cards");
    app.querySelector('[data-nav="next"]').onclick = () => { S.topSet = true; persist(); advance(); };
  };
  draw();
  window.scrollTo(0, 0);
}

// ---------- part 3: energy ----------
function energyScreen() {
  if (!guard("energy")) return;
  sequence({
    items: SLIDERS.map((_, k) => k), answers: S.sliders, part: 2, back: "#/top",
    labels: k => (SLIDERS[k].kind === "uni" ? UNI_SCALE : BI_SCALE(SLIDERS[k].left, SLIDERS[k].right)),
    prompt: k => (SLIDERS[k].kind === "uni" ? T.energy.promptUni : T.energy.promptBi), item: k => SLIDERS[k].text, lede: T.energy.lede(N.sliders),
  });
}

// ---------- part 4: what it's for ----------
function meaningScreen() {
  if (!guard("meaning")) return;
  const draw = () => {
    const n = S.meaning.length;
    app.innerHTML = html`
    <section class="quiz wide">
      ${head(3, T.of(n, MEANING.length), n, MEANING.length)}
      <h2>${T.meaning.title}</h2>
      <p class="muted">${T.meaning.lede}</p>
      <div class="mcards">${MEANING_ORDER.map(m => { const r = S.meaning.indexOf(m); return `<button class="mcard" data-m="${m}" aria-pressed="${r >= 0}"><span class="rank" aria-hidden="true">${r >= 0 ? r + 1 : ""}</span><b>${esc(MEANING[m].title)}</b><span class="muted small">${esc(MEANING[m].sub)}</span></button>`; }).join("")}</div>
      <div class="quiz-nav">
        <button class="btn ghost" data-nav="back">${T.back}</button>
        <span class="row">${n ? `<button class="btn ghost" data-nav="clear">${T.meaning.clear}</button>` : ""}<button class="btn primary" data-nav="next" ${n >= 3 ? "" : "disabled"}>${T.done}</button></span>
      </div>
      ${n < 3 ? `<p class="hint">${T.meaning.need}</p>` : ""}
    </section>`;
    app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => {
      const m = +b.dataset.m, at = S.meaning.indexOf(m);
      if (at >= 0) S.meaning.splice(at, 1); else S.meaning.push(m);
      persist(); draw();
    });
    app.querySelector('[data-nav="back"]').onclick = () => goBack("#/energy");
    app.querySelector('[data-nav="clear"]')?.addEventListener("click", () => { S.meaning = []; persist(); draw(); });
    app.querySelector('[data-nav="next"]').onclick = () => { S.meaningSet = true; persist(); advance(); };
  };
  draw();
  window.scrollTo(0, 0);
}

// ---------- part 5: training, then try a few workdays on ----------
// Training never changes a score. What the person would do sets which workdays they try on and which jobs the
// directions show; what they have now splits jobs into ready now and needs more.
function trainingScreen() {
  if (!guard("training")) return;
  let step = S.have && !S.zone ? 1 : fromBack && S.have ? 1 : 0;
  const draw = () => {
    if (step === 0) {
      const q = EN.haveQuestion;
      render(html`
      <section class="quiz stack">
        ${head(4, T.of(1, 2), 0, DAYS_TOTAL)}
        <h2>${esc(q.question)}</h2>
        <p class="muted small">${T.training.haveNote}</p>
        <div class="options">${optButtons(q.options, S.have, "h")}</div>
        <div class="quiz-nav"><button class="btn ghost" data-nav="back">${T.back}</button></div>
      </section>`);
      app.querySelectorAll("[data-h]").forEach(b => b.onclick = () => {
        S.have = +b.dataset.h;
        if (S.zone && S.zone < S.have) S.zone = null;
        persist(); step = 1; draw();
      });
      app.querySelector('[data-nav="back"]').onclick = () => goBack("#/meaning");
    } else {
      const q = EN.zoneQuestion, from = S.have || 1;
      render(html`
      <section class="quiz stack">
        ${head(4, T.of(2, 2), 0, DAYS_TOTAL)}
        <h2>${esc(q.question)}</h2>
        <p class="muted small">${T.training.zoneNote}</p>
        <div class="options">${q.options.map((label, k) => (k + 1 < from ? "" : `<button class="opt" data-z="${k + 1}" aria-pressed="${S.zone === k + 1}"><span class="key">${k + 1}</span>${esc(label)}${k + 1 === S.have ? `<span class="muted">${EN.career.zoneSame}</span>` : ""}</button>`)).join("")}</div>
        <div class="quiz-nav"><button class="btn ghost" data-nav="back">${T.back}</button></div>
      </section>`);
      app.querySelectorAll("[data-z]").forEach(b => b.onclick = () => { S.zone = +b.dataset.z; persist(); advance(); });
      app.querySelector('[data-nav="back"]').onclick = () => { step = 0; draw(); };
    }
  };
  draw();
  loadModel().catch(() => {});
}

async function daysScreen() {
  if (!guard("days")) return;
  const model = await withModel();
  if (!model) return;
  const pass = r => r.job.jobZone <= Math.max(S.zone || 5, 2);
  const pick = () => (S.days.length >= DAYS_TOTAL ? null : nextDay(model, S, pass));
  // The snapshot on screen survives a reload until it's answered.
  let current = S.dayNow != null && !S.days.some(d => d.i === S.dayNow) && model.dayRow[S.dayNow] >= 0 ? S.dayNow : pick();
  let reacted = null;
  const finish = () => {
    S.dayNow = null;
    if (S.days.length < DAYS_TOTAL) S.daysOut = true;
    persist(); go("#/results");
  };
  if (current == null) { finish(); return; }
  S.dayNow = current; persist();
  const draw = () => {
    const job = model.jobs[model.dayRow[current]].job;
    const n = S.days.length + (reacted ? 0 : 1);
    const last = S.days.length >= DAYS_TOTAL;
    const aka = (job.modernTitles || []).filter(t => t.toLowerCase() !== job.title.toLowerCase()).slice(0, 3);
    app.innerHTML = html`
    <section class="quiz">
      ${head(4, T.days.count(n, DAYS_TOTAL), S.days.length, DAYS_TOTAL)}
      ${n === 1 && !reacted ? `<p class="muted small lede">${T.days.lede}</p>` : ""}
      <p class="prompt">${T.days.prompt}</p>
      <p class="day" id="day">${esc(DAYS[current][1])}</p>
      <div class="options" role="group" aria-labelledby="day">${optButtons(T.days.reactions, reacted, "r")}</div>
      ${reacted ? `
      <div class="card reveal-job" aria-live="polite">
        <p class="eyebrow">${T.days.was}</p>
        <h3>${esc(job.title)}</h3>
        ${aka.length ? `<p class="aka">${EN.results.aka} ${aka.map(esc).join(", ")}</p>` : ""}
        <p class="small muted">${EN.zones.long[job.jobZone]}</p>
        <p class="small muted">${T.days.change}</p>
      </div>
      <div class="row end"><button class="btn primary" data-next>${last ? T.days.toResults : T.days.next}</button></div>` : ""}
    </section>`;
    app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => react(+b.dataset.r));
    app.querySelector("[data-next]")?.addEventListener("click", next);
  };
  const react = r => {
    if (reacted) S.days[S.days.length - 1].r = r; else S.days.push({ i: current, r });
    reacted = r; persist(); draw();
    app.querySelector("[data-next]")?.focus({ preventScroll: true });
    app.querySelector("[data-next]")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  };
  const next = () => {
    if (!reacted) return;
    reacted = null;
    const d = pick();
    if (d == null) { finish(); return; }
    current = d; S.dayNow = d; persist(); draw(); window.scrollTo(0, 0);
  };
  keyHandler = e => {
    if (e.key >= "1" && e.key <= "3") react(+e.key);
    else if (e.key === "Enter" || e.key === "ArrowRight") next();
  };
  draw();
  window.scrollTo(0, 0);
}

// ---------- results ----------
function levelOptions(selected, from = 1, notSet = false) {
  return (notSet ? `<option value="0"${selected ? "" : " selected"}>${EN.results.notSet}</option>` : "") +
    [1, 2, 3, 4, 5].filter(z => z >= from).map(z => `<option value="${z}"${selected === z ? " selected" : ""}>${EN.levelNames[z]}</option>`).join("");
}

async function resultsScreen() {
  const open = firstOpen();
  if (open) { go(open.hash); return; }
  const model = await withModel();
  if (!model) return;
  const res = score(model, S), p = res.profile, sum = summary(S);
  const lv = { have: S.have || 0, willing: Math.max(S.zone || 5, S.have || 0) };
  let query = "", shown = PAGE, growingOnly = false;
  const opened = new Set(); // directions showing all their jobs
  const provide = MEANING.findIndex(m => m.key === "provide");
  // Area and hobby names often contain "and" or "or" themselves, so lists of them are separated by dots or quotes.
  const headline = sum.areas.length ? sum.areas.slice(0, 3).map(a => AREAS[a].name).join(" · ") : T.results.stillTitle;
  const kept = sum.kept.map(h => `“${lower(hobbyName(h))}”`);

  render(html`
  <section>
    <p class="eyebrow">${T.results.eyebrow}</p>
    <h1>${esc(headline)}</h1>
    <p class="muted">${T.results.lede}</p>
    ${sum.areas.length ? "" : `<p class="notice small">${T.results.flat}</p>`}
    ${profileBlock(sum)}
  </section>

  <section class="section">
    <h2>${T.results.dirsTitle}</h2>
    <p class="muted">${T.results.dirsLede}</p>
    ${sum.meaning.includes(provide) ? `<p class="notice small">${T.results.provide}</p>` : ""}
    <div class="filters">
      <div class="row levels">
        <label class="field"><span class="small muted">${T.results.haveLabel}</span><select id="have">${levelOptions(lv.have, 1, true)}</select></label>
        <label class="field"><span class="small muted">${T.results.willingLabel}</span><select id="willing">${levelOptions(lv.willing, lv.have || 1)}</select></label>
      </div>
    </div>
    <p class="muted small" id="level-note" hidden>${EN.results.noZone1}</p>
    <div id="dirs"></div>
    <div id="unplaced"></div>
  </section>

  ${kept.length ? `<section class="section"><h2>${T.results.keptTitle}</h2><p>${esc(T.results.keptText(T.list(kept), kept.length))}</p></section>` : ""}

  <section class="section">
    <div class="card honest"><h3>${T.results.honestTitle}</h3><p class="muted">${T.results.honestText}</p></div>
  </section>

  <section class="section">
    <h2 id="all-title">${T.results.allTitle}</h2>
    <p class="muted">${T.results.allLede}</p>
    <div class="filters"><div class="row"><input type="search" id="q" placeholder="${T.results.search}" aria-label="${T.results.search}"><button class="chip" id="grow" aria-pressed="false">${T.results.growing}</button></div></div>
    <div class="jobs" id="jobs"></div>
    <div class="more" id="more"></div>
  </section>

  <section class="section row">
    <a class="btn" href="#/">${T.results.edit}</a>
    <button class="btn ghost" data-act="reset">${T.results.reset}</button>
  </section>
  ${save.panel(T, true)}`);

  const dirsEl = app.querySelector("#dirs"), list = app.querySelector("#jobs"), more = app.querySelector("#more");
  const haveSel = app.querySelector("#have"), willSel = app.querySelector("#willing");
  // O*NET has no Job Zone 1 occupations any more, so "little or none" falls back to the lowest level that exists.
  const inReach = r => r.job.jobZone <= Math.max(lv.willing, 2);
  const card = (r, tag) => jobCard(model, res, r, lv.have, tag);
  const drawDirs = () => {
    app.querySelector("#level-note").hidden = lv.willing !== 1;
    const dirs = directions(model, res, inReach);
    dirsEl.innerHTML = dirs.map((g, k) => directionBlock(g, k + 1, p, opened.has(g.key), card)).join("") || `<p class="muted">${T.results.dirsNone}</p>`;
    app.querySelector("#unplaced").innerHTML = unplacedBlock(model, res, dirs, unplaced(model, res, dirs, S, inReach));
  };
  const drawList = () => {
    const q = query.trim().toLowerCase();
    const hit = r => [r.job.title, ...(r.job.modernTitles || [])].some(t => t.toLowerCase().includes(q));
    const rows = res.ranked.filter(r => inReach(r) && (!growingOnly || r.job.outlook?.bright) && (!q || hit(r)));
    list.innerHTML = rows.slice(0, shown).map(r => card(r, "h3")).join("") || `<p class="muted">${T.results.none}</p>`;
    more.innerHTML = rows.length > shown ? `<button class="btn" data-more>${T.results.more(rows.length - shown)}</button>` : "";
  };
  const redraw = () => { shown = PAGE; drawDirs(); drawList(); };
  const keepLevels = () => { S.have = lv.have || null; S.zone = lv.willing; persist(); };
  haveSel.onchange = () => {
    lv.have = +haveSel.value;
    lv.willing = Math.max(lv.willing, lv.have);
    willSel.innerHTML = levelOptions(lv.willing, lv.have || 1);
    keepLevels(); redraw();
  };
  willSel.onchange = () => { lv.willing = +willSel.value; keepLevels(); redraw(); };
  app.querySelector("#q").oninput = e => { query = e.target.value; shown = PAGE; drawList(); };
  const grow = app.querySelector("#grow");
  grow.onclick = () => { growingOnly = !growingOnly; grow.setAttribute("aria-pressed", growingOnly); shown = PAGE; drawList(); };
  more.onclick = e => { if (e.target.closest("[data-more]")) { shown += PAGE; drawList(); } };
  // A job named under "Loves without a direction" opens in the full list, found by its title.
  app.querySelector("#unplaced").onclick = e => {
    const b = e.target.closest("[data-find]");
    if (!b) return;
    e.preventDefault();
    query = b.dataset.find; app.querySelector("#q").value = query; shown = PAGE;
    growingOnly = false; grow.setAttribute("aria-pressed", false); drawList();
    app.querySelector("#all-title").scrollIntoView({ block: "start" });
  };
  dirsEl.onclick = e => {
    const b = e.target.closest("[data-dir]");
    if (!b) return;
    const key = b.dataset.dir;
    if (opened.has(key)) opened.delete(key); else opened.add(key);
    drawDirs();
    if (!opened.has(key)) dirsEl.querySelector(`[data-key="${key}"]`)?.scrollIntoView({ block: "start" });
  };
  drawDirs(); drawList();
  save.bind(app, T, S, restore);
}

function profileBlock(sum) {
  const v = k => (S.sliders[k] || 3) - 3;
  const rows = [
    [T.results.loves, sum.loves.map(a => AREAS[a].name)],
    [T.results.hooks, sum.hooks.map(k => HOOKS[k].name)],
    [T.results.energizers, sum.energizers.map(k => SLIDERS[k].text)],
    [T.results.drainers, sum.drainers.map(k => SLIDERS[k].text)],
    [T.results.leanings, sum.leanings.map(k => T.results.rather(Math.abs(v(k)) === 2, v(k) > 0 ? SLIDERS[k].right : SLIDERS[k].left))],
    [T.results.meaning, sum.meaning.map((m, r) => `${r + 1}. ${MEANING[m].title}`)],
  ].filter(([, items]) => items.length);
  return `<div class="card profile">${rows.map(([label, items]) => `<div class="prow"><span class="k">${label}</span><div class="tags">${items.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>`).join("")}</div>`;
}

function directionBlock(g, n, p, all, card) {
  const [a, b] = g.areas;
  const name = x => lower(AREAS[x].name), love = x => p.feel[x] === "love";
  const why = b == null ? T.results.dirOne(name(a), love(a)) : T.results.dirTwo(name(a), love(a), name(b), love(b));
  const tries = b == null ? AREAS[a].try : [...AREAS[a].try.slice(0, 2), AREAS[b].try[0]];
  const jobs = all ? g.jobs : g.jobs.slice(0, SHOWN);
  return html`
  <section class="direction" data-key="${g.key}">
    <div class="dir-head">
      <p class="eyebrow">${T.results.direction(n)}</p>
      <h3>${g.areas.map(x => esc(AREAS[x].name)).join(` <span class="plus">+</span> `)}</h3>
      <p class="muted small">${esc(why)} ${T.results.dirCount(g.jobs.length)}</p>
    </div>
    <div class="jobs">${jobs.map(r => card(r, "h4")).join("")}</div>
    ${g.jobs.length > SHOWN ? `<div class="row"><button class="btn ghost" data-dir="${g.key}">${all ? T.results.showFewer : T.results.showAll(g.jobs.length)}</button></div>` : ""}
    <div class="try"><h4>${T.results.tryTitle}</h4><ul>${tries.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
  </section>`;
}

// Loves no direction is named after, so a missing love isn't a mystery: the closest job for each and, when that job
// ranks outside the top quarter, what holds it back (its main "worth knowing" reason, or else its weakest part).
// Loves that share a closest job share a line.
function unplacedBlock(model, res, dirs, list) {
  if (!list.length) return "";
  const R = T.results, lines = new Map();
  for (const x of list) {
    const key = x.r ? x.r.i : -1;
    if (!lines.has(key)) lines.set(key, { r: x.r, areas: [] });
    lines.get(key).areas.push(x.area);
  }
  const line = r => {
    if (!r) return esc(R.unplacedNone);
    const n = dirs.findIndex(g => g.jobs.some(x => x.i === r.i));
    let why;
    if (n >= 0) why = R.unplacedIn(n + 1);
    else if (["top", "strong", "good"].includes(r.band)) why = R.unplacedAlone;
    else {
      const watch = order(reasons(model, res, r, S).watch, WATCH_FIRST)[0];
      const weakest = Object.keys(R.unplacedParts).sort((x, y) => (r.parts[x + "Pct"] ?? 50) - (r.parts[y + "Pct"] ?? 50))[0];
      why = watch ? R.unplacedBack(lower(reasonText(model, watch, res.profile, false))) : R.unplacedPart(R.unplacedParts[weakest]);
    }
    const job = `<a class="find-job" href="#/results" data-find="${esc(r.job.title)}">${esc(r.job.title)}</a>`;
    return `${R.unplacedJob(job, esc(lower(EN.results.band[r.band])))} ${esc(why)}`;
  };
  return html`
  <div class="card unplaced">
    <h3>${R.unplacedTitle}</h3>
    <p class="muted small">${R.unplacedLede}</p>
    <ul>${[...lines.values()].map(({ r, areas }) => `<li><b>${areas.map(a => esc(AREAS[a].name)).join(" · ")}.</b> ${line(r)}</li>`).join("")}</ul>
  </div>`;
}

function jobCard(model, res, r, have, tag) {
  const j = r.job, p = res.profile;
  const why = reasons(model, res, r, S);
  const aka = (j.modernTitles || []).filter(t => t.toLowerCase() !== j.title.toLowerCase()).slice(0, 4);
  const day = model.rowDay.get(r.i), tried = day != null && S.days.some(d => d.i === day);
  const items = [
    ...order(why.good, GOOD_FIRST).slice(0, REASONS.good).map(x => ["good", reasonText(model, x, p, true)]),
    ...order(why.watch, WATCH_FIRST).slice(0, REASONS.watch).map(x => ["watch", reasonText(model, x, p, false)]),
  ];
  const tasks = model.jobs[r.i].tasks;
  return html`
  <article class="job">
    <${tag}>${esc(j.title)}</${tag}>
    ${aka.length ? `<p class="aka">${EN.results.aka} ${aka.map(esc).join(EN.results.list)}</p>` : ""}
    <div class="badges">
      <span class="badge band-${r.band}" title="${EN.results.bandTitle}">${EN.results.band[r.band]}</span>
      <span class="badge">${EN.zones.long[j.jobZone]}</span>
      ${have ? `<span class="badge ${j.jobZone <= have ? "ready" : ""}">${j.jobZone <= have ? EN.results.fitsNow : EN.results.needsMore}</span>` : ""}
      ${j.outlook?.bright ? `<span class="badge grow" title="${EN.results.growTitle}">${EN.results.growBadge}</span>` : ""}
      ${j.outlook?.declining ? `<span class="badge shrink" title="${EN.results.shrinkTitle}">${EN.results.shrinkBadge}</span>` : ""}
    </div>
    ${items.length ? `<ul class="reasons">${items.map(([k, t]) => `<li class="${k}"><span class="sr">${k === "good" ? T.results.good : T.results.watch}: </span>${esc(t)}</li>`).join("")}</ul>` : ""}
    ${outlookLine(j.outlook?.projection)}
    ${aiLine(j.ai)}
    <details><summary>${T.results.moreAbout}</summary>
      <div class="why">
        <p class="small muted">${T.results.partsHead}</p>
        <div class="fits four">
          ${["love", "hooks", "energy", "meaning"].map(k => { const v = r.parts[k + "Pct"]; return `<div class="fit"><div class="lbl"><span>${T.results.parts[k]}</span></div><div class="bar"><div style="width:${v == null ? 0 : Math.max(2, v)}%"></div></div></div>`; }).join("")}
        </div>
        <p class="muted">${esc(j.description)}</p>
        ${day != null ? `<p><b>${tried ? T.results.snapshot : T.results.snapshotAny}.</b> ${esc(DAYS[day][1])}</p>` : ""}
        ${tasks.length ? `<p><b>${T.results.tasks}</b></p><ul>${tasks.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        <a href="https://www.onetonline.org/link/summary/${j.code}" target="_blank" rel="noopener">${EN.results.onet}</a>
      </div>
    </details>
  </article>`;
}

function reasonText(model, x, p, good) {
  switch (x.kind) {
    case "areas": return T.why.areas(x.areas.map(a => ({ name: lower(AREAS[a].name), feel: p.feel[a] })));
    case "hobby": return T.why.hobby(lower(hobbyName(x.hobby)), x.hobby.work === 1);
    case "meaning": return T.why.meaning(lower(MEANING[x.card].title));
    case "day": { const title = model.jobs[model.dayRow[x.day]].job.title; return good ? T.why.dayLoved(x.same, title) : T.why.dayNo(x.same, title); }
    case "no": return T.why.no(lower(AREAS[x.area].name));
    case "energy": {
      const s = SLIDERS[x.slider], w = T.energyWords[s.key];
      if (s.kind === "bi") return x.c > 0 ? T.why.side(w.job[x.high ? 1 : 0]) : T.why.against(w.job[x.high ? 1 : 0], w.want[x.v > 0 ? 1 : 0]);
      if (x.v > 0) return x.high ? T.why.lots(w) : T.why.lacks(w);
      return x.high ? T.why.heavy(w) : T.why.little(w);
    }
  }
  return "";
}

// US projection figures and AI exposure, worded as on the main site's job cards (see app/main.js).
function outlookLine(p) {
  if (!p || p.changePct == null) return "";
  const R = EN.results, period = jobsMeta.projections?.period || "";
  const sign = p.changePct > 0 ? "+" : p.changePct < 0 ? "−" : "";
  const parts = [`<b class="${p.changePct >= 5 ? "up" : p.changePct < 0 ? "down" : ""}">${R.growth(sign + Math.abs(p.changePct))}</b>`];
  if (p.openings) parts.push(R.openings(EN.big(Math.round(p.openings / 100) * 100)));
  if (p.wage) parts.push(R.wage(EN.big(Math.round(p.wage / 10) * 10), p.wageAtLeast));
  return `<p class="outlook small" title="${esc(R.outlookTitle)}"><span class="muted">${R.outlookUS(period)}</span> ${parts.join(" · ")}${p.group === true ? `<br><span class="muted">${R.outlookShared}</span>` : p.group ? `<br><span class="muted">${R.outlookGroup}</span> ${esc(p.group)}` : ""}</p>`;
}

function aiLine(ai) {
  if (!ai || ai.potential == null) return "";
  const R = EN.results, pct = x => String(Math.round(x * 100));
  const parts = [R.aiPotential(pct(ai.potential))];
  if (ai.observed != null) parts.push(R.aiObserved(pct(ai.observed)));
  return `<p class="outlook small ai" title="${esc(R.aiTitle)}"><span class="muted">${R.aiLabel}</span> ${parts.join(" · ")} <a href="#/method" class="muted">ⓘ</a></p>`;
}

function method() {
  render(`<section class="method">${T.method}</section>`);
}

// ---------- saving and starting over ----------
function restore(st) {
  if (hasAnswers(S) && !confirm(T.save.replace)) return;
  S = { ...blank(), ...st };
  persist();
  advance();
}

app.addEventListener("click", e => {
  if (e.target.closest("[data-act]")?.dataset.act !== "reset") return;
  if (confirm(T.intro.resetConfirm)) { S = blank(); persist(); go("#/"); }
});

// Screen shortcuts, except while typing, and except Enter or Space on a focused button, which the browser turns into
// a click of that button.
document.addEventListener("keydown", e => {
  if (!keyHandler || e.target.closest("input, textarea, select")) return;
  if ((e.key === "Enter" || e.key === " ") && e.target.closest("button, a, summary")) return;
  keyHandler(e);
});

// ---------- router ----------
function route() {
  keyHandler = null;
  const h = location.hash.replace(/^#/, "") || "/";
  const screens = {
    "/loves": lovesScreen, "/hooks": hooksScreen, "/life": lifeScreen, "/cards": cardsScreen, "/top": topScreen,
    "/energy": energyScreen, "/meaning": meaningScreen, "/training": trainingScreen, "/days": daysScreen,
    "/results": resultsScreen, "/method": method,
  };
  (screens[h] || intro)();
  fromBack = false;
}

function chrome() {
  document.querySelector(".sky").innerHTML = `<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">${starfield(11, 1600, 1000, { count: 380, band: true, scale: 1.6 })}</svg>`;
  document.querySelector(".top nav").innerHTML = `<a href="${new URL("./", ROOT).href}">${T.nav.home}</a><a href="#/method">${T.nav.method}</a>`;
  document.querySelector(".foot").innerHTML = `<p>${T.footer.areas}</p><p>${EN.footer.onet}</p><p>${T.footer.privacy}</p>`;
}

chrome();
save.init({ status: st => ({ done: [0, 1, 2, 3, 4].filter(k => partDone(k, st)).length, complete: !firstOpen(st) }) });
load();
window.addEventListener("hashchange", route);
route();
