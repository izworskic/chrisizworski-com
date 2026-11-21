#!/usr/bin/env python3
"""Source-only ShoreFeel comparison of two REAL captured NWS grid forecasts.

No local station deployment, sensor files, physical field study, user location,
online request at analysis time, or beach-specific temperature claim.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCHEMA = "shorefeel.online-coastal-contrast.v1"
INPUT_SCHEMA = "shorefeel.nws-received-forecast.v1"
SITE_SHORE = "park-land-grid"
SITE_INLAND = "west-bay-inland"


def utc(s):
    if not isinstance(s, str) or not s.endswith("Z"):
        raise ValueError("Timestamp must be explicit UTC Z")
    return datetime.fromisoformat(s[:-1] + "+00:00")


def number(v, lo, hi):
    return (type(v) in (int, float) and math.isfinite(v) and lo <= v <= hi)


def site_identity(s):
    if not isinstance(s, dict) or not isinstance(s.get("grid"), dict):
        raise ValueError("Missing official NWS grid identity")
    grid = s["grid"]
    if (not isinstance(grid.get("id"), str)
            or type(grid.get("x")) is not int or type(grid.get("y")) is not int):
        raise ValueError("Invalid official NWS grid identity")
    ref = s.get("reference")
    if not isinstance(ref, dict) or not number(ref.get("lat"), 40, 48) or not number(ref.get("lon"), -90, -80):
        raise ValueError("Missing bounded public reference coordinates")
    source = s.get("forecastUrl")
    expected = f"https://api.weather.gov/gridpoints/{grid['id']}/{grid['x']},{grid['y']}/forecast/hourly"
    if source != expected:
        raise ValueError("NWS source URL does not match its recorded grid identity")
    return grid["id"], grid["x"], grid["y"]


def periods(s, now):
    seen = {}
    conflicts = set()
    for p in s.get("futurePeriods", []):
        try:
            at = utc(p["validAt"])
            issued = utc(p["nwsIssuedAt"])
            generated = utc(p["sourceGeneratedAt"])
            if (not issued <= generated + timedelta(hours=72) or
                    issued > at or generated > issued + timedelta(minutes=5) or
                    not number(p.get("nwsShoreF"), -60, 140) or
                    p.get("sourceUrl") != s["forecastUrl"] or
                    p.get("isForecastNotObservation") is not True or
                    issued > now + timedelta(minutes=5) or
                    not timedelta(0) <= at-issued <= timedelta(hours=48)):
                continue
            key = p["validAt"]
            if key in conflicts:
                continue
            value = (p["nwsShoreF"], p["nwsIssuedAt"], p["sourceGeneratedAt"])
            if key in seen and seen[key] != value:
                conflicts.add(key)
                seen.pop(key, None)
            elif key not in seen:
                seen[key] = value
        except (KeyError, ValueError, TypeError, OverflowError):
            continue
    return seen, len(conflicts)


def compare(data, now=None):
    now = now or datetime.now(timezone.utc)
    if data.get("schema") != INPUT_SCHEMA or data.get("siteCount") != 2:
        raise ValueError("Require a genuine two-site source-archived NWS snapshot")
    rows = data.get("pointForecasts")
    if not isinstance(rows, list) or len(rows) != 2:
        raise ValueError("Expected exactly two NWS gridpoint responses")
    sites = {s.get("id"): s for s in rows if isinstance(s, dict)}
    if set(sites) != {SITE_SHORE, SITE_INLAND}:
        raise ValueError("Require documented Saginaw Bay public research reference pair")
    a, b = sites[SITE_SHORE], sites[SITE_INLAND]
    left_grid, right_grid = site_identity(a), site_identity(b)
    independent = left_grid != right_grid
    aa, aconflicts = periods(a, now)
    bb, bconflicts = periods(b, now)
    output = []
    skipped = {"differentIssueWindows": 0, "sameGrid": 0}
    for hour in sorted(set(aa) & set(bb)):
        shore, inland = aa[hour], bb[hour]
        gap = abs((utc(shore[1])-utc(inland[1])).total_seconds())
        if gap > 20*60:
            skipped["differentIssueWindows"] += 1
            continue
        if not independent:
            skipped["sameGrid"] += 1
            continue
        diff = round(shore[0]-inland[0], 2)
        output.append({
            "validAt": hour,
            "shoreAreaForecastF": shore[0],
            "inlandAreaForecastF": inland[0],
            "shoreMinusInlandForecastF": diff,
            "comparison": "TWO_DISTINCT_NWS_LAND_FORECAST_GRIDS",
            "isObservedBeachDifference": False,
            "isQuarterMileDifference": False,
            "forecastsCapturedBeforeValidAt": True,
            "shoreCapturedAt": shore[1],
            "inlandCapturedAt": inland[1]
        })
    return {
        "schema": SCHEMA,
        "status": "SOURCE_GROUNDED_FORECAST_COMPARISON" if output else "NO_COMPARABLE_INDEPENDENT_GRID_HOURS",
        "site": "Saginaw Bay, Michigan (public forecast-grid research references)",
        "source": "NWS official hourly land-grid forecast snapshots archived before validity",
        "shoreReference": a["reference"],
        "inlandReference": b["reference"],
        "distinctForecastGridCells": independent,
        "sourceGridKeys": [list(left_grid), list(right_grid)],
        "coverage": {
            "shoreValidHours": len(aa), "inlandValidHours": len(bb),
            "pairedHours": len(output),
            "sourceConflictingHours": {"shore": aconflicts, "inland": bconflicts},
            "skipped": skipped
        },
        "hours": output,
        "beachSandTemperatureF": None,
        "measuredShoreInlandGradientF": None,
        "quarterMileDifferenceF": None,
        "calibratedBeachCorrectionF": None,
        "sourceBasedButNotLocalObservation": True,
        "publicationAuthorized": False,
        "interpretation": ("Official air forecasts at distinct approximately 2.5 km NWS land grids, "
                           "with the second reference about 15 km west of the bay shore. "
                           "Not two thermometers, not an observed gradient within "
                           "a quarter mile, and not a validated sand-air forecast.")
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("captured_nws", type=Path, help="Input archive from shorefeel-nws-forecast-capture.py")
    args = p.parse_args()
    try:
        data = json.loads(args.captured_nws.read_text(encoding="utf-8"))
        report = compare(data)
        print(json.dumps(report, indent=2, sort_keys=True))
    except (ValueError, OSError, TypeError, KeyError) as exc:
        print("ShoreFeel online comparison refused: "+str(exc), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
