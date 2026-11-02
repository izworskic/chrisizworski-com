#!/usr/bin/env python3
"""Bounded discovery of official 45WS PDFs from LL2 mission update links.

GitHub Actions runs this worker. LL2 nominates URLs; only fetched and parsed
official-source PDFs can emit a weather record. Failure never implies a
favorable forecast or zero available launches.
"""
import argparse
import datetime as dt
import hashlib
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

from pypdf import PdfReader

LL2 = "https://ll.thespacedevs.com"
OFFICIAL = "45thweathersquadron.nebula.spaceforce.mil"
UA = "ChrisIzworskiLaunchWeather/1.0 (https://chrisizworski.com/)"
MAX_PDF_BYTES = 2_000_000
MAX_JSON_BYTES = 800_000
UTC = dt.timezone.utc


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        origin = urllib.parse.urlsplit(request.full_url)
        dest = urllib.parse.urlsplit(newurl)
        if (origin.scheme != "https" or dest.scheme != "https"
                or origin.hostname != dest.hostname):
            raise ValueError("cross-host-redirect-blocked")
        return super().redirect_request(request, fp, code, msg, headers, newurl)


OPENER = urllib.request.build_opener(SafeRedirect())


def download(url, limit):
    request = urllib.request.Request(url, headers={
        "Accept": "application/pdf,application/json;q=0.9",
        "User-Agent": UA,
    })
    with OPENER.open(request, timeout=12) as response:
        length = int(response.headers.get("Content-Length") or 0)
        if length > limit:
            raise ValueError("oversized-source")
        raw = response.read(limit + 1)
    if len(raw) > limit:
        raise ValueError("oversized-source")
    return raw


def get_json(url):
    raw = download(url, MAX_JSON_BYTES)
    return json.loads(raw)


def official_pdf_url(value):
    if not isinstance(value, str) or len(value) > 450:
        return None
    u = urllib.parse.urlsplit(value)
    if (u.scheme != "https" or u.hostname != OFFICIAL or u.port
            or u.username or u.password or u.query or u.fragment
            or not u.path.startswith("/assets/LaunchForecasts/")
            or not u.path.lower().endswith(".pdf")):
        return None
    return value


def source_day(value):
    try:
        return dt.datetime.strptime(value, "%d %b %Y").date()
    except ValueError:
        return None


def parse_official_pdf(content, source_url, mission):
    if not content.startswith(b"%PDF-"):
        raise ValueError("official-response-not-pdf")
    reader = PdfReader(io.BytesIO(content), strict=False)
    if len(reader.pages) == 0 or len(reader.pages) > 4:
        raise ValueError("unexpected-pdf-pages")
    try:
        raw = reader.pages[0].extract_text(extraction_mode="layout") or ""
    except Exception:
        raw = reader.pages[0].extract_text() or ""
    if len(raw) < 120 or len(raw) > 40_000:
        raise ValueError("pdf-unreadable")
    # Preserve lines and normalize width; PDF table text sometimes has columns.
    txt = re.sub(r"[ \t]+", " ", raw.replace("\r", "\n"))
    name = re.search(r"\bMission:\s*(.{5,120})", txt, re.I)
    issued = re.search(
        r"\bIssued:\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s*/[^\n(]{0,35}"
        r"\(\s*(\d{4})Z\s*\)", txt, re.I)
    valid = re.search(r"\bValid:\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})", txt, re.I)
    if not name or not issued or not valid:
        raise ValueError("mission-issued-valid-header-not-readable")
    issue_day = source_day(issued.group(1))
    valid_day = source_day(valid.group(1))
    hours = issued.group(2)
    if not issue_day or not valid_day or int(hours[:2]) > 23 or int(hours[2:]) > 59:
        raise ValueError("invalid-official-issue-time")
    issued_at = dt.datetime.combine(issue_day, dt.time(int(hours[:2]), int(hours[2:]), tzinfo=UTC))
    # Conservative: an exact percentage must follow the LAUNCH DAY heading and
    # the named violation heading. Do not interpret humidities or backup PoV.
    pov = None
    day_section = re.search(
        r"\bLaunch\s+Day\b([\s\S]{0,2000}?)(?:\b24[\s-]*Hour\s+Delay\b|Notes\b|\Z)",
        txt, re.I)
    concerns = []
    risks = {}
    if day_section:
        section = day_section.group(1)
        heading = re.search(r"Probability\s+of\s+Violating\s+Weather\s+Constraints", section, re.I)
        if heading:
            after = section[heading.end():heading.end()+180]
            percentages = re.findall(r"(?<![<≤>\d])\b(\d{1,3})\s*%", after)
            if percentages and int(percentages[0]) <= 100:
                pov = int(percentages[0])
        # Prefer a reliable bounded vocabulary to an invented interpretation.
        concern_match = re.search(r"Primary\s+Concerns:\s*(.{0,260})", section, re.I)
        concern_text = concern_match.group(1) if concern_match else ""
        vocabulary = [
            "Thick Cloud Layers Rule", "Cumulus Cloud Rule", "Anvil Cloud Rules",
            "Liftoff Winds", "Lightning Rule", "Disturbed Weather Rule",
            "Flight Through Precipitation", "Surface Electric Fields Rule",
            "Attached Anvil Cloud Rule", "Detached Anvil Cloud Rule",
            "Triboelectrification Rule",
        ]
        concerns = [v for v in vocabulary if re.search(re.escape(v), concern_text, re.I)]
        for label, key in [
            ("Upper-Level Wind Shear", "upperWindShear"),
            ("Booster Recovery Weather", "boosterRecovery"),
            ("Solar Activity", "solarActivity"),
        ]:
            m = re.search(re.escape(label) + r":\s*(Low-Mod|Mod-High|Moderate|High|Low)", section, re.I)
            if m:
                risks[key] = m.group(1)
    return {
        "missionId": mission["id"],
        "sourceMission": name.group(1).strip()[:120],
        "sourceUrl": source_url,
        "sourceSha256": hashlib.sha256(content).hexdigest(),
        "issuedAt": issued_at.isoformat().replace("+00:00", "Z"),
        "validDate": valid_day.isoformat(),
        "povPercent": pov,
        "primaryConcerns": concerns,
        "additionalRisks": risks,
    }


