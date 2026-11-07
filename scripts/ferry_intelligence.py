#!/usr/bin/env python3
"""Official-source ferry intelligence: evidence-first monitoring and narrowly scoped updates.

No bookings, fare inference, service-clearance decisions or scraping of third-party
search results. Only an exact operator-published season window from an explicitly
supported extractor can modify a public planner. Other changes require review.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.error
import urllib.request
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
PLANNERS = ROOT / "data/ferry-planners.json"
STATE = ROOT / "data/ferry-monitor-state.json"
MAX_BYTES = 750_000
HEADERS = {"User-Agent": "GreatLakesFerryEvidenceWatch/1.0 (https://chrisizworski.com/)",
           "Accept": "text/html,application/pdf;q=0.8,*/*;q=0.5"}

MACKINAC_SOURCES = [
    ("Shepler's official tickets", "https://www.sheplersferry.com/ticket-options/"),
    ("Shepler's official notices", "https://www.sheplersferry.com/"),
    ("Arnold's official departures", "https://www.arnoldtransitcompany.com/summer-schedule/"),
    ("Arnold's official fares", "https://www.arnoldtransitcompany.com/summer-ferry-rates/"),
]
WATCH_TERMS = re.compile(
    r"\b(?:20[2-9][0-9]|schedule|season|sail|depart|ferr|fare|rate|fee|"
    r"cancel|delay|suspend|dock|service|closed|opening|reserv|terminal|vehicle|"
    r"May|June|July|August|September|October|November|December|January|"
    r"February|March|April)\b", re.IGNORECASE)
MONTH = {name: i for i, name in enumerate(
    ("", "January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December")) if i}


class ReadableText(HTMLParser):
    SKIP = {"script", "style", "template", "noscript", "svg", "nav", "footer", "header"}
    BLOCK = {"p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "section",
             "article", "div", "tr", "br", "main", "table", "td", "th"}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if self.depth:
            self.depth += 1
        elif tag in self.SKIP:
            self.depth = 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if self.depth:
            self.depth -= 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.depth and data.strip():
            self.parts.append(data)


def readable(raw: bytes) -> str:
    parser = ReadableText()
    parser.feed(raw.decode("utf-8", errors="replace"))
    return html.unescape("".join(parser.parts))


def semantic_lines(raw: bytes, content_type: str) -> tuple[str, str]:
    """Fingerprint relevant operator statements, not scripts, style or navigation."""
    if "pdf" in content_type.lower() or raw.startswith(b"%PDF"):
        return hashlib.sha256(raw).hexdigest(), "PDF changed; inspect the official document"
    body = readable(raw)
    lines = []
    for line in body.splitlines():
        clean = re.sub(r"\s+", " ", line).strip()
        if 8 <= len(clean) <= 900 and WATCH_TERMS.search(clean):
            lines.append(clean)
    if not lines:
        raise ValueError("no recognizable official ferry statements; cannot compare")
    normalized = "\n".join(lines[:1200])
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest(), " | ".join(lines[:7])[:450]


def badger_season(text: str, now: dt.date) -> tuple[int, list[str]] | None:
    """Parse only Badger's explicit YEAR Schedule + Full Season statement.

    Never derive a season from isolated dates, promotional banners, prior-year
    fares, overnight sailing exceptions, or a "coming soon" placeholder.
    """
    normalized = re.sub(r"\s+", " ", text)
    headings = list(re.finditer(r"\b(20\d{2})\s+Schedule\b", normalized, re.I))
    valid = []
    for heading in headings:
        year = int(heading.group(1))
        if year < now.year or year > now.year + 2:
            continue
        segment = normalized[heading.end():heading.end() + 1800]
        if re.search(r"\bcoming soon\b", segment[:150], re.I):
            continue
        match = re.search(
            r"\bFull Season\s*[-:–]\s*(January|February|March|April|May|June|"
            r"July|August|September|October|November|December)\s+(\d{1,2})"
            r"\s*(?:-|–|—|to)\s*(January|February|March|April|May|June|"
            r"July|August|September|October|November|December)\s+(\d{1,2})\b",
            segment, re.I)
        if not match:
            continue
        m1, d1, m2, d2 = match.groups()
        try:
            start = dt.date(year, MONTH[m1.title()], int(d1))
            end = dt.date(year, MONTH[m2.title()], int(d2))
        except ValueError:
            continue
        if 30 <= (end - start).days <= 245:
            valid.append((year, [start.isoformat(), end.isoformat()]))
    return valid[0] if len(valid) == 1 else None


def monitored(planners: dict) -> list[dict]:
    work, seen = [], set()
    for route, config in planners.items():
        # Monitor all curated original sources, including park access and terminals.
        # Deduplicate a shared operator page so it is not polled repeatedly.
        sources = config.get("sources", []) + config.get("experience", {}).get("extraSources", [])
        for label, url in sources:
            if url not in seen:
                work.append({"route": route, "label": label, "url": url})
                seen.add(url)
    for label, url in MACKINAC_SOURCES:
        if url not in seen:
            work.append({"route": "mackinac", "label": label, "url": url})
            seen.add(url)
    return work


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, hosts: set[str]):
        self.hosts = hosts

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        p = urlparse(newurl)
        if p.scheme != "https" or (p.hostname or "").lower() not in self.hosts:
            raise ValueError("redirect outside vetted official domains")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_source(item: dict, hosts: set[str]) -> dict:
    url = item["url"]
    p = urlparse(url)
    if p.scheme != "https" or (p.hostname or "").lower() not in hosts:
        return {**item, "status": "indeterminate", "reason": "unsafe source domain"}
    try:
        opener = urllib.request.build_opener(SafeRedirect(hosts))
        req = urllib.request.Request(url, headers=HEADERS)
        with opener.open(req, timeout=16) as res:
            length = res.headers.get("Content-Length")
            if length and int(length) > MAX_BYTES:
                raise ValueError("upstream response too large")
            raw = res.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise ValueError("upstream response exceeded size limit")
            content_type = res.headers.get("Content-Type", "").lower()
            if not (raw.startswith(b"%PDF") or "pdf" in content_type or "html" in content_type):
                raise ValueError("unsupported upstream response type")
            digest, sample = semantic_lines(raw, content_type)
            return {**item, "status": "ok", "digest": digest, "sample": sample,
                    "text": readable(raw) if "html" in content_type else ""}
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError,
            OSError, ValueError, UnicodeError) as exc:
        return {**item, "status": "indeterminate", "reason": str(exc)[:160]}


def due_today(today: dt.date) -> bool:
    # Daily April–October; Mondays during November–March; manual dispatch bypasses.
    return 4 <= today.month <= 10 or today.weekday() == 0


def process(planners: dict, state: dict, observations: list[dict],
            today: dt.date) -> tuple[dict, dict, dict]:
    updated = json.loads(json.dumps(planners))
    snapshots = dict(state.get("sources", {}))
    changes, unavailable, published, conflicts, initial = [], [], [], [], []
    for result in observations:
        url = result["url"]
        previous = snapshots.get(url)
        if result["status"] != "ok":
            unavailable.append({k: result[k] for k in ("route", "label", "url", "reason") if k in result})
            continue  # Never erase last known evidence on upstream failure.
        digest = result["digest"]
        if not previous:
            initial.append({"route": result["route"], "url": url})
        elif previous["digest"] != digest:
            changes.append({"route": result["route"], "label": result["label"], "url": url,
                            "before": previous["digest"], "after": digest,
                            "previous_sample": previous.get("sample", ""),
                            "current_sample": result.get("sample", "")})
        if not previous or previous["digest"] != digest:
            snapshots[url] = {"digest": digest, "sample": result["sample"],
                              "observed_at": today.isoformat()}
        # Only this exact official operator endpoint has an approved auto extractor.
        if result["route"] == "ss-badger" and url == "https://ssbadger.com/schedule/":
            season = badger_season(result.get("text", ""), today)
            if season:
                year, window = season
                existing = updated["ss-badger"].setdefault("seasonWindows", {}).get(str(year))
                if existing and existing != window:
                    conflicts.append({"route": "ss-badger", "year": year, "published": window,
                                      "existing": existing, "url": url,
                                      "action": "review_required_no_overwrite"})
                elif not existing:
                    updated["ss-badger"]["seasonWindows"][str(year)] = window
                    updated["ss-badger"].setdefault("seasonEvidence", {})[str(year)] = {
                        "operator": url, "verified_on": today.isoformat(),
                        "method": "explicit_year_full_season"}
                    updated["ss-badger"]["modified"] = today.isoformat()
                    published.append({"route": "ss-badger", "year": year, "window": window,
                                      "url": url, "kind": "season_window_only"})
    # Only the exact parsed season window is eligible for hands-off publishing;
    # any other changed operator page or conflicting official dates blocks merge.
    published_urls = {entry["url"] for entry in published}
    review_changes = [item for item in changes if item["url"] not in published_urls]
    auto = not conflicts and not review_changes
    report = {"generated_at": today.isoformat(), "scope": "nine route planners + Mackinac operators",
              "sources_monitored": len(observations), "sources_reachable": len(observations) - len(unavailable),
              "first_seen": initial, "changed_sources": changes, "requires_review": review_changes,
              "unavailable_sources": unavailable, "accepted_season_windows": published,
              "conflicting_official_windows": conflicts,
              "auto_publish_eligible": auto,
              "limitations": ["No fare or cancellation is automatically inferred from HTML.",
                              "A full-season date range never confirms an individual sailing.",
                              "Source downtime never becomes a cancellation or clears prior evidence."]}
    return updated, {"version": 1, "sources": snapshots}, report


def update_sitemap(route_path: str, today: dt.date) -> None:
    """Only stamp a sitemap entry when its destination is genuinely revised."""
    sitemap = ROOT / "public/sitemap.xml"
    xml = sitemap.read_text()
    url = "https://chrisizworski.com/" + route_path.strip("/") + "/"
    pattern = re.compile(
        r"(<url>\s*<loc>" + re.escape(url) +
        r"</loc>\s*<lastmod>)(\d{4}-\d{2}-\d{2})(</lastmod>)")
    fresh, count = pattern.subn(
        lambda match: match.group(1) + today.isoformat() + match.group(3),
        xml, count=1)
    if count != 1:
        raise ValueError("published route missing unique main-sitemap entry: " + url)
    if fresh != xml:
        sitemap.write_text(fresh)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write vetted data and source fingerprint proposals")
    parser.add_argument("--report", default="ferry-intelligence-report.json")
    parser.add_argument("--respect-cadence", action="store_true")
    args = parser.parse_args()
    today = dt.datetime.now(dt.timezone.utc).date()
    if args.respect_cadence and not due_today(today):
        Path(args.report).write_text(json.dumps({"skipped": "winter cadence", "date": today.isoformat()}, indent=2) + "\n")
        print("Winter cadence: next Monday or manual dispatch.")
        return 0
    planners = json.loads(PLANNERS.read_text())
    state = json.loads(STATE.read_text()) if STATE.exists() else {"version": 1, "sources": {}}
    work = monitored(planners)
    hosts = {(urlparse(item["url"]).hostname or "").lower() for item in work}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        observations = list(pool.map(lambda item: fetch_source(item, hosts), work))
    data, newstate, report = process(planners, state, observations, today)
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    if args.apply:
        if data != planners:
            for item in report["accepted_season_windows"]:
                update_sitemap(data[item["route"]]["path"], today)
            PLANNERS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        if newstate != state:
            STATE.write_text(json.dumps(newstate, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: report[k] for k in ("sources_monitored", "sources_reachable",
                "accepted_season_windows", "requires_review", "conflicting_official_windows",
                "auto_publish_eligible")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
