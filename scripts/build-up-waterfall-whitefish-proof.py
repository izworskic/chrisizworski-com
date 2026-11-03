#!/usr/bin/env python3
"""Evidence-first Whitefish Falls GIS crosswalk (Michigan DNR). No runtime service.

The waterfall name, the state parcel at the natural falls and two similarly
named DNR boating access records describe distinct evidence types. The program
verifies their identity by *exact official identifiers*, then computes
geodesic distances. It does not infer legal parking, trails, current opening,
drive time or fishing/river crossing safety from nearby points.

Run: python3 scripts/build-up-waterfall-whitefish-proof.py [--check]
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
SOURCE = BASE / "data/up-waterfall-whitefish-dnr-evidence.json"
RECONCILIATION = BASE / "data/up-waterfall-reconciliation.json"
OUTPUT = BASE / "data/up-waterfall-whitefish-dnr-proof.json"
EARTH_METRES = 6371008.8


def distance_m(left: dict, right: dict) -> float:
    to_radians = math.radians
    lat1, lat2 = to_radians(left["lat"]), to_radians(right["lat"])
    delta_lat = lat2 - lat1
    delta_lng = to_radians(right["lng"] - left["lng"])
    chord = math.sin(delta_lat / 2) ** 2 + (
        math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    )
    return 2 * EARTH_METRES * math.asin(min(1.0, math.sqrt(chord)))


def safe_one_decimal(value: float) -> float | int:
    result = round(value, 1)
    return int(result) if result.is_integer() else result


def build() -> dict:
    src = json.loads(SOURCE.read_text(encoding="utf-8"))
    rec = json.loads(RECONCILIATION.read_text(encoding="utf-8"))
    assert src["schemaVersion"] == 1 and src["gisObjectId"] == 191
    state = next(row for row in rec["candidates"] if row["gisObjectId"] == 191)
    assert state["curatedId"] is None and state["publicationEligible"] is False
    assert state["publicAccessVerified"] is False
    assert state["parkingVerified"] is False
    p = {row["id"]: row for row in src["points"]}
    assert len(p) == 5
    assert abs(p["falls-gis-191"]["lat"] - state["lat"]) < 0.0000001
    assert abs(p["falls-gis-191"]["lng"] - state["lng"]) < 0.0000001
    assert all(not v["navigationAuthorized"] for v in p.values())
    assert all(v["sourceKey"] in src["officialSources"] for v in p.values())
    assert src["dnrParcel"]["ParID"] == 1122650
    assert src["dnrParcel"]["Acreage"] == 38
    assert src["dnrParcel"]["ProjectUseType"] == "Public Water Access Site"
    assert src["dnrParcel"]["DivisionDepartment"] == "Parks and Recreation Division"
    assert src["dnrParcel"]["LandStatus"] == "Dedicated"

    facilities = {v["legacyId"]: v for v in src["dnrFacilities"]}
    assert set(facilities) == {"A-02-004", "A-02-010"}
    correct, other = facilities["A-02-004"], facilities["A-02-010"]
    assert correct["sourceObjectId"] == 6286
    assert other["sourceObjectId"] == 6285
    assert correct["carryDown"] is True and correct["carryDownLaunches"] == 1
    assert correct["rampLanes"] == 0
    assert correct["vehicleOnlyParking"] is None
    assert correct["trailerParking"] is None
    assert correct["verifiedFallsWalk"] is False and not correct["verifiedWaterfallViewpoint"]
    assert other["name"] == "West Branch of Whitefish River"
    assert not other["verifiedFallsWalk"] and not other["verifiedWaterfallViewpoint"]
    for code, point_id in (
        ("A-02-004", "dnr-access-a-02-004"),
        ("A-02-010", "dnr-access-a-02-010"),
    ):
        facility = facilities[code]
        point = p[point_id]
        assert abs(point["lat"] - facility["latitude"]) < 0.00000001
        assert abs(point["lng"] - facility["longitude"]) < 0.00000001
    for key in (
        "waterfallSpecificLegalParkingVerified",
        "continuousPublicFallsWalkingRouteVerified",
        "designatedSafeFallsViewpointVerified",
        "currentRoadAndSiteOpeningVerified",
        "wetSeasonAndWinterConditionsVerified",
        "publicWaterfallGuideEligible",
    ):
        assert src["publicationGates"][key] is False, f"Unsafe promotion {key}"
    assert src["publicationGates"]["publicLandAtFeatureVerified"] is True
    assert src["publicationGates"]["officialPublicWaterAccessSiteNearby"] is True
    assert src["bureauEvidence"]["unimprovedTrail"] is True
    assert src["bureauEvidence"]["specificRoadTurn"] is None
    assert src["bureauEvidence"]["designatedVehicleParking"] is None

    pairs = []
    for pair in src["pairs"]:
        left, right = p[pair["left"]], p[pair["right"]]
        pairs.append({
            "left": pair["left"],
            "right": pair["right"],
            "straightLineMeters": safe_one_decimal(distance_m(left, right)),
            "meaning": pair["meaning"],
        })
    by_right = {x["right"]: x["straightLineMeters"] for x in pairs}
    assert by_right["dnr-access-a-02-004"] < 100
    assert by_right["gnis-derived-whitefish"] < 250
    assert by_right["dnr-access-a-02-010"] > 5000
    assert by_right["unrelated-township-park"] > 4000

    return {
        "schemaVersion": 1,
        "reviewed": src["reviewed"],
        "source": "data/up-waterfall-whitefish-dnr-evidence.json",
        "method": "Exact DNR IDs and land parcel point intersection; WGS84 Haversine for context only",
        "gisObjectId": 191,
        "pointsCompared": len(p),
        "distances": pairs,
        "identity": {
            "waterfallStateGisId": 191,
            "dnrPublicWaterAccessParcelId": 1122650,
            "dnrPublicWaterAccessParcelAcres": 38,
            "nearbyCarryDownId": "A-02-004",
            "nearbyCarryDownIsDnrManaged": True,
            "nearbyCarryDownVehicleParkingUnknown": True,
            "upstreamDifferentBoatAccessId": "A-02-010",
            "townshipParkWaypointUnrelated": True,
        },
        "visitorDecision": {
            "naturalFallsGeographyCorroborated": True,
            "stateManagedWaterAccessLandAtFallsConfirmed": True,
            "dnrCarryDownNearFallsConfirmed": True,
            "waterfallVehicleParkingCleared": False,
            "waterfallWalkingTrailCleared": False,
            "waterfallViewpointCleared": False,
            "currentOpeningCleared": False,
            "publicWaterfallGuideEligible": False,
            "allowDrivingToNaturalFallsCoordinate": False,
            "allowWaterAccessAsFallsParkingWaypoint": False,
            "allowOtherBoatAccessAsFallsArrival": False,
        },
        "policy": src["policy"],
    }


def main() -> None:
    arg = argparse.ArgumentParser()
    arg.add_argument("--check", action="store_true")
    args = arg.parse_args()
    result = json.dumps(build(), indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != result:
            raise SystemExit("Whitefish source crosswalk stale: run Python generator")
        print("Whitefish DNR source crosswalk, distances and no-routing gates verified")
    else:
        OUTPUT.write_text(result, encoding="utf-8")
        print("Generated Whitefish DNR source crosswalk")


if __name__ == "__main__":
    main()
