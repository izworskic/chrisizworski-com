#!/usr/bin/env python3
"""Regression audit for Michigan fall-color season transitions.

No external dependencies, API calls, Redis, or paid model requests.
Exercises the real Node model with deliberately misleading, fresh, GREEN
satellite pixels and a ten-day delayed canopy camera signal. Runs on every
GitHub daily-writer schedule before another edition may be published.
"""
import datetime as dt
import json
import pathlib
import subprocess
import sys
from zoneinfo import ZoneInfo

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATES = ("2026-09-20", "2026-10-15", "2026-10-31",
         "2026-11-10", "2026-11-15", "2026-12-10",
         "2027-02-10", "2027-10-15", "2027-11-10")
DRIVER = r"""
const {REGIONS}=require("./lib/fall-color/regions.js");
const {snapshotFor}=require("./lib/fall-color/model.js");
const {writeModelReport}=require("./lib/fall-color/model-report-writer.js");
const asOf=process.argv[1];
const now=new Date(asOf+"T17:00:00Z");
const rows=REGIONS.map(r=>{
  const cond={
    weather:{coolNights:0,lowestRecent:55,frostRecent:false,hardFreezeRecent:false},
    ndvi:{date:asOf,ageDays:1,senescence:0,canopyPct:100},
    forecast:[]
  };
  return {...snapshotFor(r,cond,{shift:-10,confidence:"good"},now),
    bare:r.bare,peakEnd:r.peakEnd};
});
console.log(JSON.stringify({rows,report:writeModelReport(rows)}));
"""

def validate_runtime():
    html = (ROOT / "public/fall-color/index.html").read_text(encoding="utf-8")
    start = html.index("<script>\nconst C=")
    end = html.index("</script>", start)
    runtime = html[start + len("<script>"):end]
    assert "const lateSeason=" in runtime, "Late-season guard missing from public page"
    assert 'heading.textContent="Michigan\'s main fall-color peak has passed."' in runtime
    check = subprocess.run(["node", "-e",
        'new (require("vm").Script)(require("fs").readFileSync(0,"utf8"));'],
        input=runtime, text=True, capture_output=True, cwd=ROOT, check=False)
    assert check.returncode == 0, "Fall-color page JS parse error: " + check.stderr

def validate_date(iso):
    outcome = subprocess.run(["node", "-e", DRIVER, iso], cwd=ROOT,
        capture_output=True, text=True, check=False)
    assert outcome.returncode == 0, iso + " Node model failure: " + outcome.stderr
    obj = json.loads(outcome.stdout)
    rows = obj["rows"]
    assert len(rows) == 8 and len({r["id"] for r in rows}) == 8, iso + " incomplete regions"
    day = dt.date.fromisoformat(iso)
    outside_season = not (
        (day.month == 8 and day.day >= 20) or day.month in (9, 10)
        or (day.month == 11 and day.day <= 15)
    )
    for row in rows:
        pct, phase = row["pct"], row["phase"]
        assert isinstance(pct, int) and 0 <= pct <= 100, (iso,row["id"],pct)
        if outside_season:
            assert (pct,phase) == (0,"offseason"), (iso,row["id"],pct,phase)
            continue
        peak_end = dt.date(day.year, *row["peakEnd"])
        bare = dt.date(day.year, *row["bare"])
        if day >= peak_end + dt.timedelta(days=11):
            assert phase not in ("green","rising","peak"), (iso,row["id"],phase)
        if day >= bare + dt.timedelta(days=10):
            assert pct <= 2 and phase in ("bare","offseason"), (iso,row["id"],pct,phase)
    if day.month == 11 and day.day >= 10 and day.day <= 15:
        assert all(r["phase"] not in ("green","rising","peak") for r in rows), iso
        assert "main fall-color peak has passed" in obj["report"], iso
        assert "mostly green" not in obj["report"].lower(), iso
    return len(rows)

def main():
    validate_runtime()
    today = dt.datetime.now(ZoneInfo("America/Detroit")).date().isoformat()
    dates = list(DATES) + ([] if today in DATES else [today])
    count = sum(validate_date(iso) for iso in dates)
    print(f"PASS: Michigan page syntax + {count} modeled region-days across {len(dates)} dates; "
          "green satellite, delayed canopy and winter-rollover scenarios checked.")

if __name__ == "__main__":
    try:
        main()
    except (AssertionError, ValueError, OSError, json.JSONDecodeError) as exc:
        print("FAIL:", exc, file=sys.stderr)
        sys.exit(1)
