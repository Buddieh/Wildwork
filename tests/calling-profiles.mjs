// Made-up people run through the Calling scoring, to check that the results make sense and to tune the weights.
// Run: node tests/calling-profiles.mjs [--verbose]
// Each person states what they'd say on every part of the test, and what we'd expect near the top. The try-on part
// is simulated from the person's own results before it (see react below).

import fs from "node:fs";
import { AREAS, AREA_INDEX, HOOK_INDEX, HOBBIES, SLIDERS, MEANING, DAYS_TOTAL } from "../app/calling/content.js";
import { DAYS } from "../app/calling/days.js";
import { prepare, score, directions, unplaced, nextDay, reasons, summary, REACTIONS } from "../app/calling/score.js";

const read = p => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const model = prepare(read("data/calling.json"), read("data/jobs.json"));
const verbose = process.argv.includes("--verbose");

const hobby = (name, work, hooks) => {
  const i = HOBBIES.findIndex(h => h.name === name);
  if (i < 0) throw new Error(`no hobby "${name}"`);
  return { i, work: { yes: 1, maybe: 2, keep: 3 }[work], hooks: hooks.map(k => HOOK_INDEX[k]) };
};
const known = (i, what) => { if (i == null || i < 0) throw new Error(`no ${what}`); return i; };
const area = k => known(AREA_INDEX[k], `interest area "${k}"`);
const cards = (love = [], like = [], no = []) => {
  const out = {};
  for (let a = 0; a < AREAS.length; a++) out[a] = 3; // "not really" unless said otherwise
  for (const k of like) out[area(k)] = 2;
  for (const k of love) out[area(k)] = 1;
  for (const k of no) out[area(k)] = 4;
  return out;
};
const sliders = o => Object.fromEntries(SLIDERS.map((s, k) => [k, o[s.key] ?? 3]));
const meaning = keys => keys.map(k => known(MEANING.findIndex(m => m.key === k), `purpose card "${k}"`));
const top = keys => keys.map(area);

