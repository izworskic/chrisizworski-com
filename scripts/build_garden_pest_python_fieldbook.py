#!/usr/bin/env python3
"""Scientific offline compiler: seven Michigan NASA Daymet climate reconstructions.

This is *not* observed pest emergence, abundance, a validated local forecast,
an application recommendation, or parity with MSU/USA-NPN operational products.

Usage:
    python3 scripts/build_garden_pest_python_fieldbook.py
    python3 scripts/build_garden_pest_python_fieldbook.py --check

Source: NASA ORNL DAAC Daymet V4 R1 single-pixel tmax/tmin (2021–2025).
Reference thresholds: USA-NPN Japanese beetle Pheno Forecast and MSU
Enviroweather cabbage maggot model. The latter does not disclose a complete
algorithm on its public model page; simple-mean GDD43 is a reconstruction.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/garden-pest-daymet-2021-2025"
OUTPUT = ROOT / "public/assets/garden-pest-python-fieldbook-data.js"
YEARS = (2021, 2022, 2023, 2024, 2025)
LOCATIONS = (
    ("bay-city", "Bay City", "Central Lower Peninsula", 43.5945, -83.8889),
    ("detroit", "Detroit", "Southern Lower Peninsula", 42.3314, -83.0458),
    ("grand-rapids", "Grand Rapids", "Western Lower Peninsula", 42.9634, -85.6681),
    ("kalamazoo", "Kalamazoo", "Southwest Lower Peninsula", 42.2917, -85.5872),
    ("traverse-city", "Traverse City", "Northern Lower Peninsula", 44.7631, -85.6206),
    ("marquette", "Marquette", "Central Upper Peninsula", 46.5436, -87.3954),
    ("houghton", "Houghton", "Western Upper Peninsula", 47.1211, -88.5694),
)
DAYMET_CITATION = "Thornton et al. (2022). Daymet V4 R1. NASA ORNL DAAC. doi:10.3334/ORNLDAAC/2129"
MSU_URL = "https://enviroweather.msu.edu/crops/coleCrops/cabbagemaggot"
NPN_URL = "https://www.usanpn.org/data/maps/forecasts/Japanese_beetle"
MODELS = (
    {
        "id": "japanese-beetle", "name": "Japanese beetle", "method": "SINGLE_TRIANGLE_HORIZONTAL_CUTOFF",
        "source": NPN_URL, "methodParity": "NOT_VALIDATED_AGAINST_LIVE_DDRP",
        "lowerF": 50, "upperF": 92, "start": "January 1",
        "stages": (
            ("japanese-adults", "Adult heat milestone", 873),
            ("japanese-eggs", "Egg-hatch heat milestone", 1543),
        ),
        "limitation": "Independent reconstruction of published USA-NPN single-triangle heat thresholds. First adults or egg hatch were not observed or independently dated; the operational DDRP forecast may use different climate inputs and implementation details.",
        "currentOperationalStatus": "OFFICIAL_USA_NPN_RASTER_FETCHED_SEPARATELY",
    },
    {
        "id": "cabbage-maggot", "name": "Cabbage maggot", "method": "ASSUMED_DAILY_MEAN_BASE43",
        "source": MSU_URL, "methodParity": "MSU_DEGREE_DAY_METHOD_NOT_SPECIFIED_ON_PUBLIC_PAGE",
        "lowerF": 43, "upperF": None, "start": "March 1",
        "stages": (
            ("cabbage-first", "First-generation adult heat milestone", 300),
            ("cabbage-second", "Second-generation flight heat milestone", 1476),
            ("cabbage-third", "Third-generation flight heat milestone", 2652),
        ),
        "limitation": "MSU publishes base 43°F, March 1 and three thresholds, but its public page does not specify complete accumulation/upper-cap method. This experiment assumes positive daily mean GDD43 and is NOT an independently validated reproduction of MSU station forecasts.",
        "currentOperationalStatus": "MSU_PUBLIC_STATION_TOOL_EXISTS_NOT_REPLICATED",
    },
)
STAGES = tuple((stage_id, model["id"], label, threshold)
               for model in MODELS for stage_id, label, threshold in model["stages"])


class DataVeto(ValueError):
    """Cannot compute or publish a misleading incomplete climate series."""


def validate_daily_csv(path: Path, *, lat: float, lon: float):
    if not path.is_file() or path.stat().st_size > 100_000:
        raise DataVeto("Missing or oversized NASA Daymet source " + str(path))
    raw = path.read_text(encoding="utf-8-sig")
    if "How to cite: Thornton" not in raw or "Daymet Software Version 4" not in raw:
        raise DataVeto("NASA Daymet citation/provenance missing " + path.name)
    if f"Latitude: {lat:.4f}  Longitude: {lon:.4f}" not in raw:
        raise DataVeto("Daymet grid coordinate does not match location " + path.name)
    lines = raw.splitlines()
    marker = "year,yday,tmax (deg c),tmin (deg c)"
    if lines.count(marker) != 1 or lines.index(marker) > 15:
        raise DataVeto("Daymet tmax/tmin layout changed " + path.name)
    start = lines.index(marker)
    parsed = list(csv.DictReader(io.StringIO("\n".join(lines[start:]))))
    expected = 365 * len(YEARS)
    if len(parsed) != expected:
        raise DataVeto(f"Expected {expected} complete Daymet observations in {path.name}, saw {len(parsed)}")
    by_year = {year: [] for year in YEARS}
    for i, row in enumerate(parsed):
        if tuple(row) != ("year", "yday", "tmax (deg c)", "tmin (deg c)"):
            raise DataVeto("Unexpected Daymet input variables or missing values")
        try:
            year = int(row["year"])
            day = int(row["yday"])
            high = float(row["tmax (deg c)"])
            low = float(row["tmin (deg c)"])
        except (ValueError, TypeError) as exc:
            raise DataVeto("Invalid numeric temperature / calendar cell " + path.name) from exc
        if (year not in by_year or day < 1 or day > 365 or not math.isfinite(high)
                or not math.isfinite(low) or not -60 <= low <= high <= 60):
            raise DataVeto(f"Daymet scientific QC veto in {path.name} row {i+1}")
        by_year[year].append((day, low, high))
    for year, rows in by_year.items():
        if len(rows) != 365 or [day for day, *_ in rows] != list(range(1, 366)):
            raise DataVeto(f"Missing/duplicate/unordered Daymet yday in {path.name} {year}")
    return by_year


def fahrenheit(celsius: float) -> float:
    return celsius * 9 / 5 + 32


def above_threshold(low_f: float, high_f: float, base_f: float) -> float:
    if high_f <= base_f:
        return 0.0
    if low_f >= base_f:
        return (low_f + high_f) / 2 - base_f
    return (high_f - base_f) ** 2 / (2 * (high_f - low_f))


def triangle_degree_days(low_f: float, high_f: float, *, lower=50, upper=92):
    """Analytic integral of piecewise linear symmetric diurnal triangle."""
    if not -130 <= low_f <= high_f <= 150 or lower >= upper:
        raise DataVeto("Invalid heat accumulation geometry")
    delta = above_threshold(low_f, high_f, lower) - above_threshold(low_f, high_f, upper)
    return max(0, min(upper - lower, delta))


def simple_mean_degree_days(low_f: float, high_f: float, *, base=43):
    """Assumed reconstruction method, NOT confirmed as MSU's calculation."""
    if not -130 <= low_f <= high_f <= 150:
        raise DataVeto("Invalid heat accumulation geometry")
    return max(0, (high_f + low_f) / 2 - base)


