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
ARRIVE = re.compile(r"\b(?:arrive(?:s|d)?|arrival|docked|berthed|wintering|tied up)\b", re.I)
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
    start_year = int(inputs['season'][:4])
    winter_start, winter_end = date(start_year, 11, 1), date(start_year + 1, 10, 31)
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
        matches = matching_keys(title, aliases)
        winter_article = winter_start <= d <= min(winter_end, now)
        explicit_layup = bool(PHRASES.search(title))
        # A museum headline may say "arrives at Fincantieri" without the
        # words "winter layup", even when its cited article documents storage.
        # Surfacing it for review does NOT establish a layup.
        museum_winter_arrival = (
            item["sourceClass"] in {"maritime_historical_society", "local_maritime_museum"}
            and d.month in (12, 1, 2) and bool(ARRIVE.search(title)))
        winter_stay_headline = bool(re.search(
            r"\b(?:stays?|docks?|berthed)\b.*\b(?:for\s+)?winter\b", title, re.I))
        review_cue = explicit_layup or museum_winter_arrival or winter_stay_headline
        node_candidate = item["nodeDecision"] in ("accepted", "review")
        potentially_missed = winter_article and review_cue and bool(matches) and not node_candidate
        actionable = node_candidate or potentially_missed
        risks = []
        if actionable and len(matches) > 1:
            risks.append("multiple_known_vessels_in_headline")
        if actionable and item["vesselKey"] and matches and item["vesselKey"] not in matches:
            risks.append("node_identity_title_disagreement")
        if node_candidate and item["nodeDecision"] == "accepted" and not matches:
            risks.append("accepted_without_known_ship_in_headline")
        if potentially_missed:
            risks.append("potentially_missed_layup_headline")
        if actionable and item["kind"] == "arrival" and PLANNED.search(title):
            risks.append("planned_not_actual_arrival")
        if actionable and item["kind"] == "arrival" and DEPART.search(title) and not ARRIVE.search(title):
            risks.append("departure_title_classified_as_arrival")
        if actionable and d > now:
            risks.append("future_publication_date")
        if item["nodeDecision"] == "accepted" and not explicit_layup:
            risks.append("layup_not_explicit_in_headline")
        if actionable and not item["publisher"]:
            risks.append("source_publisher_missing")
        # Duplicate URLs from overlapping feeds are not evidence conflicts.
        seen_urls[url] = seen_urls.get(url, 0) + 1
        item["inAuditedWinter"] = winter_article
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
    ranked = sorted(eligible + at_risk,
                    key=lambda x: (-x["reviewPriority"], x["date"], x["url"]))
    prioritized = list({x["url"]: x for x in reversed(ranked)}.values())
    prioritized.sort(key=lambda x: (-x["reviewPriority"], x["date"], x["url"]))
    ledger_urls = {e.get("source", {}).get("url")
                   for e in ledger.get("events", []) if isinstance(e, dict)}
    for item in prioritized:
        item["alreadyInLedger"] = any(same_url(item["url"], u) for u in ledger_urls if u)
        item["recommendedAction"] = (
            "Investigate contradictory or ambiguous evidence" if item["risks"] else
            "Inspect existing review candidate" if item["nodeDecision"] == "review" else
            "Compare accepted Node result against source and current ledger")
    dated = sum(x.get("feedState") == "dated" for x in source_outcomes)
    empty = sum(x.get("feedState") == "empty" for x in source_outcomes)
    undated = sum(x.get("feedState") == "undated" for x in source_outcomes)
    reachable = outcomes.get("OK", 0)
    status = ("UNAVAILABLE" if not reachable else
              "PARTIAL" if outcomes.get("FAILED") or empty or undated else
              "AVAILABLE")
    return {
        "schemaVersion": 1, "mode": "SHADOW_ONLY", "status": status,
        "runAsOf": as_of, "season": inputs["season"], "publicationEnabled": False,
        "dataSource": "existing Node maritime feed scanner metadata only",
        "sourceCoverage": {"ok": reachable, "failed": outcomes.get("FAILED", 0),
                           "datedFeeds": dated, "emptyFeeds": empty,
                           "undatedFeeds": undated, "catalogTotal": len(source_outcomes)},
        "sourceFreshness": [{"sourceId": str(x.get("source") or ""),
                             "feedState": str(x.get("feedState") or "unavailable"),
                             "latestArticleDate": x.get("latestArticleDate"),
                             "latestAgeDays": x.get("latestAgeDays")}
                            for x in source_outcomes],
        "duplicateArticleRows": len(analyzed) - len(seen_urls),
        "uniqueSourceURLs": len(seen_urls),
        "outOfSeasonObservations": sum(not x["inAuditedWinter"] for x in analyzed),
        "failedSources": [{"sourceId": str(x.get("source") or ""),
                           "error": str(x.get("error") or "Unavailable")[:100]}
                          for x in source_outcomes if not x.get("ok")],
        "observedArticles": len(rows), "validObservations": len(analyzed),
        "existingNodeAccepted": sum(x["nodeDecision"] == "accepted" for x in analyzed),
        "existingNodeReview": sum(x["nodeDecision"] == "review" for x in analyzed),
        "flaggedObservations": len(at_risk), "anomalyCount": len(issues),
        "unknownIsNotZero": True,
        "interpretation": ("A non-publishing audit of dated source metadata. Duplicate "
                           "links count as feed overlap; old-season headlines are not "
                           "current layup leads. Review priorities are never probabilities, "
                           "confirmed arrivals, vessel positions or fleet counts."),
        # Case-scoped metadata only. The seven-day CI artifact is not public,
        # and contains no full article bodies, photos, AIS or user data.
        "evaluationSample": [
            {"url": x["url"], "title": x["title"], "sourceId": x["sourceId"],
             "date": x["date"], "inAuditedWinter": x["inAuditedWinter"],
             "needsShadowReview": bool(x["risks"])}
            for x in analyzed[:2000]],
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
