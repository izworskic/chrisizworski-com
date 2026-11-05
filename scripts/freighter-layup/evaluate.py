#!/usr/bin/env python3
"""Source-body-checked winter-layup REVIEW triage, never vessel confirmation.

The original publisher's content is the review reference, *not* the output
of the Python shadow engine. Sample selection is nonrandom; no prospective
positive sample or independent blinded second-human adjudication yet.
Do not report population precision, recall, or calibration from these cases.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import date
import json
from pathlib import Path
from urllib.parse import urlsplit

from shadow import analyze, catalog, matching_keys, PHRASES

ROOT = Path(__file__).resolve().parents[2]
CASES = ROOT / "data/freighter-layup-shadow-adjudications.json"
LARGE = ROOT / "data/freighter-layup-source-checked-evaluation-2026.json"
ARCHIVE = ROOT / "public/assets/freighter-layup-registry.json"
FIELDS = ("trueReviewLeads", "missedReviewLeads",
          "correctlyIgnored", "unnecessaryReviewLeads")
HOSTS = {
    "duluth-cam": "www.duluthharborcam.com",
    "boatnerd-port-news": "www.boatnerd.com",
    "wmhs": "wmhs.org",
    "owen-museum": "waterfrontheritage.ca",
}
POSITIVE_BASES = {
    "publisher_documents_winter_berth",
    "end_of_season_winter_mooring",
    "winter_shipyard_context_for_investigation",
}
NEGATIVE_BASES = {
    "no_winter_berth_in_original_post",
    "active_trade_nonlayup_or_unverified_repair",
}


def count_bucket(truth: bool, predicted: bool) -> str:
    if predicted:
        return "trueReviewLeads" if truth else "unnecessaryReviewLeads"
    return "missedReviewLeads" if truth else "correctlyIgnored"


def audit(corpus: dict, archive: dict) -> dict:
    rows = corpus.get("cases")
    if corpus.get("schemaVersion") != 1 or not isinstance(rows, list):
        raise ValueError("Unsupported or missing reviewed-case corpus")
    large = corpus.get("status") == "RETROSPECTIVE_SOURCE_CHECKED_NOT_PROSPECTIVELY_CALIBRATED"
    counts = dict.fromkeys(FIELDS, 0)
    baseline_counts = dict.fromkeys(FIELDS, 0)
    by_season = defaultdict(lambda: {
        "reviewWorthy": 0, "notReviewWorthy": 0, "shadow": dict.fromkeys(FIELDS, 0),
        "simpleTitleBaseline": dict.fromkeys(FIELDS, 0),
    })
    source_totals = Counter()
    seen = set()
    misses, false_alerts = [], []
    aliases = catalog(archive)
    corpus_date = date.fromisoformat(corpus["sourceCheckedOn"]) if large else None
    if large:
        if corpus.get("publicationEnabled") is not False or corpus.get("notPopulationAccuracy") is not True:
            raise ValueError("Large corpus must explicitly prohibit publication and skill claims")
        if corpus.get("adjudicator", "").lower().find("not a blinded") == -1:
            raise ValueError("Missing explicit no-independent-second-reviewer disclosure")

    for row in rows:
        key = (row["season"], row["url"])
        if key in seen:
            raise ValueError("Duplicate adjudication: " + row["url"])
        seen.add(key)
        if not isinstance(row.get("editorialReviewRequired"), bool):
            raise ValueError("Every label needs explicit source-based review disposition")
        reviewed = date.fromisoformat(row.get("sourceCheckedOn") or corpus["sourceCheckedOn"])
        if not row.get("reviewBasis"):
            raise ValueError("Missing source-specific review rationale")
        if large and reviewed != corpus_date:
            raise ValueError("Review date does not match frozen corpus")
        published = date.fromisoformat(row["date"])
        if published > reviewed:
            raise ValueError("Future publication in adjudicated source record")
        year = int(row["season"].split("-")[0])
        if row["season"] != f"{year}-{(year + 1) % 100:02d}":
            raise ValueError("Mismatched season label")
        if large and not (date(year, 11, 1) <= published <= date(year + 1, 4, 30)):
            raise ValueError("Large source sample contains an out-of-winter report")
        url = urlsplit(row["url"])
        if url.scheme != "https" or not url.hostname:
            raise ValueError("Original report requires a valid HTTPS URL")
        if large:
            if row["sourceId"] not in HOSTS or url.hostname != HOSTS[row["sourceId"]]:
                raise ValueError("Original report does not match its publisher host")
            if row.get("verificationMethod") not in {
                "original_publisher_month_archive_full_text_review",
                "publisher_page_200_firstparty_content",
                "original_publisher_article_web_text_review",
            }:
                raise ValueError("No valid original-publisher verification path")
            label = row["editorialReviewRequired"]
            if (label and row["reviewBasis"] not in POSITIVE_BASES) or (
                    not label and row["reviewBasis"] not in NEGATIVE_BASES):
                raise ValueError("Evidence basis conflicts with source adjudication")

        # Freeze observation as *hypothetically ignored by Node*.
        # This evaluates headline triage recall, NOT actual production Node misses.
        asof_day = min(date(year + 1, 10, 31), reviewed)
        report = analyze({
            "schemaVersion": 1,
            "season": row["season"],
            "observations": [{
                "url": row["url"], "title": row["title"], "date": row["date"],
                "sourceId": row["sourceId"], "sourceClass": row["sourceClass"],
                "publisher": row["sourceId"], "decision": "not_layup",
                "vesselKey": None, "harborId": None, "kind": None,
            }],
            "sources": [{"source": row["sourceId"], "ok": True, "feedState": "dated"}],
        }, archive, {"schemaVersion": 1, "season": row["season"], "events": []},
            asof_day.isoformat() + "T23:59:59Z")
        found = report["flaggedObservations"] > 0
        naive = bool(PHRASES.search(row["title"]) and
                     matching_keys(row["title"], aliases) and
                     date(year, 11, 1) <= published <= min(date(year + 1, 10, 31), reviewed))
        truth = row["editorialReviewRequired"]
        group = by_season[row["season"]]
        group["reviewWorthy" if truth else "notReviewWorthy"] += 1
        for predicted, overall, segment in [
            (found, counts, group["shadow"]),
            (naive, baseline_counts, group["simpleTitleBaseline"]),
        ]:
            field = count_bucket(truth, predicted)
            overall[field] += 1
            segment[field] += 1
        source_totals[row["sourceId"]] += 1
        if truth and not found:
            misses.append({"title": row["title"], "url": row["url"],
                           "season": row["season"],
                           "why": "Headline-only shadow missed a source-backed review lead"})
        if not truth and found:
            false_alerts.append({"title": row["title"], "url": row["url"],
                                 "season": row["season"]})
    n = len(seen)
    positives = counts["trueReviewLeads"] + counts["missedReviewLeads"]
    negatives = counts["correctlyIgnored"] + counts["unnecessaryReviewLeads"]
    live = by_season.get("2026-27")
    current_has_positives = bool(live and live["reviewWorthy"])
    return {
        "schemaVersion": 2 if large else 1,
        "status": "RETROSPECTIVE_SOURCE_CHECKED_NOT_PROSPECTIVELY_CALIBRATED"
            if large else "EXPLORATORY_NOT_CALIBRATED",
        "purpose": "Review-worthy article selection, never confirmed ship location",
        "reviewedCases": n,
        "sourceSupportedReviewLeads": positives,
        "sourceSupportedNonLeads": negatives,
        "publisherSourceCounts": dict(sorted(source_totals.items())),
        "bySeason": {k: by_season[k] for k in sorted(by_season)},
        "shadow": counts, "simpleTitleBaseline": baseline_counts,
        "misses": misses, "falseAlerts": false_alerts,
        "retrospectiveSampleSizeThresholdMet": large and n >= 40 and positives >= 10 and negatives >= 10,
        "currentSeasonPositiveEvidenceAvailable": current_has_positives,
        "prospectiveCurrentSeasonCalibrationCompleted": False,
        "limitations": ("Publisher body or archive verified separately from classifier output, "
                        "but deliberately selected, nonrandom samples and no blinded second "
                        "reviewer. The 2026-27 early-season set contains no positive layup "
                        "dispositions; current-season recall and population precision, "
                        "recall, specificity, confidence calibration, and field skill "
                        "cannot be established from these records."),
        "publicationEnabled": False,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", type=Path, default=CASES)
    ap.add_argument("--archive", type=Path, default=ARCHIVE)
    ap.add_argument("--output", type=Path)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--require-large-sample", action="store_true")
    args = ap.parse_args()
    report = audit(json.loads(args.cases.read_text(encoding="utf-8")),
                   json.loads(args.archive.read_text(encoding="utf-8")))
    if args.check:
        if args.require_large_sample:
            if not report["retrospectiveSampleSizeThresholdMet"]:
                raise SystemExit("At least 40 original-source rows, 10 positive and 10 negative are required")
            if len(report["publisherSourceCounts"]) < 3 or len(report["bySeason"]) < 3:
                raise SystemExit("Source and season diversity gate failed")
            if report["bySeason"].get("2026-27", {}).get("notReviewWorthy", 0) < 10:
                raise SystemExit("Current early-winter negative-control coverage insufficient")
        else:
            if report["reviewedCases"] < 12 or report["shadow"]["trueReviewLeads"] < 5:
                raise SystemExit("Original small retrospective review regression")
            if report["shadow"]["unnecessaryReviewLeads"] != 0:
                raise SystemExit("Unexpected incorrect alert in old curated examples")
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"], "reviewed": report["reviewedCases"],
        "positiveCases": report["sourceSupportedReviewLeads"],
        "negativeCases": report["sourceSupportedNonLeads"],
        "shadow": report["shadow"], "baseline": report["simpleTitleBaseline"],
        "retrospectiveSampleSizeThresholdMet": report["retrospectiveSampleSizeThresholdMet"],
        "prospectiveCurrentSeasonCalibrationCompleted": False,
        "publicationEnabled": False,
    }))


if __name__ == "__main__":
    main()
