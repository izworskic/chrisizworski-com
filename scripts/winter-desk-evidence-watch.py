#!/usr/bin/env python3
"""Great Lakes winter desk source-watch coordinator, independent of publication.

Runs the two bounded official-source collectors, checks their provenance and
freshness and writes an auditable, temporary artifact bundle. Never copies data
to the website, updates a route access assertion or pushes to main.
"""
from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
BASE = ROOT / "previews/great-lakes-winter-desk"
SOURCES = "source-checks.json"
NOTICES = "operator-notice-monitor.json"
REPORT = "monitor-report.json"
EXPECTED = ("gooseberry-upper", "munising-snowshoe", "meyers-lakeshore")
MAX_AGE_HOURS = 3


def load_module(filename: str, label: str):
    spec = importlib.util.spec_from_file_location(label, SCRIPTS / filename)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {filename}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def parse_stamp(value):
    if not isinstance(value, str):
        return None
    try:
        stamp = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        return stamp if stamp.tzinfo else None
    except ValueError:
        return None


def evaluate(sources, notices, now=None):
    """Return a neutral monitoring report, never an open/closed visitor verdict."""
    now = now or dt.datetime.now(dt.timezone.utc)
    if now.tzinfo is None:
        raise ValueError("Source monitoring requires an aware UTC time")
    source_reader = load_module("refresh-winter-desk-sources.py", "winter_sources")
    notice_reader = load_module("refresh-winter-desk-operator-notices.py", "winter_notices")
    errors = []
    if not source_reader.valid(sources):
        errors.append("source-check contract invalid")
    if not notice_reader.validate(notices):
        errors.append("operator-notice contract invalid")

    condition_states = {}
    notice_states = {}
    for route_id in EXPECTED:
        s = sources.get("places", {}).get(route_id, {})
        n = notices.get("places", {}).get(route_id, {})
        condition_states[route_id] = s.get("reachability", "UNAVAILABLE")
        notice_states[route_id] = n.get("state", "UNAVAILABLE")
        for kind, record in (("conditions", s), ("notice", n)):
            checked_at = parse_stamp(record.get("retrievedAt" if kind == "conditions" else "checkedAt"))
            if checked_at is None:
                errors.append(f"{route_id} {kind}: missing timezone-aware source time")
                continue
            age = (now - checked_at).total_seconds() / 3600
            if age < -0.1 or age > MAX_AGE_HOURS:
                errors.append(f"{route_id} {kind}: timestamp outside monitor window")
            if record.get("operatorAccess") != "NOT_DETERMINED":
                errors.append(f"{route_id} {kind}: unexpected operator access assertion")

    missing = sorted({
        route for route in EXPECTED
        if condition_states[route] != "REACHED" or notice_states[route] != "MATCHED"
    })
    if missing or errors:
        severity = "REVIEW_REQUIRED"
    else:
        severity = "SOURCE_SIGNALS_PRESENT"

    return {
        "schemaVersion": 1,
        "checkedAt": now.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "state": severity,
        "requiresReview": severity != "SOURCE_SIGNALS_PRESENT",
        "accessVerified": False,
        "mayPublishAccessClaim": False,
        "meaning": "Automated public webpage checks only. No day-specific trail access, road plowing or ice safety has been verified.",
        "routes": [
            {
                "routeId": route,
                "conditions": condition_states[route],
                "operatorStatement": notice_states[route],
                "noticeScope": notices.get("places", {}).get(route, {}).get("scope"),
                "needsReview": route in missing,
            }
            for route in EXPECTED
        ],
        "errors": errors,
    }


def run_command(args):
    subprocess.run(args, check=True, cwd=ROOT, timeout=90, capture_output=True, text=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="fetch official sources, do not alter tracked files")
    parser.add_argument("--sources", type=pathlib.Path, help="offline source snapshot")
    parser.add_argument("--notices", type=pathlib.Path, help="offline notice snapshot")
    parser.add_argument("--out-dir", type=pathlib.Path, required=True)
    args = parser.parse_args()
    if args.live and (args.sources or args.notices):
        parser.error("choose either --live or both offline snapshot paths")
    if not args.live and (not args.sources or not args.notices):
        parser.error("offline monitoring requires --sources and --notices")

    output = args.out_dir.resolve()
    if output == BASE.resolve():
        parser.error("monitor artifacts must not overwrite the website source directory")
    output.mkdir(parents=True, exist_ok=True)

    try:
        if args.live:
            with tempfile.TemporaryDirectory(prefix="winter-desk-watch-") as temp:
                temporary = pathlib.Path(temp)
                source_path = temporary / SOURCES
                notice_path = temporary / NOTICES
                run_command([sys.executable, str(SCRIPTS / "refresh-winter-desk-sources.py"), "--output", str(source_path)])
                run_command([sys.executable, str(SCRIPTS / "refresh-winter-desk-operator-notices.py"), "--output", str(notice_path)])
                sources = json.loads(source_path.read_text(encoding="utf-8"))
                notices = json.loads(notice_path.read_text(encoding="utf-8"))
                shutil.copy2(source_path, output / SOURCES)
                shutil.copy2(notice_path, output / NOTICES)
        else:
            sources = json.loads(args.sources.read_text(encoding="utf-8"))
            notices = json.loads(args.notices.read_text(encoding="utf-8"))
            shutil.copy2(args.sources, output / SOURCES)
            shutil.copy2(args.notices, output / NOTICES)
        report = evaluate(sources, notices)
    except (ValueError, OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired, json.JSONDecodeError) as exc:
        report = {
            "schemaVersion": 1,
            "checkedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "state": "MONITOR_ERROR",
            "requiresReview": True,
            "accessVerified": False,
            "mayPublishAccessClaim": False,
            "meaning": "Source watcher failed. The last-known evidence cannot imply current access.",
            "routes": [],
            "errors": [type(exc).__name__],
        }

    (output / REPORT).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "state": report["state"],
        "requiresReview": report["requiresReview"],
        "checkedAt": report["checkedAt"],
        "routes": [f"{r['routeId']}: {r['conditions']} / {r['operatorStatement']}" for r in report["routes"]],
        "errors": report["errors"],
        "artifactDirectory": str(output),
    }, indent=2))
    # Review-required is a valid monitoring outcome; corrupt/incomplete records
    # are retained as artifacts and flagged rather than claiming success.
    return 2 if report["state"] == "MONITOR_ERROR" else 0


if __name__ == "__main__":
    sys.exit(main())
