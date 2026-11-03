#!/usr/bin/env python3
"""Compile and test the closed 2026 MSU corn-earworm trap archive.

This is an audited, versioned transcription of the final 2026 MSU report;
NOT a live 2027 or user-location source, forecast, threshold calculator, or
trap network API. Never fill an unreported county/week with zero.

Usage:
 python3 scripts/build_garden_earworm_traps.py
 python3 scripts/build_garden_earworm_traps.py --check
"""
import argparse
import csv
import datetime
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/garden-earworm-msu-2026.csv"
OUTPUT = ROOT / "public/assets/garden-earworm-trap-data.js"
HEADER = "window.GardenEarwormTrapData=Object.freeze("
FOOTER = ");\n"
SOURCE_URL = "https://msu-prod.dotcms.cloud/news/michigan-vegetable-crop-report-september-2-2026"
COLS = ("ottawa", "oceana", "washtenaw", "monroe", "saginaw", "lapeer", "genesee", "midland")
TRAP = {
    "ottawa": "WIRE_HARTSTACK", "oceana": "WIRE_HARTSTACK",
    "washtenaw": "CLOTH_HELIOTHIS", "monroe": "CLOTH_HELIOTHIS",
    "saginaw": "CLOTH_HELIOTHIS", "lapeer": "CLOTH_HELIOTHIS",
    "genesee": "CLOTH_HELIOTHIS", "midland": "TYPE_NOT_SPECIFIED",
}
WEEKS = (
    "2026-06-28", "2026-07-05", "2026-07-14", "2026-07-21", "2026-07-28",
    "2026-08-04", "2026-08-11", "2026-08-18", "2026-08-25", "2026-09-01",
)
CELL = re.compile(r"^(\d{1,4})(?: \((\d{1,4}(?:\.\d)?)\))?(\*)?$")


def parse_cell(raw, week, county):
    if raw == "-":
        return {"status": "NOT_REPORTED", "publishedCell": "-", "total": None,
                "avgPerNight": None, "twoWeekTotal": False}
    match = CELL.fullmatch(raw)
    if not match:
        raise ValueError(f"Malformed published cell {week} {county}: {raw}")
    count, average, star = match.groups()
    count = int(count)
    if count > 5000 or (count == 0 and average is not None) or (
        count > 0 and average is None
    ):
        raise ValueError(f"Unverifiable moth count/average {week} {county}")
    if star and (week != "2026-08-18" or county not in ("ottawa", "oceana")):
        raise ValueError("Two-week footnote applied to unexpected location/date")
    return {
        "status": "REPORTED",
        "publishedCell": raw,
        "total": count,
        # Preserve the exact decimal printed by MSU, including 17.0.
        "avgPerNight": average,
        "twoWeekTotal": bool(star),
    }


def compile_catalog():
    with SOURCE.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if tuple(reader.fieldnames or ()) != ("week", *COLS):
            raise ValueError("MSU county columns changed; re-audit source")
        rows = list(reader)
    if tuple(r["week"] for r in rows) != WEEKS:
        raise ValueError("2026 observation weeks changed")
    counties = []
    for county in COLS:
        samples = []
        for row in rows:
            week = row["week"]
            if datetime.date.fromisoformat(week).year != 2026:
                raise ValueError("Record outside verified season")
            samples.append({"week": week, **parse_cell(row[county], week, county)})
        counties.append({
            "id": county,
            "name": county.title() + " County",
            "trapType": TRAP[county],
            "samples": samples,
        })
    catalog = {
        "schema": "garden-earworm-trap-archive-v1",
        "species": "Helicoverpa zea",
        "season": 2026,
        "seasonState": "CLOSED",
        "source": {
            "publisher": "Michigan State University Extension",
            "articleTitle": "Michigan vegetable crop report - September 2, 2026",
            "url": SOURCE_URL,
            "publishedDate": "2026-09-04",
            "latestCollectionWeek": "2026-09-01",
            "dataType": "INDEPENDENT_REGIONAL_PHEROMONE_TRAPS",
        },
        "sourceLimitations": [
            "Counts are observations at cooperating traps, not moths in your garden or a countywide survey.",
            "Dashes in the published table mean not reported, never zero.",
            "Traps differ: cloth Heliothis catches fewer moths than wire Hartstack. Midland type was not specified.",
            "Asterisks on August 18 Ottawa and Oceana totals denote two-week collections.",
            "Reported averages use MSU's observed sampling periods; do not replace them with weekly divisions.",
            "Data were published September 4, 2026; the growing season has ended. No 2027 observations are implied.",
            "This dataset is not a pesticide treatment threshold or recommendation."
        ],
        "counties": counties,
    }
    if len(counties) != 8 or sum(len(c["samples"]) for c in counties) != 80:
        raise ValueError("Missing 2026 county-week cells")
    def find(county, week):
        return next(s for c in counties if c["id"] == county
                    for s in c["samples"] if s["week"] == week)
    assert find("oceana", "2026-08-25")["publishedCell"] == "332 (47.4)"
    assert find("ottawa", "2026-08-18")["twoWeekTotal"]
    assert find("midland", "2026-09-01")["publishedCell"] == "11 (1.3)"
    assert find("saginaw", "2026-09-01")["status"] == "NOT_REPORTED"
    assert find("washtenaw", "2026-08-25")["status"] == "NOT_REPORTED"
    assert find("monroe", "2026-07-21")["total"] == 0
    assert find("midland", "2026-08-11")["avgPerNight"] is None
    return catalog


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = compile_catalog()
    output = HEADER + json.dumps(data, ensure_ascii=True,
                                  sort_keys=True, separators=(",", ":")) + FOOTER
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != output:
            raise SystemExit("FAIL: MSU compiled trap evidence differs from audited CSV")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(output, encoding="utf-8")
    reported = sum(x["status"] == "REPORTED" for c in data["counties"] for x in c["samples"])
    print(f"MSU earworm archive PASS: 2026 closed season; 8 counties; "
          f"80 county-week cells; {reported} reports, {80-reported} missing; "
          f"{'verified' if args.check else 'generated'} source-linked output")


if __name__ == "__main__":
    main()
