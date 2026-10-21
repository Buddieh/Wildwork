"""Build data/jobs.json from the latest O*NET database, O*NET OnLine's Bright Outlook list, the BLS employment
projections, and the researched list of current job titles in data/market_titles.json.

Run: python3 data/build_jobs.py [--version 31_0] [--source DIR] [--bls-dir DIR]
With --source, reads already-downloaded CSVs from DIR instead of the network.
With --bls-dir, reads occupation.xlsx and nem-onet-to-soc-crosswalk.xlsx from DIR instead of the network.
No dependencies beyond the standard library.
"""

import argparse
import csv
import io
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import date
from pathlib import Path

DB_INDEX = "https://www.onetcenter.org/database.html"
DB_ZIP = "https://www.onetcenter.org/dl_files/database/db_{v}_csv.zip"
BRIGHT_CSV = "https://www.onetonline.org/find/bright/All_Bright_Outlook_Occupations.csv?b=0&fmt=csv"
BLS_PROJECTIONS = "https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx"
BLS_PROJECTIONS_PAGE = "https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm"
BLS_CROSSWALK = "https://www.bls.gov/emp/classifications-crosswalks/nem-onet-to-soc-crosswalk.xlsx"
UA = {"User-Agent": "Wildwork job-data builder (https://github.com/Buddieh/Wildwork)"}

RIASEC = {"Realistic": "R", "Investigative": "I", "Artistic": "A", "Social": "S", "Enterprising": "E", "Conventional": "C"}
JOB_POSTINGS_SOURCE = "10"  # Source code for titles taken from employer job postings
MAX_MODERN_TITLES = 5
SKIP_WORDS = {"intern", "internship", "trainee", "student"}

OUT = Path(__file__).with_name("jobs.json")
MARKET = Path(__file__).with_name("market_titles.json")


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


def xlsx_sheets(blob):
    """Every sheet of an .xlsx file as {sheet name: list of rows of strings}, using only the standard library."""
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
    z = zipfile.ZipFile(io.BytesIO(blob))
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % ns["m"])))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    out = {}
    for sh in ET.fromstring(z.read("xl/workbook.xml")).find("m:sheets", ns):
        target = rels[sh.get("{%s}id" % ns["r"])].lstrip("/")
        path = target if target.startswith("xl/") else "xl/" + target
        table = []
        for row in ET.fromstring(z.read(path)).iter("{%s}row" % ns["m"]):
            cells = {}
            for c in row.findall("m:c", ns):
                col = re.match(r"[A-Z]+", c.get("r", "A")).group()
                idx = 0
                for ch in col:
                    idx = idx * 26 + ord(ch) - 64
                v = c.find("m:v", ns)
                if c.get("t") == "s" and v is not None:
                    val = shared[int(v.text)]
                elif c.get("t") == "inlineStr":
                    val = "".join(t.text or "" for t in c.iter("{%s}t" % ns["m"]))
                else:
                    val = v.text if v is not None else ""
                cells[idx - 1] = (val or "").strip()
            table.append([cells.get(i, "") for i in range(max(cells) + 1)] if cells else [])
        out[sh.get("name")] = table
    return out


def find_table(tables, *needles):
    """The first sheet whose header row has a cell matching each needle; returns (header keys, data rows)."""
    for table in tables:
        for i, row in enumerate(table[:15]):
            heads = [key(c) for c in row]
            if all(any(n in h for h in heads) for n in needles):
                return heads, table[i + 1:]
    return None, []


def column(heads, *needles):
    for i, h in enumerate(heads):
        if all(n in h for n in needles):
            return i
    return None


def number(text):
    t = re.sub(r"[^0-9.\-]", "", text or "")
    try:
        return float(t)
    except ValueError:
        return None


def html_table(html):
    """Rows of the first data table on a BLS page, as lists of cell text (fallback when the .xlsx is unavailable)."""
    rows_ = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I):
        cells = [re.sub(r"<[^>]+>|&nbsp;", " ", c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S | re.I)]
        rows_.append([re.sub(r"\s+", " ", c.replace("&amp;", "&")).strip() for c in cells])
    return rows_


