#!/usr/bin/env python3
"""Reproduce the Pinkerton/Traders federal-name to DNR trail geography comparison.

Usage:
  python3 scripts/build-up-waterfall-pinkerton-crosswalk.py --write
  python3 scripts/build-up-waterfall-pinkerton-crosswalk.py --check
  python3 scripts/build-up-waterfall-pinkerton-crosswalk.py --summary

The calculation is minimum STRAIGHT-LINE map proximity to APPROVED trail
polyline segments, never an established safe walking route, parking point,
or identification of UP Travel's separately unnamed cascade.
"""
from __future__ import annotations

import argparse
import json
from math import asin, cos, hypot, radians, sin
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data/up-waterfall-pinkerton-official-geography-2026.json"
OUTPUT = ROOT / "public/assets/up-waterfall-pinkerton-official-comparison.json"
EARTH_RADIUS_M = 6371008.8
FEDERAL_FEATURE_IDS = {1615029: "Traders Falls", 2126322: "Pinkerton Falls"}
TRAIL_NAME = "Porcupine Mountain Wilderness Pinkerton Trail"


def haversine_m(a: list[float], b: list[float]) -> float:
    delta_lat = radians(b[1] - a[1])
    delta_lon = radians(b[0] - a[0])
    v = sin(delta_lat / 2) ** 2 + cos(radians(a[1])) * cos(radians(b[1])) * sin(delta_lon / 2) ** 2
    return 2 * EARTH_RADIUS_M * asin(min(1.0, max(0.0, v)) ** .5)


def projected_segment_distance_m(point: list[float], a: list[float], b: list[float]) -> float:
    """Local equirectangular tangent plane: accurate for these short (<5 km) segments."""
    lat_cos = cos(radians(point[1]))

    def vector(q: list[float]) -> tuple[float, float]:
        return (radians(q[0] - point[0]) * EARTH_RADIUS_M * lat_cos,
                radians(q[1] - point[1]) * EARTH_RADIUS_M)

    ax, ay = vector(a)
    bx, by = vector(b)
    dx, dy = bx - ax, by - ay
    norm2 = dx * dx + dy * dy
    t = max(0.0, min(1.0, -(ax * dx + ay * dy) / norm2)) if norm2 else 0.0
    return hypot(ax + t * dx, ay + t * dy)


def checked_point(point: list[float]) -> None:
    if (not isinstance(point, list) or len(point) != 2 or
        not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in point) or
        not (-90.10 < point[0] < -89.50 and 46.60 < point[1] < 46.90)):
        raise ValueError("invalid/out-of-area U.P. longitude-latitude source coordinate")


def closest_to_official_trail(point: list[float], segments: list[dict]) -> dict:
    best: dict = {"meters": float("inf"), "dnrObjectId": None}
    for seg in segments:
        pts = seg["coordinatesLonLat"]
        for i in range(1, len(pts)):
            distance = projected_segment_distance_m(point, pts[i - 1], pts[i])
            if distance < best["meters"]:
                best = {"meters": distance, "dnrObjectId": seg["objectId"]}
    if not best["dnrObjectId"]:
        raise ValueError("no trail segment found")
    return best


