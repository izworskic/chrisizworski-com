#!/usr/bin/env python3
"""Build a factual, static-first winter-fleet history from the curated ship registry.

No AIS, prediction, inference from silence, additional scraping, or live positions.
Outputs are checked in; the public page never needs Python to render.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import date
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "public/assets/freighter-layup-registry.json"
OUTPUT = ROOT / "public/assets/freighter-layup-history.json"
PAGE = ROOT / "public/great-lakes-freighter-winter-layup/index.html"
START = "<!-- WINTER_FLEET_HISTORY:START -->"
END = "<!-- WINTER_FLEET_HISTORY:END -->"
SEASON_RE = re.compile(r"^20\d{2}-\d{2}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
STATUS = {"confirmed_historical": "Verified historical record",
          "reported_historical": "Reported historical record"}


def safe_url(url: str) -> bool:
    try:
        parts = urlparse(url)
        return parts.scheme == "https" and bool(parts.netloc) and not parts.username
    except (TypeError, ValueError):
        return False


def iso_day(value: str) -> str:
    if not isinstance(value, str) or not DATE_RE.fullmatch(value):
        raise ValueError(f"Invalid ISO day: {value!r}")
    date.fromisoformat(value)
    return value


def build_history(registry: dict) -> dict:
    """Make a deterministic, coverage-qualified model. Never sum into fleet totals."""
    harbors = {h["id"]: h["name"] for h in registry["harbors"]}
    seasons = []
    across_years = defaultdict(set)
    if registry.get("schemaVersion") != 2:
        raise ValueError("Unsupported registry schema version")
    for raw in sorted(registry["seasons"], key=lambda s: s["id"], reverse=True):
        if raw.get("state") != "historical_snapshot":
            continue
        year = raw["id"]
        if not SEASON_RE.fullmatch(year):
            raise ValueError("Invalid winter season")
        seen_keys = set()
        vessels = []
        for record in raw.get("records", []):
            key = record.get("identity", {}).get("key")
            if not key or key in seen_keys:
                raise ValueError(f"Missing or repeated ship identity in {year}: {key}")
            seen_keys.add(key)
            harbor_id = record["harborId"]
            if harbor_id not in harbors:
                raise ValueError(f"Unknown harbor {harbor_id}")
            status = record["status"]
            if status not in STATUS:
                raise ValueError(f"Unexpected historical status {status}")
            asof = iso_day(record["statusAsOf"])
            start_year = int(year[:4])
            if not (date(start_year, 11, 1) <= date.fromisoformat(asof)
                    <= date(start_year + 1, 10, 31)):
                raise ValueError(f"Outside season: {year}, {record['name']}")
            evidence = record["evidence"]
            if not safe_url(evidence["url"]) or not evidence.get("publisher"):
                raise ValueError(f"Missing source for {record['name']}")
            events = []
            for event in record.get("events", []):
                day = iso_day(event["date"])
                if not (date(start_year, 11, 1) <= date.fromisoformat(day)
                        <= date(start_year + 1, 10, 31)):
                    raise ValueError(f"Event outside season: {year}, {record['name']}")
                if not safe_url(event["source"]):
                    raise ValueError(f"Bad event source for {record['name']}")
                events.append({"date": day, "kind": event["type"],
                               "description": event["text"], "source": event["source"]})
            vessels.append({
                "id": record["id"], "key": key, "name": record["name"],
                "harborId": harbor_id, "harborName": harbors[harbor_id],
                "asOf": asof, "status": status, "evidenceClass": record["evidenceClass"],
                "source": {"url": evidence["url"], "publisher": evidence["publisher"],
                           "title": evidence.get("title", "")},
                "events": sorted(events, key=lambda e: (e["date"], e["kind"])),
            })
            across_years[key].add(year)
        # Keep zero-report historical years visible rather than pretending the
        # fleet was empty or erasing a completed winter entirely.
        vessels.sort(key=lambda v: (v["harborName"], v["name"]))
        counts = Counter(v["harborId"] for v in vessels)
        seasons.append({
            "id": year,
            "label": f"Winter {year[:4]}–20{year[-2:]}",
            "recordCount": len(vessels),
            "verifiedCount": sum(v["status"] == "confirmed_historical" for v in vessels),
            "reportedCount": sum(v["status"] == "reported_historical" for v in vessels),
            "harbors": [{"id": hid, "name": harbors[hid], "records": count}
                        for hid, count in sorted(counts.items(),
                                                 key=lambda x: (-x[1], harbors[x[0]]))],
            "vessels": vessels,
        })
    if not seasons:
        raise ValueError("No curated historical records; do not fabricate a history")
    recurring = sorted(k for k, years in across_years.items() if len(years) > 1)
    return {
        "schemaVersion": 1,
        "status": "PARTIAL",
        "dataClass": "curated_historical_source_records",
        "notFleetCensus": True,
        "source": "/assets/freighter-layup-registry.json",
        "asOfPolicy": "Record as-of dates are not inferred arrival or departure dates.",
        "coverageNote": ("A curated selection of documented vessel winters, not a full fleet census. "
                         "Different seasons have different source coverage; record counts are not fleet totals."),
        "recordCount": sum(s["recordCount"] for s in seasons),
        "uniqueVesselCount": len(across_years),
        "recurringKeys": recurring,
        "seasons": seasons,
    }


def e(value: object) -> str:
    return escape(str(value), quote=True)


def render(history: dict) -> str:
    seasons = history["seasons"]
    tab_html = "".join(
        f'<button type="button" class="history-season-button" data-history-pick="{e(s["id"])}" '
        f'aria-pressed="{"true" if i == 0 else "false"}">{e(s["label"])}'
        f'<span>{s["recordCount"]} documented records</span></button>'
        for i, s in enumerate(seasons))
    harbor_options = {h["id"]: h["name"]
                      for s in seasons for h in s["harbors"]}
    opts = '<option value="all">All documented harbors</option>' + "".join(
        f'<option value="{e(k)}">{e(harbor_options[k])}</option>'
        for k in sorted(harbor_options, key=lambda hid: harbor_options[hid]))

    content = []
    for season in seasons:
        max_count = max((h["records"] for h in season["harbors"]), default=1)
        bars = "".join(
            f'<li><span>{e(h["name"])}</span>'
            f'<span class="history-bar-track" aria-hidden="true">'
            f'<span style="width:{100 * h["records"] // max_count}%"></span></span>'
            f'<strong>{h["records"]}</strong></li>'
            for h in season["harbors"])
        vessel_cards = []
        for v in season["vessels"]:
            evs = "".join(
                f'<li><time datetime="{e(ev["date"])}">{e(ev["date"])}</time> '
                f'{e(ev["description"])} '
                f'<a href="{e(ev["source"])}" target="_blank" rel="noopener noreferrer">'
                f'Source<span class="sr-only"> for {e(v["name"])} {e(ev["date"])}</span> ↗</a></li>'
                for ev in v["events"])
            details = (f'<details class="history-events"><summary>'
                       f'{len(v["events"])} dated {"entry" if len(v["events"]) == 1 else "entries"}'
                       f'</summary><ol>{evs}</ol></details>') if evs else ""
            vessel_cards.append(
                f'<li class="history-vessel" data-history-harbor="{e(v["harborId"])}" '
                f'data-history-vessel="{e(v["key"])}">'
                f'<div class="history-vessel-top"><span class="history-berth">'
                f'{e(v["harborName"])}</span><span class="history-evidence '
                f'{"history-reported" if v["status"] == "reported_historical" else ""}">'
                f'{e(STATUS[v["status"]])}</span></div>'
                f'<strong class="history-vessel-name">{e(v["name"])}</strong>'
                f'<p class="history-asof">Record as of <time datetime="{e(v["asOf"])}">'
                f'{e(v["asOf"])}</time> · {e(v["source"]["publisher"])}</p>'
                f'<div class="history-vessel-links"><a href="{e(v["source"]["url"])}" '
                f'target="_blank" rel="noopener noreferrer">View supporting source ↗</a></div>'
                f'{details}</li>')
        empty_year = ('<p class="history-empty-year">No source-backed layup reports were '
                      'collected for this shipping winter. This is not evidence that '
                      'the Great Lakes harbors were empty.</p>') if not vessel_cards else ''
        content.append(
            f'<div class="history-season-panel" data-history-season="{e(season["id"])}">'
            f'<div class="history-insight"><div><strong>{season["recordCount"]}</strong>'
            f'<span>documented ship records</span></div><div><strong>{len(season["harbors"])}</strong>'
            f'<span>harbors in this subset</span></div><div><strong>{season["verifiedCount"]} / '
            f'{season["reportedCount"]}</strong><span>verified / reported</span></div></div>'
            f'<div class="history-body-grid"><div class="history-harbors">'
            f'<h4>Harbor register</h4><p>Records in this selected archive, not harbor fleet capacity.</p>'
            f'<ol>{bars}</ol></div><div class="history-vessels-area">'
            f'<h4>Ship-by-ship ledger</h4>{empty_year}<ol class="history-vessel-list">'
            f'{"".join(vessel_cards)}</ol></div></div></div>')
    recurrent = ""
    if history["recurringKeys"]:
        examples = []
        keys = set(history["recurringKeys"])
        for s in seasons:
            for v in s["vessels"]:
                if v["key"] in keys and v["name"] not in examples:
                    examples.append(v["name"])
        recurrent = ('<p class="history-returning"><strong>Across the ledgers:</strong> '
                     + e(", ".join(examples)) + ' appears in more than one curated winter record. '
                     'This does not establish continuous occupancy or an identical berth.</p>')
    winter_count = {1: "One", 2: "Two", 3: "Three"}.get(len(seasons), str(len(seasons)))
    return (START + '\n'
            '<section id="winter-fleet-history" class="winter-ledger" aria-labelledby="history-heading" '
            'data-history-enhanced="false">'
            '<div class="history-heading"><p class="kicker">The winter manifest / ship-by-ship evidence</p>'
            '<h3 id="history-heading">' + e(winter_count) + ' winters. Different harbors. Real records.</h3>'
            '<p>Turn the pages of a working harbor ledger. Follow a documented ship, '
            'then open the evidence behind its winter stay. '
            'These records tell us what was reported, not where every ship on the lakes spent the season.</p></div>'
            '<div class="history-controls"><div class="history-season-buttons" role="group" '
            'aria-label="Choose a historical winter">' + tab_html + '</div>'
            '<label for="history-harbor">Narrow to a harbor</label>'
            '<select id="history-harbor">' + opts + '</select></div>'
            '<p class="history-selection" id="history-selection" role="status" aria-live="polite"></p>'
            '<div class="history-season-panels">' + "".join(content) + '</div>'
            '<p id="history-empty" class="history-empty" hidden>No records in this curated archive '
            'match that harbor. Choose another harbor or show all harbors.</p>'
            + recurrent +
            '<p class="history-coverage"><strong>Reading the evidence:</strong> '
            + e(history["coverageNote"]) +
            ' Dates marked “Record as of” refer to dated source records, not '
            'necessarily actual arrival dates. These are historical reports, not live AIS positions.</p>'
            '</section>\n' + END)


def apply_markers(page: str, fragment: str) -> str:
    if page.count(START) != 1 or page.count(END) != 1:
        raise ValueError("History markers missing or duplicated; do not mutate HTML")
    before = page.split(START, 1)[0]
    after = page.split(END, 1)[1]
    return before + fragment + after


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="Fail if checked-in assets differ from model")
    ap.add_argument("--registry", type=Path, default=REGISTRY)
    ap.add_argument("--output", type=Path, default=OUTPUT)
    ap.add_argument("--page", type=Path, default=PAGE)
    args = ap.parse_args()
    history = build_history(json.loads(args.registry.read_text(encoding="utf-8")))
    artifact = json.dumps(history, ensure_ascii=False, indent=2) + "\n"
    current_page = args.page.read_text(encoding="utf-8")
    updated_page = apply_markers(current_page, render(history))
    if args.check:
        if args.output.read_text(encoding="utf-8") != artifact or current_page != updated_page:
            raise SystemExit("Winter fleet history is out of sync; run python3 scripts/freighter-layup/history.py")
    else:
        args.output.write_text(artifact, encoding="utf-8")
        if updated_page != current_page:
            args.page.write_text(updated_page, encoding="utf-8")
    print(json.dumps({"status": history["status"], "archiveRecords": history["recordCount"],
                      "distinctVessels": history["uniqueVesselCount"], "seasons": len(history["seasons"]),
                      "checked": args.check}))


if __name__ == "__main__":
    main()
