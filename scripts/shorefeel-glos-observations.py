#!/usr/bin/env python3
"""Read a bounded GLOS Petoskey shore weather archive window for offline research.

Observations are measured at an existing park weather station but neither a
verified on-sand temperature nor a simultaneous inland comparison. The tool
does not issue a forecast, fit a model, or write to any public website path.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError

SCHEMA = "shorefeel.glos-shore-observations.v1"
SOURCE = "https://seagull-erddap.glos.org/erddap/tabledap/obs_127.json"
STATION = "Petoskey State Park Weather Station"
OWNER = "Little Traverse Bay Bands of Odawa Indians"
STATION_REF = {"lat": 45.407589, "lon": -84.912903}
FIELDS = ("time", "longitude", "latitude", "air_temperature",
          "air_temperature_aggregate_test", "wind_speed", "wind_speed_aggregate_test",
          "wind_from_direction", "wind_from_direction_aggregate_test")
UNITS = ("UTC", "degrees_east", "degrees_north", "K", None, "m s-1",
         None, "degree", None)
LICENCE = ("The data may be used and redistributed for free but is not intended "
           "for legal use, since it may contain inaccuracies.")
FIRST_DATA = datetime(2022, 5, 30, tzinfo=timezone.utc)
MAX_WINDOW = timedelta(days=1)
MAX_BYTES = 2_000_000
MAX_ROWS = 5000


def utc(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("An explicit UTC Z timestamp is required")
    out = datetime.fromisoformat(value[:-1] + "+00:00")
    if out.utcoffset() != timedelta(0):
        raise ValueError("UTC timestamp required")
    return out


def stamp(value):
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def bounded_window(start, end, now):
    if not FIRST_DATA <= start < end <= now + timedelta(minutes=5):
        raise ValueError("The request must cover real dates after station inception and not the future")
    if end-start > MAX_WINDOW:
        raise ValueError("At most one day of archived observations may be retrieved per request")
    return start, end


def source_url(start, end):
    fields = ",".join(FIELDS)
    return (SOURCE + "?" + fields + "&" +
            quote("time>=" + stamp(start), safe="=:") + "&" +
            quote("time<=" + stamp(end), safe="=:"))


def fetch_window(start, end, now, fetcher=None):
    bounded_window(start, end, now)
    url = source_url(start, end)
    if fetcher is None:
        def fetcher(fixed_url):
            req = Request(fixed_url, headers={
                "User-Agent": "ShoreFeelResearch/1.0 (https://chrisizworski.com/)",
                "Accept": "application/json",
            })
            try:
                with urlopen(req, timeout=18) as response:
                    if response.status != 200:
                        raise ValueError("GLOS ERDDAP returned non-200 response")
                    raw = response.read(MAX_BYTES + 1)
                    if len(raw) > MAX_BYTES:
                        raise ValueError("GLOS result exceeds bounded data size")
                    return json.loads(raw)
            except HTTPError as exc:
                # Do not retry a malformed query or hide provider evidence.
                detail = exc.read(2048).decode("utf-8", errors="replace")
                raise ValueError("GLOS ERDDAP HTTP " + str(exc.code) + ": " +
                                 " ".join(detail.split())[:400]) from None
    payload = fetcher(url)
    return normalize(payload, start=start, end=end, now=now, provenance=url)


def valid_number(x, a, b):
    return not isinstance(x, bool) and isinstance(x, (int, float)) and math.isfinite(x) and a <= x <= b


def qc_good(x):
    # QARTOD: 1 = GOOD. 2 (not evaluated), 3/4/9 are not field-validated.
    return type(x) is int and x == 1


def near_station(lat, lon):
    # Metadata identity, not a verified sensor installation or exact beach point.
    return abs(lat - STATION_REF["lat"]) <= 0.025 and abs(lon - STATION_REF["lon"]) <= 0.035


def normalize(payload, *, start, end, now, provenance):
    bounded_window(start, end, now)
    table = payload.get("table") if isinstance(payload, dict) else None
    if not isinstance(table, dict):
        raise ValueError("Expected ERDDAP JSON table")
    names, units, rows = table.get("columnNames"), table.get("columnUnits"), table.get("rows")
    if names != list(FIELDS) or not isinstance(units, list) or len(units) != len(FIELDS):
        raise ValueError("Unexpected GLOS variable selection")
    # Missing QC flag units vary across ERDDAP versions, so require only physical units.
    unit_aliases = {
        "wind_speed": {"m s-1", "m/s", "m s**-1"},
        "wind_from_direction": {"degree", "degrees", "°"},
    }
    for i in (0, 1, 2, 3, 5, 7):
        valid = unit_aliases.get(FIELDS[i], {UNITS[i]})
        if units[i] not in valid:
            raise ValueError("Unexpected GLOS physical measurement unit: " +
                             FIELDS[i] + " = " + repr(units[i]))
    if not isinstance(rows, list) or len(rows) > MAX_ROWS:
        raise ValueError("Unexpected GLOS row count")
    accepted = {}
    conflicts = set()
    counts = {"rawRows": len(rows), "invalidTimeOrCoordinates": 0,
              "badAirOrQuality": 0, "unusableWind": 0,
              "duplicate": 0, "conflictingRevision": 0}
    for values in rows:
        if not isinstance(values, list) or len(values) != len(FIELDS):
            counts["invalidTimeOrCoordinates"] += 1
            continue
        row = dict(zip(FIELDS, values))
        try:
            at = utc(row["time"])
        except (ValueError, TypeError, OverflowError):
            counts["invalidTimeOrCoordinates"] += 1
            continue
        if (at < start or at > end or at > now + timedelta(minutes=5)
                or not valid_number(row["latitude"], 40, 50)
                or not valid_number(row["longitude"], -91, -75)
                or not near_station(row["latitude"], row["longitude"])):
            counts["invalidTimeOrCoordinates"] += 1
            continue
        k = row["air_temperature"]
        if not qc_good(row["air_temperature_aggregate_test"]) or not valid_number(k, 213, 328):
            counts["badAirOrQuality"] += 1
            continue
        air_f = round((k - 273.15) * 9 / 5 + 32, 2)
        wind_mph = direction = None
        if (qc_good(row["wind_speed_aggregate_test"]) and
                qc_good(row["wind_from_direction_aggregate_test"]) and
                valid_number(row["wind_speed"], 0, 60) and
                valid_number(row["wind_from_direction"], 0, 360)):
            wind_mph = round(row["wind_speed"] * 2.2369362921, 2)
            direction = round(row["wind_from_direction"], 1)
        else:
            counts["unusableWind"] += 1
        observation = {
            "observedAt": stamp(at),
            "airTempF": air_f,
            "observedWindMph": wind_mph,
            "windFromDeg": direction,
            "temperatureQuality": "GOOD",
            "windQuality": "GOOD" if wind_mph is not None else "UNAVAILABLE",
            "siteClass": "park-shore-weather-station-unverified-exposure"
        }
        key = stamp(at)
        if key in conflicts:
            continue
        if key in accepted:
            if observation == accepted[key]:
                counts["duplicate"] += 1
            else:
                counts["conflictingRevision"] += 1
                accepted.pop(key, None)
                conflicts.add(key)
            continue
        accepted[key] = observation
    observations = [accepted[k] for k in sorted(accepted)]
    latest = utc(observations[-1]["observedAt"]) if observations else None
    fresh = latest is not None and timedelta(0) <= now-latest <= timedelta(hours=6)
    return {
        "schema": SCHEMA,
        "status": "SHORE_STATION_RESEARCH_ONLY" if observations else "NO_QC_APPROVED_OBSERVATIONS",
        "source": "GLOS Seagull ERDDAP",
        "sourceUrl": provenance,
        "datasetId": "obs_127",
        "station": STATION,
        "operator": OWNER,
        "siteReference": STATION_REF,
        "requestedFrom": stamp(start),
        "requestedTo": stamp(end),
        "evaluatedAt": stamp(now),
        "firstAcceptedAt": observations[0]["observedAt"] if observations else None,
        "latestAcceptedAt": observations[-1]["observedAt"] if observations else None,
        "sourceFreshWithinSixHours": fresh,
        "licenseSummary": LICENCE,
        "coverage": {**counts, "goodAirRows": len(observations),
                     "goodAirAndWindRows": sum(x["observedWindMph"] is not None for x in observations)},
        "observations": observations,
        "hasVerifiedBeachSandThermometer": False,
        "hasIndependentlyVerifiedSensorSitingAndShielding": False,
        "hasSameHourInlandObservation": False,
        "shoreInlandGradientF": None,
        "candidateForecastSkill": None,
        "calibrationAuthorized": False,
        "publicationAuthorized": False,
        "interpretation": ("Historic measured air and wind at an existing park shoreline station, "
                           "not a verified sand thermometer, inland temperature pair, "
                           "or calibrated forecast. GLOS data may include errors.")
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--start", required=True, help="UTC YYYY-MM-DDTHH:MM:SSZ")
    p.add_argument("--end", required=True, help="UTC YYYY-MM-DDTHH:MM:SSZ, at most 24h after start")
    p.add_argument("--input-json", type=Path, default=None,
                   help="Optional offline ERDDAP response, e.g., verified downloaded archive")
    args = p.parse_args()
    try:
        now = datetime.now(timezone.utc)
        start, end = utc(args.start), utc(args.end)
        bounded_window(start, end, now)
        if args.input_json:
            raw = args.input_json.read_bytes()
            if len(raw) > MAX_BYTES:
                raise ValueError("GLOS local response exceeds bounded data size")
            result = normalize(json.loads(raw), start=start, end=end, now=now,
                               provenance="offline-source-file:" + args.input_json.name)
        else:
            result = fetch_window(start, end, now)
        print(json.dumps(result, indent=2, sort_keys=True))
    except (ValueError, OSError, TypeError, KeyError) as exc:
        print("GLOS shoreline source rejected: " + str(exc), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
