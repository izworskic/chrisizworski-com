#!/usr/bin/env python3
"""Chicagon Falls parcel-vs-access GIS provenance audit.

Pure stdlib and deterministic JSON. Compares the mapped falls position with
two independent/contradictory source waypoints and validates the explicit
access evidence gates. Geographic proximity is never road, parking or trail
authorization. Do not infer public easements from land ownership alone.

python3 scripts/build-up-waterfall-chicagon-proof.py
python3 scripts/build-up-waterfall-chicagon-proof.py --check
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / "data/up-waterfall-chicagon-corridor-evidence.json"
LEDGER = ROOT / "data/up-waterfall-reconciliation.json"
OUTPUT = ROOT / "data/up-waterfall-chicagon-corridor-proof.json"
EARTH_RADIUS_M = 6371008.8


def haversine(a: dict, b: dict) -> float:
    lat1, lon1 = math.radians(a["lat"]), math.radians(a["lng"])
    lat2, lon2 = math.radians(b["lat"]), math.radians(b["lng"])
    dy, dx = lat2 - lat1, lon2 - lon1
    k = math.sin(dy / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dx / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(k)))


def build() -> dict:
    src = json.loads(EVIDENCE.read_text(encoding="utf-8"))
    rec = json.loads(LEDGER.read_text(encoding="utf-8"))
    assert src["schemaVersion"] == 1 and src["gisObjectId"] == 12
    candidate = next(x for x in rec["candidates"] if x["gisObjectId"] == 12)
    assert candidate["curatedId"] is None, "Research-only Chicagon must not be promoted"
    assert candidate["publicAccessVerified"] is False, "Public approach not verified"
    assert candidate["parkingVerified"] is False, "Parking not verified"
    assert candidate["parcelReview"]["dnrManagedLand"]["parID"] == 258918
    assert candidate["parcelReview"]["dnrManagedLand"]["acreage"] == 47.8

    points = {x["id"]: x for x in src["points"]}
    assert len(points) == 3 and "michigan-gis-12" in points
    falls = points["michigan-gis-12"]
    assert abs(falls["lat"] - candidate["lat"]) < 1e-6
    assert abs(falls["lng"] - candidate["lng"]) < 1e-6
    for p in points.values():
        assert p["url"].startswith("https://")
        assert p["evidenceScope"] in {"geographic-location-not-parking", "secondary-feature-coordinate-not-parking", "conflicting-tourism-coordinate-do-not-route"}
        assert 45 < p["lat"] < 48 and -91 < p["lng"] < -84

    close = haversine(falls, points["secondary-gazetteer"])
    inconsistent = haversine(falls, points["inconsistent-tourism-point"])
    assert close < 100, "Secondary location moved materially; review identity"
    assert inconsistent > 1000, "Conflicting tourism location no longer distinct"
    assert close < inconsistent

    sources = src["evidence"]
    assert len(sources) >= 7
    assert len({s["key"] for s in sources}) == len(sources)
    assert all(s["url"].startswith("https://") for s in sources)
    assert {s["key"] for s in sources}.issuperset({
        "state-feature-land", "county-recreation-owner", "tourism-route",
        "private-camps", "road-commission"
    })
    gates = src["gates"]
    assert gates["fallsFeatureLocated"] and gates["fallsParcelStateManaged"]
    assert gates["countyPrivateInventoryContradictionResolved"] is False
    for key in ("publicRoadToArrivalConfirmed", "safeAuthorizedParkingConfirmed",
                "completeLegalWalkingRouteConfirmed", "currentPassabilityVerified",
                "openNowConfirmed"):
        assert gates[key] is False, f"Cannot silently promote unsupported gate: {key}"
    assert len(src["nextAuthorityActions"]) == 3

    def rounded_distance(n):
        rounded = round(n, 1)
        return int(rounded) if rounded.is_integer() else rounded

    return {
        "schemaVersion": 1,
        "reviewed": src["checked"],
        "gisObjectId": 12,
        "source": "data/up-waterfall-chicagon-corridor-evidence.json",
        "method": "Haversine source-point comparison, not a mapped arrival route",
        "sourcePoints": [
            {
                "id": point["id"],
                "sourceUrl": point["url"],
                "evidenceScope": point["evidenceScope"]
            }
            for point in src["points"]
        ],
        "distances": {
            "statePointToSecondaryMeters": rounded_distance(close),
            "statePointToConflictingTourismMeters": rounded_distance(inconsistent),
        },
        "sourceConflict": {
            "dnrPointManagedParcel": True,
            "countyPlanScenicOwnerPrivate": True,
            "interpretation": "Source scopes or dates may differ. DNR point ownership and an older county scenic classification conflict; neither proves the road-to-falls public corridor.",
            "resolved": False,
        },
        "visitorDecision": {
            "publicationEligible": False,
            "publicRoadConfirmed": False,
            "parkingVerified": False,
            "walkVerified": False,
            "openNowVerified": False,
            "safeToGenerateDrivingDirections": False,
        },
        "policy": src["policy"],
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--check", action="store_true")
    args = p.parse_args()
    value = json.dumps(build(), indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != value:
            raise SystemExit("Chicagon proof out of sync; regenerate with Python")
        print("Chicagon ownership and route conflict source gates verified")
    else:
        OUTPUT.write_text(value, encoding="utf-8")
        print("Regenerated Chicagon source-conflict proof")


if __name__ == "__main__":
    main()
