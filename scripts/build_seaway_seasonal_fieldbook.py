#!/usr/bin/env python3
"""Python Intelligence OS: evidence-checked historical Seaway passage fieldbook.

Usage:
    python3 scripts/build_seaway_seasonal_fieldbook.py
    python3 scripts/build_seaway_seasonal_fieldbook.py --check

Reads the EXISTING dated BTS archive; makes no extra network calls.
Does not forecast arrivals, infer lock-specific traffic, or treat missing data as zero.
Artifact is committed, so the Vercel build needs no Python runtime.
"""
from __future__ import annotations

import argparse
import calendar
import json
import re
import sys
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/seaway/history.json"
OUTPUT = ROOT / "public/assets/seaway-seasonal-fieldbook.json"
SCHEMA = "seaway-seasonal-fieldbook-v1"
# BTS catalog metadata confirms U.S. Government public-domain license.
SOURCE_METADATA = "https://data.bts.gov/Research-and-Statistics/Great-Lakes-St-Lawrence-Seaway-Performance/swpm-impx"
MONTH_PATTERN = re.compile(r"^([0-9]{4})-([0-9]{2})-01T00:00:00[.]000$")


def _month_key(value: object) -> tuple[int, int]:
    if not isinstance(value, str):
        raise ValueError("A source row has no dated month")
    m = MONTH_PATTERN.fullmatch(value)
    if not m:
        raise ValueError(f"Invalid source month: {value!r}")
    year, month = map(int, m.groups())
    if not (2010 <= year <= 2100 and 1 <= month <= 12):
        raise ValueError("Source month outside supported range")
    return year, month


def _nonnegative_transits(value: object) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        raise ValueError("Transit count must be a non-negative integer or missing")
    if not re.fullmatch(r"[0-9]+", str(value)):
        raise ValueError(f"Invalid vessel-transit value: {value!r}")
    number = int(value)
    if number > 1_000_000:
        raise ValueError("Transit count outside conservative bounds")
    return number


def build_fieldbook(snapshot: dict) -> dict:
    if not isinstance(snapshot, dict) or not isinstance(snapshot.get("rows"), list):
        raise ValueError("Source archive has no rows")
    if not snapshot.get("source", "").startswith("https://data.bts.gov/"):
        raise ValueError("Expected the documented federal BTS source")
    years = snapshot.get("years")
    if (not isinstance(years, list) or len(years) < 2
            or any(isinstance(y, bool) or not isinstance(y, int) for y in years)
            or years != sorted(set(years))):
        raise ValueError("Years must be a sorted, unique integer list")
    # Missing months are still explicit, and each month must have exactly one
    # source row per snapshot year. Do not silently fill or deduplicate data.
    seen = {}
    for row in snapshot["rows"]:
        if not isinstance(row, dict):
            raise ValueError("Bad BTS source row")
        key = _month_key(row.get("month"))
        if key in seen:
            raise ValueError(f"Conflicting/duplicate observation for {key}")
        if key[0] not in years:
            raise ValueError(f"Unlisted source year for {key}")
        count = _nonnegative_transits(row.get("vessel_transits"))
        note = row.get("note") or ""
        if not isinstance(note, str):
            raise ValueError("Invalid source annotation")
        seen[key] = {"count": count, "note": note}

    expected = {(year, month) for year in years for month in range(1, 13)}
    missing = expected.difference(seen)
    if missing or set(seen) != expected:
        raise ValueError(f"Source archive has missing calendar slots: {sorted(missing)}")

    result = []
    for month in range(1, 13):
        records = [seen[(year, month)] for year in years]
        observed = [(y, r["count"]) for y, r in zip(years, records) if r["count"] is not None]
        numbers = sorted(value for _, value in observed)
        enough = len(numbers) >= 3
        # Fewer than 3 complete values must not be advertised as a typical month.
        state = "available" if enough else "partial" if numbers else "unreported"
        note_years = [year for year, row in zip(years, records)
                      if row["count"] is None and "closed" in row["note"].lower()]
        result.append({
            "month": month,
            "name": calendar.month_name[month],
            "state": state,
            "sampleCount": len(numbers),
            "sampleYears": [year for year, _ in observed],
            "minimum": numbers[0] if enough else None,
            "median": int(median(numbers)) if enough and median(numbers) == int(median(numbers))
                      else median(numbers) if enough else None,
            "maximum": numbers[-1] if enough else None,
            "reportedValues": [{"year": year, "transits": seen[(year, month)]["count"]}
                               for year in years],
            "sourceClosedNoteYears": note_years,
        })

    return {
        "schema": SCHEMA,
        "metric": "Commercial vessel transits in the published BTS Great Lakes–St. Lawrence Seaway performance series",
        "scope": snapshot.get("scope"),
        "source": snapshot["source"],
        "sourceMetadata": SOURCE_METADATA,
        "sourceLicense": "Public Domain U.S. Government",
        "snapshotRetrievedAt": snapshot.get("retrievedAt"),
        "years": years,
        "method": "Per-calendar-month median and observed min–max across three or more distinct complete-year measurements. No forecast, smoothing, zero filling or extrapolation.",
        "limitations": [
            "The count is a published system-wide monthly measure, not ships visible at a selected lock or viewing point.",
            "The archive is 2022–2024; trends are descriptive and may not represent 2026 conditions.",
            "A missing transit number never means zero ships. Some historical rows explicitly say the Seaway was closed.",
            "An apparently busy month is not a lock arrival estimate, a promise of public access or a safety recommendation.",
            "Confirm season notices, visitor-center hours and actual vessel order from the respective operators.",
        ],
        "months": result,
    }


def render(snapshot: dict) -> str:
    return json.dumps(build_fieldbook(snapshot), ensure_ascii=False, indent=2) + "\n"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="Fail unless the committed fieldbook exactly matches the source")
    args = parser.parse_args(argv)
    content = render(json.loads(INPUT.read_text(encoding="utf-8")))
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != content:
            print("Stale or absent seasonal fieldbook. Run python3 scripts/build_seaway_seasonal_fieldbook.py", file=sys.stderr)
            return 1
        print("Seaway Python fieldbook: deterministic artifact verified.")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(content, encoding="utf-8")
        print(f"Seaway Python fieldbook: {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
