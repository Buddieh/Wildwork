"""Build data/calling.json, the job data behind the Calling test, from the latest O*NET database.

For every occupation in data/jobs.json it stores:
  areas    O*NET's 41 specific interest areas (scale OI, "how characteristic the area is of the occupation"), added in
           release 30.3 and based on the Comprehensive Assessment of Basic Interests (Su et al., 2019).
  acts     importance (IM, 1-5) of the 41 generalized work activities.
  context  a selection of work context ratings (CX, 1-5, or the percent of workers in one answer category), in the
           order listed in meta.context.
  home     1 if the job can plausibly be done from home under Dingel and Neiman's rules (2020, NBER w26948), applied
           to the current O*NET data, else 0.
  tasks    the occupation's most important core tasks, for the "a typical day" line on job cards.

Titles, outlook, AI exposure and work styles stay in data/jobs.json; the page loads both files.

Run: python3 data/build_calling.py [--version 31_0] [--source DIR]
No dependencies beyond the standard library.
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from build_jobs import Source, latest_version, number

HERE = Path(__file__).parent
OUT = HERE / "calling.json"
JOBS = HERE / "jobs.json"
MAX_TASKS = 3

# Work context elements the test uses, by O*NET element ID. "CX" is the mean rating (1-5); ("CXP", n) and ("CTP", n)
# are the percent of workers who chose answer category n.
CONTEXT = [
    ("contact", "4.C.1.a.4", "CX"),         # Contact With Others
    ("public", "4.C.1.b.1.f", "CX"),        # Deal With External Customers or the Public in General
    ("team", "4.C.1.b.1.e", "CX"),          # Work With or Contribute to a Work Group or Team
    ("lead", "4.C.1.b.1.g", "CX"),          # Coordinate or Lead Others in Accomplishing Work Activities
    ("speaking", "4.C.1.a.2.c", "CX"),      # Public Speaking
    ("email", "4.C.1.a.2.h", "CX"),         # E-Mail
    ("unpleasant", "4.C.1.d.2", "CX"),      # Dealing With Unpleasant, Angry, or Discourteous People
    ("conflict", "4.C.1.d.1", "CX"),        # Conflict Situations
    ("violent", "4.C.1.d.3", "CX"),         # Dealing with Violent or Physically Aggressive People
    ("othersSafety", "4.C.1.c.1", "CX"),    # Health and Safety of Other Workers
    ("indoors", "4.C.2.a.1.a", "CX"),       # Indoors, Environmentally Controlled
    ("outdoors", "4.C.2.a.1.c", "CX"),      # Outdoors, Exposed to All Weather Conditions
    ("outdoorsDaily", "4.C.2.a.1.c", ("CXP", 5)),
    ("coveredDaily", "4.C.2.a.1.d", ("CXP", 5)),  # Outdoors, Under Cover: every day
    ("sitting", "4.C.2.d.1.a", "CX"),       # Spend Time Sitting
    ("standing", "4.C.2.d.1.b", "CX"),      # Spend Time Standing
    ("walking", "4.C.2.d.1.d", "CX"),       # Spend Time Walking or Running
    ("hands", "4.C.2.d.1.g", "CX"),         # Spend Time Using Your Hands to Handle, Control, or Feel Objects...
    ("disease", "4.C.2.c.1.b", "CX"),       # Exposed to Disease or Infections
    ("cuts", "4.C.2.c.1.f", "CX"),          # Exposed to Minor Burns, Cuts, Bites, or Stings
    ("hazards", "4.C.2.c.1.d", "CX"),       # Exposed to Hazardous Conditions
    ("machinery", "4.C.2.c.1.e", "CX"),     # Exposed to Hazardous Equipment
    ("heights", "4.C.2.c.1.c", "CX"),       # Exposed to High Places
    ("safetyGear", "4.C.2.e.1.d", "CX"),    # Wear Common Protective or Safety Equipment...
    ("specialGear", "4.C.2.e.1.e", "CX"),   # Wear Specialized Protective or Safety Equipment...
    ("freedom", "4.C.3.a.4", "CX"),         # Freedom to Make Decisions
    ("ownGoals", "4.C.3.b.8", "CX"),        # Determine Tasks, Priorities and Goals
    ("repeat", "4.C.3.b.7", "CX"),          # Importance of Repeating Same Tasks
    ("exact", "4.C.3.b.4", "CX"),           # Importance of Being Exact or Accurate
    ("competition", "4.C.3.c.1", "CX"),     # Level of Competition
    ("deadlines", "4.C.3.d.1", "CX"),       # Time Pressure
    ("errors", "4.C.3.a.1", "CX"),          # Consequence of Error
    ("impact", "4.C.3.a.2.a", "CX"),        # Impact of Decisions on Co-workers or Company Results
    ("irregular", "4.C.3.d.4", ("CTP", 2)), # Work Schedules: irregular
    ("longWeek", "4.C.3.d.8", ("CTP", 3)),  # Duration of Typical Work Week: more than 40 hours
]

# Dingel and Neiman's activities that rule out working from home when rated "very important" (IM >= 4).
HOME_ACTS = ["4.A.3.a.1", "4.A.3.a.2", "4.A.3.a.3", "4.A.3.a.4", "4.A.4.a.8", "4.A.3.b.4", "4.A.3.b.5", "4.A.1.b.2"]


def can_work_from_home(c, acts):
    """Dingel and Neiman's rules, as listed in their paper: any one of these makes a job unable to be done at home."""
    if not c or not acts:
        return None
    def at(k, lo):
        return c.get(k) is not None and c[k] >= lo
    rules = [
        c.get("email") is not None and c["email"] < 3,               # e-mail less than once a month
        at("violent", 4), at("disease", 4), at("cuts", 4),           # at least once a week
        at("outdoorsDaily", 50.01) or at("coveredDaily", 50.01),     # most workers outdoors every day
        at("walking", 4), at("safetyGear", 4) or at("specialGear", 4),  # more than half the time
        any(acts.get(a, 0) >= 4 for a in HOME_ACTS),
    ]
    return 0 if any(rules) else 1


