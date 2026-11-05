#!/usr/bin/env python3
"""Offline, source-reviewed cabbage maggot field-evidence and methodology audit.

Four Michigan MSU reports are biological evidence, NOT first-flight trap records.
Evaluation remains locked (no MAE, skill score, probability or promotion) until
independent exact-station monitored first adult catch records are available.
All thermal comparisons are from NASA Daymet and do not establish MSU parity.
"""
from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import json
import math
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/garden-cabbage-maggot-official-evidence.json"
OUTPUT = ROOT / "public/assets/garden-cabbage-validation-data.js"
FIELD_BOOK = ROOT / "scripts/build_garden_pest_python_fieldbook.py"
CALIBRATION_SCHEMA = "cabbage-maggot-validation-gate-v1"
CUTOFF = dt.date(2026, 11, 5)
THRESHOLDS = (300, 565)
MODEL_SOURCE = "https://enviroweather.msu.edu/crops/coleCrops/cabbagemaggot"
EARLY_FLIGHT_SOURCE = "https://www.canr.msu.edu/news/cabbage_maggots_of_cole_crops"
ALTERNATE_METHOD_SOURCE = "https://ipm.ucanr.edu/weather/phenology-models-description/cabbage-maggot/"

spec = importlib.util.spec_from_file_location("regional_fieldbook", FIELD_BOOK)
fieldbook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fieldbook)


class EvidenceVeto(ValueError):
    """Unsupported source, false first-flight inference or invalid observations."""


def date(value: str) -> dt.date:
    if not isinstance(value, str) or len(value) != 10:
        raise EvidenceVeto("INVALID_DATE")
    try:
        parsed = dt.date.fromisoformat(value)
    except ValueError as err:
        raise EvidenceVeto("INVALID_DATE") from err
    if parsed.isoformat() != value:
        raise EvidenceVeto("INVALID_DATE")
    return parsed


def official_url(value: str, *, article: bool = True) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlsplit(value)
    return (parsed.scheme == "https" and parsed.hostname == "www.canr.msu.edu"
            and not parsed.username and not parsed.password and not parsed.port
            and not parsed.query and not parsed.fragment and
            (parsed.path.startswith("/news/michigan-vegetable-crop-report-") if article
             else parsed.path.startswith("/news/")))