def date_for_day(year: int, day: int):
    return (dt.date(year, 1, 1) + dt.timedelta(days=day - 1)).isoformat()


def compile_one_year(year: int, rows):
    if len(rows) != 365:
        raise DataVeto("Incomplete year")
    events = {key: None for key, _, _, _ in STAGES}
    japan_cumulative = cabbage_cumulative = 0.0
    for day, low, high in rows:
        low_f, high_f = fahrenheit(low), fahrenheit(high)
        japan_cumulative += triangle_degree_days(low_f, high_f)
        if date_for_day(year, day) >= f"{year}-03-01":
            cabbage_cumulative += simple_mean_degree_days(low_f, high_f)
        for key, model, _, threshold in STAGES:
            total = japan_cumulative if model == "japanese-beetle" else cabbage_cumulative
            if events[key] is None and total >= threshold:
                events[key] = date_for_day(year, day)
    return {"year": year, "events": events}


def same_month_day(iso: str):
    return iso[5:] if isinstance(iso, str) and len(iso) == 10 else None


def summarize_years(year_rows: list[dict]):
    output = {}
    for key, _model, _name, _threshold in STAGES:
        dates = [(y["year"], y["events"][key]) for y in year_rows]
        present = [(year, date) for year, date in dates if date]
        # No misleading 5-year timing band if one of five seasons did not reach threshold.
        complete = len(present) == len(YEARS)
        # Leap years: compare month/day, not uncorrected leap/non-leap yday.
        by_calendar = sorted(present, key=lambda p: (p[1][5:], p[0]))
        output[key] = {
            "status": "COMPLETE_HISTORIC_HEAT_RECONSTRUCTION" if complete else "INCOMPLETE_THRESHOLD_HISTORY",
            "yearsReached": len(present), "yearsTotal": len(YEARS),
            "earliestMonthDay": same_month_day(by_calendar[0][1]) if complete else None,
            "latestMonthDay": same_month_day(by_calendar[-1][1]) if complete else None,
            "sampledCrossingYears": [{"year": year, "date": date} for year, date in dates],
        }
    return output