def build(src, version, jobs):
    codes = {j["code"] for j in jobs}

    areas, area_names = {}, {}
    for r in src.get("specific_interest_areas"):
        if r["scaleid"] == "OI" and r["onetsoccode"] in codes:
            areas.setdefault(r["onetsoccode"], {})[r["elementid"]] = float(r["datavalue"])
            area_names[r["elementid"]] = r["elementname"]

    acts, act_names = {}, {}
    for r in src.get("work_activities"):
        if r["scaleid"] == "IM" and r["onetsoccode"] in codes:
            acts.setdefault(r["onetsoccode"], {})[r["elementid"]] = float(r["datavalue"])
            act_names[r["elementid"]] = r["elementname"]

    wanted = {}
    for name, eid, scale in CONTEXT:
        wanted.setdefault(eid, []).append((name, scale))
    context, context_names = {}, {}
    for r in src.get("work_context"):
        if r["elementid"] not in wanted or r["onetsoccode"] not in codes:
            continue
        context_names[r["elementid"]] = r["elementname"]
        for name, scale in wanted[r["elementid"]]:
            if isinstance(scale, tuple):
                hit = r["scaleid"] == scale[0] and number(r.get("category")) == scale[1]
            else:
                hit = r["scaleid"] == scale
            if hit:
                context.setdefault(r["onetsoccode"], {})[name] = float(r["datavalue"])

    importance = {}
    for r in src.get("task_ratings"):
        if r["scaleid"] == "IM":
            importance[(r["onetsoccode"], r["taskid"])] = float(r["datavalue"])
    tasks = {}
    for k, r in enumerate(src.get("task_statements")):
        if r["onetsoccode"] in codes and r.get("tasktype", "Core") in ("Core", ""):
            tasks.setdefault(r["onetsoccode"], []).append((-importance.get((r["onetsoccode"], r["taskid"]), 0), k, r["task"]))

    area_ids = sorted(area_names, key=lambda e: (len(e), e))  # 1.B.3.a .. 1.B.3.z, then 1.B.3.aa .. 1.B.3.ao
    act_ids = sorted(act_names)
    missing = [eid for _, eid, _ in CONTEXT if eid not in context_names]
    if len(area_ids) != 41 or len(act_ids) != 41 or missing:
        sys.exit(f"Unexpected O*NET content: {len(area_ids)} interest areas, {len(act_ids)} work activities, "
                 f"missing work context elements {missing}")

    out = []
    for j in jobs:
        c = j["code"]
        a, g, cx = areas.get(c), acts.get(c), context.get(c, {})
        out.append({
            "code": c,
            "areas": [round(a[e], 2) for e in area_ids] if a and len(a) == 41 else None,
            "acts": [round(g[e], 2) for e in act_ids] if g and len(g) == 41 else None,
            "context": [round(cx[name], 2) if name in cx else None for name, _, _ in CONTEXT] if cx else None,
            "home": can_work_from_home(cx, g),
            "tasks": [t for *_, t in sorted(tasks.get(c, []))[:MAX_TASKS]],
        })
    return {
        "meta": {
            "onetVersion": version.replace("_", "."),
            "built": date.today().isoformat(),
            "areas": [[e, area_names[e]] for e in area_ids],
            "acts": [[e, act_names[e]] for e in act_ids],
            "context": [[name, eid, context_names[eid], scale if isinstance(scale, str) else f"{scale[0]}{scale[1]}"] for name, eid, scale in CONTEXT],
            "notes": "areas: O*NET specific interest areas, scale OI (how characteristic of the occupation; ratings made by AI "
                     "models checked against experts, O*NET 30.3+). acts: generalized work activities, importance 1-5. "
                     "context: work context in the order of meta.context, CX = mean rating 1-5, CXPn/CTPn = percent of workers in "
                     "answer category n. "
                     "home: 1 if none of Dingel and Neiman's (2020) work-at-home exclusions apply. tasks: most important "
                     "core tasks.",
            "credit": "This site incorporates information from the O*NET Database by the U.S. Department of Labor, Employment "
                      "and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET(R) is a trademark of "
                      "USDOL/ETA.",
        },
        "jobs": out,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", help="O*NET database version such as 31_0 (default: latest)")
    ap.add_argument("--source", help="folder with O*NET CSV files, for offline builds and tests")
    a = ap.parse_args()
    if a.source:
        version, src = a.version or "local", Source(folder=a.source)
    else:
        version = a.version or latest_version()
        src = Source(version=version)
    jobs = json.loads(JOBS.read_text(encoding="utf-8"))["jobs"]
    data = build(src, version, jobs)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))

    rated = [j for j in data["jobs"] if j["areas"]]
    lo = min(min(j["areas"]) for j in rated)
    hi = max(max(j["areas"]) for j in rated)
    home = [j for j in data["jobs"] if j["home"] is not None]
    print(f"O*NET {data['meta']['onetVersion']}: {len(data['jobs'])} occupations, {len(rated)} with interest areas "
          f"(OI {lo}-{hi}), {sum(1 for j in data['jobs'] if j['acts'])} with work activities, "
          f"{sum(1 for j in data['jobs'] if j['context'])} with work context, {sum(1 for j in data['jobs'] if j['tasks'])} with tasks")
    print(f"Work from home possible: {sum(j['home'] for j in home)} of {len(home)} rated occupations")
    print(f"Size: {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
