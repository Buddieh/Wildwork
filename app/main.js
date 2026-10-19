import { scorePersonality, scoreInterests } from "../questionnaire/scoring.js";
import { ANIMALS, DOMAINS, DOMAIN_INFO, FACET_INFO, rankAnimals } from "./animals.js";
import { constellationSvg } from "./constellation.js";
import { matchJobs, workStyleProfile, interestLabel, personalityLabel, styleHighlights, WEIGHTS } from "./match.js";

const app = document.getElementById("app");
const STORE_KEY = "wildwork-v1";
const RIASEC_COLORS = { R: "#fb923c", I: "#38bdf8", A: "#f472b6", S: "#4ade80", E: "#fbbf24", C: "#a78bfa" };
const ZONE_LABELS = { 1: "Little or no preparation", 2: "Some preparation", 3: "Medium preparation", 4: "Considerable preparation", 5: "Extensive preparation" };
const ZONE_SHORT = { 1: "No prep", 2: "Some prep", 3: "Medium prep", 4: "Degree", 5: "Advanced degree" };
const PAGE = 20;

let D;          // loaded data
let S = blank(); // the visitor's own state
let view = null; // results being shown (own or shared)
let jobsPromise;

function blank() {
  return { person: {}, p: {}, i: {}, jobZone: null, pIndex: 0, iIndex: 0 };
}

// ---------- storage (best effort: private windows may block it) ----------
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) S = { ...blank(), ...JSON.parse(raw) }; } catch {}
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch {}
}

// ---------- data ----------
async function getJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

async function loadData() {
  const [personality, norms, interests, wsMap] = await Promise.all([
    getJSON("questionnaire/personality.json"),
    getJSON("questionnaire/norms-ipip-neo-120.json"),
    getJSON("questionnaire/interests.json"),
    getJSON("questionnaire/workstyles-map.json"),
  ]);
  const ids = Object.keys(ANIMALS);
  const art = Object.fromEntries(await Promise.all(ids.map(async id => [id, await getJSON(`app/constellations/${id}.json`)])));
  personality.items.sort((a, b) => a.n - b.n);
  interests.items.sort((a, b) => a.n - b.n);
  return { personality, norms, interests, wsMap, art };
}

function loadJobs() {
  jobsPromise ||= getJSON("data/jobs.json");
  return jobsPromise;
}

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ordinal = n => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const pctText = p => ordinal(Math.max(1, Math.min(99, Math.round(p))));
const html = (strings, ...vals) => strings.reduce((out, s, i) => out + s + (i < vals.length ? vals[i] ?? "" : ""), "");

function render(markup) {
  app.innerHTML = markup;
  window.scrollTo(0, 0);
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}

function go(hash) {
  if (location.hash === hash) route(); else location.hash = hash;
}

function personalityDone(st = S) { return D.personality.items.every(it => st.p[it.id]); }
function interestsDone(st = S) { return D.interests.items.every(it => st.i[it.id]) && st.jobZone; }

function art(id, opts = {}) {
  const a = D.art[id];
  return constellationSvg(id, a, a.color, { title: `${ANIMALS[id].name} constellation`, ...opts });
}

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