def build() -> dict:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    if source["schemaVersion"] != 1 or source["sourceCheckedOn"] != "2026-11-09":
        raise ValueError("unexpected source edition: review before rebuilding")
    features = source["officialNamedFalls"]
    trails = source["dnrPinkertonHikingSegments"]
    if len(features) != 2 or len(trails) != 66:
        raise ValueError("federal names or DNR trail-segment count changed")
    if len({f["featureId"] for f in features}) != len(features) or {
        f["featureId"]: f["featureName"] for f in features} != FEDERAL_FEATURE_IDS:
        raise ValueError("official GNIS identity mismatch")
    if len({seg["objectId"] for seg in trails}) != len(trails):
        raise ValueError("duplicate official DNR trail ID")
    for feature in features:
        checked_point(feature["coordinateLonLat"])
        if feature["featureClass"] != "Falls" or feature["state"] != "MI" or feature["county"] != "Gogebic":
            raise ValueError("USGS geographic-name record is not the expected Michigan waterfall")
    for seg in trails:
        if (seg["trailName"] != TRAIL_NAME or seg["county"] != "Gogebic" or
            seg["approvalInGIS"] != "Approved" or seg["nonmotorStatusInGIS"] != "Open" or
            seg["lengthMilesAttribute"] < 0 or not isinstance(seg["coordinatesLonLat"], list) or
            len(seg["coordinatesLonLat"]) < 2):
            raise ValueError("unexpected DNR hiking-trail segment status or geometry")
        for point in seg["coordinatesLonLat"]:
            checked_point(point)

    by_id = {f["featureId"]: f for f in features}
    official = []
    for feature_id in sorted(by_id):
        feature = by_id[feature_id]
        closest = closest_to_official_trail(feature["coordinateLonLat"], trails)
        official.append({
            "featureId": feature_id,
            "featureName": feature["featureName"],
            "featureClass": "Falls",
            "county": "Gogebic",
            "sourceRefresh": feature["sourceRefresh"],
            "coordinateLonLat": feature["coordinateLonLat"],
            "nearestDNRHikingTrailMeters": round(closest["meters"], 1),
            "nearestDNRObjectId": closest["dnrObjectId"],
            "semanticRole": "federal-geographic-feature-point-not-trailhead-or-viewpoint",
        })

    controls = []
    for row in source["directoryControlPoints"]:
        checked_point(row["lonLat"])
        named = "Traders Falls" if "Traders" in row["label"] else "Pinkerton Falls"
        target = next(f for f in official if f["featureName"] == named)
        near = closest_to_official_trail(row["lonLat"], trails)
        controls.append({
            "sourceLabel": row["label"],
            "sourceUrl": row["source"],
            "sourceReliability": "independent-tourism" if "Western U.P." in row["label"] else "unverified-directory",
            "officialNameCompared": named,
            # Do NOT publish unverified location coordinates: comparisons only.
            "distanceFromFederalFeatureMeters": round(haversine_m(row["lonLat"], target["coordinateLonLat"]), 1),
            "distanceFromMappedDNRHikingTrailMeters": round(near["meters"], 1),
            "mustNotCreateMapMarker": True,
        })
    if len(controls) != 3 or len(set(x["sourceLabel"] for x in controls)) != 3:
        raise ValueError("third-party comparison quality controls changed")

    length_miles = sum(seg["lengthMilesAttribute"] for seg in trails)
    if not 2.0 < length_miles < 3.0:
        raise ValueError("DNR trail segment length is inconsistent with 2.6mi printed trail")
    sep = haversine_m(by_id[1615029]["coordinateLonLat"], by_id[2126322]["coordinateLonLat"])
    if not 1500 < sep < 2500:
        raise ValueError("Pinkerton and Traders federal-feature identities are unexpectedly co-located")

    # Preserve DNR segment shapes (real published trails), not any connector line to falls.
    return {
        "schemaVersion": 1,
        "sourceCheckedOn": source["sourceCheckedOn"],
        "provenance": source["originalReferenceUrls"],
        "originalGISQueries": source["queryUrls"],
        "status": "FEATURE_IDENTITIES_CONFIRMED; WATERFALL_VIEWPOINT_ROUTES_UNVERIFIED",
        "meaning": "Two distinct USGS-named falls; DNR-mapped trail proximity is NOT visitor access.",
        "counts": {
            "federalDistinctNamedFalls": 2,
            "dnrApprovedHikingTrailSegments": len(trails),
            "dnrTrailGeometryVertices": sum(len(s["coordinatesLonLat"]) for s in trails),
            "independentLocationChecks": len(controls),
            "approvedWaterfallViewpointRoutes": 0,
        },
        "officialNamedFalls": official,
        "officialFallsStraightLineSeparationMeters": round(sep, 1),
        "dnrHikingTrail": {
            "name": TRAIL_NAME,
            "statusAsGISAttribute": "Open",
            "approvalAsGISAttribute": "Approved",
            "statusDoesNotOverrideSeasonalRoadClosure": True,
            "mappedSumOfSegmentMiles": round(length_miles, 4),
            "dnrPrintedTrailMiles": source["parkPDFObservations"]["dnrTrailDescriptionPinkertonMiles"],
            "dnrPrintedToCreekMiles": source["parkPDFObservations"]["dnrTrailDescriptionToPinkertonCreekMiles"],
            "segmentPolylines": [
                {"objectId": row["objectId"], "coordinatesLonLat": row["coordinatesLonLat"]}
                for row in trails
            ],
        },
        "independentLocationChecks": controls,
        "mapRules": {
            "approvedHikingTrailOnly": True,
            "federalNaturalFeaturePointsOnly": True,
            "drawStraightLineConnectors": False,
            "drawFootpathToFalls": False,
            "drawParkingMarkers": False,
            "drawUnverifiedThirdPartyPoints": False,
            "arrivalNavigable": False,
            "publicWaterfallItineraryApproved": False,
            "tourismUnnamedFallsLinkedToNamedFeature": False,
        },
        "officialMapLabelsTradersFalls": True,
        "officialMapLabelsPinkertonFalls": False,
        "nextProofRequired": [
            "Land-manager identification of the UP Travel unnamed Pinkerton Creek cascade as one specific federal geographic feature, or a separate drop.",
            "Official or otherwise independently verified continuous public route from the mapped hiking trail to a safe viewpoint for the precise named falls.",
            "Current land-manager trail condition, parking permission and road access; recurring December 1 road closure is not a live road status.",
        ],
    }


def first_difference(a, b, path="root"):
    if type(a) is not type(b):
        return path + ": type differs"
    if isinstance(a, dict):
        if a.keys() != b.keys():
            return path + ": keys differ " + str(set(a) ^ set(b))
        for key in a:
            diff = first_difference(a[key], b[key], path + "." + str(key))
            if diff:
                return diff
    elif isinstance(a, list):
        if len(a) != len(b):
            return path + ": length differs"
        for i, (x, y) in enumerate(zip(a, b)):
            diff = first_difference(x, y, path + "[" + str(i) + "]")
            if diff:
                return diff
    elif a != b:
        return path + ": expected " + str(a)[:90] + ", got " + str(b)[:90]
    return None


def main():
    parser = argparse.ArgumentParser()
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--write", action="store_true")
    selection.add_argument("--check", action="store_true")
    selection.add_argument("--summary", action="store_true")
    args = parser.parse_args()
    payload = build()
    if args.write:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Wrote " + str(OUTPUT.relative_to(ROOT)))
    elif args.check:
        if not OUTPUT.exists():
            raise SystemExit("Missing Pinkerton comparison output. Run --write.")
        observed = json.loads(OUTPUT.read_text(encoding="utf-8"))
        diff = first_difference(payload, observed)
        if diff:
            raise SystemExit("Pinkerton official GIS crosswalk differs: " + diff)
        print("PASS Pinkerton official GNIS + DNR GIS crosswalk")
    else:
        print(json.dumps({"officialNamedFalls": payload["officialNamedFalls"],
                          "federalSeparationMeters": payload["officialFallsStraightLineSeparationMeters"],
                          "thirdPartyOffsets": payload["independentLocationChecks"],
                          "approvedVisitorRoutes": payload["counts"]["approvedWaterfallViewpointRoutes"]},
                         indent=2))


if __name__ == "__main__":
    main()
