#!/usr/bin/env python3
"""Source-adjudicated retrospective review triage check (NOT a layup forecast).

These hand-checked examples are selected, not a random or independent
production sample. Counts are useful regression gates but do NOT establish
population precision, recall, current-season detection skill or ship status.
"""
from __future__ import annotations

import argparse
from datetime import date
import json
from pathlib import Path

from shadow import analyze, catalog, matching_keys, PHRASES

ROOT = Path(__file__).resolve().parents[2]
CASES = ROOT / "data/freighter-layup-shadow-adjudications.json"
ARCHIVE = ROOT / "public/assets/freighter-layup-registry.json"


def audit(corpus: dict, archive: dict) -> dict:
    if corpus.get("schemaVersion") != 1 or not isinstance(corpus.get("cases"), list):
        raise ValueError("Unsupported or missing reviewed-case corpus")
    counts = {"trueReviewLeads": 0, "missedReviewLeads": 0,
              "correctlyIgnored": 0, "unnecessaryReviewLeads": 0}
    naive = {"trueReviewLeads": 0, "missedReviewLeads": 0,
             "correctlyIgnored": 0, "unnecessaryReviewLeads": 0}
    seen = set()
    misses, false_alerts = [], []
    aliases = catalog(archive)
    for row in corpus["cases"]:
        key = (row["season"], row["url"])
        if key in seen:
            raise ValueError("Duplicate adjudication: " + row["url"])
        seen.add(key)
        if not isinstance(row.get("editorialReviewRequired"), bool):
            raise ValueError("Every label must have an explicit source-based editorial outcome")
        if not row.get("reviewBasis") or not row.get("sourceCheckedOn"):
            raise ValueError("Review rationale and review date are required")
        pub = date.fromisoformat(row["date"])
        yr = int(row["season"].split("-")[0])
        if not date(yr, 11, 1) <= pub <= date(yr + 1, 10, 31):
            # A deliberately off-season decoy must be represented as evidence
            # but never treated as current season for this retrospective check.
            pass
        asof = f"{yr + 1}-10-31T23:59:59Z"
        report = analyze({
            "schemaVersion": 1,
            "season": row["season"],
            "observations": [{
                "url": row["url"], "title": row["title"], "date": row["date"],
                "sourceId": row["sourceId"], "sourceClass": row["sourceClass"],
                "publisher": row["sourceId"],
                "decision": "not_layup", "vesselKey": None,
                "harborId": None, "kind": None,
            }],
            "sources": [{"source": row["sourceId"], "ok": True, "feedState": "dated"}],
        }, archive, {"schemaVersion": 1, "season": row["season"], "events": []}, asof)
        found = report["flaggedObservations"] > 0
        baseline = bool(PHRASES.search(row["title"]) and
                        matching_keys(row["title"], aliases) and
                        date(yr, 11, 1) <= pub <= date(yr + 1, 10, 31))
        truth = row["editorialReviewRequired"]
        def bucket(predicted: bool) -> str:
            return ("trueReviewLeads" if truth else "unnecessaryReviewLeads") if predicted else (
                "missedReviewLeads" if truth else "correctlyIgnored")
        counts[bucket(found)] += 1
        naive[bucket(baseline)] += 1
        if truth and not found:
            misses.append({"title": row["title"], "url": row["url"],
                           "why": "Headline-only triage did not identify an otherwise source-supported lead"})
        if not truth and found:
            false_alerts.append({"title": row["title"], "url": row["url"]})
    n = len(seen)
    return {
        "schemaVersion": 1, "status": "EXPLORATORY_NOT_CALIBRATED",
        "purpose": "Review-worthy article selection, never vessel layup confirmation",
        "reviewedCases": n,
        "sourceSupportedReviewLeads": counts["trueReviewLeads"] + counts["missedReviewLeads"],
        "sourceSupportedNonLeads": counts["correctlyIgnored"] + counts["unnecessaryReviewLeads"],
        "shadow": counts, "simpleTitleBaseline": naive,
        "misses": misses, "falseAlerts": false_alerts,
        "limitations": ("Small, deliberately selected retrospective examples across multiple winters; "
                        "hypothetically treated as missed by Node, not actual production decisions. "
                        "Source checks are heterogeneous. No randomly sampled independently adjudicated "
                        "current-winter corpus, so population precision, recall and calibration are NOT available."),
        "publicationEnabled": False,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", type=Path, default=CASES)
    ap.add_argument("--archive", type=Path, default=ARCHIVE)
    ap.add_argument("--output", type=Path)
    ap.add_argument("--check", action="store_true",
                    help="Require regression counts only; never claim statistically validated accuracy")
    args = ap.parse_args()
    report = audit(json.loads(args.cases.read_text(encoding="utf-8")),
                   json.loads(args.archive.read_text(encoding="utf-8")))
    if args.check:
        if report["reviewedCases"] < 12 or report["shadow"]["trueReviewLeads"] < 5:
            raise SystemExit("Shadow review lead regression in source-checked retrospective cases")
        if report["shadow"]["unnecessaryReviewLeads"] != 0:
            raise SystemExit("Unexpected irrelevant current-season lead in reviewed cases")
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "reviewed": report["reviewedCases"],
                      "shadow": report["shadow"], "baseline": report["simpleTitleBaseline"],
                      "publicationEnabled": False}))


if __name__ == "__main__":
    main()
