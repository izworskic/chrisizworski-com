#!/usr/bin/env python3
"""Fetch real NOAA model GRIB2 field slices for offline ShoreFeel research.

No public API change, beach correction, calibration, cron or external service.
Downloads official HRRR and URMA field ranges into memory and asks ecCodes for
the nearest grid cells at two fixed public reference points.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import importlib.util
import io
import json
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    "shorefeel_hindcast", ROOT / "shorefeel-noaa-hindcast.py")
hindcast = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hindcast)

UA = "ShoreFeel research archive validation (chrisizworski.com)"
MAX_FIELD_BYTES = 10_000_000
FIELD_TAGS = {"temperature": ("TMP", "2 m above ground"),
              "u": ("UGRD", "10 m above ground"),
              "v": ("VGRD", "10 m above ground")}


def url_for(product, day, cycle, lead):
    # NOAA official public open-data buckets. Inputs are checked in CLI.
    if product == "HRRR":
        return ("https://noaa-hrrr-bdp-pds.s3.amazonaws.com/"
                f"hrrr.{day}/conus/hrrr.t{cycle:02d}z.wrfsfcf{lead:02d}.grib2")
    return ("https://noaa-urma-pds.s3.amazonaws.com/"
            f"urma2p5.{day}/urma2p5.t{cycle:02d}z.2dvaranl_ndfd.grb2_wexp")


def get(url, headers=None, limit=40_000):
    req = Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urlopen(req, timeout=50) as response:
        status = response.status
        content_range = response.headers.get("Content-Range")
        blob = response.read(limit + 1)
        if len(blob) > limit:
            raise ValueError("NOAA response larger than bounded maximum")
        return status, content_range, blob


def parse_idx(blob, product, cycle, lead):
    text = blob.decode("ascii", errors="strict")
    rows = []
    for line in text.splitlines():
        parts = line.split(":")
        if len(parts) < 6:
            raise ValueError("Invalid NOAA GRIB index format")
        number, offset = int(parts[0]), int(parts[1])
        if number != len(rows) + 1 or (rows and offset <= rows[-1]["start"]):
            raise ValueError("GRIB index offsets are not strictly ordered")
        rows.append({"number": number, "start": offset,
                     "variable": parts[3], "level": parts[4],
                     "reference": parts[2], "step": parts[5]})
    if not rows or rows[0]["start"] != 0:
        raise ValueError("Empty or misaligned NOAA index")
    selected = {}
    for field, (var, level) in FIELD_TAGS.items():
        matches = [i for i, row in enumerate(rows)
                   if row["variable"] == var and row["level"] == level]
        if len(matches) != 1:
            raise ValueError(f"Require exactly one indexed {field} field")
        i = matches[0]
        if i + 1 >= len(rows):
            raise ValueError("Selected GRIB field has no following byte offset")
        row, nxt = rows[i], rows[i + 1]
        if product == "HRRR" and f"{lead} hour fcst" not in row["step"]:
            raise ValueError("HRRR lead differs from index")
        if product == "URMA" and row["step"] != "anl":
            raise ValueError("URMA index must be analysis")
        if not row["reference"].startswith("d=" + cycle):
            raise ValueError("NOAA index cycle does not match request")
        length = nxt["start"] - row["start"]
        if length < 32 or length > MAX_FIELD_BYTES:
            raise ValueError("Unreasonable NOAA GRIB field byte length")
        selected[field] = {"start": row["start"],
                           "end": nxt["start"] - 1, "length": length,
                           "indexMessage": row["number"]}
    return selected


def download_fields(url, product, cycle_key, lead):
    hindcast.verify_source(product, url)
    status, _, index_bytes = get(url + ".idx", limit=70_000)
    if status != 200:
        raise ValueError(f"NOAA index HTTP {status}")
    fields = parse_idx(index_bytes, product, cycle_key, lead)
    blobs = {}
    for label, field in fields.items():
        start, end = field["start"], field["end"]
        status, content_range, blob = get(
            url, {"Range": f"bytes={start}-{end}"}, limit=MAX_FIELD_BYTES)
        expected = f"bytes {start}-{end}/"
        if status != 206 or not (content_range or "").startswith(expected):
            raise ValueError(f"NOAA did not honor field range for {label}")
        if len(blob) != field["length"] or not blob.startswith(b"GRIB") or not blob.endswith(b"7777"):
            raise ValueError(f"NOAA GRIB field corrupt or incomplete: {label}")
        blobs[label] = blob
        field["sha256"] = hashlib.sha256(blob).hexdigest()
    return fields, blobs, hashlib.sha256(index_bytes).hexdigest()


def sample_point(blobs, lat, lon):
    import eccodes
    messages = []
    for label in ("temperature", "u", "v"):
        with io.BytesIO(blobs[label]) as binary:
            gid = eccodes.codes_grib_new_from_file(binary)
            if gid is None:
                raise ValueError("ecCodes could not decode NOAA GRIB2 field")
            try:
                nearest = eccodes.codes_grib_find_nearest(gid, lat, lon)[0]
                nlat, nlon, value, _, _ = nearest
                fetch = lambda key: eccodes.codes_get(gid, key)
                messages.append({
                    "shortName": str(fetch("shortName")),
                    "typeOfLevel": str(fetch("typeOfLevel")),
                    "level": int(fetch("level")),
                    "units": str(fetch("units")),
                    "dataDate": int(fetch("dataDate")),
                    "dataTime": int(fetch("dataTime")),
                    "validityDate": int(fetch("validityDate")),
                    "validityTime": int(fetch("validityTime")),
                    "latitudes": [float(nlat)], "longitudes": [float(nlon)],
                    "values": [float(value)],
                })
            finally:
                eccodes.codes_release(gid)
    return messages


def read_ndbc(station):
    url = f"https://www.ndbc.noaa.gov/data/realtime2/{station}.txt"
    try:
        status, _, raw = get(url, limit=850_000)
        if status != 200:
            raise ValueError(f"HTTP {status}")
        rows = raw.decode("ascii", errors="replace").splitlines()
        measured = []
        for line in rows:
            if not line or line[0] == "#":
                continue
            p = line.split()
            if len(p) < 15:
                continue
            try:
                when = dt.datetime(*map(int, p[:5]), tzinfo=dt.timezone.utc)
                temp = None if p[13] == "MM" else float(p[13])
                wind = None if p[6] == "MM" else float(p[6])
                if temp is not None and not -70 <= temp <= 55:
                    temp = None
                if wind is not None and not 0 <= wind <= 80:
                    wind = None
                measured.append((when, temp, wind))
            except (ValueError, OverflowError):
                continue
        measured.sort(reverse=True)
        air = next(((t, x) for t, x, w in measured if x is not None), None)
        wind = next(((t, w) for t, x, w in measured if w is not None), None)
        return {"station": station, "sourceUrl": url,
                "records": len(measured),
                "airAvailable": air is not None,
                "latestAirAt": air[0].isoformat().replace("+00:00", "Z") if air else None,
                "latestAirC": air[1] if air else None,
                "latestWindAt": wind[0].isoformat().replace("+00:00", "Z") if wind else None,
                "latestWindMps": wind[1] if wind else None,
                "isBeachAirMeasurement": False,
                "status": "OFFSHORE_CONTEXT_ONLY"}
    except (OSError, ValueError, TimeoutError) as exc:
        return {"station": station, "sourceUrl": url,
                "status": "SOURCE_UNAVAILABLE", "error": type(exc).__name__,
                "isBeachAirMeasurement": False}


def run(day, cycle, lead):
    cycle_key = f"{day}{cycle:02d}"
    products = []
    for product, this_lead in [("HRRR", lead), ("URMA", 0)]:
        url = url_for(product, day, cycle, this_lead)
        fields, blobs, idx_sha = download_fields(url, product, cycle_key, this_lead)
        archive = {"product": product, "url": url, "indexUrl": url + ".idx",
                   "indexSha256": idx_sha, "ranges": fields, "points": {}}
        for site, (lat, lon) in hindcast.SITES.items():
            archive["points"][site] = hindcast.extract(
                sample_point(blobs, lat, lon), product=product,
                site_id=site, source_url=url,
                sha256=hashlib.sha256(b"".join(blobs[x] for x in ("temperature", "u", "v"))).hexdigest())
        products.append(archive)
    records = [point for product in products for point in product["points"].values()]
    return {"schema": "shorefeel.noaa-real-hindcast-pull.v1",
            "sourceDate": f"{day[:4]}-{day[4:6]}-{day[6:8]}",
            "cycleUTC": f"{cycle:02d}:00",
            "modelSources": products,
            "archiveAudit": hindcast.audit(records),
            "offshoreStations": [read_ndbc("SBLM4"), read_ndbc("45163")],
            "fieldThermometersInstalled": False,
            "measuredBeachMinusInlandF": None,
            "calibratedBeachAirEstimateF": None,
            "calibrationAuthorized": False,
            "publicationAuthorized": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", default="20261119")
    parser.add_argument("--cycle", type=int, default=12)
    parser.add_argument("--lead", type=int, default=1)
    args = parser.parse_args()
    try:
        dt.datetime.strptime(args.date, "%Y%m%d")
        if not 0 <= args.cycle <= 23 or not 1 <= args.lead <= 18:
            raise ValueError("Invalid cycle or lead")
        result = run(args.date, args.cycle, args.lead)
        print(json.dumps(result, indent=2, sort_keys=True))
    except Exception as exc:
        print(f"ShoreFeel NOAA real-data pull failed closed: {type(exc).__name__}: {exc}",
              file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
