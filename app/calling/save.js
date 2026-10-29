// Saving the Calling test without any server, the same way as the main site: the answers are packed into a "calling
// code" and hidden inside a PNG "calling map" that the visitor downloads. Opening the file, or pasting the code,
// restores everything. Nothing leaves the browser.

import { starfield } from "../constellation.js";
import { withTextChunk, readTextChunk, loadImage, wrap } from "../save.js";
import { AREAS, HOBBIES, HOOKS, LIFE, SLIDERS, MEANING } from "./content.js";
import { DAYS } from "./days.js";
import { CUSTOM, profile, summary } from "./score.js";

const KEY = "wildwork-calling";
const PREFIX = "WWC1-";
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
let status = () => ({ done: 0, complete: false }); // set by init: how far the person has got

export function init(options) { status = options.status; }

// ---------- calling code ----------
// Every answer is a number with a fixed range, packed into one big number in mixed radix. The ranges leave room for
// the lists in content.js to grow, so old codes keep working; a new layout would get a new prefix.
//   training now 0-5, most you'd do 0-5, hobbies picked 0-1, life questions done 0-3, top four picked 0-1, purpose ranked 0-1
//   hobbies: count 0-7, then each one's index 0-255 (255 = your own), hooks as 12 bits, as work 0-3,
//            and for your own hobby: area count 0-3 and each area 0-63
//   life: three 20-bit masks · cards: count 0-63 and each answer 0-5 · top four: count 0-4 and each area 0-63
//   energy: count 0-63 and each answer 0-5 · purpose: count 0-15 and each card 0-15
//   workdays: count 0-15, then each one's index 0-511 and reaction 0-3 · a 12-bit checksum of everything before it
function fields(st) {
  const f = [];
  const put = (v, radix) => {
    if (!Number.isInteger(v) || v < 0 || v >= radix) throw new Error(`calling code: ${v} is outside 0-${radix - 1}`);
    f.push([v, radix]);
  };
  const mask = list => (list || []).reduce((m, k) => m | (1 << k), 0);
  put(st.have || 0, 6); put(st.zone || 0, 6);
  put(st.lovesSet ? 1 : 0, 2); put(Math.min(st.lifeAt || 0, 3), 4); put(st.topSet ? 1 : 0, 2); put(st.meaningSet ? 1 : 0, 2);
  const hobbies = (st.hobbies || []).slice(0, 7);
  put(hobbies.length, 8);
  for (const h of hobbies) {
    put(h.i, 256); put(mask(h.hooks), 1 << 12); put(h.work || 0, 4);
    if (h.i === CUSTOM) { const a = (h.areas || []).slice(0, 3); put(a.length, 4); a.forEach(x => put(x, 64)); }
  }
  for (let q = 0; q < 3; q++) put(mask(st.life?.[q]), 1 << 20);
  put(AREAS.length, 64); AREAS.forEach((_, a) => put(st.cards?.[a] || 0, 6));
  const top = (st.top || []).slice(0, 4);
  put(top.length, 5); top.forEach(a => put(a, 64));
  put(SLIDERS.length, 64); SLIDERS.forEach((_, k) => put(st.sliders?.[k] || 0, 6));
  const meaning = (st.meaning || []).slice(0, 15);
  put(meaning.length, 16); meaning.forEach(m => put(m, 16));
  const days = (st.days || []).slice(0, 15);
  put(days.length, 16); days.forEach(d => { put(d.i, 512); put(d.r, 4); });
  put(checksum(f.map(x => x[0])), 4096);
  return f;
}

function checksum(values) {
  let h = 2166136261;
  for (const ch of values.join(",")) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % 4096;
}

export function toCode(st) {
  const f = fields(st);
  let n = 1n; // the leading 1 marks where the number ends
  for (let k = f.length - 1; k >= 0; k--) n = n * BigInt(f[k][1]) + BigInt(f[k][0]);
  let out = "";
  while (n > 0n) { out = B64[Number(n % 64n)] + out; n /= 64n; }
  return PREFIX + out;
}

