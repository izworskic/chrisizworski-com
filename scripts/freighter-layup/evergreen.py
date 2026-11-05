#!/usr/bin/env python3
"""Evergreen Great Lakes winter-layup publication cycle.

Called AFTER the existing Node source/evidence writer in the existing winter
watch workflow. Node remains the ONLY live-berth confirmation authority.

At a Detroit November 1 rollover, freeze completed dated source reports into
the historical registry, add an empty honest slot for the new winter, then
rebuild Python's crawlable history manifest. No future vessel location, AIS,
forecast, external request or user data is used. Idempotent on repeated scans.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, date, timezone
from pathlib import Path
import json
import re
from zoneinfo import ZoneInfo

from history import build_history, render, apply_markers, safe_url

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "public/assets/freighter-layup-registry.json"
LEDGER = ROOT / "public/assets/freighter-layup-live-season.json"
PAGE = ROOT / "public/great-lakes-freighter-winter-layup/index.html"
HISTORY = ROOT / "public/assets/freighter-layup-history.json"
SITEMAP = ROOT / "public/sitemap-winter.xml"
CANONICAL = "https://chrisizworski.com/great-lakes-freighter-winter-layup/"
SOURCE_CLASSES = {
    "port_authority", "operator", "operator_statement", "official_agency",
    "maritime_historical_society", "local_maritime_museum",
}
REPORT_CLASSES = SOURCE_CLASSES | {"journalistic_report", "community_report"}
SOURCE_EVENT_KINDS = {
    "arrival", "berth_change", "maintenance", "departure", "status_update",
}


def year_id(year: int) -> str:
    if not 2000 <= year < 2100:
        raise ValueError("Unexpected winter year (extend contract deliberately if needed)")
    return f"{year}-{(year + 1) % 100:02d}"


def parse_year(season: str) -> int:
    if not isinstance(season, str) or not re.fullmatch(r"20\d{2}-\d{2}", season):
        raise ValueError(f"Invalid winter identity: {season}")
    year = int(season[:4])
    if year_id(year) != season:
        raise ValueError(f"Year-pair mismatch: {season}")
    return year


def current_winter(now: datetime) -> str:
    local = now.astimezone(ZoneInfo("America/Detroit"))
    return year_id(local.year - int(local.month < 11))


def winter_label(season: str) -> str:
    parse_year(season)
    return f"Winter {season[:4]}–20{season[-2:]}"


def winter_day_is_valid(day: str, season: str) -> bool:
    try:
        d = date.fromisoformat(day)
        y = parse_year(season)
        return date(y, 11, 1) <= d <= date(y + 1, 10, 31)
    except (ValueError, TypeError):
        return False


def validate_past_events(past: dict, harbors: set[str]) -> list[dict]:
    season = past.get("season")
    parse_year(season)
    events = past.get("events")
    if not isinstance(events, list):
        raise ValueError("Historical season is missing events array")
    seen = set()
    out = []
    arrivals = set()
    for item in sorted(events, key=lambda x: (str(x.get("date")), str(x.get("id")))):
        identity = item.get("vessel") or {}
        source = item.get("source") or {}
        key = identity.get("key")
        kind = item.get("kind")
        dt = item.get("date")
        if (not isinstance(key, str) or not re.fullmatch(r"[a-z0-9-]{2,85}", key)
                or not identity.get("name")
                or item.get("harborId") not in harbors or kind not in SOURCE_EVENT_KINDS
                or not winter_day_is_valid(dt, season)
                or item.get("confidence") not in {"confirmed", "reported"}
                or source.get("class") not in REPORT_CLASSES
                or not safe_url(source.get("url", "")) or not source.get("publisher")
                or not item.get("summary")):
            raise ValueError(f"Invalid archival evidence in {season}: {key!r}")
        if item["confidence"] == "confirmed" and source["class"] not in SOURCE_CLASSES:
            raise ValueError(f"Cannot convert unverified source to confirmed: {key}")
        if kind != "arrival" and key not in arrivals:
            raise ValueError(f"Non-arrival without earlier same-winter arrival: {key}")
        if kind == "arrival":
            arrivals.add(key)
        identity_fingerprint = (key, kind, item["harborId"], dt, source["url"])
        if identity_fingerprint in seen:
            raise ValueError(f"Duplicate source event in {season}: {key}")
        seen.add(identity_fingerprint)
        out.append(item)
    return out


def records_from_events(past: dict, registry: dict) -> list[dict]:
    season = past["season"]
    harbors = {h["id"] for h in registry["harbors"]}
    events = validate_past_events(past, harbors)
    known = {}
    for old_season in registry["seasons"]:
        for record in old_season.get("records", []):
            known.setdefault(record["id"], record)
    grouped = {}
    for event in events:
        grouped.setdefault(event["vessel"]["key"], []).append(event)
    records = []
    for key, rows in sorted(grouped.items()):
        last = rows[-1]
        loc = next((x for x in reversed(rows) if x["kind"] in {"arrival", "berth_change"}), None)
        if loc is None:
            raise ValueError(f"Missing source-backed arrival in {season} for {key}")
        source = loc["source"]
        confirmed = (loc["confidence"] == "confirmed" and
                     source["class"] in SOURCE_CLASSES and loc["harborId"] == last["harborId"])
        reference = known.get(key)
        # Canonical hull identity may be reused; never infer an unknown IMO/MMSI.
        if reference and reference["name"] != last["vessel"]["name"]:
            # Names change; retain published identity and display the reviewed
            # name rather than silently merging or changing a historic hull.
            name = reference["name"]
        else:
            name = last["vessel"]["name"]
        record = {
            "id": key, "name": name,
            "aliases": reference.get("aliases", []) if reference else [],
            "identity": deepcopy(reference["identity"]) if reference else
                        {"key": key, "imo": None, "mmsi": None,
                         "matchPolicy": "dated_source_key_not_independently_verified"},
            "harborId": loc["harborId"],
            "berth": "Source-reported harbor — exact winter dock not verified",
            "berthPrecision": "berth_unverified",
            "status": "confirmed_historical" if confirmed else "reported_historical",
            "statusAsOf": last["date"],
            "evidenceClass": source["class"],
            "evidence": {
                "url": source["url"],
                "title": source.get("title") or "Dated winter berth report",
                "publisher": source["publisher"], "published": loc["date"],
            },
            "summary": ("Recorded winter reporting; historical source, not the vessel's "
                        "present position. Departure and changes remain visible in the timeline."),
            "events": [{
                "date": e["date"], "type": e["kind"], "text": e["summary"],
                "source": e["source"]["url"], "sourceClass": e["source"]["class"],
            } for e in rows],
            "storyFacts": reference.get("storyFacts", []) if reference else [],
            "photo": reference.get("photo") if reference else None,
        }
        records.append(record)
    return records


def synchronize(registry: dict, ledger: dict, now: datetime) -> dict:
    if registry.get("schemaVersion") != 2 or not isinstance(registry.get("seasons"), list):
        raise ValueError("Unsupported historical registry")
    if ledger.get("schemaVersion") != 1 or not isinstance(ledger.get("previousSeasons"), list):
        raise ValueError("Unsupported live ledger")
    actual = current_winter(now)
    if ledger.get("season") != actual:
        raise ValueError(f"Ledger season {ledger.get('season')} is not Detroit current {actual}; run Node rollover first")
    seasons = deepcopy(registry["seasons"])
    ids = [s["id"] for s in seasons]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate seasons in curated registry")
    seen_historical = set()
    for past in sorted(ledger["previousSeasons"], key=lambda s: s["season"]):
        prior_year = parse_year(past["season"])
        if prior_year >= parse_year(actual) or past["season"] in seen_historical:
            raise ValueError("Future or repeated archived winter in ledger")
        seen_historical.add(past["season"])
        idx = next((i for i, s in enumerate(seasons) if s["id"] == past["season"]), None)
        if idx is not None and seasons[idx]["state"] == "historical_snapshot":
            # Preserved curated sources win over a rollover. No silent overwrite.
            continue
        if idx is not None and seasons[idx]["records"]:
            raise ValueError("Unexpected unsourced records in prior-season placeholder")
        source_rows = records_from_events(past, registry)
        archive = {
            "id": past["season"], "label": winter_label(past["season"]),
            "state": "historical_snapshot", "asOf": now.date().isoformat(),
            "note": ("Source-backed reports from the completed winter; no AIS or "
                     "inferred occupancy. Empty means no reports were recorded by this tool."),
            "records": source_rows,
            "archiveProvenance": "dated_live_ledger_rollover",
        }
        if idx is None:
            seasons.append(archive)
        else:
            seasons[idx] = archive
    current_idx = next((i for i, s in enumerate(seasons) if s["id"] == actual), None)
    if current_idx is None:
        seasons.append({
            "id": actual, "label": winter_label(actual),
            "state": "upcoming_unconfirmed", "asOf": now.date().isoformat(),
            "note": "Current winter: only dated evidence can establish a layup.",
            "records": [],
        })
    else:
        active = seasons[current_idx]
        if active["state"] not in {"upcoming_unconfirmed", "active_current"} or active["records"]:
            raise ValueError("Current winter must not inherit a historical ship roster")
        # Preserve the seed's source date; no daily empty commit.
    for season in seasons:
        if season["id"] != actual and season["state"] == "upcoming_unconfirmed":
            raise ValueError(f"Unarchived prior winter {season['id']}; do not hide a gap")
    result = deepcopy(registry)
    result["seasons"] = sorted(seasons, key=lambda x: x["id"], reverse=True)
    if result["seasons"] != registry["seasons"]:
        result["updatedOn"] = now.date().isoformat()
    return result


def render_selector(registry: dict, current: str) -> str:
    options = []
    for s in registry["seasons"]:
        id_ = s["id"]
        role = "living season" if id_ == current else "documented history"
        options.append(f'<option value="{id_}">{id_[:4]}–20{id_[-2:]} · {role}</option>')
    return '<select id="season">' + "".join(options) + "</select>"


def assemble(registry: dict, ledger: dict, page: str, sitemap: str,
             now: datetime) -> tuple[dict, str, str, str]:
    revised = synchronize(registry, ledger, now)
    current = current_winter(now)
    history = build_history(revised)
    body = apply_markers(page, render(history))
    select = re.compile(r'<select id="season">.*?</select>', re.S)
    if len(select.findall(body)) != 1:
        raise ValueError("Missing or duplicated shipping winter selector")
    # On first release, the 2026–27 options are deliberately regenerated.
    body = select.sub(lambda _: render_selector(revised, current), body, count=1)
    strong = re.compile(r'<strong id="live-season">[^<]*</strong>')
    if len(strong.findall(body)) != 1:
        raise ValueError("Missing live season label")
    body = strong.sub(f'<strong id="live-season">{winter_label(current)}</strong>', body)
    hist_json = json.dumps(history, ensure_ascii=False, indent=2) + "\n"
    if body != page:
        today = now.date().isoformat()
        modified = re.compile(r'"dateModified":"\d{4}-\d{2}-\d{2}"')
        if len(modified.findall(body)) != 1:
            raise ValueError("Cannot safely update canonical page dateModified")
        body = modified.sub('"dateModified":"' + today + '"', body)
        pattern = re.compile(r"(<loc>" + re.escape(CANONICAL) +
                             r"</loc>\s*<lastmod>)\d{4}-\d{2}-\d{2}(</lastmod>)")
        if len(pattern.findall(sitemap)) != 1:
            raise ValueError("Canonical winter sitemap entry missing or repeated")
        sitemap = pattern.sub(lambda m: m[1] + today + m[2], sitemap)
    return revised, hist_json, body, sitemap


def main() -> None:
    ap = argparse.ArgumentParser(description="Evergreen yearly archival publishing, no AIS")
    ap.add_argument("--now", help="ISO8601 timestamp to simulate rollover (tests only)")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--registry", type=Path, default=REGISTRY)
    ap.add_argument("--ledger", type=Path, default=LEDGER)
    ap.add_argument("--history", type=Path, default=HISTORY)
    ap.add_argument("--page", type=Path, default=PAGE)
    ap.add_argument("--sitemap", type=Path, default=SITEMAP)
    args = ap.parse_args()
    now = datetime.fromisoformat(args.now.replace("Z", "+00:00")) if args.now else datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError("Simulation timestamp must include a timezone")
    registry = json.loads(args.registry.read_text(encoding="utf-8"))
    ledger = json.loads(args.ledger.read_text(encoding="utf-8"))
    page, sitemap = args.page.read_text(encoding="utf-8"), args.sitemap.read_text(encoding="utf-8")
    updated, hist_json, html, xml = assemble(registry, ledger, page, sitemap, now)
    results = [
        (args.registry, json.dumps(updated, ensure_ascii=False, indent=2) + "\n"),
        (args.history, hist_json),
        (args.page, html),
        (args.sitemap, xml),
    ]
    different = [(p, content) for p, content in results
                 if p.read_text(encoding="utf-8") != content]
    if args.check:
        if different:
            raise SystemExit("Evergreen winter artifacts need rebuilding: " +
                             ", ".join(str(p) for p, _ in different))
    else:
        # Validate ALL of the outputs before writing any of them.
        for p, content in different:
            p.write_text(content, encoding="utf-8")
    print(json.dumps({
        "status": "CURRENT", "season": ledger["season"],
        "historicalSeasons": len([s for s in updated["seasons"] if s["state"] == "historical_snapshot"]),
        "updatedArtifacts": len(different), "sourceConfidencePreserved": True,
        "checked": args.check,
    }))


if __name__ == "__main__":
    main()
