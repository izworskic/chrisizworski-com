#!/usr/bin/env python3
"""Archive real, pre-observation NWS hourly land forecasts for ShoreFeel research.

Captures two FIXED public Saginaw Bay research reference points. The timestamp
of successful receipt is the conservative availability/issue bound. Never backfill
historical forecasts, manufacture candidates, or publish beach air corrections.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

SCHEMA = "shorefeel.nws-received-forecast.v1"
SITES = {
    "park-land-grid": (43.6714, -83.9120),
    "west-bay-inland": (43.6714, -84.1000),
}
MAX_RESPONSE = 2_000_000
MAX_CLOCK_SKEW = timedelta(minutes=5)
PROVIDER = "https://api.weather.gov"
SOURCE = "US National Weather Service hourly land-grid forecast, not an on-sand observation"


def utc(value):
    if not isinstance(value, str):
        raise ValueError("Missing ISO timestamp")
    try:
        t = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, OverflowError) as exc:
        raise ValueError("Invalid ISO timestamp") from exc
    if t.tzinfo is None:
        raise ValueError("Source timestamp lacks UTC offset")
    return t.astimezone(timezone.utc)


def stamp(t):
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def is_real(n, lo, hi):
    return type(n) in (float, int) and math.isfinite(n) and lo <= n <= hi


def safe_api_url(url, *, forecast=False):
    p = urlparse(url) if isinstance(url, str) else None
    if (p is None or p.scheme != "https" or p.netloc != "api.weather.gov"
            or p.query or p.fragment or p.username or p.password or ".." in p.path):
        raise ValueError("NWS URL must be an unmodified secure api.weather.gov endpoint")
    if forecast and not (p.path.startswith("/gridpoints/") and
                         p.path.endswith("/forecast/hourly") and
                         p.path.count("/") == 5):
        raise ValueError("Expected official NWS hourly gridpoint URL")
    return url


def get_json(url):
    safe_api_url(url)
    req = Request(url, headers={
        "User-Agent": "ShoreFeelResearch/1.0 (https://chrisizworski.com)",
        "Accept": "application/geo+json, application/json",
        "Cache-Control": "no-cache",
    })
    try:
        with urlopen(req, timeout=20) as response:
            if response.status != 200:
                raise ValueError("NWS response was not HTTP 200")
            data = response.read(MAX_RESPONSE+1)
            if len(data) > MAX_RESPONSE:
                raise ValueError("NWS response exceeds 2MB research bound")
            return json.loads(data), hashlib.sha256(data).hexdigest(), datetime.now(timezone.utc)
    except HTTPError as exc:
        raise ValueError("NWS HTTP " + str(exc.code)) from None
    except (URLError, TimeoutError) as exc:
        raise ValueError("NWS source unavailable: " + str(exc)) from None


def point_url(coord):
    lat, lon = coord
    return PROVIDER + "/points/" + str(lat) + "," + str(lon)


def normalize_point(name, data):
    p = data.get("properties") if isinstance(data, dict) else None
    if not isinstance(p, dict):
        raise ValueError("Missing NWS point mapping")
    gridid, x, y = p.get("gridId"), p.get("gridX"), p.get("gridY")
    if (not isinstance(gridid, str) or not gridid.isalpha() or len(gridid) > 5
            or type(x) is not int or type(y) is not int or not 0 <= x <= 1000
            or not 0 <= y <= 1000):
        raise ValueError("Invalid NWS source grid identity")
    forecast_url = safe_api_url(p.get("forecastHourly"), forecast=True)
    # The metadata grid must match the returned forecast endpoint.
    if urlparse(forecast_url).path != f"/gridpoints/{gridid}/{x},{y}/forecast/hourly":
        raise ValueError("NWS hourly endpoint does not match the point grid identity")
    return {
        "id": name, "reference": dict(zip(("lat", "lon"), SITES[name])),
        "grid": {"id": gridid, "x": x, "y": y},
        "forecastUrl": forecast_url,
        "pointMappingUrl": point_url(SITES[name]),
    }


def normalize_forecast(mapping, forecast, fetched_at, source_sha):
    props = forecast.get("properties") if isinstance(forecast, dict) else None
    if not isinstance(props, dict) or not isinstance(props.get("periods"), list):
        raise ValueError("Missing NWS forecast periods")
    generated = props.get("generatedAt") or props.get("updateTime")
    if not generated:
        raise ValueError("NWS forecast lacks generatedAt/updateTime source provenance")
    generated_at = utc(generated)
    if generated_at > fetched_at+MAX_CLOCK_SKEW:
        raise ValueError("Forecast reported generated in the future")
    if generated_at < fetched_at-timedelta(hours=72):
        raise ValueError("NWS source snapshot is over 72 hours old")
    cases = []
    duplicate = set()
    for row in props["periods"]:
        try:
            at, until = utc(row["startTime"]), utc(row["endTime"])
            temp = row["temperature"]
            unit = row["temperatureUnit"]
            if until <= at or at in duplicate:
                continue
            # Only forecasts demonstrably obtained before the valid hour.
            if at <= fetched_at+timedelta(minutes=1):
                continue
            if at > fetched_at+timedelta(hours=48):
                continue
            if unit != "F" or not is_real(temp, -60, 140):
                continue
            duplicate.add(at)
            cases.append({
                "validAt": stamp(at),
                "validUntil": stamp(until),
                "nwsShoreF": temp,
                "nwsIssuedAt": stamp(fetched_at),
                "sourceGeneratedAt": stamp(generated_at),
                "sourceUrl": mapping["forecastUrl"],
                "sourceSha256": source_sha,
                "isForecastNotObservation": True,
            })
        except (KeyError, TypeError, ValueError, OverflowError):
            continue
    cases.sort(key=lambda c: c["validAt"])
    if not cases:
        raise ValueError("No future valid NWS land forecast periods survived source checks")
    return {**mapping, "capturedAt": stamp(fetched_at),
            "providerGeneratedAt": stamp(generated_at),
            "sourceSha256": source_sha, "futurePeriods": cases}


def capture(fetcher=None):
    fetcher = fetcher or get_json
    out = []
    for name, coords in SITES.items():
        p_url = point_url(coords)
        points, p_sha, point_received = fetcher(p_url)
        mapping = normalize_point(name, points)
        raw, sha, received = fetcher(mapping["forecastUrl"])
        if point_received > received+MAX_CLOCK_SKEW:
            raise ValueError("Clock moved backwards between NWS requests")
        out.append(normalize_forecast(mapping, raw, received, sha) |
                   {"pointsSha256": p_sha, "pointMetadataReceivedAt": stamp(point_received)})
    unique = {(x["grid"]["id"], x["grid"]["x"], x["grid"]["y"]) for x in out}
    return {
        "schema": SCHEMA,
        "status": "REAL_PREISSUED_LAND_FORECAST_ARCHIVED",
        "source": SOURCE, "siteCount": len(out),
        "distinctForecastGridCells": len(unique) == len(out),
        "pointForecasts": out,
        "eventId": None, "candidateModelVersion": None,
        "modelBeachF": None, "beachAirMeasurementF": None,
        "isQuarterMileShoreDifference": False,
        "calibrationAuthorized": False, "publicationAuthorized": False,
        "interpretation": ("Captured prospective NWS forecast snapshots at two public "
                           "land-grid reference points. Not actual beach/inland thermometers. "
                           "The evidence cannot reconstruct what was known before capture.")
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--output", type=Path, required=True,
                   help="Private JSON file; existing output is never overwritten")
    args = p.parse_args()
    try:
        dest = args.output
        if any(part in {"public", "api", "data"} for part in dest.parts):
            raise ValueError("NWS issued snapshots must not be saved to a public site directory")
        result = capture()
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open("x", encoding="utf-8") as f:
            json.dump(result, f, sort_keys=True, indent=2)
            f.write("\n")
        print(json.dumps({
            "schema": result["schema"], "status": result["status"],
            "file": str(dest), "distinctForecastGridCells": result["distinctForecastGridCells"],
            "futurePeriods": [len(row["futurePeriods"]) for row in result["pointForecasts"]],
            "publicationAuthorized": result["publicationAuthorized"]
        }, sort_keys=True))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print("ShoreFeel NWS issuance capture refused: " + str(exc), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