async function share() {
  const url = location.href.split("#")[0] + encodeShare(S);
  const animal = ANIMALS[computePersonality(S).animals[0].id].name;
  const text = `I'm a ${animal} on Wildwork. Find your animal and your work:`;
  try {
    if (navigator.share) { await navigator.share({ title: "Wildwork", text, url }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(url); toast("Link copied"); }
  catch { prompt("Copy this link:", url); }
}

// ---------- screens ----------
function home() {
  const started = Object.keys(S.p).length > 0;
  const pDone = personalityDone();
  const iDone = interestsDone();
  const picks = ["fox", "owl", "dolphin"];
  let cta;
  if (iDone) cta = `<a class="btn primary" href="#/results">See my results</a><a class="btn ghost" href="#/animal">My animal</a>`;
  else if (pDone) cta = `<a class="btn primary" href="#/career">Continue to the career quiz</a><a class="btn ghost" href="#/animal">My animal</a>`;
  else if (started) cta = `<a class="btn primary" href="#/personality">Continue (${Object.keys(S.p).length} of ${D.personality.items.length})</a>`;
  else cta = `<a class="btn primary" href="#/start">Find my animal</a>`;
  if (started) cta += `<button class="btn ghost" data-act="reset">Start over</button>`;

  render(html`
  <section class="hero">
    <div>
      <p class="eyebrow">A personality and career quiz</p>
      <h1>Find your animal, then find your work.</h1>
      <p class="lede">Answer two well-tested questionnaires. Your personality draws your animal in the stars, and your interests plus your personality pick out real jobs that fit.</p>
      <div class="row">${cta}</div>
    </div>
    <div class="hero-art">${picks.map(id => art(id, { size: 120 })).join("")}</div>
  </section>
  <section class="steps">
    <div class="card"><p class="num">Part 1 · about 15 minutes</p><h3>Your animal</h3><p class="muted">116 statements from the IPIP-NEO-120, a free scientific Big Five test. You get your scores on five traits and 29 facets, and the animal whose pattern is closest to yours.</p></div>
    <div class="card"><p class="num">Part 2 · about 6 minutes</p><h3>Your work</h3><p class="muted">60 activities from the US Department of Labor's O*NET Interest Profiler. Your interests (70%) and personality (30%) are matched against 900+ real occupations.</p></div>
  </section>
  <p class="muted small">Your progress saves in this browser, so you can stop and come back. <a href="#/animals">Meet all 16 animals</a> · <a href="#/method">How it works</a></p>
  `);
}

function start() {
  const { age, sex } = S.person;
  render(html`
  <section class="quiz stack">
    <h2>Before you start</h2>
    <p class="muted">Personality scores are compared with people of your age and sex, because averages differ between groups. Both questions are optional; without them you're compared with adults aged 21 to 40 of both sexes.</p>
    <div class="field"><label for="age">Age</label><input id="age" type="number" inputmode="numeric" min="10" max="99" value="${age ?? ""}" placeholder="Optional"></div>
    <fieldset class="field"><legend>Sex</legend><div class="chips" id="sex">
      ${[["female", "Female"], ["male", "Male"], ["", "Prefer not to say"]].map(([v, l]) => `<button class="chip" data-v="${v}" aria-pressed="${(sex || "") === v}">${l}</button>`).join("")}
    </div></fieldset>
    <div class="card">
      <h3>How to answer</h3>
      <p class="muted">${esc(D.personality.instructions)}</p>
      <p class="muted small">Go with your first reaction. There are no right answers, and answering honestly is what makes the result accurate.</p>
    </div>
    <div class="row"><button class="btn primary" data-act="begin">Start the questions</button></div>
  </section>`);
  app.querySelectorAll("#sex .chip").forEach(b => b.onclick = () => {
    app.querySelectorAll("#sex .chip").forEach(x => x.setAttribute("aria-pressed", x === b));
  });
}

function quiz(kind) {
  const isP = kind === "personality";
  const items = isP ? D.personality.items : D.interests.items;
  const scale = isP ? D.personality.scale : D.interests.scale;
  const answers = isP ? S.p : S.i;
  const idxKey = isP ? "pIndex" : "iIndex";
  let idx = Math.min(S[idxKey] || 0, items.length - 1);
  // Resume at the first unanswered item.
  const firstOpen = items.findIndex(it => !answers[it.id]);
  if (firstOpen === -1) { finishQuiz(kind); return; }
  if (answers[items[idx].id] && firstOpen >= 0) idx = firstOpen;
  let locked = false;

  const draw = () => {
    const it = items[idx];
    const done = items.filter(x => answers[x.id]).length;
    const text = isP
      ? `<span class="muted">I</span> ${esc(it.text.charAt(0).toLowerCase() + it.text.slice(1))}`
      : esc(it.text);
    app.innerHTML = html`
    <section class="quiz">
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${done}"><div style="width:${(100 * done) / items.length}%"></div></div>
      <p class="count"><span>${isP ? "Part 1 · Personality" : "Part 2 · Work interests"}</span><span>${idx + 1} of ${items.length}</span></p>
      <p class="prompt">${isP ? "How accurately does this describe you?" : "How would you feel about doing this as work?"}</p>
      <h2 class="item" id="item" aria-live="polite">${text}</h2>
      <div class="options" role="group" aria-labelledby="item">
        ${scale.map(o => `<button class="opt" data-v="${o.value}" aria-pressed="${answers[it.id] === o.value}"><span class="key">${o.value}</span>${esc(o.label)}</button>`).join("")}
      </div>
      <div class="quiz-nav">
        <button class="btn ghost" data-nav="back" ${idx === 0 ? "disabled" : ""}>Back</button>
        <button class="btn ghost" data-nav="next" ${answers[it.id] ? "" : "disabled"}>Next</button>
      </div>
      <p class="hint">Keyboard: press 1 to 5 to answer, ← to go back.</p>
    </section>`;
    app.querySelectorAll(".opt").forEach(b => b.onclick = () => choose(+b.dataset.v));
    app.querySelector('[data-nav="back"]').onclick = back;
    app.querySelector('[data-nav="next"]').onclick = next;
  };

  const choose = v => {
    if (locked) return;
    answers[items[idx].id] = v;
    S[idxKey] = idx;
    save();
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
    S[idxKey] = idx; save(); draw();
  };
  const back = () => { if (idx > 0) { idx--; S[idxKey] = idx; save(); draw(); } };

  keyHandler = e => {
    if (e.target.closest("input, textarea, select")) return;
    if (e.key >= "1" && e.key <= "5") choose(+e.key);
    else if (e.key === "ArrowLeft") back();
    else if (e.key === "ArrowRight" || e.key === "Enter") next();
  };
  draw();
  window.scrollTo(0, 0);
  if (!isP) loadJobs();
}

let keyHandler = null;
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
    <h2>Quick check before your animal</h2>
    <p>Some of your answers didn't agree with each other as much as usual${q.longestSameAnswerRun > 10 ? `, and ${q.longestSameAnswerRun} answers in a row were the same` : ""}. That often happens when people go fast or skim, and it makes the result less trustworthy.</p>
    <p class="muted">You can change any answer, start the personality part again, or carry on with these answers.</p>
    <div class="row">
      <a class="btn primary" href="#/personality-review">Review my answers</a>
      <button class="btn" data-act="retake-p">Start part 1 again</button>
      <button class="btn ghost" data-act="ack-quality">Show my animal anyway</button>
    </div>
  </section>`);
}

function careerIntro() {
  if (!personalityDone()) { go("#/personality"); return; }
  if (Object.keys(S.i).length) { quiz("interests"); return; }
  render(html`
  <section class="quiz stack">
    <p class="eyebrow">Part 2 · Work interests</p>
    <h2>Now, what kind of work would you enjoy?</h2>
    <p class="muted">${esc(D.interests.instructions)}</p>
    <p class="muted small">60 short activities, about 6 minutes. Some sound old-fashioned (they are the official O*NET items, kept word for word because they are the best-tested ones); just ask yourself whether you'd like that kind of task.</p>
    <div class="row"><button class="btn primary" data-act="begin-i">Start part 2</button></div>
  </section>`);
  loadJobs();
}

function zone() {
  const f = D.interests.filters.job_zone;
  render(html`
  <section class="quiz stack">
    <p class="eyebrow">Last question</p>
    <h2>${esc(f.question)}</h2>
    <p class="muted small">This doesn't change your scores. It hides jobs that need more preparation than you want, and you can change it on the results page.</p>
    <div class="options">
      ${f.options.map(o => `<button class="opt" data-z="${o.value}" aria-pressed="${S.jobZone === o.value}"><span class="key">${o.value}</span>${esc(o.label)}</button>`).join("")}
    </div>
  </section>`);
  app.querySelectorAll("[data-z]").forEach(b => b.onclick = () => { S.jobZone = +b.dataset.z; save(); go("#/results"); });
}

function traitBlock(res, d, color) {
  const dom = res.domains[d], info = DOMAIN_INFO[d];
  const facets = D.personality.facets.filter(f => f.domain === d);
  return html`
  <div class="trait">
    <div class="trait-head"><h3>${info.name} <span class="muted small" style="font-family:var(--sans);font-weight:400">· ${info.plain}</span></h3>
      <span class="pct">${pctText(dom.percentile)}<small>percentile</small></span></div>
    ${meter(dom, color)}
    <div class="poles"><span>${info.low}</span><span>${info.high}</span></div>
    <details class="facets"><summary>${facets.length} facets</summary>
      ${facets.map(f => { const r = res.facets[f.id]; return r ? `
        <div class="facet"><span><span class="fn">${esc(f.name)}</span><span class="fd">${esc(FACET_INFO[f.id])}</span></span>${meter(r, color)}<span class="fp">${Math.round(r.percentile)}</span></div>` : ""; }).join("")}
      <p class="muted small" style="margin-top:8px">The shaded band shows the likely range given how precise each scale is. Wider bands mean less certainty.</p>
    </details>
  </div>`;
}

function meter(r, color) {
  const [lo, hi] = r.band95;
  return `<div class="meter" aria-label="${Math.round(r.percentile)}th percentile, likely range ${Math.round(lo)} to ${Math.round(hi)}"><span class="mid"></span><span class="band" style="left:${lo}%;width:${hi - lo}%;background:${color}"></span><span class="dot" style="left:${r.percentile}%;background:${color}"></span></div>`;
}

function animalScreen(st, shared) {
  if (!personalityDone(st)) { go("#/personality"); return; }
  const { res, z, pct, animals } = computePersonality(st);
  const top = animals[0], a = ANIMALS[top.id], color = D.art[top.id].color;
  const blend = animals.filter(x => x.share >= 0.05).slice(0, 4);
  const why = Object.entries(a.proto).sort((x, y) => Math.abs(z[y[0]]) - Math.abs(z[x[0]]))
    .map(([d, s]) => `${DOMAIN_INFO[d].name} ${s > 0 ? "high" : "low"} (yours: ${pctText(pct[d])} percentile)`);
  const sharedBanner = shared ? `<div class="banner"><span>You're looking at someone's shared result.</span><a class="btn primary" href="#/">Find your own animal</a></div>` : "";

  render(html`
  ${sharedBanner}
  <section class="reveal">
    <div class="art">${art(top.id, { size: 340, animate: true, percentiles: pct })}</div>
    <div>
      <p class="eyebrow">${shared ? "Their animal" : "Your animal"}</p>
      <h1>The ${a.name}</h1>
      <p class="tagline">${a.tagline}</p>
      <div class="blend" aria-hidden="true">${blend.map(b => `<span style="width:${b.share * 100}%;background:${D.art[b.id].color}"></span>`).join("")}</div>
      <div class="blend-legend">${blend.map(b => `<span><i style="background:${D.art[b.id].color}"></i>${Math.round(b.share * 100)}% ${ANIMALS[b.id].name}</span>`).join("")}</div>
      <p style="margin-top:16px">${a.about}</p>
      <p class="muted small">${why.length ? `Why the ${a.name}: ${why.join("; ")}.` : "Why the Raccoon: none of your five traits is far from average, so the balanced animal fits you best."}</p>
      ${res.quality.flagged ? `<p class="notice small">Some answers looked inconsistent, so treat this result with extra caution. <a href="#/personality-review">Review answers</a></p>` : ""}
    </div>
  </section>

  <section class="section lists">
    <div class="card"><h3>Strengths</h3><ul>${a.strengths.map(s => `<li>${s}</li>`).join("")}</ul></div>
    <div class="card"><h3>Watch out for</h3><ul>${a.watch.map(s => `<li>${s}</li>`).join("")}</ul></div>
  </section>

  <section class="section">
    <h2>${shared ? "Their" : "Your"} five traits</h2>
    <p class="muted">The five bright stars in the constellation are these traits; the higher the score, the bigger the star. Percentiles compare with ${res.normGroup.sex === "combined" ? "adults" : res.normGroup.sex === "male" ? "men" : "women"} aged ${res.normGroup.age.replace("<21", "under 21").replace(">60", "over 60")} in a large, mostly US online sample.</p>
    <div class="card">${DOMAINS.map(d => traitBlock(res, d, color)).join("")}</div>
  </section>

  <section class="section row">
    ${shared
      ? (interestsDone(st) ? `<a class="btn primary" href="${location.hash.replace("#/r/", "#/rj/")}">See their job matches</a>` : "")
      : `${interestsDone() ? `<a class="btn primary" href="#/results">See my job matches</a>` : `<a class="btn primary" href="#/career">Next: find your work</a>`}
         <button class="btn" data-act="share">Share my animal</button>`}
    <a class="btn ghost" href="#/animals">Meet all 16 animals</a>
  </section>`);
}

function zoneFilterChips(active) {
  return [1, 2, 3, 4, 5].map(z => `<button class="chip" data-zone="${z}" aria-pressed="${active.has(z)}" title="${ZONE_LABELS[z]}">${ZONE_SHORT[z]}</button>`).join("");
}

async function resultsScreen(st, shared) {
  if (!personalityDone(st)) { go("#/personality"); return; }
  if (!interestsDone(st)) { go(shared ? "#/" : "#/career"); return; }
  render(`<p class="loading">Matching you against 900+ occupations…</p>`);
  const jobsData = await loadJobs();
  const { res } = computePersonality(st);
  const interests = scoreInterests(D.interests, st.i);
  const styles = workStyleProfile(res, D.personality, D.wsMap);
  const matches = matchJobs(jobsData.jobs, interests.raw, styles);
  const types = Object.fromEntries(D.interests.types.map(t => [t.id, t]));
  const order = Object.entries(interests.raw).sort((a, b) => b[1] - a[1]);
  const zones = new Set([1, 2, 3, 4, 5].filter(z => z <= (st.jobZone || 5)));
  let growingOnly = false, query = "", shown = PAGE;

  const code = order.slice(0, 3).map(([k], i) => `${k}${interests.tiedWithNext[i] && i < 2 ? "<span class='muted'>=</span>" : ""}`).join("");

  render(html`
  ${shared ? `<div class="banner"><span>You're looking at someone's shared result.</span><a class="btn primary" href="#/">Take the quiz yourself</a></div>` : ""}
  <section>
    <p class="eyebrow">${shared ? "Their" : "Your"} work interests</p>
    <div class="row" style="justify-content:space-between;align-items:flex-end">
      <h1 style="margin:0">Interest code <span class="code">${code}</span></h1>
    </div>
    <p class="muted">Holland (RIASEC) scores from 10 to 50. ${order.slice(0, 3).map(([k]) => `<b>${types[k].name}</b>: ${esc(types[k].summary.split(":")[1] || types[k].summary).trim()}`).join(". ")}.</p>
    ${interests.flat ? `<p class="notice small">Your six interest scores are close together, so no type clearly leads. Matches below rely more on small differences than usual; treat them as a starting list to explore.</p>` : ""}
    ${interests.tiedWithNext.slice(0, 2).some(Boolean) && !interests.flat ? `<p class="muted small">"=" marks scores within 3 points of each other, which is too close to call; their order could swap if you took the test again.</p>` : ""}
    <div class="card riasec">
      ${order.map(([k, v]) => `<div class="ri"><span class="n">${types[k].name}<small>${esc(types[k].summary.split(":")[0])}</small></span><div class="bar"><div style="width:${((v - 10) / 40) * 100}%;background:${RIASEC_COLORS[k]}"></div></div><span class="v">${Math.round(v)}</span></div>`).join("")}
    </div>
  </section>

  <section class="section">
    <h2>Jobs that fit ${shared ? "them" : "you"}</h2>
    <p class="muted">Ranked by how well each occupation's interest profile matches ${shared ? "theirs" : "yours"} (${WEIGHTS.interests * 100}%) and how well ${shared ? "their" : "your"} personality fits the work styles it needs (${WEIGHTS.personality * 100}%). Treat the top 20 or so as a shortlist to explore, not a strict order.</p>
    <div class="filters">
      <div><p class="small muted" style="margin-bottom:6px">Preparation needed</p><div class="chips" id="zones">${zoneFilterChips(zones)}</div></div>
      <div class="row"><input type="search" id="q" placeholder="Search jobs" aria-label="Search jobs"><button class="chip" id="grow" aria-pressed="false">Growing fast in the US</button></div>
    </div>
    <div class="jobs" id="jobs"></div>
    <div class="more" id="more"></div>
  </section>

  <section class="section row">
    <a class="btn" href="${shared ? location.hash.replace("#/rj/", "#/r/") : "#/animal"}">${shared ? "Their" : "My"} animal</a>
    ${shared ? "" : `<button class="btn" data-act="share">Share my results</button><button class="btn ghost" data-act="retake-i">Redo part 2</button>`}
  </section>`);

  const list = app.querySelector("#jobs"), more = app.querySelector("#more");
  const drawJobs = () => {
    const q = query.trim().toLowerCase();
    const filtered = matches.filter(m => zones.has(m.job.jobZone) && (!growingOnly || m.job.outlook?.bright) &&
      (!q || m.job.title.toLowerCase().includes(q) || m.job.modernTitles.some(t => t.toLowerCase().includes(q))));
    list.innerHTML = filtered.slice(0, shown).map(m => jobCard(m, interests, styles, types)).join("") ||
      `<p class="muted">No jobs match these filters.</p>`;
    more.innerHTML = filtered.length > shown ? `<button class="btn" id="more-btn">Show more (${filtered.length - shown} left)</button>` : "";
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
  app.querySelector("#q").oninput = e => { query = e.target.value; shown = PAGE; drawJobs(); };
  drawJobs();
}

function jobCard(m, interests, styles, types) {
  const j = m.job;
  const iPct = Math.max(0, Math.min(100, (m.interestR + 1) * 50));
  const pPct = m.personalityPct ?? 0;
  const jobTop = Object.entries(j.riasec).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const youTop = Object.entries(interests.raw).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const shared = jobTop.filter(k => youTop.includes(k));
  const hl = styleHighlights(styles, j.workStyles);
  const level = z => (z >= 0.35 ? "high" : z <= -0.35 ? "low" : "average");
  const aka = j.modernTitles.filter(t => t.toLowerCase() !== j.title.toLowerCase()).slice(0, 4);
  return html`
  <article class="job">
    <div class="job-top">
      <span class="rank">${m.rank}</span>
      <div>
        <h3>${esc(j.title)}</h3>
        ${aka.length ? `<p class="aka">Also called: ${aka.map(esc).join(", ")}</p>` : ""}
        <div class="badges">
          ${j.outlook?.bright ? `<span class="badge grow" title="O*NET Bright Outlook: projected to grow quickly or have many openings in the US">Growing</span>` : ""}
          <span class="badge" title="O*NET Job Zone ${j.jobZone}">${ZONE_LABELS[j.jobZone]}</span>
        </div>
        <div class="fits">
          <div class="fit"><div class="lbl"><span>Interests</span><b>${interestLabel(m.interestR)}</b></div><div class="bar"><div style="width:${iPct}%"></div></div></div>
          <div class="fit" title="Compared with your fit for other occupations"><div class="lbl"><span>Personality</span><b>${personalityLabel(m.personalityPct)}</b></div><div class="bar"><div style="width:${pPct}%;background:#818cf8"></div></div></div>
        </div>
        <details><summary>Why it fits</summary>
          <div class="why">
            <p class="muted">${esc(j.description)}</p>
            <p><b>Interests.</b> This job is mostly ${jobTop.map(k => types[k].name).join(", ")}${shared.length ? `; it shares ${shared.map(k => types[k].name).join(" and ")} with your top three` : "; none of these is in your top three, but the overall shape of the profiles is similar"}.</p>
            ${hl.length ? `<p><b>Work styles that matter most here,</b> and where you stand:</p><ul>${hl.map(h => `<li>${esc(h.style)}: you're ${level(h.z)}</li>`).join("")}</ul>` : `<p class="muted">O*NET hasn't rated the work styles for this occupation yet, so only interests were used.</p>`}
            <a href="https://www.onetonline.org/link/summary/${j.code}" target="_blank" rel="noopener">Full details on O*NET OnLine</a>
          </div>
        </details>
      </div>
    </div>
  </article>`;
}

function gallery() {
  render(html`
  <section>
    <h1>The 16 animals</h1>
    <p class="muted">Each animal stands for a pattern of Big Five scores. You get the one whose pattern is closest to yours, and the result shows how much of each nearby animal you are.</p>
    <div class="gallery">
      ${Object.entries(ANIMALS).map(([id, a]) => `<figure>${art(id, { size: 140 })}<figcaption>${a.name}<small>${esc(a.tagline)}</small></figcaption></figure>`).join("")}
    </div>
    <p class="section"><a class="btn primary" href="${personalityDone() ? "#/animal" : "#/start"}">${personalityDone() ? "Back to my animal" : "Find my animal"}</a></p>
  </section>`);
}

function method() {
  render(html`
  <section class="method">
    <h1>How Wildwork works</h1>
    <p class="muted">Short version: two published, well-tested questionnaires, scored the way their authors score them, and matched to real US Department of Labor occupation data. No AI guesswork.</p>
    <h2>Part 1: personality</h2>
    <ul>
      <li>The <b>IPIP-NEO-120</b> (Johnson, 2014), a public-domain measure of the Big Five traits and their facets. Items are used word for word. The four items of the Liberalism facet were removed because they ask about US politics, so Openness is scored from its other five facets.</li>
      <li>Scores are compared with published norms for your age band and sex (or averaged norms if you skip those questions). The norm sample is a large group of mostly US volunteers online.</li>
      <li>Every score shows a likely range based on the scale's reliability. A quick consistency check flags answer patterns that look rushed.</li>
    </ul>
    <h2>Your animal</h2>
    <ul>
      <li>Each of the 16 animals is a prototype pattern of the five traits (for example, the Fox is high in Openness and low in Agreeableness). You get the animal whose pattern is closest to your scores, and the blend bar shows how close the runners-up are.</li>
      <li>The animal is a friendly summary. The trait and facet scores underneath are the accurate part.</li>
      <li>The five bright stars in your constellation are your five traits, sized by your scores.</li>
    </ul>
    <h2>Part 2: work interests</h2>
    <ul>
      <li>The <b>O*NET Interest Profiler Short Form</b>, 60 items, from the US Department of Labor. It measures the six Holland (RIASEC) interest types. Items are used word for word.</li>
      <li>Scores within 3 points are shown as ties, and a flat profile is flagged rather than forced into a top type.</li>
    </ul>
    <h2>Job matching</h2>
    <ul>
      <li><b>Interest fit (70%)</b>: the correlation between your six interest scores and each occupation's O*NET interest ratings, using the whole profile rather than just the top letter.</li>
      <li><b>Personality fit (30%)</b>: your facet scores are translated into O*NET's 21 work styles and compared with how much each style helps performance in the occupation. Less reliable facets count for less. The label shows how this job ranks for you among all occupations, because most work styles help in most jobs. The facet-to-style translation is our own content-based mapping and hasn't been tested empirically.</li>
      <li>Both parts are put on the same scale across all occupations before weighting. Interests carry more weight because they predict job choice and satisfaction more strongly than personality.</li>
      <li>The preparation filter uses O*NET Job Zones. The "Growing" badge is O*NET's Bright Outlook flag for the US and is never part of the score.</li>
      <li>The job list comes from the latest O*NET database (refreshed monthly), including the modern titles employers use in postings.</li>
    </ul>
    <h2>Limits worth knowing</h2>
    <ul>
      <li>Self-report tests describe how you see yourself. Answer as you are, not as you'd like to be.</li>
      <li>Norms, job zones and growth data are US-based.</li>
      <li>A good match means "worth exploring", not "you'll love it". Talk to people who do the job.</li>
    </ul>
    <p class="muted small">Full research notes: <a href="https://github.com/Buddieh/Wildwork/blob/main/questionnaire/ANALYSIS.md">ANALYSIS.md</a>.</p>
  </section>`);
}

// ---------- actions ----------
app.addEventListener("click", e => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (!act) return;
  if (act === "begin") {
    const age = parseInt(app.querySelector("#age").value, 10);
    const sex = app.querySelector('#sex [aria-pressed="true"]')?.dataset.v;
    S.person = { age: age >= 10 && age <= 99 ? age : undefined, sex: sex || undefined };
    save(); go("#/personality");
  } else if (act === "begin-i") { quiz("interests"); }
  else if (act === "share") share();
  else if (act === "ack-quality") { S.qualityAck = true; save(); go("#/animal"); }
  else if (act === "retake-p") { if (confirm("Clear your personality answers and start part 1 again?")) { S.p = {}; S.pIndex = 0; S.qualityAck = false; save(); go("#/personality"); } }
  else if (act === "retake-i") { if (confirm("Clear your work-interest answers and redo part 2?")) { S.i = {}; S.iIndex = 0; S.jobZone = null; save(); go("#/career"); } }
  else if (act === "reset") { if (confirm("Clear all your answers and start over?")) { S = blank(); save(); go("#/"); } }
});

// ---------- router ----------
function route() {
  keyHandler = null;
  const h = location.hash.replace(/^#/, "") || "/";
  const shared = h.match(/^\/(r|rj)\/(.+)$/);
  if (shared) {
    const st = decodeShare(shared[2]);
    if (!st) { render(`<p class="loading">This share link looks broken. <a href="#/">Take the quiz</a></p>`); return; }
    view = st;
    return shared[1] === "r" ? animalScreen(st, true) : resultsScreen(st, true);
  }
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
      <p class="count"><span>Reviewing your answers</span><span>${idx + 1} of ${items.length}</span></p>
      <p class="prompt">How accurately does this describe you?</p>
      <h2 class="item"><span class="muted">I</span> ${esc(it.text.charAt(0).toLowerCase() + it.text.slice(1))}</h2>
      <div class="options">${D.personality.scale.map(o => `<button class="opt" data-v="${o.value}" aria-pressed="${S.p[it.id] === o.value}"><span class="key">${o.value}</span>${esc(o.label)}</button>`).join("")}</div>
      <div class="quiz-nav"><button class="btn ghost" data-nav="back" ${idx === 0 ? "disabled" : ""}>Back</button><button class="btn ghost" data-nav="done">Done reviewing</button><button class="btn ghost" data-nav="next">Next</button></div>
    </section>`;
    app.querySelectorAll(".opt").forEach(b => b.onclick = () => { S.p[it.id] = +b.dataset.v; save(); step(1); });
    app.querySelector('[data-nav="back"]').onclick = () => step(-1);
    app.querySelector('[data-nav="next"]').onclick = () => step(1);
    app.querySelector('[data-nav="done"]').onclick = () => { S.qualityAck = true; save(); go("#/animal"); };
  };
  const step = d => { idx += d; if (idx >= items.length) { S.qualityAck = true; save(); go("#/animal"); return; } idx = Math.max(0, idx); draw(); };
  keyHandler = e => {
    if (e.key >= "1" && e.key <= "5") { S.p[items[idx].id] = +e.key; save(); step(1); }
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  };
  draw();
  window.scrollTo(0, 0);
}

(async () => {
  try {
    D = await loadData();
  } catch (err) {
    render(`<p class="loading">Couldn't load the questionnaire. Please refresh the page.</p>`);
    console.error(err);
    return;
  }
  load();
  window.addEventListener("hashchange", route);
  route();
})();
