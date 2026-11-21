#!/usr/bin/env python3
"""Offline co-location quality gate for two prospective ShoreFeel air loggers.

A passing bench result only shows two instruments agree with each other under
one shared exposure. It does not establish absolute accuracy, site permission,
deployed on-sand readings, or validated shoreline prediction.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import statistics
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("shorefeel_pair", BASE / "shorefeel-field-pair.py")
PAIR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PAIR)
SCHEMA = "shorefeel.field-logger-bench.v1"
MAX_GAP = timedelta(minutes=2)
LOCAL = ZoneInfo("America/Detroit")


def stamp(t):
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def date_only(s):
    return datetime.strptime(s, "%Y-%m-%d").date()


def is_real(x, lo, hi):
    return type(x) in (int, float) and math.isfinite(x) and lo <= x <= hi


def manifest_ok(manifest, now):
    if not isinstance(manifest, dict) or manifest.get("schema") != SCHEMA:
        raise ValueError("Require shorefeel.field-logger-bench.v1 manifest")
    if (manifest.get("coLocatedSameExposure") is not True or
            manifest.get("benchSitePermissionDocumented") is not True or
            not is_real(manifest.get("distanceBetweenSensorsM"), 0, 2)):
        raise ValueError("Bench must document permission and a shared exposure within 2 m")
    devices = manifest.get("devices")
    if not isinstance(devices, list) or len(devices) != 2:
        raise ValueError("Require exactly two distinct instrument metadata records")
    ids = []
    for d in devices:
        if not isinstance(d, dict):
            raise ValueError("Invalid instrument")
        station = d.get("stationId")
        if not isinstance(station, str) or len(station.strip()) < 3:
            raise ValueError("Missing local instrument ID")
        if (d.get("radiationShielded") is not True or
                d.get("sameLoggerModelAsPartner") is not True or
                not is_real(d.get("sensorHeightM"), 1, 4)):
            raise ValueError("Both instruments require same-model shielded siting")
        try:
            cal = date_only(d["calibratedOn"])
        except (KeyError, ValueError, TypeError):
            raise ValueError("Dated sensor calibration metadata required") from None
        if cal > now.date():
            raise ValueError("Calibration date is in the future")
        ids.append(station)
    if ids[0] == ids[1]:
        raise ValueError("Co-location needs two separate instruments")
    return ids


def percentile_abs(vals, p):
    ordered = sorted(abs(v) for v in vals)
    index = math.ceil(p*len(ordered))-1
    return ordered[max(0, min(index, len(ordered)-1))]


def pairs(a, b):
    used = set()
    matched = []
    for at, av in sorted(a.items()):
        picks = [(abs((at - bt).total_seconds()), bt, bv)
                 for bt, bv in b.items() if bt not in used and abs(at-bt) <= MAX_GAP]
        if not picks:
            continue
        seconds, bt, bv = min(picks, key=lambda x: (x[0], x[1]))
        used.add(bt)
        matched.append((at, (av-bv)*1.8, seconds))
    return matched


def audit(manifest, log_a, log_b, now=None):
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None or now.utcoffset() != timedelta(0):
        raise ValueError("Evaluation time must be UTC")
    manifest_ok(manifest, now)
    series_a, bad_a = PAIR.read_log(log_a, now)
    series_b, bad_b = PAIR.read_log(log_b, now)
    combined = pairs(series_a, series_b)
    diffs = [x[1] for x in combined]
    n = len(diffs)
    duration = (combined[-1][0]-combined[0][0]).total_seconds()/3600 if n>1 else 0
    daytime = sum(1 for at, *_ in combined if 9 <= at.astimezone(LOCAL).hour < 17)
    nighttime = sum(1 for at, *_ in combined if
                    at.astimezone(LOCAL).hour < 6 or at.astimezone(LOCAL).hour >= 20)
    mean = statistics.fmean(diffs) if n else None
    mae = statistics.fmean(abs(x) for x in diffs) if n else None
    p95 = percentile_abs(diffs, .95) if n else None
    first_half = [x[1] for x in combined if x[0] <= combined[0][0]+
                  (combined[-1][0]-combined[0][0])/2] if n else []
    second_half = [x[1] for x in combined if x[0] > combined[0][0]+
                   (combined[-1][0]-combined[0][0])/2] if n else []
    drift = (abs(statistics.fmean(first_half)-statistics.fmean(second_half))
             if first_half and second_half else None)
    checks = {
        "pairedSamples200": n >= 200,
        "full24HourSpan": duration >= 24,
        "bothDayAndNight": daytime >= 30 and nighttime >= 30,
        "meanBiasAtMost0_75F": mean is not None and abs(mean) <= .75,
        "maeAtMost1F": mae is not None and mae <= 1,
        "p95AbsoluteDifferenceAtMost2F": p95 is not None and p95 <= 2,
        "halfToHalfBiasDriftAtMost0_75F": drift is not None and drift <= .75,
        "noRejectionOrDuplicateConflict": all(
            sum(v.values()) == 0 for v in (bad_a, bad_b))
    }
    ready = all(checks.values())
    return {
        "schema": "shorefeel.logger-bench-audit.v1",
        "status": "BENCH_AGREEMENT_FOR_REVIEW" if ready else "BENCH_INSUFFICIENT_OR_DISAGREES",
        "source": "local unverified co-located logger CSV files",
        "coverage": {
            "validFirstLogger": len(series_a), "validSecondLogger": len(series_b),
            "paired": n, "spanHours": round(duration, 2),
            "daytimePairs": daytime, "nighttimePairs": nighttime,
            "rejected": {"first": bad_a, "second": bad_b}
        },
        "differences": {
            "meanFirstMinusSecondF": round(mean, 3) if mean is not None else None,
            "maeF": round(mae, 3) if mae is not None else None,
            "p95AbsoluteF": round(p95, 3) if p95 is not None else None,
            "halfToHalfBiasDriftF": round(drift, 3) if drift is not None else None
        },
        "checks": checks,
        "absoluteAccuracyCertified": False,
        "fieldSitingVerified": False,
        "landManagerPermissionVerified": False,
        "deploymentApproved": False,
        "automaticBiasCorrection": False,
        "publicationAuthorized": False,
        "interpretation": ("Bench comparison only; relative agreement does not certify absolute "
                           "temperature accuracy or a lake-air gradient. Instrument metadata "
                           "and permissions remain self-reported until independently verified.")
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--manifest", required=True, type=Path)
    p.add_argument("--first-csv", required=True, type=Path)
    p.add_argument("--second-csv", required=True, type=Path)
    args = p.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text())
        with args.first_csv.open(newline="") as a, args.second_csv.open(newline="") as b:
            result = audit(manifest, a, b)
        print(json.dumps(result, indent=2, sort_keys=True))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print("ShoreFeel logger preflight rejected: " + str(exc), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
