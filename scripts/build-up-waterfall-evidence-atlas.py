#!/usr/bin/env python3
"""Offline U.P. waterfall Evidence Atlas.

This script composes *source records*, not a count of distinct waterfalls.
It never geocodes tourism addresses, copies third-party directions, invents
parking or walking paths, or promotes research candidates to public outings.

python3 scripts/build-up-waterfall-evidence-atlas.py --check
python3 scripts/build-up-waterfall-evidence-atlas.py --write
python3 scripts/build-up-waterfall-evidence-atlas.py --summary
"""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "public/assets/up-waterfall-evidence-atlas.json"
INPUTS = {
    "curated": "data/up-waterfalls.json",
    "gis": "data/up-waterfall-reconciliation.json",
    "external": "data/up-waterfall-external-identity-shorelinescout.json",
    "discovery": "data/up-waterfall-discovery-index.json",
    "tourism": "data/up-waterfall-uptravel-location-review-2026.json",
}
VERSION = 1
WARNING = (
    "This atlas contains source mentions, not verified distinct waterfalls. "
    "Natural-feature dots are NOT parking or approved trailheads. A name-only "
    "listing has no independently verified coordinates or public access."
)


def load_all() -> dict:
    return {
        name: json.loads((ROOT / path).read_text(encoding="utf-8"))
        for name, path in INPUTS.items()
    }


