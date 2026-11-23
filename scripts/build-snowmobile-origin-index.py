#!/usr/bin/env python3
"""Build a source-checked, offline Michigan origin gazetteer for snowmobile routes.

Input: pinned U.S. Census Bureau 2025 Michigan place Gazetteer columns,
plus town reference locations already audited against Michigan DNR trails.
Output: one static JSON file. This script NEVER claims to geocode an
arbitrary address or that a place centroid is a trailhead.
Run: python3 scripts/build-snowmobile-origin-index.py [--check]
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data/snowmobile-origin-sources/mi-2025-census-places.tsv"
OUTPUT = ROOT / "public/assets/snowmobile-origin-cities.json"
TOWN_DIRECTORY = ROOT / "data/snowmobile-town-proximity"
REGIONS = (
    "eastern-up", "keweenaw-copper-country", "central-western-up",
    "grayling-gaylord", "northeast-sunrise", "northwest-michigan", "west-michigan",
)
CENSUS_URL = (
    "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/"
    "2025_Gazetteer/2025_gaz_place_26.txt"
)
SOURCE_NAME = (
    "U.S. Census Bureau 2025 Gazetteer: Michigan places; supplemental "
    "existing Michigan DNR town reference for Frederic"
)


def valid_point(lat: float, lon: float) -> None:
    if not (math.isfinite(lat) and math.isfinite(lon) and
            41 <= lat <= 49 and -91 <= lon <= -82):
        raise ValueError(f"Michigan place has invalid coordinates: {lat}, {lon}")


def records_from_source(source: Path = SOURCE) -> list[dict]:
    rows = []
    seen_ids: set[str] = set()
    with source.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        if reader.fieldnames != ["GEOID", "NAME", "LAT", "LON"]:
            raise ValueError("Census source header changed; refusing silent remapping")
        for line_number, row in enumerate(reader, 2):
            geoid, raw = row["GEOID"], row["NAME"]
            if not re.fullmatch(r"26\d{5}", geoid) or geoid in seen_ids:
                raise ValueError(f"Duplicate/invalid Census place GEOID on line {line_number}")
            seen_ids.add(geoid)
            match = re.fullmatch(r"(.+?) (city|village|CDP)", raw)
            if not match:
                raise ValueError(f"Unexpected Census place name on line {line_number}: {raw}")
            lat, lon = float(row["LAT"]), float(row["LON"])
            valid_point(lat, lon)
            rows.append({
                "id": "mi-" + geoid, "name": match.group(1),
                "kind": match.group(2).lower(),
                "lat": round(lat, 5), "lon": round(lon, 5),
            })
    if len(rows) != 745:
        raise ValueError(f"Expected pinned 745 Michigan Census places, got {len(rows)}")
    return rows


def add_trail_reference_towns(rows: list[dict], town_directory: Path = TOWN_DIRECTORY) -> list[dict]:
    found = {r["name"].casefold() for r in rows}
    added: set[str] = set()
    for region in REGIONS:
        payload = json.loads((town_directory / (region + ".json")).read_text(encoding="utf-8"))
        if payload.get("region") != region:
            raise ValueError(f"Wrong DNR town region: {region}")
        for town in payload["towns"]:
            name = town["name"].strip()
            if not town.get("proxy", {}).get("source", "").startswith("Google autocomplete"):
                raise ValueError(f"Town has no audited autocomplete source: {name}")
            if town.get("dnr", {}).get("radiusKm") != 5:
                raise ValueError(f"Town has no verified DNR 5 km proximity: {name}")
            if name.casefold() in found:
                continue
            lat, lon = float(town["lat"]), float(town["lon"])
            valid_point(lat, lon)
            if name.casefold() in added:
                raise ValueError(f"Duplicate supplemental trail community: {name}")
            added.add(name.casefold())
            rows.append({
                "id": "trail-" + re.sub(r"[^a-z0-9]+", "-", name.casefold()).strip("-"),
                "name": name, "kind": "trail-reference",
                "lat": round(lat, 5), "lon": round(lon, 5),
            })
    # Supplemental reference is not a Census community, hence explicit and bounded.
    if added != {"frederic"}:
        raise ValueError(f"Unexpected supplemental community additions: {sorted(added)}")
    return rows


def build(source: Path = SOURCE, town_directory: Path = TOWN_DIRECTORY) -> dict:
    rows = add_trail_reference_towns(records_from_source(source), town_directory)
    if len({r["id"] for r in rows}) != len(rows):
        raise ValueError("Duplicate origin IDs")
    return {
        "version": 1, "state": "MI",
        "source": SOURCE_NAME, "sourceUrl": CENSUS_URL,
        "records": sorted(rows, key=lambda r: (r["name"].casefold(), r["kind"], r["id"])),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Reject a stale/corrupt checked-in JSON snapshot")
    args = parser.parse_args()
    expected = build()
    if args.check:
        actual = json.loads(OUTPUT.read_text(encoding="utf-8"))
        if actual != expected:
            raise SystemExit("Snowmobile origin index is not reproducible: rerun Python generator")
        print(f"Origin index valid: {len(expected['records'])} source-backed Michigan places")
    else:
        OUTPUT.write_text(json.dumps(expected, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {OUTPUT.relative_to(ROOT)}: {len(expected['records'])} places")


if __name__ == "__main__":
    main()