const PEOPLE = [
  { name: "Maya, music first",
    st: { cards: cards(["music", "perform"], ["teach", "media"], ["account", "manual"]), top: top(["music", "perform"]),
      hobbies: [hobby("Playing an instrument", "yes", ["make", "master", "perform"]), hobby("Singing or choir", "maybe", ["perform", "team"])],
      life: [[2, 13], [3], [4]], sliders: sliders({ stage: 5, freedom: 5, public: 4, body: 4, variety: 5, deadlines: 2, compete: 2, heights: 1, machines: 1 }),
      meaning: meaning(["beauty", "learners", "freedom"]), zone: 5 },
    expect: ["27-2042.00", "27-2041.00"] },
  { name: "Sam, animals and outdoors, no medicine",
    st: { cards: cards(["animals", "nature"], ["farm", "lifesci", "teach"], ["health", "office"]), top: top(["animals", "nature"]),
      hobbies: [hobby("Caring for pets", "yes", ["help"]), hobby("Training dogs", "yes", ["teach", "master"]), hobby("Hiking", "keep", ["explore"])],
      life: [[4, 12], [12], [6]], sliders: sliders({ outdoors: 5, hands: 4, public: 2, body: 5, home: 1 }),
      meaning: meaning(["nature", "people"]), zone: 3 },
    expect: ["39-2011.00", "39-2021.00"] },
  { name: "Priya, code and data, no selling",
    st: { cards: cards(["it", "math", "eng"], ["physsci"], ["sales", "perform", "speak"]), top: top(["it", "math", "eng"]),
      hobbies: [hobby("Coding side projects", "yes", ["figure", "make", "alone"]), hobby("Chess, poker or strategy games", "keep", ["compete", "figure"]),
        hobby("Building things with AI tools", "yes", ["make", "explore"])],
      life: [[1, 10], [1, 5], [0, 11]], sliders: sliders({ home: 5, body: 1, public: 1, stage: 1, freedom: 5, ai: 5, deadlines: 2 }),
      meaning: meaning(["knowledge", "things", "freedom"]), zone: 5 },
    expect: ["15-1252.00", "15-2051.00", "15-1221.00"] },
  { name: "Diego, builds things by hand",
    st: { cards: cards(["build", "mech"], ["drive", "manual"], ["office", "account"]), top: top(["build", "mech"]),
      hobbies: [hobby("Woodworking or carpentry", "yes", ["make", "master"]), hobby("Fixing bikes, cars or motorcycles", "yes", ["figure", "make"]), hobby("Motorcycles", "keep", ["explore"])],
      life: [[0], [0], [0, 1]], sliders: sliders({ hands: 5, outdoors: 4, body: 5, home: 1, public: 2 }),
      meaning: meaning(["things", "freedom"]), zone: 3 },
    expect: ["47-2111.00", "49-9071.00", "51-7011.00"] },
  { name: "Lena, care and support",
    st: { cards: cards(["health", "social"], ["teach", "advise"], ["it", "math"]), top: top(["health", "social"]),
      hobbies: [hobby("Caring for an older or ill relative", "yes", ["help"]), hobby("Yoga or Pilates", "maybe", ["master"]), hobby("Listening to friends and giving advice", "yes", ["help"])],
      life: [[6], [2, 10], [8, 15]], sliders: sliders({ public: 4, team: 5, upset: 3, body: 4, home: 1 }),
      meaning: meaning(["people", "learners"]), zone: 5 },
    expect: ["29-1141.00", "29-1122.00", "21-1014.00"] },
  { name: "Omar, deals and growth",
    st: { cards: cards(["venture", "sales", "market"], ["finance", "manage"], []), top: top(["venture", "sales", "market"]),
      hobbies: [hobby("A small business on the side, or an online shop", "yes", ["compete", "lead", "make"]), hobby("Reselling vintage or second-hand finds", "yes", ["compete"]),
        hobby("Investing, trading or crypto", "maybe", ["figure"])],
      life: [[11, 7], [13], [9]], sliders: sliders({ compete: 5, freedom: 5, public: 4, deadlines: 4, stage: 4, lead: 5, variety: 5 }),
      meaning: meaning(["growth", "freedom"]), zone: 4 },
    expect: ["11-2022.00", "11-2021.00", "41-9022.00"] },
  { name: "Ana, words and stories",
    st: { cards: cards(["write", "media", "human"], ["art"], ["drive", "manual", "mech"]), top: top(["write", "human", "media"]),
      hobbies: [hobby("Writing stories, poems or fan fiction", "yes", ["make", "alone"]), hobby("Reading novels", "keep", ["explore"]), hobby("Podcasting", "maybe", ["make", "perform"])],
      life: [[2, 8], [6], [3, 10]], sliders: sliders({ home: 5, body: 1, public: 2, freedom: 5 }),
      meaning: meaning(["beauty", "knowledge"]), zone: 4 },
    expect: ["27-3043.00", "27-3041.00"] },
  { name: "Kai, outdoors and adrenaline",
    st: { cards: cards(["sport", "nature", "protect"], ["manual"], ["office", "account", "finance"]), top: top(["protect", "nature", "sport"]),
      hobbies: [hobby("Climbing or bouldering", "yes", ["master", "compete"]), hobby("Swimming, surfing or diving", "keep", ["explore"]), hobby("Martial arts or boxing", "maybe", ["master"])],
      life: [[4, 5], [10], [7]], sliders: sliders({ outdoors: 5, heights: 5, machines: 4, body: 5, compete: 4, team: 4, variety: 5 }),
      meaning: meaning(["safe", "people"]), zone: 3 },
    expect: ["33-2011.00", "33-9092.00", "33-3031.00"] },
  { name: "Mei, design and visuals",
    st: { cards: cards(["design", "art"], ["it", "market"], []), top: top(["design", "art"]),
      hobbies: [hobby("Graphic design or making posters", "yes", ["make", "master"]), hobby("Decorating or room makeovers", "maybe", ["make"]), hobby("Photography", "keep", ["explore"])],
      life: [[2], [7], [2]], sliders: sliders({ home: 4, freedom: 5, body: 2, deadlines: 2 }),
      meaning: meaning(["beauty", "things"]), zone: 4 },
    expect: ["27-1024.00", "27-1011.00"] },
  { name: "Robin, music but never on stage",
    st: { cards: cards(["music"], ["media", "it"], ["perform", "speak"]), top: top(["music"]),
      hobbies: [hobby("Making beats or producing music", "yes", ["make", "alone", "master"])],
      life: [[2], [], []], sliders: sliders({ stage: 1, public: 1, home: 4 }),
      meaning: meaning(["beauty"]), zone: 4 },
    expect: ["27-4014.00", "29-1129.02"], notTop3: ["27-2042.00", "27-2091.00"] },
  { name: "Alex, likes a bit of everything",
    st: { cards: cards([], ["teach", "it", "design", "nature", "sales", "health", "music", "food"], []), hobbies: [], life: [[], [], []],
      sliders: sliders({}), meaning: [], zone: 5 },
    expect: [] },
  { name: "Jo, cook",
    st: { cards: cards(["food"], ["service", "venture"], ["it"]), top: top(["food"]),
      hobbies: [hobby("Cooking", "yes", ["make", "master"]), hobby("Hosting dinners or parties", "yes", ["help", "team"])],
      life: [[9], [11], [14]], sliders: sliders({ body: 5, hands: 5, deadlines: 4, team: 4 }),
      meaning: meaning(["beauty", "people"]), zone: 3 },
    expect: ["35-1011.00", "35-2014.00", "51-3011.00"] },
];

