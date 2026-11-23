#!/usr/bin/env python3
"""Independent stdlib audit of holiday airport lookup data.

No network, model inference, visitor location, or production Python runtime.
The --tsv output is an immutable input contract for the optional Rust verifier.
"""
import argparse
import json
import math
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "public/holiday-travel/data/national.json"
TOP_THIRTY = ROOT / "lib/holiday-travel/busiest-airports.mjs"


def catalog():
    national = json.loads(SOURCE.read_text(encoding="utf-8"))
    airports = national["airports"]
    if len(airports) < 30:
        raise ValueError("Airport coverage unexpectedly below 30")
    seen = set()
    for row in airports:
        code, city, flights = row.get("code"), row.get("city"), row.get("flights")
        if not isinstance(code, str) or not re.fullmatch(r"[A-Z]{3}", code):
            raise ValueError(f"Invalid 3-letter airport code: {code!r}")
        if code in seen:
            raise ValueError(f"Duplicate code: {code}")
        seen.add(code)
        if not isinstance(city, str) or not city.strip() or "\t" in city or "\n" in city:
            raise ValueError(f"{code}: invalid city name")
        if type(flights) is not int or flights <= 0:
            raise ValueError(f"{code}: invalid BTS flight count")
        for key, limit in (("lat", 90), ("lon", 180)):
            value = row.get(key)
            if not isinstance(value, (int, float)) or not math.isfinite(value) or abs(value) > limit:
                raise ValueError(f"{code}: invalid {key}")
    return airports


def audit(airports):
    text = TOP_THIRTY.read_text(encoding="utf-8")
    prefix = "export const AIRPORTS ="
    if prefix not in text:
        raise ValueError("Missing committed busiest-airport list")
    listed = json.loads(text.split(prefix, 1)[1].strip().removesuffix(";"))
    expected = sorted(airports, key=lambda a: (-a["flights"], a["code"]))[:30]
    fields = ("code", "city", "flights", "lat", "lon")
    if [{k: a[k] for k in fields} for a in listed] != [
        {k: a[k] for k in fields} for a in expected
    ]:
        raise ValueError("Committed top 30 differs from BTS national.json")
    codes = {a["code"] for a in airports}
    for key in ("ATL", "DTW", "ORD", "JFK"):
        if key not in codes:
            raise ValueError(f"Required sample airport absent: {key}")
    return listed


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tsv", action="store_true", help="Emit code, city and BTS flights, sorted by code")
    args = parser.parse_args(argv)
    airports = catalog()
    top = audit(airports)
    if args.tsv:
        for row in sorted(airports, key=lambda a: a["code"]):
            print(f"{row['code']}\t{row['city']}\t{row['flights']}")
    else:
        duplicate_city_names = len(airports) - len({a["city"].casefold() for a in airports})
        print(json.dumps({
            "source": "BTS holiday national.json",
            "airport_count": len(airports),
            "top_thirty_count": len(top),
            "duplicate_city_records_require_iata_selection": duplicate_city_names,
            "live_weather_or_flight_probability": False
        }, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"Holiday airport catalog audit failed: {exc}", file=sys.stderr)
        sys.exit(1)