def load_evidence(path: Path = INPUT) -> dict:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if raw.get("schema") != "msu-cabbage-maggot-field-evidence-v1" or raw.get("policy") != "VERIFIED_OFFICIAL_EXTENSION_REPORTS_ONLY":
        raise EvidenceVeto("UNKNOWN_OFFICIAL_EVIDENCE_SCHEMA")
    if date(raw.get("reviewDate")) > CUTOFF or raw.get("targetTaxon") != "Delia radicum":
        raise EvidenceVeto("UNSUPPORTED_TAXON_OR_FUTURE_REVIEW")
    reports = raw.get("reports")
    if not isinstance(reports, list) or not 1 <= len(reports) <= 40:
        raise EvidenceVeto("INVALID_FIELD_REPORT_COUNT")
    ids, issue_urls = set(), set()
    known_stages = {"EGGS", "LARVAL_FEEDING", "LARVAL_DAMAGE", "ADULT_DIRECT_COUNT"}
    for r in reports:
        if not isinstance(r, dict):
            raise EvidenceVeto("NON_OBJECT_REPORT")
        record_id = r.get("id")
        if not isinstance(record_id, str) or not record_id.startswith("msu-") or record_id in ids:
            raise EvidenceVeto("DUPLICATED_OR_UNTRUSTED_REPORT_ID")
        ids.add(record_id)
        rd = date(r.get("issueDate"))
        if rd > CUTOFF or rd.year not in fieldbook.YEARS:
            raise EvidenceVeto("OUT_OF_SCOPE_SEASON")
        if not official_url(r.get("sourceUrl")) or not r["sourceUrl"].endswith(rd.strftime("%B").lower() + "-" + str(rd.day) + "-" + str(rd.year)):
            raise EvidenceVeto("UNVERIFIED_EXTENSION_SOURCE_DATE")
        issue_urls.add(r["sourceUrl"])
        if r.get("sourcePublisher") != "Michigan State University Extension":
            raise EvidenceVeto("SOURCE_PUBLISHER_MISMATCH")
        if r.get("observationKind") != "VERIFIED_FIELD_REPORT" or r.get("observedStage") not in known_stages:
            raise EvidenceVeto("FORECAST_OR_UNSUPPORTED_BIOLOGICAL_CLASS")
        # Observed eggs/larvae from a dated report are not an exact first-flight date.
        if (r.get("confirmedAdultFirstFlight") is not False or r.get("observationDateExact") is not None
                or r.get("observationDateEarliest") is not None
                or r.get("siteID") is not None or r.get("coords") is not None
                or r.get("trapEffort") is not None):
            raise EvidenceVeto("FORGED_EXACT_SITE_OR_FIRST_FLIGHT")
        latest = date(r.get("observationDateLatest"))
        if latest > rd or (rd - latest).days > 30:
            raise EvidenceVeto("OBSERVATION_CANNOT_POSTDATE_REPORT")
        if r.get("sitePrecision") not in {"REGION_ONLY", "STATE_UNSPECIFIED", "STATEWIDE_UNLOCATED"}:
            raise EvidenceVeto("IMPLIED_STATION_PRECISION")
        if not isinstance(r.get("regionLabel"), str) or not r["regionLabel"]:
            raise EvidenceVeto("MISSING_REGION")
        if not isinstance(r.get("observed"), str) or len(r["observed"]) > 250:
            raise EvidenceVeto("UNCLEAR_OBSERVATION")
        phrase = r.get("sourcePhrase")
        if not isinstance(phrase, str) or "cabbage maggot" not in phrase.lower() or len(phrase.split()) > 25:
            raise EvidenceVeto("BAD_SOURCE_SNIPPET")
        if not isinstance(r.get("independenceGroup"), str) or not r["independenceGroup"]:
            raise EvidenceVeto("MISSING_INDEPENDENCE_SCOPE")
    if len(issue_urls) < 1:
        raise EvidenceVeto("NO_OFFICIAL_REPORTS")
    for excluded in raw.get("excludedEvidence", []):
        if not official_url(excluded.get("sourceUrl")) or excluded.get("reason") not in {
            "PREDICTED_PEAK_NOT_FIELD_OBSERVATION", "TRIAL_ACTIVITY_IS_NOT_PEST_FIRST_FLIGHT"
        }:
            raise EvidenceVeto("INVALID_NON_OBSERVATION_AUDIT")
    if not isinstance(raw.get("stationFirstFlights"), list):
        raise EvidenceVeto("STATION_LEDGER_NOT_A_LIST")
    return raw


def single_sine_degree_days(low_f: float, high_f: float, base: float = 43) -> float:
    """Continuous sine-wave integration above lower base, without an upper cap.
    
    UC IPM recommends single sine for Wisconsin's field-tested D. radicum
    thresholds; this is a sensitivity test, not a replacement MSU algorithm.
    """
    if not -130 <= low_f <= high_f <= 150 or not math.isfinite(low_f + high_f):
        raise EvidenceVeto("INVALID_THERMAL_GEOMETRY")
    if high_f <= base:
        return 0.0
    if low_f >= base:
        return (low_f + high_f) / 2 - base
    middle, amplitude = (low_f + high_f) / 2, (high_f - low_f) / 2
    z = (base - middle) / amplitude
    angle = math.acos(max(-1, min(1, z)))
    return max(0, (middle - base) * angle / math.pi +
               amplitude * math.sqrt(max(0, 1 - z * z)) / math.pi)


def crossing_dates(rows: list[tuple[int, float, float]], year: int) -> dict:
    if len(rows) != 365 or any(day != i + 1 for i, (day, _, _) in enumerate(rows)):
        raise EvidenceVeto("INVALID_ARCHIVED_WEATHER_SERIES")
    crossings = {method: {t: None for t in THRESHOLDS} for method in ("mean", "sine")}
    cumulative = {method: 0.0 for method in crossings}
    for day, low, high in rows:
        day_date = fieldbook.date_for_day(year, day)
        if day_date < f"{year}-03-01":
            continue
        low_f = fieldbook.fahrenheit(low)
        high_f = fieldbook.fahrenheit(high)
        cumulative["mean"] += fieldbook.simple_mean_degree_days(low_f, high_f, base=43)
        cumulative["sine"] += single_sine_degree_days(low_f, high_f, base=43)
        for method in crossings:
            for t in THRESHOLDS:
                if crossings[method][t] is None and cumulative[method] >= t:
                    crossings[method][t] = day_date
    return crossings


