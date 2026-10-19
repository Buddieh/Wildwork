"""Build data/jobs.json from the latest O*NET database and O*NET OnLine's Bright Outlook list.

Run: python3 data/build_jobs.py [--version 31_0] [--source DIR]
With --source, reads already-downloaded CSVs from DIR instead of the network.
No dependencies beyond the standard library.
"""

import argparse
import csv
import io
import json
import re
import sys
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

DB_INDEX = "https://www.onetcenter.org/database.html"
DB_ZIP = "https://www.onetcenter.org/dl_files/database/db_{v}_csv.zip"
BRIGHT_CSV = "https://www.onetonline.org/find/bright/All_Bright_Outlook_Occupations.csv?b=0&fmt=csv"
UA = {"User-Agent": "Wildwork job-data builder (https://github.com/Buddieh/Wildwork)"}

RIASEC = {"Realistic": "R", "Investigative": "I", "Artistic": "A", "Social": "S", "Enterprising": "E", "Conventional": "C"}
JOB_POSTINGS_SOURCE = "10"  # Source code for titles taken from employer job postings
MAX_MODERN_TITLES = 5

OUT = Path(__file__).with_name("jobs.json")


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


def build(src, bright_text, version):
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
        title = r.get("jobtitle") or r.get("alternatetitle") or r.get("shorttitle", "")
        if job and JOB_POSTINGS_SOURCE in sources and title.lower() != job["title"].lower() and title not in job["modernTitles"]:
            job["modernTitles"].append(title)
    for job in jobs.values():
        # No popularity data in the file, so prefer short, plain titles.
        job["modernTitles"] = sorted(job["modernTitles"], key=len)[:MAX_MODERN_TITLES]

    bright = 0
    if bright_text:
        for r in rows(bright_text):
            job = jobs.get(r.get("code", ""))
            if job:
                job["outlook"] = {"bright": True, "categories": [c.strip() for c in r.get("categories", "").split(",") if c.strip()]}
                bright += 1

    usable = [j for j in jobs.values() if len(j["riasec"]) == 6]
    return {
        "meta": {
            "onetVersion": version.replace("_", "."),
            "built": date.today().isoformat(),
            "workStyleScale": scale,
            "occupations": len(usable),
            "brightOutlook": bright,
            "credit": "This site incorporates information from O*NET OnLine and the O*NET Database by the U.S. Department of "
                      "Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. "
                      "O*NET(R) is a trademark of USDOL/ETA.",
            "notes": "riasec: O*NET occupational interest ratings, 1-7. jobZone: 1-5 preparation needed. modernTitles: titles "
                     "employers use in job postings. outlook: US Bright Outlook (BLS 2025-2035 projections or O*NET new and "
                     "emerging); display only, not part of the match score.",
        },
        "jobs": sorted(usable, key=lambda j: j["code"]),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", help="O*NET database version such as 31_0 (default: latest)")
    ap.add_argument("--source", help="folder with O*NET CSV files, for offline builds and tests")
    ap.add_argument("--bright", help="local Bright Outlook CSV, for offline builds and tests")
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

    data = build(src, bright_text, version)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    m = data["meta"]
    print(f"O*NET {m['onetVersion']}: {m['occupations']} occupations, {m['brightOutlook']} Bright Outlook, work styles scale {m['workStyleScale']}")


if __name__ == "__main__":
    main()
