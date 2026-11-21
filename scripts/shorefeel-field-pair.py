#!/usr/bin/env python3
"""Pair independently logged beach and inland air sensors for ShoreFeel research.

Read private local files only. Never uploads station data or publishes calibration.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


def utc_time(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("Records must have unambiguous UTC Z timestamps")
    return datetime.fromisoformat(value[:-1] + "+00:00")


def station_valid(meta, role):
    try:
        if meta["role"] != role or meta["temperature_unit"] != "C":
            return False
        if meta["permission_documented"] is not True or meta["radiation_shielded"] is not True:
            return False
        if not 1 <= float(meta["sensor_height_m"]) <= 4:
            return False
        d = float(meta["distance_to_shore_m"])
        if role == "beach" and not 0 <= d <= 200:
            return False
        if role == "inland" and not 200 <= d <= 5000:
            return False
        lat, lon = float(meta["lat"]), float(meta["lon"])
        if not (40 <= lat <= 47 and -89 <= lon <= -80):
            return False
        datetime.strptime(meta["calibrated_on"], "%Y-%m-%d")
        return isinstance(meta["station_id"], str) and len(meta["station_id"].strip()) > 2
    except (KeyError, ValueError, TypeError):
        return False


def read_log(lines, now):
    required = {"observed_at_utc", "temperature_c", "quality_flag"}
    reader = csv.DictReader(lines)
    if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
        raise ValueError("Logger CSV requires observed_at_utc, temperature_c, quality_flag")
    accepted, seen = {}, {}
    rejected = {"invalid": 0, "future": 0, "flagged": 0, "duplicate": 0, "conflict": 0}
    for row in reader:
        if row["quality_flag"] != "valid":
            rejected["flagged"] += 1
            continue
        try:
            at = utc_time(row["observed_at_utc"])
            c = float(row["temperature_c"])
            if not math.isfinite(c) or not -70 <= c <= 55:
                raise ValueError("Implausible dry-bulb air temperature")
        except (TypeError, ValueError, OverflowError):
            rejected["invalid"] += 1
            continue
        if at > now + timedelta(minutes=5):
            rejected["future"] += 1
            continue
        if at in seen:
            if abs(seen[at] - c) > 1e-9:
                accepted.pop(at, None)
                seen[at] = float("nan")
                rejected["conflict"] += 1
            else:
                rejected["duplicate"] += 1
            continue
        seen[at] = c
        accepted[at] = c
    return accepted, rejected


def pair(beach_rows, inland_rows, beach_meta, inland_meta, *, now=None):
    now = now or datetime.now(timezone.utc)
    if not station_valid(beach_meta, "beach") or not station_valid(inland_meta, "inland"):
        raise ValueError("Two separately documented, shielded and permissioned air loggers required")
    if beach_meta["station_id"] == inland_meta["station_id"]:
        raise ValueError("Beach and inland air must come from independent instruments")
    beach, bad_beach = read_log(beach_rows, now)
    inland, bad_inland = read_log(inland_rows, now)
    used, pairs = set(), []
    for observed_at, beach_c in sorted(beach.items()):
        candidates = [(abs((x - observed_at).total_seconds()), x) for x in inland
                      if x not in used and abs((x - observed_at).total_seconds()) <= 300]
        if not candidates:
            continue
        gap, matched = min(candidates)
        used.add(matched)
        inland_c = inland[matched]
        pairs.append({
            "beachAt": observed_at.isoformat().replace("+00:00", "Z"),
            "inlandAt": matched.isoformat().replace("+00:00", "Z"),
            "timeGapSeconds": int(gap),
            "beachAirF": round(beach_c * 9 / 5 + 32, 2),
            "inlandAirF": round(inland_c * 9 / 5 + 32, 2),
            "beachMinusInlandF": round((beach_c - inland_c) * 9 / 5, 2),
            "independentFieldObservation": True,
        })
    return {
        "schema": "shorefeel.paired-air-loggers.v1",
        "status": "UNVERIFIED_FIELD_METADATA",
        "beachStationId": beach_meta["station_id"],
        "inlandStationId": inland_meta["station_id"],
        "paired": len(pairs),
        "unpairedBeach": len(beach) - len(pairs),
        "unpairedInland": len(inland) - len(pairs),
        "rejected": {"beach": bad_beach, "inland": bad_inland},
        "records": pairs,
        "stationMetadataIndependentlyVerified": False,
        "modelSkillClaim": False,
        "calibrationAuthorized": False,
        "publicationAuthorized": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--beach-meta", type=Path, required=True)
    parser.add_argument("--inland-meta", type=Path, required=True)
    parser.add_argument("--beach-csv", type=Path, required=True)
    parser.add_argument("--inland-csv", type=Path, required=True)
    args = parser.parse_args()
    try:
        beach_meta = json.loads(args.beach_meta.read_text())
        inland_meta = json.loads(args.inland_meta.read_text())
        with args.beach_csv.open(newline="") as beach, args.inland_csv.open(newline="") as inland:
            report = pair(beach, inland, beach_meta, inland_meta)
        print(json.dumps(report, sort_keys=True, indent=2))
    except (ValueError, OSError, TypeError, KeyError) as exc:
        print(f"ShoreFeel field data rejected: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
