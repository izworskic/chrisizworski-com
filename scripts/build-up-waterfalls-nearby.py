#!/usr/bin/env python3
"""Deterministic U.P. waterfall proximity index, generated from curated visitor cards.

Only cards with a documented verified visitor arrival are eligible. Geographic
distance is straight-line between waterfall features, NEVER trail length, road
mileage, parking directions, a legal route or a live opening prediction.

Usage: python3 scripts/build-up-waterfalls-nearby.py [--check]
Pure Python stdlib; run during editorial updates, not on each web request.
"""
from __future__ import annotations

import argparse
from html.parser import HTMLParser
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HUB = ROOT / "public/upper-peninsula-waterfalls/index.html"
CATALOG = ROOT / "data/up-waterfalls.json"
OUTPUT = ROOT / "public/assets/up-waterfalls-nearby.json"
RADIUS_MILES = 50
EARTH_RADIUS_MILES = 3958.7613
ELIGIBLE_STATUSES = frozenset({"verify", "seasonal", "restricted"})


class CuratedCards(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.cards = []

    def handle_starttag(self, tag, attrs):
        if tag != "article":
            return
        attributes = dict(attrs)
        if "waterfall-card" in attributes.get("class", "").split():
            self.cards.append(attributes)


def great_circle_miles(left, right):
    """Haversine over fall-feature coordinates, not arrival or hiking geometry."""
    lat1, lon1 = math.radians(left["lat"]), math.radians(left["lng"])
    lat2, lon2 = math.radians(right["lat"]), math.radians(right["lng"])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_MILES * math.asin(min(1.0, math.sqrt(a)))


def build():
    source = json.loads(CATALOG.read_text(encoding="utf-8"))
    catalog = source["waterfalls"]
    by_id = {row["id"]: row for row in catalog}
    assert len(by_id) == len(catalog), "duplicate curated ids"
    parser = CuratedCards()
    parser.feed(HUB.read_text(encoding="utf-8"))
    cards = parser.cards
    assert len(cards) == len(catalog), "curated cards out of sync with the source inventory"
    assert {c.get("data-id") for c in cards} == set(by_id), "missing/unknown curated visitor card"

    locations = []
    excluded = []
    for card in cards:
        ident = card["data-id"]
        row = by_id[ident]
        lat, lng = float(card["data-lat"]), float(card["data-lng"])
        assert math.isfinite(lat) and math.isfinite(lng), f"bad coordinates: {ident}"
        assert 45.0 <= lat <= 48.5 and -91 <= lng <= -84, f"outside Upper Peninsula review bounds: {ident}"
        assert abs(lat - row["lat"]) < 0.00001 and abs(lng - row["lng"]) < 0.00001, f"map/source drift: {ident}"
        assert card["data-status"] == row["status"], f"access status drift: {ident}"
        arrival = card.get("data-arrival-verified")
        if arrival != "verified" or row["status"] not in ELIGIBLE_STATUSES:
            excluded.append(ident)
            continue
        url = card["data-url"]
        authority = card.get("data-arrival-source", "")
        assert url.startswith("/") and not url.startswith("//"), f"unsafe guide url: {ident}"
        assert authority.startswith("https://"), f"missing verified arrival source: {ident}"
        locations.append({
            "id": ident,
            "name": row["name"],
            "region": row["region"],
            "status": row["status"],
            "url": url,
            "source": authority,
            "lat": lat,
            "lng": lng,
        })
    locations.sort(key=lambda row: row["id"])
    assert locations and excluded, "empty or ungated geographic index"
    nearby = {}
    for origin in locations:
        matches = []
        for target in locations:
            if origin["id"] == target["id"]:
                continue
            distance = great_circle_miles(origin, target)
            if distance <= RADIUS_MILES:
                rounded = round(distance, 1)
                miles = int(rounded) if rounded.is_integer() else rounded
                matches.append((distance, target["id"], miles))
        matches.sort(key=lambda item: (item[0], item[1]))
        nearby[origin["id"]] = [{"id": ident, "miles": miles} for _, ident, miles in matches]

    return {
        "schemaVersion": 1,
        "reviewed": source["reviewed"],
        "method": "haversine-waterfall-coordinate-straight-line-not-driving",
        "maxRadiusMiles": RADIUS_MILES,
        "policy": "Not a route, visitor parking point, driving distance, trail distance, access grant, or live-open forecast.",
        "counts": {"curated": len(catalog), "eligible": len(locations), "excluded": len(excluded)},
        "excludedIds": sorted(excluded),
        "locations": locations,
        "nearby": nearby,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail when committed output is stale")
    args = parser.parse_args()
    result = json.dumps(build(), indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != result:
            raise SystemExit("Waterfall nearby index is stale: run python3 scripts/build-up-waterfalls-nearby.py")
        print("Waterfall nearby index matches curated coordinates and verified arrival gates.")
    else:
        OUTPUT.write_text(result, encoding="utf-8")
        print(f"Wrote {OUTPUT.relative_to(ROOT)} with {len(build()['locations'])} eligible curated stops.")


if __name__ == "__main__":
    main()
