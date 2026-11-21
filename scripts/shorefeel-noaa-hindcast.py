#!/usr/bin/env python3
"""Offline NOAA HRRR/URMA GRIB2 point extractor for ShoreFeel research.

No network requests, credentials, runtime functions, user location, calibration,
or changes to the public ShoreFeel API. Optional 'eccodes' is needed to read GRIB2.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

VERSION = "shorefeel.noaa-hindcast.v1"
SITES = {
    "park-land-grid": (43.6714, -83.9120),
    "west-bay-inland": (43.6714, -84.1000),
}
SOURCES = {
    "HRRR": ("noaa-hrrr-bdp-pds.s3.amazonaws.com", "/hrrr."),
    "URMA": ("noaa-urma-pds.s3.amazonaws.com", "/urma2p5."),
}
MISSING = (9999, 9999.0, -9999, -9999.0)


def utc(value: str) -> datetime:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("UTC timestamp must end with Z")
    dt = datetime.fromisoformat(value[:-1] + "+00:00")
    if dt.utcoffset() != timedelta(0):
        raise ValueError("UTC timestamp required")
    return dt


def stamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def grib_clock(date_value, time_value) -> datetime:
    date_text = str(int(date_value))
    if len(date_text) != 8:
        raise ValueError("Invalid GRIB date")
    t = str(int(time_value)).zfill(4)
    return datetime.strptime(date_text + t, "%Y%m%d%H%M").replace(tzinfo=timezone.utc)


def distance_km(lat_a, lon_a, lat_b, lon_b):
    a, b = math.radians(lat_a), math.radians(lat_b)
    dlat = b - a
    dlon = math.radians(lon_b - lon_a)
    h = math.sin(dlat / 2) ** 2 + math.cos(a) * math.cos(b) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.atan2(math.sqrt(h), math.sqrt(max(0, 1 - h)))


def verify_source(product, url):
    host, prefix = SOURCES[product]
    parsed = urlparse(url)
    if (parsed.scheme != "https" or parsed.hostname != host
            or not parsed.path.startswith(prefix) or parsed.query or parsed.fragment
            or ".." in parsed.path):
        raise ValueError("Source URL must name the official product's NOAA open-data bucket")
    if product == "HRRR" and not parsed.path.endswith(".grib2"):
        raise ValueError("Expected HRRR GRIB2 file")
    if product == "URMA" and not parsed.path.endswith(".grb2_wexp"):
        raise ValueError("Expected URMA analysis GRIB2 file")
    return url


def archive_identity(product, source_url, start, lead):
    path = urlparse(source_url).path
    if product == "HRRR":
        found = re.fullmatch(r"/hrrr\.(\d{8})/conus/hrrr\.t(\d{2})z\.wrfsfcf(\d{2})\.grib2", path)
    else:
        found = re.fullmatch(r"/urma2p5\.(\d{8})/urma2p5\.t(\d{2})z\.2dvaranl_ndfd\.grb2_wexp", path)
    if not found:
        raise ValueError("NOAA archive object path does not identify a supported cycle and product")
    day, hour = found.groups()[:2]
    if start.strftime("%Y%m%d") != day or start.hour != int(hour):
        raise ValueError("GRIB cycle differs from NOAA archive object identity")
    if product == "HRRR" and int(found.group(3)) != int(lead):
        raise ValueError("GRIB lead differs from NOAA archive filename")


def nearest(values, lats, lons, target):
    if not (len(values) == len(lats) == len(lons)) or len(values) == 0:
        raise ValueError("Invalid GRIB grid arrays")
    best = None
    for index, (value, lat, lon) in enumerate(zip(values, lats, lons)):
        if not all(isinstance(x, (int, float)) and math.isfinite(x)
                   for x in (value, lat, lon)):
            continue
        if not 180 <= value <= 335 or not -90 <= lat <= 90:
            continue
        normalized_lon = (lon + 180) % 360 - 180
        d = distance_km(lat, normalized_lon, *target)
        if best is None or d < best[0]:
            best = (d, index, float(value), float(lat), float(normalized_lon))
    if best is None or best[0] > 8:
        raise ValueError("No physical 2m air-temperature grid value within 8 km")
    return best


def extract(messages, *, product, site_id, source_url, sha256):
    """Process decoded GRIB messages with all provenance carried by the caller."""
    if product not in SOURCES or site_id not in SITES:
        raise ValueError("Unsupported product or fixed reference site")
    verify_source(product, source_url)
    if not isinstance(sha256, str) or len(sha256) != 64 or any(c not in "0123456789abcdef" for c in sha256):
        raise ValueError("SHA-256 of original GRIB2 file required")
    target = SITES[site_id]
    samples = {}
    for msg in messages:
        level = str(msg.get("typeOfLevel"))
        height = msg.get("level")
        short = str(msg.get("shortName", "")).lower()
        var = None
        if level == "heightAboveGround" and height == 2 and short in ("2t", "t2m"):
            var = "temperature"
        elif level == "heightAboveGround" and height == 10 and short in ("10u", "u10"):
            var = "u"
        elif level == "heightAboveGround" and height == 10 and short in ("10v", "v10"):
            var = "v"
        if var is None:
            continue
        if var in samples:
            raise ValueError("Multiple GRIB messages for one variable; choose a single valid analysis hour")
        if msg.get("units") != ("K" if var == "temperature" else "m s**-1"):
            # GRIB producers have multiple short unit forms for wind.
            if not (var in ("u", "v") and msg.get("units") in ("m/s", "m s-1")):
                raise ValueError("Unexpected GRIB physical units")
        start = grib_clock(msg["dataDate"], msg["dataTime"])
        valid = grib_clock(msg["validityDate"], msg["validityTime"])
        if valid < start or valid - start > timedelta(hours=48):
            raise ValueError("Implausible forecast lead or analysis validity time")
        if product == "URMA" and valid != start:
            raise ValueError("URMA must be a zero-lead analysis")
        # For wind, find the nearest actual grid point, not a water-mask substitute.
        vals, lats, lons = msg["values"], msg["latitudes"], msg["longitudes"]
        if var == "temperature":
            d, idx, val, lat, lon = nearest(vals, lats, lons, target)
        else:
            if "temperature" not in samples:
                # Wind may appear before temperature. Hold it until the end.
                samples[var] = {"unlocated": msg, "start": start, "valid": valid}
                continue
            idx = samples["temperature"]["index"]
            val, lat, lon = float(vals[idx]), float(lats[idx]), (float(lons[idx]) + 180) % 360 - 180
            d = distance_km(lat, lon, *target)
        if var != "temperature" and (not math.isfinite(val) or abs(val) > 120):
            raise ValueError("Unphysical 10m wind component")
        samples[var] = {"index": idx, "value": val, "lat": lat, "lon": lon,
                        "distanceKm": d, "start": start, "valid": valid}
        if var == "temperature":
            for key in ("u", "v"):
                if key in samples and "unlocated" in samples[key]:
                    pending = samples[key]
                    values = pending["unlocated"]
                    wi = idx
                    wval = float(values["values"][wi])
                    wlat = float(values["latitudes"][wi])
                    wlon = (float(values["longitudes"][wi]) + 180) % 360 - 180
                    if not math.isfinite(wval) or abs(wval) > 120:
                        raise ValueError("Unphysical wind component")
                    samples[key] = {"index": wi, "value": wval, "lat": wlat, "lon": wlon,
                                    "distanceKm": distance_km(wlat, wlon, *target),
                                    "start": pending["start"], "valid": pending["valid"]}
    temp = samples.get("temperature")
    if not temp:
        raise ValueError("Required 2m air temperature absent from GRIB file")
    if temp["distanceKm"] > 8 or not 180 <= temp["value"] <= 335:
        raise ValueError("Missing or invalid air-temperature point")
    for key in ("u", "v"):
        if key in samples and (samples[key]["valid"] != temp["valid"]
                or samples[key]["start"] != temp["start"]
                or samples[key]["distanceKm"] > 8
                or abs(samples[key]["lat"] - temp["lat"]) > .001
                or abs(samples[key]["lon"] - temp["lon"]) > .001):
            raise ValueError("Wind and air temperature must represent the same grid point and time")
    lead = (temp["valid"] - temp["start"]).total_seconds() / 3600
    if product == "HRRR" and not lead.is_integer():
        raise ValueError("HRRR hourly dataset requires integral lead hours")
    archive_identity(product, source_url, temp["start"], lead)
    both = "u" in samples and "v" in samples
    u, v = (samples["u"]["value"], samples["v"]["value"]) if both else (None, None)
    return {
        "schema": VERSION, "product": product,
        "kind": "model-forecast" if product == "HRRR" and lead > 0 else "gridded-analysis",
        "site": site_id, "siteLat": target[0], "siteLon": target[1],
        "gridLat": round(temp["lat"], 5), "gridLon": round(temp["lon"], 5),
        "gridDistanceKm": round(temp["distanceKm"], 3),
        "validAt": stamp(temp["valid"]), "cycleAt": stamp(temp["start"]),
        "forecastLeadHours": int(lead),
        "tempF": round((temp["value"] - 273.15) * 9 / 5 + 32, 2),
        "windMps": round(math.hypot(u, v), 2) if both else None,
        "windFromDeg": round((math.degrees(math.atan2(-u, -v)) + 360) % 360, 1) if both else None,
        "sourceUrl": source_url, "sourceFileSha256": sha256,
        "isBeachAirMeasurement": False, "calibrationEligibleAlone": False,
    }


def read_grib(path):
    try:
        import eccodes
    except ImportError as exc:
        raise RuntimeError("Install ecCodes Python bindings locally to decode GRIB2") from exc
    rows = []
    with path.open("rb") as stream:
        while True:
            gid = eccodes.codes_grib_new_from_file(stream)
            if gid is None:
                break
            try:
                key = lambda name: eccodes.codes_get(gid, name)
                short = str(key("shortName")).lower()
                typ = str(key("typeOfLevel"))
                height = int(key("level"))
                if typ != "heightAboveGround" or not (
                    (height == 2 and short in ("2t", "t2m")) or
                    (height == 10 and short in ("10u", "u10", "10v", "v10"))):
                    continue
                rows.append({
                    "shortName": short, "typeOfLevel": typ, "level": height,
                    "units": key("units"), "dataDate": key("dataDate"),
                    "dataTime": key("dataTime"), "validityDate": key("validityDate"),
                    "validityTime": key("validityTime"),
                    "values": eccodes.codes_get_array(gid, "values"),
                    "latitudes": eccodes.codes_get_array(gid, "latitudes"),
                    "longitudes": eccodes.codes_get_array(gid, "longitudes"),
                })
            finally:
                eccodes.codes_release(gid)
    return rows


def audit(records):
    """Archive inventory only. NEVER compares grids to measured beach air."""
    seen = {}
    report = {"schema": "shorefeel.noaa-archive-audit.v1", "accepted": 0, "duplicates": 0,
              "conflictingRevisions": 0, "rejected": 0, "byProduct": {}, "pairs": []}
    for row in records:
        if not isinstance(row, dict) or row.get("schema") != VERSION or row.get("product") not in SOURCES:
            report["rejected"] += 1
            continue
        product, site = row.get("product"), row.get("site")
        try:
            verify_source(product, row["sourceUrl"])
            utc(row["validAt"])
            utc(row["cycleAt"])
            if site not in SITES or not isinstance(row.get("tempF"), (float, int)) or not -100 < row["tempF"] < 150:
                raise ValueError("Invalid site or unit")
            if row.get("isBeachAirMeasurement") is not False:
                raise ValueError("Cannot treat model grid as an observed thermometer")
            if not 0 <= float(row.get("gridDistanceKm", 1e9)) <= 8:
                raise ValueError("Grid point too distant")
            sha = row["sourceFileSha256"]
            if not isinstance(sha, str) or len(sha) != 64:
                raise ValueError("Missing GRIB checksum")
        except (KeyError, ValueError, TypeError):
            report["rejected"] += 1
            continue
        key = (product, site, row["validAt"], row["cycleAt"])
        if key in seen:
            if seen[key] != row:
                report["conflictingRevisions"] += 1
                seen[key] = None
            else:
                report["duplicates"] += 1
        else:
            seen[key] = row
    unique = {k: v for k, v in seen.items() if v is not None}
    report["accepted"] = len(unique)
    for key in unique:
        product = key[0]
        report["byProduct"][product] = report["byProduct"].get(product, 0) + 1
    # Paired sites at the same product, valid time and cycle. No beach station
    # is represented by either GRIB point. This is an archive contrast only.
    for (product, site, valid, cycle), shore in sorted(unique.items()):
        if site != "park-land-grid":
            continue
        inland = unique.get((product, "west-bay-inland", valid, cycle))
        if inland is not None:
            report["pairs"].append({"product": product, "validAt": valid, "cycleAt": cycle,
                                    "shoreMinusInlandF": round(shore["tempF"] - inland["tempF"], 2)})
    report["status"] = "REQUIRES_FIELD_MEASUREMENTS"
    report["publishedBeachCorrectionF"] = None
    report["modelSkillClaim"] = False
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    extract_p = sub.add_parser("extract", help="Read a locally downloaded NOAA GRIB2 file")
    extract_p.add_argument("--file", type=Path, required=True)
    extract_p.add_argument("--source-url", required=True)
    extract_p.add_argument("--product", choices=SOURCES, required=True)
    extract_p.add_argument("--site", choices=SITES, required=True)
    audit_p = sub.add_parser("audit", help="Audit extracted JSON records, no beach model fitting")
    audit_p.add_argument("files", type=Path, nargs="+")
    args = parser.parse_args()
    try:
        if args.command == "extract":
            digest = hashlib.sha256()
            with args.file.open("rb") as stream:
                if stream.read(4) != b"GRIB":
                    raise ValueError("Not a GRIB2 file")
                stream.seek(0)
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(chunk)
            result = extract(read_grib(args.file), product=args.product, site_id=args.site,
                             source_url=args.source_url, sha256=digest.hexdigest())
        else:
            rows = []
            for file in args.files:
                raw = json.loads(file.read_text())
                rows.extend(raw if isinstance(raw, list) else [raw])
            result = audit(rows)
        print(json.dumps(result, indent=2, sort_keys=True))
    except (OSError, ValueError, RuntimeError, KeyError) as exc:
        print(f"ShoreFeel research input rejected: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
