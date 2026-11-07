#!/usr/bin/env python3
"""Offline, evidence-gated Upper Peninsula waterfall discovery reconciliation.

This program NEVER changes the public waterfall catalog, sitemap, maps or visitor
routes. Independent directory observations establish candidate *names*, not
confirmed natural features, landowner permission, parking or safe viewpoints.

Usage:
  python3 scripts/build-up-waterfall-discovery.py --check
  python3 scripts/build-up-waterfall-discovery.py --write
  python3 scripts/build-up-waterfall-discovery.py --summary

Python standard library only; source snapshots are intentionally reviewed inputs.
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data/up-waterfall-external-identity-shorelinescout.json"
GIS = ROOT / "data/up-waterfall-reconciliation.json"
CURATED = ROOT / "data/up-waterfalls.json"
OUTPUT = ROOT / "data/up-waterfall-discovery-index.json"

TIERS = frozenset(("upper", "lower", "middle", "first", "second", "third", "fourth"))
COUNTIES = frozenset(("Alger", "Baraga", "Chippewa", "Delta", "Dickinson",
                      "Gogebic", "Houghton", "Iron", "Keweenaw", "Luce",
                      "Mackinac", "Marquette", "Menominee", "Ontonagon",
                      "Schoolcraft"))
PRIORITY_KEYWORDS = ("montreal", "peterson", "piers gorge", "miners beach",
                     "big pup", "lower gratiot", "big garlic", "let herby")
GENERIC = frozenset(("falls", "upper falls", "lower falls", "middle falls",
                     "big falls", "little falls", "unnamed falls", "no name falls"))


def normal(value: str) -> str:
    value = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii").lower()
    value = re.sub(r"[^a-z0-9]+", " ", value).strip()
    return re.sub(r"\s+", " ", value)


def county_from_place(place: str) -> str | None:
    for county in sorted(COUNTIES):
        if re.search(r"\b" + re.escape(county) + r"\s+County\b", place or "", re.I):
            return county
    return None


def has_tier_conflict(a: str, b: str) -> bool:
    a_tier = set(normal(a).split()) & TIERS
    b_tier = set(normal(b).split()) & TIERS
    return a_tier != b_tier


def is_alias_hint(a: str, b: str) -> bool:
    # Hints are NEVER automatic matches. Tier names and namesakes stay distinct.
    if has_tier_conflict(a, b):
        return False
    aa = normal(a).split()
    bb = normal(b).split()
    if not aa or not bb or len(aa) < 2 or len(bb) < 2:
        return False
    if sorted(aa) == sorted(bb):
        return True
    a_tokens = set(aa) - {"falls", "fall"}
    b_tokens = set(bb) - {"falls", "fall"}
    return len(a_tokens) >= 2 and len(b_tokens) >= 2 and bool(a_tokens & b_tokens) and (
        a_tokens <= b_tokens or b_tokens <= a_tokens
    )


def build() -> dict:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    gis = json.loads(GIS.read_text(encoding="utf-8"))
    curated = json.loads(CURATED.read_text(encoding="utf-8"))["waterfalls"]
    external = source["observations"]
    assert source["observationCount"] == source["sourceAdvertisedEntries"] == len(external) and len(external) >= 150
    assert len({x["id"] for x in external}) == len(external)
    assert len({x["reference"] for x in external}) == len(external)
    assert len(curated) == gis["counts"]["curatedTotal"]
    assert len(gis["candidates"]) == gis["counts"]["gisCandidates"] and len(gis["candidates"]) >= 100
    assert 0 <= gis["counts"]["pending"] <= len(gis["candidates"])
    assert all(x["county"] in COUNTIES and x["reference"].startswith(
        "https://shorelinescout.com/michigan/waterfalls/") for x in external)

    gis_by_name = defaultdict(list)
    for row in gis["candidates"]:
        gis_by_name[normal(row["name"])].append(row)
    curated_by_name = defaultdict(list)
    for row in curated:
        curated_by_name[normal(row["name"])].append(row)
    linked_county = defaultdict(set)
    for row in gis["candidates"]:
        if row.get("curatedId"):
            linked_county[row["curatedId"]].add(str(row.get("county", "")).title())

    identity_groups = Counter((normal(x["name"]), x["county"]) for x in external)
    classifications = Counter()
    records = []
    for row in external:
        n = normal(row["name"])
        county = row["county"]
        exact_gis = [g for g in gis_by_name[n] if str(g.get("county", "")).title() == county]
        exact_curated = [c for c in curated_by_name[n] if (
            not linked_county[c["id"]] or county in linked_county[c["id"]]
        ) and (not county_from_place(c.get("place", "")) or county_from_place(c.get("place", "")) == county)]
        # When a county is not known from any curated evidence, an identical name
        # may be a namesake: record a suggestion, not a confirmed identity.
        definite_curated = [c for c in exact_curated if county in linked_county[c["id"]]
                            or county_from_place(c.get("place", "")) == county]
        gis_ids = sorted(g["gisObjectId"] for g in exact_gis)
        curated_ids = sorted({c["id"] for c in definite_curated}
                             | {g["curatedId"] for g in exact_gis if g.get("curatedId")})
        ambiguous = identity_groups[(n, county)] > 1
        if curated_ids and not ambiguous:
            category = "curated_exact_identity"
        elif exact_gis and not ambiguous:
            category = "gis_identity_review" if not curated_ids else "curated_exact_identity"
        elif ambiguous:
            category = "same_name_same_county_review"
        else:
            category = "external_only_research"
        hints = []
        if category == "external_only_research":
            for c in curated:
                known_county = linked_county[c["id"]] or ({county_from_place(c.get("place", ""))} if county_from_place(c.get("place", "")) else set())
                if (not known_county or county in known_county) and (
                    (normal(c["name"]) == n) or is_alias_hint(row["name"], c["name"])
                ):
                    hints.append(c["id"])
            for g in gis["candidates"]:
                if str(g.get("county", "")).title() == county and is_alias_hint(row["name"], g["name"]):
                    hints.append("gis:" + str(g["gisObjectId"]))
            hints = sorted(set(hints))[:8]
            if hints:
                category = "possible_alias_review"
        classifications[category] += 1
        river = row.get("river")
        score = 10 + (5 if river else 0) + (20 if any(k in n for k in PRIORITY_KEYWORDS) else 0)
        if n in GENERIC:
            score -= 12
        if category == "external_only_research":
            score += 20
        if category == "possible_alias_review":
            score += 5
        if category == "same_name_same_county_review":
            score -= 10
        if category in ("curated_exact_identity", "gis_identity_review"):
            score = 0
        records.append({
            "sourceId": row["id"], "name": row["name"], "county": county,
            "river": river, "category": category,
            "exactCuratedIds": curated_ids, "exactGisIds": gis_ids,
            "possibleAliasIds": hints, "sourceDuplicateGroupSize": identity_groups[(n, county)],
            "reviewPriority": score, "publicationEligible": False,
            "legalRouteVerifiedByThisSource": False,
        })
    unresolved = [r for r in records if r["category"] != "curated_exact_identity"]
    ranked = sorted(unresolved, key=lambda x: (-x["reviewPriority"], x["county"], normal(x["name"]), x["sourceId"]))
    return {
        "schemaVersion": 1,
        "reviewed": source["retrieved"],
        "generatedFrom": [
            "data/up-waterfall-external-identity-shorelinescout.json",
            "data/up-waterfall-reconciliation.json", "data/up-waterfalls.json"
        ],
        "publicationPolicy": "RESEARCH ONLY. Name/river mentions, GIS points, rankings, aliases and presumed routes never grant access, authorize car navigation or create indexable guides.",
        "counts": {
            "externalObservations": len(external),
            "externalUniqueNameCountyGroups": len(identity_groups),
            "curatedDestinations": len(curated),
            "stateGisRecords": len(gis["candidates"]),
            "stateGisPendingAccessReview": gis["counts"]["pending"],
            "classification": {k: classifications[k] for k in sorted(classifications)},
            "unresolvedSourceObservations": len(unresolved),
            "distinctGeographicFallsVerifiedByThisEngine": 0,
        },
        "externalRecords": records,
        "researchPrioritySourceIds": [r["sourceId"] for r in ranked],
    }


def main() -> None:
    cli = argparse.ArgumentParser(description=__doc__)
    group = cli.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true")
    group.add_argument("--write", action="store_true")
    group.add_argument("--summary", action="store_true")
    args = cli.parse_args()
    result = build()
    body = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUTPUT.exists():
            raise SystemExit("Missing waterfall discovery index; run --write after reviewing source inputs")
        actual = OUTPUT.read_text(encoding="utf-8")
        if actual != body:
            old = json.loads(actual)
            def first_difference(left, right, where="$"):
                if type(left) != type(right):
                    return where, left, right
                if isinstance(left, dict):
                    for key in list(dict.fromkeys([*left, *right])):
                        if key not in left or key not in right:
                            return where + "." + key, left.get(key, "<missing>"), right.get(key, "<missing>")
                        found = first_difference(left[key], right[key], where + "." + key)
                        if found:
                            return found
                elif isinstance(left, list):
                    if len(left) != len(right):
                        return where + ".length", len(left), len(right)
                    for number, (a, b) in enumerate(zip(left, right)):
                        found = first_difference(a, b, where + "[" + str(number) + "]")
                        if found:
                            return found
                elif left != right:
                    return where, left, right
                return None
            difference = first_difference(old, result)
            if difference:
                place, committed, generated = difference
                raise SystemExit("Waterfall discovery mismatch at " + place +
                                 "\nexpected: " + json.dumps(committed, ensure_ascii=False)[:250] +
                                 "\nactual: " + json.dumps(generated, ensure_ascii=False)[:250])
            raise SystemExit("Waterfall research index serialization mismatch: update generator formatting")
        print("Waterfall identity and GIS research index is deterministic; no access is inferred.")
    elif args.write:
        OUTPUT.write_text(body, encoding="utf-8")
        print("Wrote " + str(OUTPUT.relative_to(ROOT)) + " for research only.")
    else:
        print(json.dumps(result["counts"], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
