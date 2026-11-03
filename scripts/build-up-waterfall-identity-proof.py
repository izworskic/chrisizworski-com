#!/usr/bin/env python3
"""Source-gated geographic name-collision audit for research-only waterfalls.

Rebuild after the curated state GIS or independent evidence changes:
    python3 scripts/build-up-waterfall-identity-proof.py
    python3 scripts/build-up-waterfall-identity-proof.py --check

This calculates geographic differences, NOT waterfall equivalence, public
access, parking coordinates, a trail, a safe turnout or live conditions.
No new network requests, libraries, paid APIs, databases or runtime Python.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / "data/up-waterfall-identity-evidence.json"
RECONCILIATION = ROOT / "data/up-waterfall-reconciliation.json"
OUTPUT = ROOT / "data/up-waterfall-identity-calculations.json"
RADIUS_M = 6371008.8


def haversine(a: dict, b: dict) -> float:
    lat1, lon1 = math.radians(a["lat"]), math.radians(a["lng"])
    lat2, lon2 = math.radians(b["lat"]), math.radians(b["lng"])
    dy, dx = lat2 - lat1, lon2 - lon1
    q = math.sin(dy / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dx / 2) ** 2
    return 2 * RADIUS_M * math.asin(min(1, math.sqrt(q)))


def build() -> dict:
    evidence = json.loads(INPUT.read_text(encoding="utf-8"))
    recon = json.loads(RECONCILIATION.read_text(encoding="utf-8"))
    by_id = {row["gisObjectId"]: row for row in recon["candidates"]}
    assert len(by_id) == len(recon["candidates"]), "Duplicate state GIS ID"
    assert evidence["schemaVersion"] == 1
    assert len(evidence["clusters"]) == 3
    expected = {"upper-silver": 68, "mill-pond": 8, "alger": 213}
    seen_slugs = set()
    clusters = []
    for cluster in evidence["clusters"]:
        slug = cluster["slug"]
        assert slug in expected and slug not in seen_slugs
        seen_slugs.add(slug)
        assert expected[slug] in cluster["gisObjectIds"]
        pts = {p["id"]: p for p in cluster["points"]}
        assert len(pts) == len(cluster["points"]), f"Duplicate point label in {slug}"
        for p in pts.values():
            assert p["sourceKey"] in evidence["landmarkSources"], f"Missing original source in {slug}"
            assert math.isfinite(p["lat"]) and math.isfinite(p["lng"]), f"Invalid point {p['id']}"
            assert 45 < p["lat"] < 48 and -91 < p["lng"] < -84, f"Out-of-scope point {p['id']}"
            if p["id"].startswith("gis-"):
                suffix = p["id"].rsplit("-", 1)[-1]
                oid = int(suffix)
                assert oid in cluster["gisObjectIds"], f"Unlisted state GIS {oid}"
                assert abs(p["lat"] - by_id[oid]["lat"]) < 0.000001, f"Latitude drift {oid}"
                assert abs(p["lng"] - by_id[oid]["lng"]) < 0.000001, f"Longitude drift {oid}"
        pairs = []
        for aid, bid in cluster["pairs"]:
            assert aid != bid and aid in pts and bid in pts
            pairs.append({"left": aid, "right": bid, "straightLineMeters": round(haversine(pts[aid], pts[bid]), 1)})
        distances = {(p["left"], p["right"]): p["straightLineMeters"] for p in pairs}
        if slug == "upper-silver":
            assert 100 < distances["gis-upper-silver-68", "field-herman-upper-silver"] < 200
            assert 100 < distances["gis-upper-silver-68", "secondary-upper-silver"] < 200
            assert 12000 < distances["gis-upper-silver-68", "gis-lower-silver-110"] < 13000
        elif slug == "mill-pond":
            assert 450 < distances["gis-mill-8", "gnis-upper-mill"] < 550
            assert 825 < distances["gis-mill-8", "gnis-lower-mill"] < 925
            assert 350 < distances["gnis-upper-mill", "gnis-lower-mill"] < 425
        elif slug == "alger":
            assert distances["gis-alger-213", "field-alger"] < 100
        for oid in [expected[slug]]:
            assert not by_id[oid].get("curatedId"), f"Accidentally published research-only GIS {oid}"
        clusters.append({
            "slug": slug, "label": cluster["label"], "identityClassification": cluster["status"],
            "landmarkIds": cluster["gisObjectIds"], "findings": cluster["note"],
            "pairs": pairs, "publicRouteCleared": False, "parkingVerified": False,
            "publicationEligible": False,
        })
    return {
        "schemaVersion": 1, "reviewed": evidence["reviewed"],
        "source": "data/up-waterfall-identity-evidence.json",
        "method": "Haversine geodesic coordinate comparisons, no route or ownership inference",
        "policy": evidence["policy"], "clusters": clusters,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    contents = json.dumps(build(), indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != contents:
            raise SystemExit("Waterfall identity calculation is stale. Regenerate with Python.")
        print("Waterfall identity distances and research-only source gates verified.")
    else:
        OUTPUT.write_text(contents, encoding="utf-8")
        print("Regenerated waterfall identity evidence calculation.")


if __name__ == "__main__":
    main()
