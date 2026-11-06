#!/usr/bin/env python3
"""Verify source roles at Warner Falls: a named creek crossing is not a visitor parking point.

Recomputes straight-line geometry between separately attributed source points.
Neither a USGS historic stream station, an approximate tourism waterfall point,
nor an MDOT press release supplies current legal parking or a trailhead.
No network calls, third-party Python dependencies or runtime visitor routing.

python3 scripts/audit-up-waterfall-warner-coordinate-roles.py [--check]
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / "data/up-waterfall-warner-coordinate-roles.json"
OUTPUT = ROOT / "data/up-waterfall-warner-coordinate-audit.json"
RADIUS_METRES = 6371008.8


def metres(first: list[float], second: list[float]) -> float:
    lat1, lon1, lat2, lon2 = [math.radians(float(x)) for x in (*first, *second)]
    h = math.sin((lat2 - lat1) / 2) ** 2
    h += math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * RADIUS_METRES * math.asin(min(1, math.sqrt(max(0, h))))


def build() -> dict:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["batch"] == "B73"
    assert source["fall"]["stateGisObjectId"] == 172
    assert source["usgs"]["siteId"] == "USGS-04058240"
    assert source["usgs"]["recentContinuousStreamflow"] is False
    assert source["usgs"]["observationEnd"] == "1976-08-30"
    assert source["usgs"]["coordinateMethod"] == "map-interpolated"
    assert all("parking" in source[name]["role"] for name in ("fall", "tourism", "usgs"))
    assert all(p["coordinates"] is None and not p["waterfallIdentityEstablished"]
               for p in source["mdotProjects"]), "Do not invent MDOT worksite points or waterfall identity"
    assert source["parcel"]["proofOfCurrentOwner"] is False
    assert source["parcel"]["proofOfPublicWalkingRight"] is False
    assert all(source["access"][k] is True for k in (
        "noVerifiedDrivingDestination", "noCurrentParkingPermissionOrSafeShoulderWidth",
        "noContinuousLawfulFootRoute", "notOpenNowClaim", "sameCreekDoesNotProveSameProject"))
    assert all(source["access"][k] is False for k in (
        "curated", "indexable", "addNaturalOrUSGSPointToCarRouting"))
    f = source["fall"]["coordinates"]
    u = source["usgs"]["coordinates"]
    t = source["tourism"]["coordinates"]
    assert f == [46.433378, -87.59896], "Waterfall natural feature must stay in state-GIS role"
    assert 45 <= u[0] <= 48 and -91 <= u[1] <= -84
    usgs_gap = round(metres(f, u), 1)
    tourism_gap = round(metres(f, t), 1)
    assert 470 < usgs_gap < 480, "Unexpected USGS station geometry: independently investigate"
    assert 0 < tourism_gap < 20, "Tourism marker should identify the waterfall, not a second crossing"
    return {
        "schemaVersion": 1,
        "batch": "B73",
        "reviewDate": source["reviewDate"],
        "method": "haversine-straight-line-geodesic-not-road-or-trail",
        "waterfallStateGisId": 172,
        "tourismToWaterfallMetres": tourism_gap,
        "usgsCrossingToWaterfallMetres": usgs_gap,
        "usgsStation": source["usgs"]["siteId"],
        "mdotProjectGeometryResolved": False,
        "legalVisitorArrivalResolved": False,
        "routeToCreekOrUSGSPoint": False,
        "disposition": "research-only-not-indexed",
        "policy": "Geographic proximity and a shared stream name cannot authorize parking, bridge access, or creek-bank walking."
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = json.dumps(build(), indent=2) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != data:
            raise SystemExit("Warner source-role audit stale; regenerate offline with this script")
        print("Warner source role and geometry audit current; publication gates remain closed.")
    else:
        OUTPUT.write_text(data, encoding="utf-8")
        print(f"Wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
