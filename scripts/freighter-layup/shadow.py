#!/usr/bin/env python3
"""Independent, NON-PUBLISHING QA of already-fetched layup feed classifications.

Never writes the current winter ledger, map, roster, predictions, or visitor content.
Reads metadata from the existing Node ingester; performs no web fetches or geocoding.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "public/assets/freighter-layup-registry.json"
LEDGER = ROOT / "public/assets/freighter-layup-live-season.json"
PHRASES = re.compile(r"\b(?:winter lay[\s-]*up|winter berth|wintering|wintered|spring departure)\b", re.I)
PLANNED = re.compile(r"\b(?:expected|expects|will arrive|scheduled|planning|plans to|due to arrive)\b", re.I)
DEPART = re.compile(r"\b(?:departed|departure|departing|leaves winter|returned? to service|returns? to service)\b", re.I)
ARRIVE = re.compile(r"\b(?:arrived|arrival|docked|berthed|wintering|tied up)\b", re.I)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(s or "").lower())).strip()


def date_safe(s: str) -> date | None:
    if not isinstance(s, str) or not DATE_RE.fullmatch(s):
        return None
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def same_url(a: str, b: str) -> bool:
    try:
        u, v = urlsplit(a), urlsplit(b)
        return (u.scheme, u.netloc.lower(), u.path.rstrip("/"), u.query) == (
            v.scheme, v.netloc.lower(), v.path.rstrip("/"), v.query)
    except (ValueError, TypeError):
        return False


def catalog(archive: dict) -> dict[str, set[str]]:
    aliases = defaultdict(set)
    for season in archive.get("seasons", []):
        for record in season.get("records", []):
            key = record.get("identity", {}).get("key")
            if not key:
                continue
            for name in [record.get("name"), *record.get("aliases", [])]:
                if len(norm(name)) > 4:
                    aliases[key].add(norm(name))
    return dict(aliases)


def matching_keys(title: str, aliases: dict[str, set[str]]) -> list[str]:
    text = f" {norm(title)} "
    return sorted(key for key, names in aliases.items()
                  if any(f" {name} " in text for name in names))


def analyze(inputs: dict, archive: dict, ledger: dict, as_of: str) -> dict:
    if inputs.get("schemaVersion") != 1:
        raise ValueError("Unsupported Node observation contract")
    if inputs.get("season") != ledger.get("season"):
        raise ValueError("Current season does not match the existing ledger")
    if not re.fullmatch(r"20\d{2}-\d{2}", str(inputs["season"])):
        raise ValueError("Invalid season")
    now = date_safe(as_of[:10])
    if now is None:
        raise ValueError("Invalid audit date")
    aliases = catalog(archive)
    rows = inputs.get("observations")
    if not isinstance(rows, list):
        raise ValueError("Missing observations")
    source_outcomes = inputs.get("sources", [])
    outcomes = Counter("OK" if s.get("ok") else "FAILED" for s in source_outcomes)
    issues = []
    analyzed = []
    seen_urls = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            issues.append({"type": "invalid_observation", "index": index})
            continue
        url, title = str(row.get("url") or ""), str(row.get("title") or "")[:190]
        d = date_safe(row.get("date"))
        try:
            parts = urlsplit(url)
            valid_url = parts.scheme == "https" and bool(parts.hostname)
        except ValueError:
            valid_url = False
        if not valid_url or d is None or not title.strip():
            issues.append({"type": "missing_source_or_date", "index": index})
            continue
        item = {
            "url": url, "sourceId": str(row.get("sourceId") or ""),
            "publisher": str(row.get("publisher") or ""),
            "sourceClass": str(row.get("sourceClass") or ""),
            "nodeDecision": str(row.get("decision") or "unknown"),
            "kind": row.get("kind") or None, "vesselKey": row.get("vesselKey") or None,
            "harborId": row.get("harborId") or None, "date": d.isoformat(),
            "title": title,
        }
        risks = []
        matches = matching_keys(title, aliases)
        if len(matches) > 1:
            risks.append("multiple_known_vessels_in_headline")
        if item["vesselKey"] and matches and item["vesselKey"] not in matches:
            risks.append("node_identity_title_disagreement")
        if item["nodeDecision"] == "accepted" and len(matches) == 0:
            risks.append("accepted_without_known_ship_in_headline")
        if (item["nodeDecision"] not in ("accepted", "review")
                and matches and PHRASES.search(title)):
            risks.append("potentially_missed_layup_headline")
        if item["kind"] == "arrival" and PLANNED.search(title):
            risks.append("planned_not_actual_arrival")
        if item["kind"] == "arrival" and DEPART.search(title) and not ARRIVE.search(title):
            risks.append("departure_title_classified_as_arrival")
        if d > now:
            risks.append("future_publication_date")
        if item["nodeDecision"] == "accepted" and not PHRASES.search(title):
            risks.append("layup_not_explicit_in_headline")
        if url in seen_urls:
            risks.append("duplicate_source_url")
        else:
            seen_urls[url] = index
        if item["nodeDecision"] in ("review", "accepted") and not item["publisher"]:
            risks.append("source_publisher_missing")
        # Triage only. Numeric rank is never a probability or confirmation.
        priority = min(100, 20 + (25 if item["nodeDecision"] == "review" else 0)
                       + (15 if matches else 0) + (10 if PHRASES.search(title) else 0)
                       + (10 if item["harborId"] else 0) + (15 if risks else 0))
        analyzed.append({**item, "headlineMatches": matches, "risks": risks,
                         "reviewPriority": priority, "publishEligible": False})

    # Same-ship contradictory messages are an investigation, not proof of a bad record.
    grouping = defaultdict(list)
    for item in analyzed:
        if item["vesselKey"] and item["nodeDecision"] == "accepted":
            grouping[(item["vesselKey"], item["date"])].append(item)
    for (key, day), group in grouping.items():
        harbors = {x["harborId"] for x in group if x["harborId"]}
        if len(harbors) > 1:
            for x in group:
                x["risks"].append("different_harbors_same_vessel_day")
                x["reviewPriority"] = 100
            issues.append({"type": "different_harbors_same_vessel_day",
                           "vesselKey": key, "date": day,
                           "sourceUrls": sorted({x["url"] for x in group})})
    eligible = [item for item in analyzed if item["nodeDecision"] in ("accepted", "review")]
    at_risk = [item for item in analyzed if item["risks"]]
    prioritized = sorted({x["url"]: x for x in eligible + at_risk}.values(),
                         key=lambda x: (-x["reviewPriority"], x["date"], x["url"]))
    ledger_urls = {e.get("source", {}).get("url")
                   for e in ledger.get("events", []) if isinstance(e, dict)}
    for item in prioritized:
        item["alreadyInLedger"] = any(same_url(item["url"], u) for u in ledger_urls if u)
        item["recommendedAction"] = (
            "Investigate contradictory or ambiguous evidence" if item["risks"] else
            "Inspect existing review candidate" if item["nodeDecision"] == "review" else
            "Compare accepted Node result against source and current ledger")
    status = ("UNAVAILABLE" if not source_outcomes else
              "PARTIAL" if outcomes.get("FAILED") else
              "AVAILABLE")
    return {
        "schemaVersion": 1, "mode": "SHADOW_ONLY", "status": status,
        "runAsOf": as_of, "season": inputs["season"], "publicationEnabled": False,
        "dataSource": "existing Node maritime feed scanner metadata only",
        "sourceCoverage": {"ok": outcomes.get("OK", 0), "failed": outcomes.get("FAILED", 0),
                           "catalogTotal": len(source_outcomes)},
        "observedArticles": len(rows), "validObservations": len(analyzed),
        "existingNodeAccepted": sum(x["nodeDecision"] == "accepted" for x in analyzed),
        "existingNodeReview": sum(x["nodeDecision"] == "review" for x in analyzed),
        "flaggedObservations": len(at_risk), "anomalyCount": len(issues),
        "unknownIsNotZero": True,
        "interpretation": ("A non-publishing audit of source-headline and Node-classification "
                           "consistency. Rankings are review priorities, not probabilities, "
                           "confirmed arrivals, ship positions, or fleet counts."),
        "anomalies": issues[:100], "cases": prioritized[:100],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--archive", type=Path, default=ARCHIVE)
    parser.add_argument("--ledger", type=Path, default=LEDGER)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--as-of", default=None)
    args = parser.parse_args()
    as_of = args.as_of or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    report = analyze(json.loads(args.input.read_text(encoding="utf-8")),
                     json.loads(args.archive.read_text(encoding="utf-8")),
                     json.loads(args.ledger.read_text(encoding="utf-8")), as_of)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "shadowOnly": True,
                      "validObservations": report["validObservations"],
                      "flaggedObservations": report["flaggedObservations"],
                      "sourceCoverage": report["sourceCoverage"]}))


if __name__ == "__main__":
    main()
