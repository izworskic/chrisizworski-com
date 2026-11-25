#!/usr/bin/env python3
"""Offline, source-owned input audit for the holiday flight planner.

No network calls, model downloads, inference service or visitor runtime cost.
Checks BTS airport uniqueness, labels/coordinates and the committed top-30
board against its only authoritative national.json dataset.
"""
from __future__ import annotations

import json
import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = ROOT / "public/holiday-travel/data/national.json"
ROSTER = ROOT / "lib/holiday-travel/busiest-airports.mjs"
PAGE = ROOT / "public/holiday-travel/index.html"
CHOICES = ROOT / "public/assets/holiday-travel-choices.js"


def checked_airports() -> tuple[dict, list[dict]]:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    seen = set()
    raw = source["airports"]
    assert 150 <= len(raw) <= 500, "Unexpected airport source coverage"
    for a in raw:
        code, city, flights = a["code"], a["city"], a["flights"]
        assert isinstance(code, str) and re.fullmatch(r"[A-Z0-9]{3}", code), code
        assert code not in seen, f"Duplicate airport code: {code}"
        seen.add(code)
        assert isinstance(city, str) and 2 <= len(city) <= 100, code
        assert isinstance(flights, int) and flights > 0, code
        assert all(isinstance(a[k], (int, float)) and math.isfinite(a[k]) for k in ("lat", "lon")), code
        assert -90 <= a["lat"] <= 90 and -180 <= a["lon"] <= 180, code
    assert len(seen) == len(raw)
    expected = sorted(
        ({k: a[k] for k in ("code", "city", "flights", "lat", "lon")} for a in raw),
        key=lambda a: (-a["flights"], a["code"])
    )[:30]
    match = re.search(r"export const AIRPORTS = (\[[\s\S]*?\]);", ROSTER.read_text(encoding="utf-8"))
    assert match, "Cannot parse committed top-30 airport roster"
    actual = json.loads(match.group(1))
    assert actual == expected, "Committed top-30 airports differ from sourced BTS counts"
    assert source["meta"]["windowFlights"] > 2_000_000
    return source, expected


def audit() -> dict:
    source, top = checked_airports()
    page = PAGE.read_text(encoding="utf-8")
    choices = CHOICES.read_text(encoding="utf-8")
    ids = ("travel-year", "home", "away", "routing", "layover", "dep-day",
           "dep-time", "due-day", "due-time", "region")
    for name in ids:
        assert f'<select id="{name}"' in page, f"Original field contract changed: {name}"
        assert f"'{name}'" in choices, f"Type-to-find enhancement missing: {name}"
    assert 'holiday-travel-choices.js' in page
    for token in ('id="best-days"', 'id="airport-weather"', 'id="trip-planner"',
                  'rel="canonical"', 'https://chrisizworski.com/#person'):
        assert token in page, f"Search / evidence invariant changed: {token}"
    for token in ("https://huggingface.co", "transformers.js", "fetch("):
        assert token not in choices.lower(), f"Unexpected model or network dependency: {token}"
    return {
        "source_airports": len(source["airports"]),
        "validated_controls": len(ids),
        "board_airports": len(top),
        "top_code": top[0]["code"],
        "source_flights": source["meta"]["windowFlights"],
        "offline_only": True,
    }


if __name__ == "__main__":
    print(json.dumps(audit(), sort_keys=True))