def load_bls(folder=None):
    """BLS national projections keyed by National Employment Matrix code, and the O*NET-SOC -> matrix crosswalk.

    Returns (projections, crosswalk, period) or (None, None, None) if BLS can't be reached.
    """
    def get(url, name):
        if folder:
            p = Path(folder) / name
            return p.read_bytes() if p.exists() else None
        try:
            return fetch(url)
        except OSError as e:
            print(f"BLS file unavailable ({url}):", e, file=sys.stderr)
            return None

    tables = []
    blob = get(BLS_PROJECTIONS, "occupation.xlsx")
    if blob:
        try:
            sheets = xlsx_sheets(blob)
            # Table 1.2 (occupational projections and worker characteristics) first, then any sheet that fits.
            tables = [t for n, t in sheets.items() if "1.2" in n] + list(sheets.values())
        except (zipfile.BadZipFile, KeyError, ET.ParseError) as e:
            print("Could not read the BLS workbook:", e, file=sys.stderr)
    heads, data = find_table(tables, "matrixcode", "employmentchangepercent", "openings")
    if not heads:
        page = get(BLS_PROJECTIONS_PAGE, "occupational-projections-and-characteristics.htm")
        if page:
            heads, data = find_table([html_table(page.decode("utf-8", "replace"))], "matrixcode", "employmentchangepercent", "openings")
    if not heads:
        print("BLS projections unavailable, continuing without them", file=sys.stderr)
        return None, None, None

    c_code, c_title, c_type = column(heads, "matrixcode"), column(heads, "matrixtitle"), column(heads, "occupationtype")
    c_pct, c_open, c_wage = column(heads, "employmentchangepercent"), column(heads, "openings"), column(heads, "medianannualwage")
    c_emp = next(i for i, h in enumerate(heads) if h.startswith("employment") and re.fullmatch(r"employment\d{4}", h))
    years = re.search(r"(\d{4})(\d{2,4})$", heads[c_pct])  # "...percent202535" -> 2025-35
    period = f"{years[1]}-{years[2][-2:]}" if years else None
    proj = {}
    for r in data:
        r = r + [""] * (len(heads) - len(r))
        code = r[c_code]
        if not re.fullmatch(r"\d\d-\d{4}", code):
            continue
        wage = r[c_wage] if c_wage is not None else ""
        proj[code] = {
            "nem": code,
            "nemTitle": r[c_title] if c_title is not None else "",
            "summary": c_type is not None and r[c_type].lower().startswith("summary"),
            "employment": round(number(r[c_emp]) * 1000) if number(r[c_emp]) is not None else None,  # BLS reports thousands
            "changePct": number(r[c_pct]),
            "openings": round(number(r[c_open]) * 1000) if number(r[c_open]) is not None else None,
            "wage": number(wage),
            "wageAtLeast": wage.startswith(">") or "≥" in wage,
        }

    cross = {}
    blob = get(BLS_CROSSWALK, "nem-onet-to-soc-crosswalk.xlsx")
    if blob:
        try:
            ch, cdata = find_table(list(xlsx_sheets(blob).values()), "onet", "code")
            if ch:
                c_onet = column(ch, "onet", "code")
                c_nem = next((i for i, h in enumerate(ch) if "code" in h and i != c_onet and ("matrix" in h or "nem" in h)), None)
                if c_nem is None:
                    c_nem = next((i for i, h in enumerate(ch) if "code" in h and i != c_onet and "soc" in h), None)
                for r in cdata:
                    if c_nem is not None and len(r) > max(c_onet, c_nem) and r[c_onet] and r[c_nem]:
                        cross[r[c_onet]] = r[c_nem]
        except (zipfile.BadZipFile, KeyError, ET.ParseError) as e:
            print("Could not read the BLS crosswalk:", e, file=sys.stderr)
    return proj, cross, period


def nem_for(code, proj, cross):
    """The BLS matrix row for an O*NET-SOC code: the official crosswalk first, then the SOC code, then the BLS
    aggregate that ends in 0 (e.g. 13-1020 for 13-1022). Broader groups are too coarse to be useful."""
    soc = code.split(".")[0]
    return next((proj[c] for c in (cross.get(code), soc, soc[:-1] + "0") if c in proj), None)