const title = r => r.job.title;
const reach = st => r => r.job.jobZone <= Math.max(st.zone || 5, 2);
let failures = 0;

// Simulated try-on: a person whose reactions agree with the rest of their answers loves a day from their top 3% of
// jobs, finds one from their top 15% OK, and turns down the rest. Jobs mostly about an area they said "definitely not" to
// (rated 4.6 of 7 or more) are always turned down.
function react(st, code, before) {
  const r = before.ranked.find(x => x.code === code), n = before.ranked.length;
  const s = model.jobs[r.i].s;
  if (Object.entries(st.cards).some(([a, v]) => v === 4 && s[a] >= 0.6)) return 3;
  return r.rank <= 0.03 * n ? 1 : r.rank <= 0.15 * n ? 2 : 3;
}

for (const person of PEOPLE) {
  const st = { ...person.st, days: [] };
  const before = score(model, st);
  for (let k = 0; k < DAYS_TOTAL; k++) {
    const d = nextDay(model, st, reach(st));
    if (d == null) break;
    st.days.push({ i: d, r: react(st, DAYS[d][0], before) });
  }
  const res = score(model, st);
  const pass = reach(st);
  const shown = res.ranked.filter(pass);
  const top10 = shown.slice(0, 10);
  const dirs = directions(model, res, pass);
  console.log(`\n=== ${person.name}`);
  console.log("before try-on:", before.ranked.filter(pass).slice(0, 5).map(title).join("; "));
  console.log("days tried:", st.days.map(d => `${DAYS[d.i][0]} ${model.jobs[model.row.get(DAYS[d.i][0])].job.title} [${["", "love", "ok", "no"][d.r]}]`).join(" | "));
  console.log("top 10:", top10.map(r => `${title(r)} (${r.score.toFixed(2)})`).join("; "));
  console.log("directions:", dirs.map(g => `${g.areas.map(a => AREAS[a].name).join(" + ")}: ${g.jobs.slice(0, 3).map(r => `${title(r)} [${r.band}]`).join(", ")}`).join("\n            "));
  const left = unplaced(model, res, dirs, st, pass);
  if (left.length) console.log("loves without a direction:", left.map(u => `${AREAS[u.area].name}: ${u.r ? `${title(u.r)} [${u.r.band}]` : "none in reach"}`).join("; "));
  if (verbose) {
    const s = summary(st);
    console.log("summary:", JSON.stringify(s));
    for (const r of top10.slice(0, 3)) console.log("  why", title(r), JSON.stringify(reasons(model, res, r, st)), JSON.stringify(r.parts, (k, v) => typeof v === "number" ? +v.toFixed(2) : v));
  }
  const top15 = shown.slice(0, 15).map(r => r.code);
  const missing = person.expect.filter(c => !top15.includes(c));
  if (missing.length) { failures++; console.log("!! expected in top 15 but missing:", missing.map(c => `${c} ${model.jobs[model.row.get(c)].job.title} (#${res.ranked.find(r => r.code === c).rank})`).join("; ")); }
  if (dirs.length < 3 && person.expect.length) { failures++; console.log("!! fewer than 3 directions"); }
  const top3 = shown.slice(0, 3).map(r => r.code);
  const wrong = (person.notTop3 || []).filter(c => top3.includes(c));
  if (wrong.length) { failures++; console.log("!! should not be in the top 3:", wrong.join(", ")); }
  // Rules that hold for everyone. A day tried for a job settles that job, and its reasons cite no other day.
  for (const d of st.days) {
    const r = res.byRow[model.dayRow[d.i]];
    if (r.tryOn !== REACTIONS[d.r]) { failures++; console.log(`!! ${title(r)} was tried, but its try-on is ${r.tryOn.toFixed(2)}`); }
    const why = reasons(model, res, r, st);
    if ([...why.good, ...why.watch].some(x => x.kind === "day" && !x.same)) { failures++; console.log(`!! ${title(r)} was tried, but its reasons cite another day`); }
  }
  // Only cards marked "Love it" are called loves, and a love listed as without a direction really has none.
  const sum = summary(st), named = new Set(dirs.flatMap(g => g.areas));
  if (sum.loves.some(a => st.cards[a] !== 1)) { failures++; console.log("!! the summary calls an area a love that wasn't marked Love it"); }
  if (left.some(u => named.has(u.area) || !sum.areas.includes(u.area))) { failures++; console.log("!! a love listed as without a direction has one, or isn't in the top five"); }
}
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
