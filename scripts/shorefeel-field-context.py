#!/usr/bin/env python3
"""Offline ShoreFeel evidence join. Never publishes an on-sand forecast.

Consumes privately held shielded logger pairs, independently archived PRE-ISSUED
candidate/NWS forecasts, observed local wind and dated NOAA nearshore water pixels.
Does not fetch the web or change any production endpoint.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

SCHEMA = "shorefeel.paired-context-research.v1"
NOW_TOLERANCE = timedelta(minutes=5)
WIND_TOLERANCE = timedelta(minutes=10)
WATER_AGE = timedelta(hours=36)
TARGET_TOLERANCE = timedelta(minutes=15)
MAX_ISSUE_LEAD = timedelta(hours=48)
NOAA_WATER_HOSTS = {"apps.glerl.noaa.gov", "coastwatch.glerl.noaa.gov", "www.glerl.noaa.gov"}
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("shorefeel_field_pair", ROOT / "shorefeel-field-pair.py")
_pair_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(_pair_module)


def utc(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("All timestamps must be UTC and end with Z")
    dt = datetime.fromisoformat(value[:-1] + "+00:00")
    if dt.utcoffset() != timedelta(0):
        raise ValueError("UTC timestamp required")
    return dt


def stamp(value):
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def num(value, low, high):
    return (not isinstance(value, bool) and isinstance(value, (int, float))
            and math.isfinite(value) and low <= value <= high)


def distance_km(a, b):
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dlat = p2 - p1
    dlon = math.radians(b["lon"] - a["lon"])
    hav = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 12742.0176 * math.asin(min(1, math.sqrt(hav)))


def bearing_deg(a, b):
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dl = math.radians(b["lon"] - a["lon"])
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def wind_sector(wind_from_deg, toward_water_deg, speed_mph):
    if not num(speed_mph, 0, 130) or speed_mph < 3:
        return None  # Calm or missing winds do not identify a direction regime.
    if not num(wind_from_deg, 0, 360):
        return None
    angular_gap = abs(((wind_from_deg - toward_water_deg + 180) % 360) - 180)
    if angular_gap <= 45:
        return "onshore"
    if angular_gap >= 135:
        return "offshore"
    return "alongshore"


def selected_hour(dt):
    hour = dt.replace(minute=0, second=0, microsecond=0)
    if dt - hour > timedelta(minutes=30):
        hour += timedelta(hours=1)
    return hour if abs(dt - hour) <= TARGET_TOLERANCE else None


def distinct_rows(raw, identity, valid):
    """Exclude conflicting same-identity records, not merely the later revision."""
    accepted, conflicted, duplicates = {}, set(), 0
    for row in raw if isinstance(raw, list) else []:
        try:
            if not valid(row):
                continue
            key = identity(row)
            if key in conflicted:
                continue
            if key in accepted:
                if accepted[key] != row:
                    accepted.pop(key, None)
                    conflicted.add(key)
                else:
                    duplicates += 1
            else:
                accepted[key] = row
        except (KeyError, ValueError, TypeError, OverflowError):
            continue
    return list(accepted.values()), len(conflicted), duplicates


def source_ok(url, allowed_hosts):
    if not isinstance(url, str):
        return False
    p = urlparse(url)
    return p.scheme == "https" and p.hostname in allowed_hosts and not p.username and not p.password


def valid_wind(row, now):
    try:
        at = utc(row["observedAt"])
        return (at <= now + NOW_TOLERANCE and num(row["speedMph"], 0, 130)
                and num(row["fromDeg"], 0, 360) and row.get("quality") == "valid")
    except (KeyError, ValueError, TypeError):
        return False


def valid_water(row, now, beach):
    try:
        at = utc(row["observedAt"])
        pos = {"lat": row["lat"], "lon": row["lon"]}
        return (at <= now + NOW_TOLERANCE
                and row.get("kind") == "NOAA_GLSEA_ACSPO_NEARSHORE_PIXEL"
                and source_ok(row.get("sourceUrl"), NOAA_WATER_HOSTS)
                and num(row["tempF"], 27, 100)
                and num(pos["lat"], 40, 50) and num(pos["lon"], -91, -75)
                and 0.1 <= distance_km(beach, pos) <= 30
                and row.get("quality") == "valid")
    except (KeyError, ValueError, TypeError):
        return False


def valid_forecast(row, now, expected_version):
    try:
        valid, nws_at, model_at = utc(row["validAt"]), utc(row["nwsIssuedAt"]), utc(row["modelIssuedAt"])
        return (valid <= now + NOW_TOLERANCE and
                all(t <= valid and timedelta(0) <= valid - t <= MAX_ISSUE_LEAD
                    for t in (nws_at, model_at))
                and row.get("modelVersion") == expected_version
                and num(row.get("nwsShoreF"), -60, 140)
                and num(row.get("modelBeachF"), -60, 140)
                and isinstance(row.get("eventId"), str) and bool(row["eventId"].strip())
                and source_ok(row.get("nwsSourceUrl"), {"api.weather.gov"})
                and row.get("modelSource") == "independently-archived-preissued")
    except (KeyError, ValueError, TypeError):
        return False


def closest_at(rows, target, *, timestamp_key, max_gap, earliest=None, latest=None):
    usable = []
    for row in rows:
        at = utc(row[timestamp_key])
        if abs(at - target) > max_gap:
            continue
        if earliest is not None and at < earliest:
            continue
        if latest is not None and at > latest:
            continue
        usable.append((abs((at - target).total_seconds()), at, row))
    usable.sort(key=lambda x: (x[0], x[1]))
    return usable[0][2] if usable else None


def compose(paired, issued, context, beach_meta, inland_meta, now=None):
    now = now or datetime.now(timezone.utc)
    if paired.get("schema") != "shorefeel.paired-air-loggers.v1" or not isinstance(paired.get("records"), list):
        raise ValueError("Require unmodified ShoreFeel paired-air-loggers.v1 records")
    if issued.get("schema") != "shorefeel.issued-air-comparison.v1" or not isinstance(issued.get("records"), list):
        raise ValueError("Require independently archived issued-air-comparison.v1 records")
    if context.get("schema") != "shorefeel.local-observation-context.v1":
        raise ValueError("Require typed local-observation-context.v1")
    if not _pair_module.station_valid(beach_meta, "beach") or not _pair_module.station_valid(inland_meta, "inland"):
        raise ValueError("Require permissioned, shielded and documented independent station metadata")
    if (beach_meta["station_id"] == inland_meta["station_id"]
            or paired.get("beachStationId") != beach_meta["station_id"]
            or paired.get("inlandStationId") != inland_meta["station_id"]):
        raise ValueError("Paired logger identities do not match the independent station register")
    if paired.get("stationMetadataIndependentlyVerified") is not False:
        raise ValueError("Current field-pair contract must retain unverified provenance")
    station = context.get("windStation")
    if (not isinstance(station, dict)
            or not num(station.get("lat"), 40, 50) or not num(station.get("lon"), -91, -75)
            or not num(station.get("heightM"), 1, 20)
            or station.get("role") != "local-observed-wind"
            or station.get("permissionDocumented") is not True
            or distance_km(beach_meta, station) > 2):
        raise ValueError("Wind-sector evidence requires a permissioned local wind instrument within 2 km")
    if not isinstance(issued.get("modelVersion"), str) or not issued["modelVersion"].strip():
        raise ValueError("A versioned archived candidate is required")
    model_locked = utc(issued["modelLockedAt"])
    holdout_starts = utc(issued["holdoutStartsAt"])
    if not model_locked < holdout_starts:
        raise ValueError("Model must be locked before the out-of-time holdout")
    for meta in (beach_meta, inland_meta):
        if datetime.strptime(meta["calibrated_on"], "%Y-%m-%d").replace(tzinfo=timezone.utc) > now:
            raise ValueError("Station calibration cannot be dated in the future")
    forecasts, fconflicts, fduplicates = distinct_rows(
        issued["records"], lambda r: (r["validAt"], r["nwsIssuedAt"], r["modelIssuedAt"]),
        lambda r: valid_forecast(r, now, issued["modelVersion"]))
    wind, wconflicts, wduplicates = distinct_rows(
        context.get("wind", []), lambda r: r["observedAt"], lambda r: valid_wind(r, now))
    water, tconflicts, tduplicates = distinct_rows(
        context.get("water", []), lambda r: (r["observedAt"], r["lat"], r["lon"]),
        lambda r: valid_water(r, now, beach_meta))
    by_hour = {}
    for f in forecasts:
        by_hour.setdefault(f["validAt"], []).append(f)
    for key in by_hour:
        by_hour[key].sort(key=lambda f: (utc(f["modelIssuedAt"]), utc(f["nwsIssuedAt"])), reverse=True)
    rejected = {"invalidPairs": 0, "outOfHour": 0, "duplicateHour": 0,
                "missingForecast": 0, "missingLocalWind": 0, "missingWaterPixel": 0,
                "uncalibratedTime": 0}
    candidates = {}
    for row in paired["records"]:
        try:
            at = utc(row["beachAt"])
            inland_at = utc(row["inlandAt"])
            if (at > now + NOW_TOLERANCE or abs(at - inland_at) > timedelta(minutes=5)
                    or row.get("independentFieldObservation") is not True
                    or not all(num(row.get(k), -60, 140) for k in ("beachAirF", "inlandAirF"))
                    or not num(row.get("beachMinusInlandF"), -100, 100)
                    or abs((row["beachAirF"]-row["inlandAirF"])-row["beachMinusInlandF"]) > .05):
                rejected["invalidPairs"] += 1
                continue
            if any(datetime.strptime(meta["calibrated_on"], "%Y-%m-%d").date() > at.date()
                   for meta in (beach_meta, inland_meta)):
                rejected["uncalibratedTime"] += 1
                continue
            hour = selected_hour(at)
            if hour is None:
                rejected["outOfHour"] += 1
                continue
            key = stamp(hour)
            # Only one field observation per forecast hour, nearest to its target.
            delta = abs((at - hour).total_seconds())
            if key in candidates:
                rejected["duplicateHour"] += 1
                if delta >= candidates[key][0]:
                    continue
            candidates[key] = (delta, at, row)
        except (KeyError, ValueError, TypeError, OverflowError):
            rejected["invalidPairs"] += 1
    descriptive, eligible = [], []
    for key, (_, at, row) in sorted(candidates.items()):
        wsp = closest_at(wind, at, timestamp_key="observedAt", max_gap=WIND_TOLERANCE)
        pixel_candidates = [w for w in water if utc(w["observedAt"]) <= at
                            and at-utc(w["observedAt"]) <= WATER_AGE]
        pixel_candidates.sort(key=lambda x: utc(x["observedAt"]), reverse=True)
        pixel = pixel_candidates[0] if pixel_candidates else None
        sector = None
        if wsp and pixel:
            sector = wind_sector(wsp["fromDeg"], bearing_deg(beach_meta, pixel),
                                 wsp["speedMph"])
        descriptive.append({
            "observedAt": stamp(at), "beachMinusInlandF": row["beachMinusInlandF"],
            "windSector": sector if sector else "unknown",
            "localWindMph": wsp["speedMph"] if wsp else None,
            "localWindFromDeg": wsp["fromDeg"] if wsp else None,
            "waterTempF": pixel["tempF"] if pixel else None,
            "waterObservedAt": pixel["observedAt"] if pixel else None,
            "pixelDistanceKm": round(distance_km(beach_meta, pixel), 2) if pixel else None,
            "isMeasuredNearshoreAir": True, "isOnSandThermometer": False,
            "isValidatedForecast": False
        })
        if not wsp or not sector:
            rejected["missingLocalWind"] += 1
        if not pixel:
            rejected["missingWaterPixel"] += 1
        choices = by_hour.get(key, [])
        forecast = next((f for f in choices if utc(f["nwsIssuedAt"]) <= at
                         and utc(f["modelIssuedAt"]) <= at), None)
        if forecast is None:
            rejected["missingForecast"] += 1
        if forecast is None or sector is None or pixel is None:
            continue
        eligible.append({
            "observedAt": stamp(at), "beachAirF": row["beachAirF"],
            "inlandAirF": row["inlandAirF"], "waterTempF": pixel["tempF"],
            "nwsShoreF": forecast["nwsShoreF"], "modelBeachF": forecast["modelBeachF"],
            "nwsIssuedAt": forecast["nwsIssuedAt"], "modelIssuedAt": forecast["modelIssuedAt"],
            "windSector": sector, "eventId": forecast["eventId"]
        })
    result = {
        "schema": SCHEMA, "status": "RESEARCH_ONLY_UNVERIFIED_FIELD_METADATA",
        "source": "local paired air loggers, local observed wind, NOAA GLSEA pixel, archived issued forecasts",
        "coverage": {"pairedInput": len(paired["records"]), "distinctHours": len(candidates),
                     "descriptive": len(descriptive), "forecastComparable": len(eligible),
                     "rejected": rejected,
                     "conflicts": {"forecasts": fconflicts, "wind": wconflicts, "water": tconflicts},
                     "duplicates": {"forecasts": fduplicates, "wind": wduplicates, "water": tduplicates}},
        "descriptive": descriptive,
        "validationDataset": {
            "station": {
                "id": beach_meta["station_id"], "type": "measured-beach-air",
                "radiationShielded": True, "sensorHeightM": float(beach_meta["sensor_height_m"]),
                "distanceFromShoreM": float(beach_meta["distance_to_shore_m"]),
                "lat": float(beach_meta["lat"]), "lon": float(beach_meta["lon"])
            },
            "units": "F", "modelVersion": issued["modelVersion"],
            "modelLockedAt": issued["modelLockedAt"],
            "holdoutStartsAt": issued["holdoutStartsAt"], "observations": eligible
        },
        "localWindObservationNotForecast": True,
        "waterPixelNotBeachWater": True,
        "windSectorIsDescriptivePostHoc": True,
        "fieldStationIndependentlyVerified": False, "forecastSkillClaim": False,
        "calibrationAuthorized": False, "publicationAuthorized": False,
        "warning": "Post-observation wind sectors and NOAA water pixels classify comparisons but cannot be used as hindsight features of the pre-issued candidate. Independently validate field metadata and out-of-time model skill before publishing."
    }
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for arg in ("paired", "issued", "context", "beach-meta", "inland-meta"):
        p.add_argument("--" + arg, required=True, type=Path)
    p.add_argument("--validation-only", action="store_true",
                   help="Emit existing fieldAudit input JSON, not the larger descriptive study")
    opts = p.parse_args()
    try:
        inputs = [json.loads(getattr(opts, k.replace("-", "_")).read_text())
                  for k in ("paired", "issued", "context", "beach-meta", "inland-meta")]
        report = compose(*inputs)
        print(json.dumps(report["validationDataset"] if opts.validation_only else report,
                         indent=2, sort_keys=True))
    except (OSError, ValueError, TypeError, KeyError) as exc:
        print("ShoreFeel context join refused: " + str(exc), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