def assessment(records: list[dict], fieldbook_asset: dict) -> dict:
    """No point error may be calculated from spatially/censoring-ambiguous reports.

    Future station validation must include a first positive trap sampling
    interval, a preceding negative sample, independent identification,
    precise coordinates with matching independently archived weather and
    a pre-registered held-out season. None exists in the published input.
    """
    if records:
        # Source ledger has no permissioned matched independent observations.
        # This version intentionally refuses any nonempty station flight set;
        # it must receive a separately reviewed station matching implementation.
        raise EvidenceVeto("STATION_DATA_UNSUPPORTED_PENDING_SOURCE_MATCH_REVIEW")
    return {
        "status": "NO_MATCHED_INDEPENDENT_FIRST_FLIGHT_STATION_YEARS",
        "reference": "Delia radicum adult first positive trap catch, not egg observation or root injury",
        "uniqueMatchedStationYears": 0,
        "distinctHeldOutSeasons": 0,
        "verifiedFirstFlightTrapSamples": 0,
        "observationalMedianAbsoluteErrorDays": None,
        "observationalP90AbsoluteErrorDays": None,
        "empiricalHitRate": None,
        "modelBiasDays": None,
        "skillScore": None,
        "correlation": None,
        "promotionAllowed": False,
        "reason": "MSU report dates/locations are not first adult trap-capture dates at matching Daymet station coordinates. A timing accuracy statistic would be manufactured.",
        "requiredBeforeModelPromotion": [
            "Independently verified adult Delia radicum first positive trap sampling intervals",
            "Known trapping start and preceding negative checks; dates and trap protocol",
            "Precise monitoring station coordinates with matched historical climate series",
            "Archived original source and expert species identification; not a weather-derived prediction",
            "At least three independent held-out seasons and two independent monitored stations",
            "Locked algorithm and preregistered evaluation before viewing held-out outcomes"
        ],
    }