export function fromCode(code) {
  const body = String(code).trim().replace(/\s+/g, "");
  if (!body.startsWith(PREFIX)) return null;
  let n = 0n;
  for (const ch of body.slice(PREFIX.length)) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    n = n * 64n + BigInt(v);
  }
  const seen = [];
  const get = radix => { const r = BigInt(radix), v = Number(n % r); n /= r; seen.push(v); return v; };
  const bits = (m, size) => { const out = []; for (let k = 0; k < 20; k++) if (m & (1 << k)) { if (k >= size) throw 0; out.push(k); } return out; };
  const check = ok => { if (!ok) throw 0; };
  try {
    const st = { have: get(6) || null, zone: get(6) || null, lovesSet: !!get(2), lifeAt: get(4), topSet: !!get(2), meaningSet: !!get(2) };
    check(!st.have || !st.zone || st.zone >= st.have);
    st.hobbies = Array.from({ length: get(8) }, () => {
      const h = { i: get(256), hooks: bits(get(1 << 12), HOOKS.length), work: get(4) };
      check(h.i === CUSTOM || h.i < HOBBIES.length);
      if (h.i === CUSTOM) { h.areas = Array.from({ length: get(4) }, () => get(64)); check(h.areas.every(a => a < AREAS.length)); }
      return h;
    });
    st.life = LIFE.map(q => bits(get(1 << 20), q.options.length));
    st.cards = {};
    const nCards = get(64);
    for (let a = 0; a < nCards; a++) { const v = get(6); if (v) st.cards[a] = v; }
    check(nCards <= AREAS.length);
    st.top = Array.from({ length: get(5) }, () => get(64));
    check(st.top.every(a => a < AREAS.length) && new Set(st.top).size === st.top.length);
    st.sliders = {};
    const nSliders = get(64);
    for (let k = 0; k < nSliders; k++) { const v = get(6); if (v) st.sliders[k] = v; }
    check(nSliders <= SLIDERS.length);
    st.meaning = Array.from({ length: get(16) }, () => get(16));
    check(st.meaning.every(m => m < MEANING.length) && new Set(st.meaning).size === st.meaning.length);
    st.days = Array.from({ length: get(16) }, () => ({ i: get(512), r: get(4) }));
    check(st.days.every(d => d.i < DAYS.length && d.r >= 1) && new Set(st.days.map(d => d.i)).size === st.days.length);
    const sum = checksum(seen);
    if (get(4096) !== sum || n !== 1n) return null;
    return st;
  } catch { return null; }
}

// ---------- the calling map ----------
// A small constellation of the person's loves: up to five stars, sized by how strongly each area counts, in a shape
// fixed for each number of stars.
const SHAPES = [
  [],
  [[540, 470]],
  [[380, 540], [700, 390]],
  [[320, 580], [560, 330], [790, 540]],
  [[270, 520], [470, 300], [730, 380], [800, 650]],
  [[250, 590], [390, 330], [640, 250], [830, 450], [680, 700]],
];

async function drawCard(st, T) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const { done, complete } = status(st);
  const p = profile(st), sum = summary(st);
  const g = ctx.createRadialGradient(W / 2, 360, 50, W / 2, 500, 1100);
  g.addColorStop(0, "#1f2a4d"); g.addColorStop(1, "#070b18");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const seed = [...sum.areas, ...sum.hooks].reduce((h, x) => Math.imul(h ^ (x + 1), 16777619), 2166136261) >>> 0;
  const sky = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${starfield(seed, W, H, { count: 520, band: true, scale: 2.2 })}</svg>`;
  ctx.drawImage(await loadImage(URL.createObjectURL(new Blob([sky], { type: "image/svg+xml" }))), 0, 0, W, H);
  await document.fonts?.ready;
  const serif = "Fraunces, Georgia, serif", sans = "Inter, system-ui, sans-serif";

  // Loves if there are any, otherwise the areas the person likes, drawn fainter.
  let stars = sum.areas, faint = false;
  if (!stars.length) { stars = [...p.w].map((w, a) => [a, w]).filter(([, w]) => w >= 1).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([a]) => a); faint = true; }
  const pos = SHAPES[stars.length];
  const maxW = Math.max(...stars.map(a => p.w[a]), 1);
  ctx.strokeStyle = faint ? "rgba(255,255,255,.18)" : "rgba(251,191,36,.45)"; ctx.lineWidth = 2.5;
  ctx.beginPath();
  pos.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.textAlign = "center";
  stars.forEach((a, k) => {
    const [x, y] = pos[k], r = 9 + 9 * (p.w[a] / maxW);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    glow.addColorStop(0, faint ? "rgba(255,255,255,.35)" : "rgba(253,224,71,.55)"); glow.addColorStop(1, "rgba(253,224,71,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = faint ? "#cbd5e1" : "#fff7d6"; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = faint ? "#a6adc8" : "#eef0f8"; ctx.font = `600 30px ${sans}`;
    wrap(ctx, AREAS[a].name, 340).slice(0, 2).forEach((l, i) => ctx.fillText(l, x, y + r + 48 + i * 36));
  });

  let title, subtitle = "", line = "";
  if (!complete) { title = T.save.progressTitle; subtitle = T.save.progress(done); }
  else if (sum.areas.length) {
    title = AREAS[sum.areas[0]].name;
    if (sum.areas.length > 1) subtitle = T.save.with(sum.areas.slice(1, 3).map(a => AREAS[a].name));
  } else { title = T.results.stillTitle; subtitle = T.save.stillSub; }
  if (sum.hooks.length) line = T.save.enjoy(sum.hooks.slice(0, 2).map(k => HOOKS[k].name));
  ctx.fillStyle = "#a6adc8"; ctx.font = `600 30px ${sans}`;
  ctx.fillText(T.save.cardEyebrow, W / 2, 930);
  ctx.fillStyle = "#fff"; ctx.font = `700 80px ${serif}`;
  const titleLines = wrap(ctx, title, 960).slice(0, 2);
  titleLines.forEach((l, i) => ctx.fillText(l, W / 2, 1020 + i * 86));
  let y = 1020 + titleLines.length * 86 - 20;
  ctx.fillStyle = "#fbbf24"; ctx.font = `500 36px ${sans}`;
  if (subtitle) wrap(ctx, subtitle, 920).slice(0, 2).forEach(l => { ctx.fillText(l, W / 2, y); y += 46; });
  ctx.fillStyle = "#a6adc8"; ctx.font = `400 30px ${sans}`;
  if (line) wrap(ctx, line, 920).slice(0, 2).forEach(l => { ctx.fillText(l, W / 2, y + 10); y += 40; });
  ctx.fillStyle = "#737b99"; ctx.font = `400 26px ${sans}`;
  ctx.fillText(T.save.cardFooter, W / 2, 1300);
  const blob = await new Promise(r => c.toBlob(r, "image/png"));
  const png = new Uint8Array(await blob.arrayBuffer());
  return new Blob([withTextChunk(png, KEY, toCode(st))], { type: "image/png" });
}

async function downloadMap(st, T) {
  const blob = await drawCard(st, T);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `wildwork-calling-map-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// The restored answers, or a message saying why not (a star map from the main quiz is the common mix-up).
