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
import re
import unicodedata
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
    "tourismIndex": "data/up-waterfall-uptravel-indexed-listings-2026.json",
    "identityReview": "data/up-waterfall-uptravel-unmatched-identity-review-2026.json",
    "priorityAccess": "data/up-waterfall-three-priority-access-research-2026.json",
}
VERSION = 4
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


def normalized_name(value: str) -> str:
    value = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def make() -> dict:
    src = load_all()
    guides = src["curated"]["waterfalls"]
    gis = src["gis"]["candidates"]
    names = src["external"]["observations"]
    discovery = src["discovery"]["externalRecords"]
    first_page = src["tourism"]["mainDirectoryFirstTwelve"]
    index = src["tourismIndex"]
    reviews = src["identityReview"]
    priorities = src["priorityAccess"]
    tourist = [x for x in index["records"] if x["inAtlas"]]
    by_first_name = {normalized_name(x["name"]): x for x in first_page}
    assert len(by_first_name) == len(first_page) == 12
    assert len(index["records"]) == index["counts"]["siteWideTermMatchedUrls"]
    assert len(tourist) == index["counts"]["researchAtlasListingRecords"]
    assert len({x["listingId"] for x in index["records"]}) == len(index["records"])
    assert len({x["sourceUrl"] for x in index["records"]}) == len(index["records"])
    assert len(guides) == src["gis"]["counts"]["curatedTotal"]
    assert len(gis) == src["gis"]["counts"]["gisCandidates"]
    assert len(names) == src["external"]["observationCount"] == len(discovery)
    assert len(tourist) > len(first_page)
    assert reviews["schemaVersion"] == 1
    by_review = {r["listingId"]: r for r in reviews["records"]}
    assert len(by_review) == len(reviews["records"]) == 13
    assert priorities["schemaVersion"] == 1
    by_priority = {r["listingId"]: r for r in priorities["records"]}
    assert len(by_priority) == len(priorities["records"]) == 3
    assert set(by_priority) == {4474, 5457, 3701}
    assert set(by_priority).issubset(set(by_review))
    for access in by_priority.values():
        assert access["sourceRecordId"] == "tourism:" + str(access["listingId"])
        assert access["reviewed"] == priorities["reviewed"]
        assert access["routeCleared"] is False
        assert access["newDestinationAuthorized"] is False
        assert access["featurePoint"] is None
        assert access["parkingPoint"] is None
        assert access["routeGeometry"] is None
        assert access["accessVerdict"] in (
            "NO VERIFIED WATERFALL ROUTE",
            "PARK CLOSED NOVEMBER 1–APRIL 15; NO VERIFIED FALLS ROUTE")
        assert len(access["officialFacts"]) >= 3
        assert len(access["nextEvidence"]) >= 2
        assert access["references"] and any(x["authority"] == "land-manager" for x in access["references"])
        cited_ids = [x["id"] for x in access["references"]]
        assert len(cited_ids) == len(set(cited_ids))
        for source in access["references"]:
            assert source["url"].startswith("https://")
        for fact in access["officialFacts"] + access["independentFacts"]:
            assert fact["sourceId"] in cited_ids
        assert len(access["establishedStart"]) > 40
        assert len(access["waterfallViewpoint"]) > 40
        assert len(access["falseEquivalence"]) > 40

    assert set(by_review).issubset({x["listingId"] for x in tourist})
    guide_ids = {g["id"] for g in guides}
    gis_ids = {g["gisObjectId"] for g in gis}
    external_ids = {n["id"] for n in names}
    for review in by_review.values():
        assert review["sourceUrl"].startswith("https://www.uptravel.com/listing/")
        assert review["sourceUrls"] and all(x.startswith("https://") for x in review["sourceUrls"])
        assert set(review["existingGuideIds"]).issubset(guide_ids)
        assert set(review["linkedGisIds"]).issubset(gis_ids)
        assert set(review["relatedExternalIds"]).issubset(external_ids)
        assert review["publicRouteCleared"] is False
        assert review["publishNewDestination"] is False

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
            "county": counties[0] if len(counties) == 1 else None,
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
    guide_by_name = defaultdict(list)
    gis_by_name = defaultdict(list)
    external_by_name = defaultdict(list)
    for g in guides:
        guide_by_name[normalized_name(g["name"])].append(g["id"])
    for g in gis:
        gis_by_name[normalized_name(g["name"])].append(g)
    for n in names:
        external_by_name[normalized_name(n["name"])].append(n)
    for t in tourist:
        review = by_review.get(t["listingId"])
        access = by_priority.get(t["listingId"])
        if review and (review["sourceUrl"] != t["sourceUrl"] or
                       normalized_name(review["originalName"]) != normalized_name(t["name"])):
            raise ValueError("Identity review drift: " + str(t["listingId"]))
        k = normalized_name(t["name"])
        first = by_first_name.get(k) if t["sourceCategoryMembership"] == "observed-on-directory-first-page" else None
        if t["sourceCategoryMembership"] == "observed-on-directory-first-page" and first is None:
            raise ValueError("First page crosswalk mismatch: " + t["name"])
        matches_gis = gis_by_name[k]
        matches_external = external_by_name[k]
        candidate_counties = sorted(set(g["county"].title() for g in matches_gis)
                                    | set(n["county"] for n in matches_external))
        if t["role"] not in ("waterfall-named-listing", "related-place-or-activity"):
            raise ValueError("Unsafe inclusion of non-falls index record: " + t["name"])
        records.append({
            "id": "tourism:" + str(t["listingId"]), "kind": "tourism",
            "name": t["name"], "county": None, "river": None,
            "lat": None, "lng": None, "sourceUrl": t["sourceUrl"],
            "place": t["areaLabel"], "addressLabel": t["roadLabel"],
            "identityStatus": t["firstPageDisposition"] or "indexed-url-research-only",
            "relatedGuideId": t["firstPageCuratedId"],
            "relatedGuideIds": t["firstPageCuratedIds"],
            "candidateGuideIds": sorted(guide_by_name[k]),
            "candidateGisIds": sorted(g["gisObjectId"] for g in matches_gis),
            "candidateExternalIds": sorted(n["id"] for n in matches_external),
            "candidateCounties": candidate_counties,
            "listingId": t["listingId"], "listingRole": t["role"],
            "nameMethod": t["nameMethod"],
            "siteIndexWaterfallSearch": t["siteIndexWaterfallSearch"],
            "directoryMembership": t["sourceCategoryMembership"],
            "note": first["note"] if first else "Indexed listing URL only. Current category membership, location and visitor access are not verified.",
            "sourceReviewed": index["reviewed"],
            "mapRole": "tourism-index-no-geographic-point-or-arrival",
            "priorityAccess": access if access else None,
            "identityReview": ({
                "disposition": review["disposition"], "canonicalName": review["canonicalName"],
                "finding": review["identityFinding"], "barrier": review["accessBarrier"],
                "confidence": review["identityConfidence"],
                "reviewedGuideIds": review["existingGuideIds"],
                "linkedGisIds": review["linkedGisIds"],
                "relatedExternalIds": review["relatedExternalIds"],
                "sourceUrls": review["sourceUrls"],
                "reviewed": reviews["reviewed"],
                "publicRouteCleared": False, "newDestinationAuthorized": False,
            } if review else None),
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
            "upTravelIndex": index["reviewed"],
            "identityReview": reviews["reviewed"],
            "priorityAccess": priorities["reviewed"],
        },
        "claim": "Source observations, NOT distinct waterfalls or public visitor destinations.",
        "warning": WARNING,
        "counts": {
            "curatedGuideRecords": len(guides),
            "stateGisFeatureRecords": len(gis),
            "independentNameObservations": len(names),
            "upTravelDirectorySampleRecords": len(first_page),
            "upTravelIndexedListingRecords": len(tourist),
            "upTravelKeywordIndexRecords": len(index["records"]),
            "upTravelIndexedWaterfallSearchHits": index["counts"]["indexWaterfallSearchHits"],
            "upTravelWaterfallNamedListings": index["counts"]["atlasWaterfallNamedRecords"],
            "upTravelRelatedPlaces": index["counts"]["atlasRelatedPlacesOrActivities"],
            "upTravelUnmatchedIdentityReviews": len(by_review),
            "priorityAccessInvestigations": len(by_priority),
            "priorityAccessClearedVisitorRoutes": sum(a["routeCleared"] for a in by_priority.values()),
            "upTravelUnrelatedKeywordPagesExcluded": index["counts"]["excludedBroadIndexHits"],
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
        if not DEST.exists():
            raise SystemExit("Evidence Atlas output missing; run --write")
        actual = json.loads(DEST.read_text(encoding="utf-8"))
        if actual != result:
            def first_difference(expected, observed, prefix="root"):
                if type(expected) is not type(observed):
                    return f"{prefix}: expected type {type(expected).__name__}, got {type(observed).__name__}"
                if isinstance(expected, dict):
                    for key in expected:
                        if key not in observed:
                            return f"{prefix}.{key}: missing key"
                        diff = first_difference(expected[key], observed[key], f"{prefix}.{key}")
                        if diff:
                            return diff
                    extras = set(observed) - set(expected)
                    if extras:
                        return f"{prefix}: extra keys {sorted(extras)}"
                elif isinstance(expected, list):
                    if len(expected) != len(observed):
                        return f"{prefix}: expected {len(expected)} records, got {len(observed)}"
                    for i, (a, b) in enumerate(zip(expected, observed)):
                        diff = first_difference(a, b, f"{prefix}[{i}]")
                        if diff:
                            return diff
                elif expected != observed:
                    return f"{prefix}: expected {str(expected)[:160]!r}, got {str(observed)[:160]!r}"
                return None
            raise SystemExit("Evidence Atlas output differs: " + str(first_difference(result, actual)))
        print(f"PASS Evidence Atlas generated record contract: {result['counts']}")
    else:
        print(json.dumps(result["counts"], indent=2))


if __name__ == "__main__":
    main()
