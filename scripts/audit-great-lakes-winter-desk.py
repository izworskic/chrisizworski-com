#!/usr/bin/env python3
"""Offline evidence and licensing audit for the three-place Lake Superior preview.

Why Python: independently reconcile the editorial source register, photo rights and
strict allowlists before the browser can render. This is not an access checker.
Weather logic stays in small, testable JavaScript. No API, Redis or prediction.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import pathlib
import subprocess
import sys
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
CORE = ROOT / "previews/great-lakes-winter-desk/core.js"
SOURCE_HOSTS = {"www.nps.gov", "nps.gov", "www.dnr.state.mn.us"}
PHOTO_HOSTS = {"www.nps.gov", "thumb.wikimedia.org"}
CREDIT_LICENSES = ("National Park Service", "CC BY-SA 4.0")
MAX_REVIEW_DAYS = 90

def extract() -> dict:
    js = (
        "const x=require(process.argv[1]);"
        "process.stdout.write(JSON.stringify({places:x.PLACES,review:x.SOURCE_REVIEWED}));"
    )
    output = subprocess.run(
        ["node", "-e", js, str(CORE)],
        check=True, cwd=ROOT, capture_output=True, text=True, timeout=10
    )
    return json.loads(output.stdout)

def audit(payload: dict, today: dt.date) -> dict:
    issues = []
    places = payload.get("places") or []
    try:
        reviewed = dt.date.fromisoformat(payload["review"])
        age = (today - reviewed).days
        if age < 0 or age > MAX_REVIEW_DAYS:
            issues.append(f"source review outside 0..{MAX_REVIEW_DAYS} days: {age}")
    except (ValueError, KeyError, TypeError) as exc:
        reviewed, age = None, None
        issues.append(f"invalid review date: {exc}")
    if len(places) != 3:
        issues.append("pilot must have exactly three independent land outings")
    ids = set()
    goals = set()
    for p in places:
        ident = p.get("id", "")
        if not ident or ident in ids:
            issues.append(f"duplicate or missing outing id: {ident!r}")
        ids.add(ident)
        goals.add(p.get("goal"))
        for field in ("official", "conditions", "entrance"):
            url = p.get(field, "")
            if urlparse(url).scheme != "https" or urlparse(url).hostname not in SOURCE_HOSTS:
                issues.append(f"{ident}: invalid official source {field}")
        url = p.get("google", "")
        if not url.startswith("https://www.google.com/maps/search/?api=1&query="):
            issues.append(f"{ident}: maps link must be place search, not directions")
        photo = p.get("photo", "")
        if urlparse(photo).hostname not in PHOTO_HOSTS:
            issues.append(f"{ident}: photo origin unapproved")
        if not any(s in p.get("photoCredit", "") for s in CREDIT_LICENSES):
            issues.append(f"{ident}: exact photo attribution/license absent")
        if not p.get("photoPage", "").startswith("https://"):
            issues.append(f"{ident}: photo source page missing")
        if not p.get("photoAlt") or not p.get("photoNote"):
            issues.append(f"{ident}: photo alt and archival/date note required")
        if p.get("effort") not in p.get("supported", []):
            issues.append(f"{ident}: default outing effort incompatible")
        if not (-90 <= p.get("lon", -999) <= -80 and 40 <= p.get("lat", -999) <= 50):
            issues.append(f"{ident}: mapped coordinates outside intended Great Lakes pilot")
    if goals != {"falls", "snowshoe", "coast"}:
        issues.append(f"pilot goals not independently covered: {sorted(str(x) for x in goals)}")
    return {
        "audit": "great-lakes-winter-desk-evidence-v1",
        "checkedOn": today.isoformat(),
        "editorialReview": reviewed.isoformat() if reviewed else None,
        "reviewAgeDays": age,
        "coverage": {"outings": len(places), "goals": len(goals)},
        "officialAccess": "NOT VERIFIED for a future visit; audit is offline",
        "photoBytes": "NOT CHECKED; requires browser",
        "status": "PASS" if not issues else "FAIL",
        "issues": issues
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="override audit date for deterministic tests (YYYY-MM-DD)")
    parser.add_argument("--check", action="store_true", help="exit nonzero on failure")
    args = parser.parse_args()
    today = dt.date.fromisoformat(args.date) if args.date else dt.date.today()
    result = audit(extract(), today)
    print(json.dumps(result, indent=2))
    if args.check and result["status"] != "PASS":
        sys.exit(1)

if __name__ == "__main__":
    main()