def make() -> dict:
    src = load_all()
    guides = src["curated"]["waterfalls"]
    gis = src["gis"]["candidates"]
    names = src["external"]["observations"]
    discovery = src["discovery"]["externalRecords"]
    tourist = src["tourism"]["mainDirectoryFirstTwelve"]
    assert len(guides) == src["gis"]["counts"]["curatedTotal"]
    assert len(gis) == src["gis"]["counts"]["gisCandidates"]
    assert len(names) == src["external"]["observationCount"] == len(discovery)
    assert len(tourist) == 12
    assert len({x["id"] for x in guides}) == len(guides)
    assert len({x["gisObjectId"] for x in gis}) == len(gis)
    assert len({x["id"] for x in names}) == len(names)
    assert len({x["sourceId"] for x in discovery}) == len(discovery)
    g_by_curated = defaultdict(list)
    for g in gis:
        if g.get("curatedId"):
            g_by_curated[g["curatedId"]].append(g)
    d_by_id = {x["sourceId"]: x for x in discovery}
    assert {n["id"] for n in names} == set(d_by_id)
    records = []
    for g in guides:
        gs = g_by_curated.get(g["id"], [])
        counties = sorted({x["county"].title() for x in gs})
        # A multi-falls planner can span county lines; do not invent one county.
        pub = g.get("publication") or "multi-falls-planner"
        if pub not in ("verified-access-guide", "verified-closure-guide",
                       "research-only-guide", "multi-falls-planner"):
            raise ValueError("Unknown curated publication: " + pub)
        records.append({
            "id": "guide:" + g["id"], "kind": "guide", "name": g["name"],
            "county": counties[0] if counties else None,
            "river": None, "place": g.get("place"),
            "lat": g.get("lat"), "lng": g.get("lng"),
            "sourceUrl": g.get("source"),
            "guidePath": g.get("link") or "/upper-peninsula-waterfalls/" + g["id"] + "/",
            "publication": pub, "status": g.get("status"),
            "relatedGuideId": g["id"],
            "linkedGisIds": sorted(x["gisObjectId"] for x in gs),
            "identityStatus": "curated-guide-not-live-opening",
            "sourceReviewed": g.get("sourceReviewed") or src["curated"].get("reviewed"),
            "mapRole": "natural-waterfall-feature-not-arrival",
        })
    for g in gis:
        records.append({
            "id": "gis:" + str(g["gisObjectId"]), "kind": "gis", "name": g["name"],
            "county": g["county"].title(), "river": g.get("river") or None,
            "lat": g["lat"], "lng": g["lng"],
            "sourceUrl": src["gis"]["source"], "gisObjectId": g["gisObjectId"],
            "relatedGuideId": g.get("curatedId"),
            "identityStatus": "explicit-curated-gis-id" if g.get("curatedId") else "mapped-identity-needs-access-review",
            "sourceReviewed": src["gis"]["sourceRetrieved"],
            "mapRole": "state-natural-feature-point-not-parking-or-trailhead",
        })
    for n in names:
        x = d_by_id[n["id"]]
        assert x["name"] == n["name"] and x["county"] == n["county"]
        assert x["category"] in (
            "curated_exact_identity", "external_only_research",
            "gis_identity_review", "possible_alias_review",
            "same_name_same_county_review")
        records.append({
            "id": "name:" + n["id"], "kind": "name", "name": n["name"],
            "county": n["county"], "river": n.get("river"),
            "lat": None, "lng": None, "sourceUrl": n["reference"],
            "identityStatus": x["category"],
            "relatedGuideIds": x["exactCuratedIds"],
            "relatedGisIds": x["exactGisIds"],
            "possibleAliasIds": x["possibleAliasIds"],
            "sourceReviewed": src["external"]["retrieved"],
            "mapRole": "no-geographic-point",
        })
    for i, t in enumerate(tourist):
        records.append({
            "id": "tourism:" + str(i + 1), "kind": "tourism", "name": t["name"],
            "county": None, "river": None,
            "lat": None, "lng": None, "sourceUrl": src["tourism"]["sourceCitation"],
            "place": t["cityLabel"], "addressLabel": t["addressLabel"],
            "identityStatus": t["disposition"], "relatedGuideId": t.get("curatedId"),
            "relatedGuideIds": t.get("curatedIds") or [],
            "note": t["note"], "sourceReviewed": src["tourism"]["reviewed"],
            "mapRole": "tourism-address-not-validated-visitor-arrival",
        })
    expected = len(guides) + len(gis) + len(names) + len(tourist)
    assert len(records) == expected
    assert len({r["id"] for r in records}) == expected
    assert all((r["lat"] is None and r["lng"] is None)
               for r in records if r["kind"] in ("name", "tourism"))
    for r in records:
        if r["lat"] is not None or r["lng"] is not None:
            if not isinstance(r["lat"], (int, float)) or not isinstance(r["lng"], (int, float)):
                raise ValueError("Partial or invalid coordinate: " + r["id"])
            if not (44.0 < r["lat"] < 49.0 and -93.0 < r["lng"] < -82.0):
                raise ValueError("Outside Michigan UP bounding screen: " + r["id"])
    return {
        "schemaVersion": VERSION, "generatedFrom": INPUTS,
        "sourceDates": {
            "gis": src["gis"]["sourceRetrieved"],
            "nameDirectory": src["external"]["retrieved"],
            "tourismSample": src["tourism"]["reviewed"],
        },
        "claim": "Source observations, NOT distinct waterfalls or public visitor destinations.",
        "warning": WARNING,
        "counts": {
            "curatedGuideRecords": len(guides),
            "stateGisFeatureRecords": len(gis),
            "independentNameObservations": len(names),
            "upTravelDirectorySampleRecords": len(tourist),
            "totalSourceRecords": expected,
            "gisExplicitlyLinkedToGuides": sum(bool(g.get("curatedId")) for g in gis),
            "nameOnlyWithoutPoint": len(names) + len(tourist),
        },
        "records": records,
    }


def main() -> None:
    cli = argparse.ArgumentParser()
    mode = cli.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--summary", action="store_true")
    args = cli.parse_args()
    result = make()
    if args.write:
        DEST.parent.mkdir(parents=True, exist_ok=True)
        DEST.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {DEST.relative_to(ROOT)}: {result['counts']}")
    elif args.check:
        if not DEST.exists() or json.loads(DEST.read_text(encoding="utf-8")) != result:
            raise SystemExit("Evidence Atlas output differs; run --write and inspect diff")
        print(f"PASS Evidence Atlas generated record contract: {result['counts']}")
    else:
        print(json.dumps(result["counts"], indent=2))


if __name__ == "__main__":
    main()
