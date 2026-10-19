// Saving progress without any server: the visitor's answers are packed into a "star code" and hidden
// inside a PNG "star map" (a tEXt chunk) that they download. Opening the file, or pasting the code,
// restores everything. Nothing leaves the browser.

const KEY = "wildwork";
const PREFIX = "WW1-";
let cfg; // { encode(st) -> digits string, decode(digits) -> st | null, card(st) -> { svg, title, lines[], color } }

export function init(options) { cfg = options; }

// ---------- star code: base-6 digits packed into base64url ----------
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function toCode(st) {
  const digits = cfg.encode(st); // e.g. "<age 2 digits><sex><zone><116 + 60 answer digits>", all 0-5 after mapping
  let n = 1n; // leading 1 keeps leading zeros
  for (const d of digits) n = n * 6n + BigInt(d);
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
  let digits = "";
  while (n > 1n) { digits = String(n % 6n) + digits; n /= 6n; }
  return n === 1n ? cfg.decode(digits) : null;
}

// ---------- PNG text chunks ----------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function withTextChunk(png, keyword, text) {
  const data = new TextEncoder().encode(`${keyword}\0${text}`);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set([116, 69, 88, 116], 4); // "tEXt"
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
  const ihdrEnd = 8 + 25; // signature + IHDR chunk
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, ihdrEnd), 0);
  out.set(chunk, ihdrEnd);
  out.set(png.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return out;
}

function readTextChunk(bytes, keyword) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 8 || view.getUint32(0) !== 0x89504e47) return null;
  for (let p = 8; p + 8 <= bytes.length;) {
    const len = view.getUint32(p);
    const type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
    if (type === "tEXt") {
      const s = new TextDecoder().decode(bytes.subarray(p + 8, p + 8 + len));
      const [k, v] = [s.slice(0, s.indexOf("\0")), s.slice(s.indexOf("\0") + 1)];
      if (k === keyword) return v;
    }
    if (type === "IEND") break;
    p += 12 + len;
  }
  return null;
}

// ---------- the star map card ----------
function loadImage(src) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src; });
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(" "), lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function drawCard(st, T) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const card = cfg.card(st);
  const rtl = T.dir === "rtl";
  const g = ctx.createRadialGradient(W / 2, 360, 50, W / 2, 500, 1100);
  g.addColorStop(0, "#1f2a4d"); g.addColorStop(1, "#070b18");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Background stars, seeded from the code so each map looks a little different.
  let seed = [...card.seed].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let k = 0; k < 260; k++) {
    ctx.globalAlpha = 0.15 + rnd() * 0.6;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 0.6 + rnd() * 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (card.svg) {
    const img = await loadImage(URL.createObjectURL(new Blob([card.svg], { type: "image/svg+xml" })));
    ctx.drawImage(img, 140, 90, 800, 800);
  }
  await document.fonts?.ready;
  ctx.textAlign = "center";
  ctx.direction = rtl ? "rtl" : "ltr";
  const serif = rtl ? "Vazirmatn, Tahoma, sans-serif" : "Fraunces, Georgia, serif";
  const sans = rtl ? "Vazirmatn, Tahoma, sans-serif" : "Inter, system-ui, sans-serif";
  ctx.fillStyle = "#a6adc8"; ctx.font = `600 30px ${sans}`;
  ctx.fillText(card.eyebrow, W / 2, 950);
  ctx.fillStyle = "#fff"; ctx.font = `700 84px ${serif}`;
  ctx.fillText(card.title, W / 2, 1040);
  ctx.fillStyle = card.color; ctx.font = `500 36px ${sans}`;
  wrap(ctx, card.subtitle, 900).slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 1100 + i * 46));
  ctx.fillStyle = "#737b99"; ctx.font = `400 26px ${sans}`;
  ctx.fillText(T.save.cardFooter, W / 2, 1290);
  const blob = await new Promise(r => c.toBlob(r, "image/png"));
  const png = new Uint8Array(await blob.arrayBuffer());
  return new Blob([withTextChunk(png, KEY, toCode(st))], { type: "image/png" });
}

async function downloadMap(st, T) {
  const blob = await drawCard(st, T);
  const name = `wildwork-star-map-${new Date().toISOString().slice(0, 10)}.png`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export async function readFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const code = readTextChunk(bytes, KEY);
  return code ? fromCode(code) : null;
}

// ---------- UI ----------
export function panel(T, st) {
  const has = Object.keys(st.p).length > 0;
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
      <input type="text" name="code" placeholder="WW1-…" aria-label="${T.save.codeLabel}" autocomplete="off" spellcheck="false" dir="ltr">
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
  const accept = restored => {
    if (!restored) { fail(T.save.bad); return; }
    restore(restored);
  };
  box.addEventListener("click", async e => {
    const act = e.target.closest("[data-save]")?.dataset.save;
    if (act === "map") {
      msg.textContent = T.save.making;
      try { await downloadMap(st, T); msg.textContent = T.save.saved; } catch (err) { console.error(err); fail(T.save.mapFailed); }
    } else if (act === "copy") {
      const code = toCode(st);
      try { await navigator.clipboard.writeText(code); msg.textContent = T.save.copied; }
      catch { prompt(T.save.codeLabel, code); }
    } else if (act === "paste") {
      const f = box.querySelector('[data-save="form"]');
      f.hidden = false; f.querySelector("input").focus();
    }
  });
  box.querySelector('[data-save="file"]').addEventListener("change", async e => {
    const file = e.target.files[0];
    if (file) accept(await readFile(file));
  });
  box.querySelector('[data-save="form"]').addEventListener("submit", e => {
    e.preventDefault();
    accept(fromCode(new FormData(e.target).get("code")));
  });
  // Dropping a star map anywhere on the page opens it.
  root.ondragover = e => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); document.body.classList.add("dropping"); } };
  root.ondragleave = () => document.body.classList.remove("dropping");
  root.ondrop = async e => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    document.body.classList.remove("dropping");
    accept(await readFile(e.dataTransfer.files[0]));
  };
}