def singular(t):
    return re.sub(r"s$", "", t.lower().strip())


def plain_title(title, job):
    """Skip titles that only restate the official one or describe trainee positions."""
    words = set(re.findall(r"[a-z]+", title.lower()))
    return title and singular(title) != singular(job["title"]) and not words & SKIP_WORDS


def build(src, bright_text, version, bls=(None, None, None), market=None):
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

    proj, cross, period = bls
    with_projection = 0
    if proj:
        by_nem = {}
        for job in jobs.values():
            row = nem_for(job["code"], proj, cross or {})
            if row:
                by_nem.setdefault(row["nem"], []).append(job["code"])
                job["outlook"]["projection"] = {k: row[k] for k in ("nem", "changePct", "openings", "wage", "wageAtLeast")}
                with_projection += 1
        # When several occupations share one BLS row, the numbers describe the wider group; say which.
        for nem, codes in by_nem.items():
            if len(codes) > 1:
                for c in codes:
                    jobs[c]["outlook"]["projection"]["group"] = proj[nem]["nemTitle"]

    if market:
        for t in market.get("rising", []):
            job = jobs.get(t["code"])
            if job and t["title"] not in job.get("trendingTitles", []):
                job.setdefault("trendingTitles", []).append(t["title"])
        for t in market.get("declining", []):
            if t["code"] in jobs:
                jobs[t["code"]]["outlook"]["declining"] = True

    usable = [j for j in jobs.values() if len(j["riasec"]) == 6]
    return {
        "meta": {
            "onetVersion": version.replace("_", "."),
            "built": date.today().isoformat(),
            "workStyleScale": scale,
            "occupations": len(usable),
            "brightOutlook": bright,
            "projections": {"source": "BLS Employment Projections", "period": period, "occupations": with_projection} if proj else None,
            "market": {"updated": market.get("updated"), "sources": market.get("sources", [])} if market else None,
            "credit": "This site incorporates information from O*NET OnLine and the O*NET Database by the U.S. Department of "
                      "Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. "
                      "O*NET(R) is a trademark of USDOL/ETA.",
            "notes": "riasec: O*NET occupational interest ratings, 1-7. jobZone: 1-5 preparation needed. modernTitles: titles "
                     "employers use in job postings. outlook: US Bright Outlook (BLS 2025-2035 projections or O*NET new and "
                     "emerging). outlook.projection: BLS national projections for the matching Employment Matrix row (changePct over "
                     "the period, openings per year, median annual wage in USD; group = the wider BLS group when several "
                     "occupations share a row). trendingTitles: current job titles mapped to this occupation from recent "
                     "job-market research (data/market_titles.json); outlook.declining: named as a declining role there. "
                     "All outlook data is display only, not part of the match score.",
        },
        "jobs": sorted(usable, key=lambda j: j["code"]),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", help="O*NET database version such as 31_0 (default: latest)")
    ap.add_argument("--source", help="folder with O*NET CSV files, for offline builds and tests")
    ap.add_argument("--bright", help="local Bright Outlook CSV, for offline builds and tests")
    ap.add_argument("--bls-dir", help="folder with occupation.xlsx and nem-onet-to-soc-crosswalk.xlsx, for offline builds")
    ap.add_argument("--no-bls", action="store_true", help="skip the BLS projections")
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

    bls = (None, None, None) if a.no_bls or (a.source and not a.bls_dir) else load_bls(a.bls_dir)
    market = json.loads(MARKET.read_text(encoding="utf-8")) if MARKET.exists() else None
    data = build(src, bright_text, version, bls, market)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    m = data["meta"]
    print(f"O*NET {m['onetVersion']}: {m['occupations']} occupations, {m['brightOutlook']} Bright Outlook, work styles scale {m['workStyleScale']}")
    print("BLS projections:", m["projections"] or "none")
    print("Trending titles:", sum(len(j.get("trendingTitles", [])) for j in data["jobs"]), "on", sum(1 for j in data["jobs"] if j.get("trendingTitles")), "occupations")


if __name__ == "__main__":
    main()