def assemble():
    cities = []
    verified_days = 0
    for city_id, name, region, lat, lon in LOCATIONS:
        source_path = INPUT / f"{city_id}.csv"
        by_year = validate_daily_csv(source_path, lat=lat, lon=lon)
        annual = [compile_one_year(year, by_year[year]) for year in YEARS]
        verified_days += sum(len(by_year[year]) for year in YEARS)
        cities.append({
            "id": city_id, "name": name, "region": region,
            "referencePoint": {"lat": lat, "lon": lon,
                               "meaning": "NASA Daymet 1 km gridded reference coordinate; not garden or trap location"},
            "sourcePath": str(source_path.relative_to(ROOT)),
            "years": annual,
            "summary": summarize_years(annual),
        })
    if len(cities) != 7 or verified_days != 12_775:
        raise DataVeto("Missing regional Daymet source coverage")
    models = []
    for m in MODELS:
        models.append({k: (v if k != "stages" else [
            {"id": stage_id, "label": title, "thresholdGddF": amount}
            for stage_id, title, amount in v]) for k, v in m.items()})
    return {
        "schema": "garden-pest-python-regional-fieldbook-v1",
        "sourceYears": list(YEARS),
        "purpose": "HISTORICAL_GRIDDED_HEAT_RECONSTRUCTION_NOT_FORECAST",
        "publisher": "Freighter View Farms",
        "weatherSource": {
            "provider": "NASA ORNL DAAC Daymet V4 R1",
            "citation": DAYMET_CITATION,
            "url": "https://daymet.ornl.gov/web_services",
            "method": "Archived single-pixel 1 km gridded daily tmax/tmin, not field measurements of pest presence",
        },
        "audit": {
            "locationCount": len(cities), "yearsPerLocation": len(YEARS),
            "completeClimateLocationYears": len(cities) * len(YEARS),
            "dailyWeatherValuesVerified": verified_days,
            "historicalThresholdFamilies": 2,
            "eventStagesReconstructed": len(STAGES),
            "operationalModelParity": "NOT_ESTABLISHED",
            "confirmedPestPresenceRecords": 0,
            "experimentalMethodGates": [
                "Japanese beetle thresholds and method are official USA-NPN, but separate Daymet inputs/algorithm parity are not verified.",
                "MSU cabbage maggot thresholds and dates are official, but this reconstruction assumes unverified simple daily averaging.",
                "A weather threshold is not a sighting, outbreak probability, treatment threshold, or future prediction.",
            ],
        },
        "models": models,
        "cities": cities,
    }


def render(data):
    encoded = json.dumps(data, ensure_ascii=True, sort_keys=True, separators=(",", ":"))
    return "window.GardenPestRegionalFieldbook=Object.freeze(" + encoded + ");\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = assemble()
    output = render(data)
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != output:
            raise SystemExit("FAIL: Python regional fieldbook not synchronized with audited NASA daily inputs")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(output, encoding="utf-8")
    print(f"Python regional fieldbook PASS: {data['audit']['locationCount']} official Daymet reference cells, "
          f"{data['audit']['completeClimateLocationYears']} complete region-years, "
          f"{data['audit']['dailyWeatherValuesVerified']} day rows; "
          f"{'compiled source verified' if args.check else 'written'}. "
          "NO historical pest presence, operational parity, or future outbreak inference.")


if __name__ == "__main__":
    main()