async function readFile(file, T) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const code = readTextChunk(bytes, KEY);
  if (code) return fromCode(code) || T.save.bad;
  return readTextChunk(bytes, "wildwork") ? T.save.starMap : T.save.bad;
}

function readCode(code, T) {
  if (String(code).trim().startsWith("WW1-")) return T.save.starMap;
  return fromCode(code) || T.save.bad;
}

// ---------- UI ----------
export function panel(T, has) {
  return `
  <div class="savebox" id="savebox">
    <div class="savebox-text">
      <h3>${has ? T.save.titleSave : T.save.titleOpen}</h3>
      <p class="muted small">${has ? T.save.leadSave : T.save.leadOpen}</p>
    </div>
    <div class="row">
      ${has ? `<button class="btn primary" data-save="map">${T.save.download}</button><button class="btn" data-save="copy">${T.save.copy}</button>` : ""}
      <label class="btn ${has ? "ghost" : ""}">${T.save.open}<input type="file" accept="image/png" data-save="file" hidden></label>
      <button class="btn ghost" data-save="paste">${T.save.paste}</button>
    </div>
    <form class="paste" data-save="form" hidden>
      <input type="text" name="code" placeholder="WWC1-…" aria-label="${T.save.codeLabel}" autocomplete="off" spellcheck="false" dir="ltr">
      <button class="btn" type="submit">${T.save.go}</button>
    </form>
    <p class="small muted">${T.save.privacy}</p>
    <p class="small" data-save="msg" aria-live="polite"></p>
  </div>`;
}

export function bind(root, T, st, restore) {
  const box = root.querySelector("#savebox");
  if (!box) return;
  const msg = box.querySelector('[data-save="msg"]');
  const fail = text => { msg.textContent = text; msg.classList.add("warn"); };
  const accept = got => (typeof got === "string" ? fail(got) : restore(got));
  box.addEventListener("click", async e => {
    const act = e.target.closest("[data-save]")?.dataset.save;
    if (act === "map") {
      msg.classList.remove("warn"); msg.textContent = T.save.making;
      try { await downloadMap(st, T); msg.textContent = T.save.saved; } catch (err) { console.error(err); fail(T.save.mapFailed); }
    } else if (act === "copy") {
      const code = toCode(st);
      try { await navigator.clipboard.writeText(code); msg.classList.remove("warn"); msg.textContent = T.save.copied; }
      catch { prompt(T.save.codeLabel, code); }
    } else if (act === "paste") {
      const f = box.querySelector('[data-save="form"]');
      f.hidden = false; f.querySelector("input").focus();
    }
  });
  box.querySelector('[data-save="file"]').addEventListener("change", async e => {
    const file = e.target.files[0];
    if (file) accept(await readFile(file, T));
    e.target.value = "";
  });
  box.querySelector('[data-save="form"]').addEventListener("submit", e => {
    e.preventDefault();
    accept(readCode(new FormData(e.target).get("code"), T));
  });
  // Dropping a calling map anywhere on the page opens it.
  root.ondragover = e => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); document.body.classList.add("dropping"); } };
  root.ondragleave = () => document.body.classList.remove("dropping");
  root.ondrop = async e => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    document.body.classList.remove("dropping");
    accept(await readFile(e.dataTransfer.files[0], T));
  };
}