def compile_bundle(raw: dict) -> dict:
    rows = []
    for city_id, name, region, lat, lon in fieldbook.LOCATIONS:
        raw_series = fieldbook.validate_daily_csv(
            fieldbook.INPUT / (city_id + ".csv"), lat=lat, lon=lon)
        for year in fieldbook.YEARS:
            models = crossing_dates(raw_series[year], year)
            first_mean = models["mean"][300]
            first_sine = models["sine"][300]
            peak_mean = models["mean"][565]
            peak_sine = models["sine"][565]
            # No arithmetic on dates with censored/mismatched observations.
            assert first_mean is not None and first_sine is not None
            days = (date(first_sine) - date(first_mean)).days
            rows.append({
                "cityId": city_id, "city": name, "year": year,
                "first300Mean": first_mean, "first300SingleSine": first_sine,
                "peak565Mean": peak_mean, "peak565SingleSine": peak_sine,
                "methodShiftDays": days,
                "modelParity": "UNVERIFIED_MSU_STATION_IMPLEMENTATION",
            })
    from_existing = fieldbook.assemble()
    for city in from_existing["cities"]:
        for yr in city["years"]:
            actual = next(row for row in rows if row["cityId"] == city["id"] and row["year"] == yr["year"])
            if actual["first300Mean"] != yr["events"]["cabbage-first"]:
                raise EvidenceVeto("GDD_METHOD_DRIFT_VERSUS_EXISTING_HISTORIC_FIELDBOOK")
    if len(rows) != 35:
        raise EvidenceVeto("DAYMET_CITY_YEAR_MISMATCH")
    shifts = [r["methodShiftDays"] for r in rows]
    reports = raw["reports"]
    published = sorted(set(r["sourceUrl"] for r in reports))
    proof = {
        "status": "HISTORIC_MSU_EGGS_AND_INJURY_VERIFIED_NOT_FLIGHT_VALIDATION",
        "verifiedReportMentions": len(reports),
        "uniqueMSUReportIssues": len(published),
        "independentStationYears": 0,
        "reportSeasons": sorted(set(int(r["issueDate"][:4]) for r in reports)),
        "firstFlightMeasurements": 0,
        "publicationDateIsNotFirstEmergenceDate": True,
        "geographicPrecision": "Only region/state descriptions; exact field coordinates withheld in source",
        "reportSources": published,
        "reports": [{
            "id": r["id"], "issueDate": r["issueDate"],
            "sourceUrl": r["sourceUrl"], "stage": r["observedStage"],
            "observed": r["observed"], "region": r["regionLabel"],
            "dateMeaning": "ISSUE_DATE_NOT_EXACT_FIELD_OBSERVATION",
            "sitePrecision": r["sitePrecision"], "independenceGroup": r["independenceGroup"],
            "canScoreFirstFlightError": False,
            "firstFlightObserved": False
        } for r in reports]
    }
    gr = next(r for r in rows if r["cityId"] == "grand-rapids" and r["year"] == 2025)
    bay = next(r for r in rows if r["cityId"] == "bay-city" and r["year"] == 2025)
    reference = {
        "reportIssueDate": "2025-05-07", "firstMSUEggEvidenceRegion": "West-central Michigan",
        "referenceCity": "Grand Rapids",
        "referenceCityNotField": True,
        "reportEvidence": "MSU eggs documented in a west-central Michigan planting by its May 7, 2025 report.",
        "mean300Reference": gr["first300Mean"], "singleSine300Reference": gr["first300SingleSine"],
        "mean565Reference": gr["peak565Mean"], "singleSine565Reference": gr["peak565SingleSine"],
        "bayCityMean300Reference": bay["first300Mean"],
        "meaning": "Different evidence types and unmatched sites. These dates are shown side by side to explain the research question, NOT to claim an observed model error or even a one-day forecast hit.",
        "measuredFirstFlightDate": None, "errorDays": None
    }
    return {
        "schema": CALIBRATION_SCHEMA,
        "taxon": "Delia radicum",
        "purpose": "VERIFIED_FIELD_REPORTS_WITH_FAIL_CLOSED_EMPIRICAL_CALIBRATION",
        "fieldEvidence": proof,
        "evaluation": assessment(raw["stationFirstFlights"], from_existing),
        "methodSensitivity": {
            "status": "UNVALIDATED_ALGORITHM_SENSITIVITY_NOT_PEST_ACCURACY",
            "archivedGridYears": len(rows),
            "referenceMethod": "SIMPLE_DAILY_MEAN_DD43_START_MARCH_1",
            "alternativeMethod": "SINGLE_SINE_DD43_START_MARCH_1",
            "referenceSource": MODEL_SOURCE,
            "sineMethodReference": ALTERNATE_METHOD_SOURCE,
            "publishedFirstAdultDD": 300,
            "publishedSpringAdultPeakDD": 565,
            "firstAdultSource": EARLY_FLIGHT_SOURCE,
            "parityWithOperationalMSU": False,
            "earliestShiftDays": min(shifts),
            "latestShiftDays": max(shifts),
            "regions2025": [r for r in rows if r["year"] == 2025],
            "completeReferenceGridYears": rows,
            "unit": "calendar-day difference between two model formulas on the same archived daily weather series",
            "not": "difference from actual first flight, not observed error, not crop-specific risk",
        },
        "regionalUnmatchedExample": reference,
        "limits": [
            "A source publication date is not the first day eggs were deposited or adults flew.",
            "The first adult threshold (300°F-degree-days) is distinct from the reported spring peak (565°F-degree-days).",
            "A nearby gridded reference city cannot be treated as the unknown exact MSU field location.",
            "A published Wisconsin model test is not an out-of-sample Michigan station-year accuracy test.",
            "Only official MSU reported observations are counted; 2026 model warnings and trials are not detections.",
        ],
        "sources": raw["methodReferences"],
        "nonObservationExclusions": raw["excludedEvidence"],
        "auditedAt": raw["reviewDate"],
    }


def render(data: dict) -> str:
    encoded = json.dumps(data, ensure_ascii=True, sort_keys=True, separators=(",", ":"))
    return "window.GardenCabbageValidation=Object.freeze(" + encoded + ");\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    artifact = render(compile_bundle(load_evidence()))
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != artifact:
            raise SystemExit("FAIL: validated official cabbage evidence output differs from Python source")
    else:
        OUTPUT.write_text(artifact, encoding="utf-8")
    print("Cabbage field evidence PASS: 4 MSU mentions, 3 source issues, 35 model sensitivity grid-years; "
          "0 independently matched adult first-flight stations; no fabricated validation metrics.")


if __name__ == "__main__":
    main()
