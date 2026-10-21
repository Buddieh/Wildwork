"""Build data/jobs.json from the latest O*NET database, O*NET OnLine's Bright Outlook list and BLS projections,
two research datasets on AI exposure, and the researched list of current job titles in data/market_titles.json.

Run: python3 data/build_jobs.py [--version 31_0] [--source DIR] [--projections FILE] [--ai-dir DIR]
With --source, reads already-downloaded CSVs from DIR instead of the network (and skips projections and AI data
unless --projections / --ai-dir give local copies).
No dependencies beyond the standard library.
"""

import argparse
import csv
import io
import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
import zipfile
from datetime import date
from pathlib import Path

DB_INDEX = "https://www.onetcenter.org/database.html"
DB_ZIP = "https://www.onetcenter.org/dl_files/database/db_{v}_csv.zip"
BRIGHT_CSV = "https://www.onetonline.org/find/bright/All_Bright_Outlook_Occupations.csv?b=0&fmt=csv"
AI_POTENTIAL = "https://raw.githubusercontent.com/openai/GPTs-are-GPTs/main/data/occ_level.csv"
AI_OBSERVED = "https://huggingface.co/datasets/Anthropic/EconomicIndex/resolve/main/labor_market_impacts/job_exposure.csv"
ONET_TRENDS = "https://www.onetonline.org/link/localtrends/{code}"
ONET_SUMMARY = "https://www.onetonline.org/link/summary/{code}"
UA = {"User-Agent": "Wildwork job-data builder (https://github.com/Buddieh/Wildwork)"}

RIASEC = {"Realistic": "R", "Investigative": "I", "Artistic": "A", "Social": "S", "Enterprising": "E", "Conventional": "C"}
JOB_POSTINGS_SOURCE = "10"  # Source code for titles taken from employer job postings
MAX_MODERN_TITLES = 5
SKIP_WORDS = {"intern", "internship", "trainee", "student"}

OUT = Path(__file__).with_name("jobs.json")
MARKET = Path(__file__).with_name("market_titles.json")
PROJECTION_PERIOD = "2025-35"  # the BLS projection cycle O*NET OnLine shows; update when BLS publishes a new one


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def latest_version():
    html = fetch(DB_INDEX).decode("utf-8", "replace")
    versions = re.findall(r"db_(\d+)_(\d+)_", html)
    if not versions:
        sys.exit("Could not find a database version on " + DB_INDEX)
    major, minor = max((int(a), int(b)) for a, b in versions)
    return f"{major}_{minor}"