def collect(now):
    out = {"discoveryStatus": "ok", "inspected": 0, "verified": 0,
           "failed": 0, "reports": []}
    url = LL2 + "/2.3.0/launches/upcoming/?location__ids=12%2C27&limit=12&format=json&ordering=net&hide_recent_previous=true"
    try:
        listing = get_json(url)
        if not isinstance(listing.get("results"), list):
            raise ValueError("invalid-launch-feed")
    except Exception:
        out["discoveryStatus"] = "unavailable"
        out["failed"] = 1
        return out
    candidates = []
    for mission in listing["results"]:
        if len(candidates) >= 3:
            break
        net = mission.get("net", "")
        try:
            net_date = dt.datetime.fromisoformat(net.replace("Z", "+00:00"))
        except (TypeError, ValueError):
            continue
        if not 0 <= (net_date - now).total_seconds() <= 6*86400:
            continue
        if not re.fullmatch(r"[a-fA-F0-9-]{36}", str(mission.get("id", ""))):
            continue
        if not isinstance(mission.get("name"), str):
            continue
        candidates.append(mission)
    for mission in candidates:
        out["inspected"] += 1
        mid = mission["id"]
        try:
            detail = get_json(LL2 + "/2.3.0/launches/" + mid + "/?mode=detailed&format=json")
            updates = detail.get("updates") or []
            if not isinstance(updates, list):
                updates = []
            # An update comment is untrusted. Read only allowlisted official
            # forecast document links, newest first. Never extract PoV from it.
            urls = list(dict.fromkeys(filter(None, (
                official_pdf_url(item.get("info_url")) for item in updates
                if isinstance(item, dict)
            ))))[:3]
            for link in reversed(urls):
                try:
                    pdf = download(link, MAX_PDF_BYTES)
                    report = parse_official_pdf(pdf, link, mission)
                    out["reports"].append(report)
                    out["verified"] += 1
                except Exception:
                    out["failed"] += 1
        except Exception:
            out["failed"] += 1
    if out["failed"]:
        out["discoveryStatus"] = "partial"
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    result = collect(dt.datetime.now(UTC))
    with open(args.output, "w", encoding="utf-8") as file:
        json.dump(result, file, ensure_ascii=False, separators=(",", ":"))
    print(f"Official weather discovery: {result['discoveryStatus']}; "
          f"missions {result['inspected']}, documents {result['verified']}, "
          f"unverified sources {result['failed']}")
    # A source outage must not erase prior data. The receiver can store health.
    return 0


if __name__ == "__main__":
    sys.exit(main())