def key(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def rows(text):
    reader = csv.DictReader(io.StringIO(text))
    for r in reader:
        yield {key(k): (v or "").strip() for k, v in r.items()}


class Source:
    """CSV files from an O*NET database zip, or from a local folder."""

    def __init__(self, version=None, folder=None):
        self.files = {}
        if folder:
            for p in Path(folder).glob("*.csv"):
                self.files[key(p.stem)] = p.read_text(encoding="utf-8-sig")
        else:
            z = zipfile.ZipFile(io.BytesIO(fetch(DB_ZIP.format(v=version))))
            for n in z.namelist():
                if n.lower().endswith(".csv"):
                    self.files[key(Path(n).stem)] = z.read(n).decode("utf-8-sig")

    def get(self, *names):
        for n in names:
            if key(n) in self.files:
                return rows(self.files[key(n)])
        raise SystemExit(f"Missing O*NET file: {names[0]}.csv. Files found: {sorted(self.files)}")


def number(text):
    t = re.sub(r"[^0-9.\-]", "", text or "")
    try:
        return float(t)
    except ValueError:
        return None


def page_fields(html):
    """The label/value pairs (<dt>/<dd>) of an O*NET OnLine report page, as {label key: value text}."""
    out = {}
    for dt, dd in re.findall(r"<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>", html, re.S):
        label = key(re.sub(r"<small.*?</small>|<[^>]+>", " ", dt, flags=re.S))
        out.setdefault(label, re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", dd)).replace("&amp;", "&").strip())
    return out


def projection_for(code):
    """BLS national projections and median pay for one occupation, as shown on O*NET OnLine (BLS's own site refuses
    automated downloads). Returns None if the pages can't be read."""
    try:
        trends = page_fields(fetch(ONET_TRENDS.format(code=code)).decode("utf-8", "replace"))
        summary = page_fields(fetch(ONET_SUMMARY.format(code=code)).decode("utf-8", "replace"))
    except OSError as e:
        print(f"O*NET OnLine page unavailable for {code}:", e, file=sys.stderr)
        return None
    now, later = number(trends.get("employment", "")), number(trends.get("projectedemployment", ""))
    if not now or later is None:
        return None
    wage = summary.get("medianwages", "")
    annual = re.search(r"\$([\d,]+\+?) annual", wage)
    return {
        "employment": int(now),
        "changePct": round((later - now) / now * 100, 1),
        "openings": int(number(trends.get("projectedannualjobopenings", "")) or 0) or None,
        "wage": number(annual.group(1)) if annual else None,
        "wageAtLeast": bool(annual and annual.group(1).endswith("+")),
    }


def load_projections(codes):
    """Projections for each 6-digit SOC group among the given O*NET-SOC codes, read from one O*NET page per group
    (the figures are per SOC group, so subgroups like 15-1299.08 share them). Returns ({soc: figures}, period)."""
    first = {}
    for c in sorted(codes):
        first.setdefault(c.split(".")[0], c)
    with ThreadPoolExecutor(max_workers=4) as pool:
        found = dict(zip(first, pool.map(projection_for, first.values())))
    found = {soc: p for soc, p in found.items() if p}
    if len(found) < len(first) / 2:
        print(f"Only {len(found)} of {len(first)} projections read, leaving them out", file=sys.stderr)
        return None, None
    return found, PROJECTION_PERIOD


def load_ai(folder=None):
    """AI exposure by occupation from two research datasets, or None for each one that can't be reached.

    potential: Eloundou, Manning, Mishkin & Rock (2023/2024, Science), human-rated share of an O*NET occupation's
      tasks that a GPT-4-class model, alone or with tools, could do at least twice as fast (beta), by O*NET-SOC code.
    observed: Anthropic, "Labor market impacts of AI" (March 2026), share of those feasible tasks that showed
      work-related Claude usage in late 2025, automation weighted fully and augmentation half, by 6-digit SOC code.
    """
    def get(url, name):
        if folder:
            p = Path(folder) / name
            return p.read_text(encoding="utf-8-sig") if p.exists() else None
        try:
            return fetch(url).decode("utf-8-sig")
        except OSError as e:
            print(f"AI exposure data unavailable ({url}):", e, file=sys.stderr)
            return None

    potential = observed = None
    text = get(AI_POTENTIAL, "occ_level.csv")
    if text:
        potential = {r["onetsoccode"]: float(r["humanratingbeta"]) for r in rows(text) if number(r.get("humanratingbeta")) is not None}
    text = get(AI_OBSERVED, "job_exposure.csv")
    if text:
        observed = {r["occcode"]: float(r["observedexposure"]) for r in rows(text) if number(r.get("observedexposure")) is not None}
    return potential, observed


def singular(t):
    return re.sub(r"s$", "", t.lower().strip())


def plain_title(title, job):
    """Skip titles that only restate the official one or describe trainee positions."""
    words = set(re.findall(r"[a-z]+", title.lower()))
    return title and singular(title) != singular(job["title"]) and not words & SKIP_WORDS


def build(src, bright_text, version, projections=(None, None), market=None, ai=(None, None)):
    jobs = {}
    for r in src.get("occupation_data"):
        jobs[r["onetsoccode"]] = {"code": r["onetsoccode"], "title": r["title"], "description": r["description"],
                                  "modernTitles": [], "riasec": {}, "jobZone": None, "workStyles": {},
                                  "outlook": {"bright": False, "categories": []}}

    for r in src.get("career_interest_types", "interests"):
        if r["scaleid"] == "OI" and r["onetsoccode"] in jobs and r["elementname"] in RIASEC:
            jobs[r["onetsoccode"]]["riasec"][RIASEC[r["elementname"]]] = float(r["datavalue"])

    for r in src.get("job_zones"):
        if r["onetsoccode"] in jobs:
            jobs[r["onetsoccode"]]["jobZone"] = int(float(r["jobzone"]))

    # O*NET 30.1+ rates work styles by impact (WI, -3..+3); older releases by importance (IM, 1..5).
    styles = list(src.get("work_styles"))
    scale = "WI" if any(r["scaleid"] == "WI" for r in styles) else "IM"
    for r in styles:
        if r["scaleid"] == scale and r["onetsoccode"] in jobs:
            jobs[r["onetsoccode"]]["workStyles"][r["elementname"]] = float(r["datavalue"])

    for r in src.get("job_titles", "alternate_titles"):
        job = jobs.get(r["onetsoccode"])
        sources = {s.strip() for s in r.get("sources", "").split(",")}
        title = r.get("jobtitle") or r.get("alternatetitle", "")
        m = re.fullmatch(r"(.+?)\s*\((.+)\)", title)
        if m:  # "OR Nurse (Operating Room Nurse)" -> the spelled-out half
            title = max(m.groups(), key=len)
        if job and JOB_POSTINGS_SOURCE in sources and plain_title(title, job) and title not in job["modernTitles"]:
            job["modernTitles"].append(title)
    for job in jobs.values():
        # No popularity data in the file, so prefer short, plain titles, but put one-word titles such as
        # "Developer" last because they say little about the job.
        job["modernTitles"] = sorted(job["modernTitles"], key=lambda t: (" " not in t, len(t)))[:MAX_MODERN_TITLES]

    bright = 0
    if bright_text:
        for r in rows(bright_text):
            job = jobs.get(r.get("code", ""))
            if job:
                job["outlook"] = {"bright": True, "categories": [c.strip() for c in re.split(r"[;,]", r.get("categories", "")) if c.strip()]}
                bright += 1

    proj, period = projections
    if proj:
        for job in jobs.values():
            soc = job["code"].split(".")[0]
            if soc in proj:
                job["outlook"]["projection"] = dict(proj[soc])
        # Projections are per SOC group, so subgroups such as 15-1299.08 share them; say which group they describe.
        shared = {}
        for c in jobs:
            shared.setdefault(c.split(".")[0], []).append(c)
        for soc, codes in shared.items():
            if len(codes) > 1 and soc in proj:
                base = jobs.get(soc + ".00")
                for c in codes:
                    if c != soc + ".00":
                        jobs[c]["outlook"]["projection"]["group"] = base["title"] if base else True

    potential, observed = ai
    for job in jobs.values():
        soc = job["code"].split(".")[0]
        entry = {}
        if potential and job["code"] in potential:
            entry["potential"] = round(potential[job["code"]], 3)
        if observed and soc in observed:
            entry["observed"] = round(observed[soc], 3)
        if entry:
            job["ai"] = entry

    if market:
        for t in market.get("rising", []):
            job = jobs.get(t["code"])
            if job and t["title"] not in job.get("trendingTitles", []):
                job.setdefault("trendingTitles", []).append(t["title"])
        for t in market.get("declining", []):
            if t["code"] in jobs:
                jobs[t["code"]]["outlook"]["declining"] = True

    usable = [j for j in jobs.values() if len(j["riasec"]) == 6]
    with_projection = sum(1 for j in usable if "projection" in j["outlook"])
    with_ai = sum(1 for j in usable if "ai" in j)
    return {
        "meta": {
            "onetVersion": version.replace("_", "."),
            "built": date.today().isoformat(),
            "workStyleScale": scale,
            "occupations": len(usable),
            "brightOutlook": bright,
            "projections": {"source": "BLS Employment Projections via O*NET OnLine", "period": period,
                            "occupations": with_projection} if proj else None,
            "ai": {"occupations": with_ai,
                   "potential": "Eloundou et al. (2024), GPTs are GPTs, Science 384:1306; human-rated beta" if potential else None,
                   "observed": "Anthropic (2026), Labor market impacts of AI: observed exposure, Anthropic Economic Index" if observed else None},
            "market": {"updated": market.get("updated"), "sources": market.get("sources", [])} if market else None,
            "credit": "This site incorporates information from O*NET OnLine and the O*NET Database by the U.S. Department of "
                      "Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. "
                      "O*NET(R) is a trademark of USDOL/ETA.",
            "notes": "riasec: O*NET occupational interest ratings, 1-7. jobZone: 1-5 preparation needed. modernTitles: titles "
                     "employers use in job postings. outlook: US Bright Outlook (BLS 2025-2035 projections or O*NET new and "
                     "emerging). outlook.projection: BLS national projections for the occupation's SOC group as shown on O*NET "
                     "OnLine (employment, changePct over the period, openings per year, median annual wage in USD; group = "
                     "the wider occupation the figures describe when several O*NET occupations share them). trendingTitles: current job titles mapped to this occupation from recent "
                     "job-market research (data/market_titles.json); outlook.declining: named as a declining role there. "
                     "ai.potential: share of the occupation's tasks a GPT-4-class model could do at least twice as fast (0-1). "
                     "ai.observed: share of those tasks with work-related AI usage seen in late 2025 (0-1, per SOC code). "
                     "All outlook and AI data is display only, not part of the match score.",
        },
        "jobs": sorted(usable, key=lambda j: j["code"]),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", help="O*NET database version such as 31_0 (default: latest)")
    ap.add_argument("--source", help="folder with O*NET CSV files, for offline builds and tests")
    ap.add_argument("--bright", help="local Bright Outlook CSV, for offline builds and tests")
    ap.add_argument("--projections", help="local JSON of {SOC code: projection}, for offline builds and tests")
    ap.add_argument("--ai-dir", help="folder with occ_level.csv and job_exposure.csv, for offline builds")
    a = ap.parse_args()

    if a.source:
        version, src = a.version or "local", Source(folder=a.source)
    else:
        version = a.version or latest_version()
        src = Source(version=version)
    if a.bright:
        bright_text = Path(a.bright).read_text(encoding="utf-8-sig")
    elif a.source:
        bright_text = None
    else:
        try:
            bright_text = fetch(BRIGHT_CSV).decode("utf-8-sig")
        except OSError as e:
            print("Bright Outlook list unavailable, continuing without it:", e, file=sys.stderr)
            bright_text = None

    if a.projections:
        projections = json.loads(Path(a.projections).read_text()), PROJECTION_PERIOD
    elif a.source:
        projections = None, None
    else:
        projections = load_projections([r["onetsoccode"] for r in src.get("occupation_data")])
        if not projections[0] and OUT.exists():  # keep last month's figures rather than dropping them
            old = json.loads(OUT.read_text(encoding="utf-8"))
            kept = {j["code"].split(".")[0]: {k: v for k, v in j["outlook"]["projection"].items() if k != "group"}
                    for j in old["jobs"] if j["outlook"].get("projection")}
            projections = (kept, (old["meta"].get("projections") or {}).get("period")) if kept else (None, None)
    market = json.loads(MARKET.read_text(encoding="utf-8")) if MARKET.exists() else None
    ai = (None, None) if a.source and not a.ai_dir else load_ai(a.ai_dir)
    data = build(src, bright_text, version, projections, market, ai)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    m = data["meta"]
    print(f"O*NET {m['onetVersion']}: {m['occupations']} occupations, {m['brightOutlook']} Bright Outlook, work styles scale {m['workStyleScale']}")
    print("Projections:", m["projections"] or "none")
    print("AI exposure:", m["ai"])
    print("Trending titles:", sum(len(j.get("trendingTitles", [])) for j in data["jobs"]), "on", sum(1 for j in data["jobs"] if j.get("trendingTitles")), "occupations")


if __name__ == "__main__":
    main()
