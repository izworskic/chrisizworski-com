#!/usr/bin/env python3
"""Check Great Lakes ferry source integrity and optional operator URL reachability.

Only the operator can confirm a sailing or fare. This audit never rolls a past
season forward or treats an HTTP 200 as proof that schedule facts remain true.
"""
import argparse
import concurrent.futures
import datetime as dt
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data/ferry-planners.json"
HEADERS = {"User-Agent": "ChrisIzworskiFerryAudit/1.0 (+https://chrisizworski.com/)",
           "Accept": "text/html,application/pdf;q=0.8,*/*;q=0.5"}


def source_urls(config):
    return (config.get("sources") or []) + (config.get("experience", {}).get("extraSources") or [])


def validate(data):
    errors = []
    results = []
    paths = set()
    for key, c in data.items():
        slug = c.get("path")
        if key != c.get("id") or not slug or slug in paths:
            errors.append(f"{key}: duplicate path or mismatched id")
        paths.add(slug)
        year = c.get("fareReferenceYear")
        if type(year) is not int or not (2000 <= year <= 2100):
            errors.append(f"{key}: missing or invalid explicit fare reference year {year}")
        for name, window in (c.get("seasonWindows") or {}).items():
            if not re.fullmatch(r"\d{4}", name):
                errors.append(f"{key}: bad window year {name}")
            if len(window) != 2 or not all(re.fullmatch(r"\d{4}-\d{2}-\d{2}", x) for x in window):
                errors.append(f"{key}: malformed {name} window")
            elif not (window[0] <= window[1] and window[0][:4] == name == window[1][:4]):
                errors.append(f"{key}: window crosses years or is reversed")
        for o in c.get("options", []):
            pricing = o.get("pricing", {})
            if pricing and not year:
                errors.append(f"{key}/{o['id']}: pricing without a reference year")
            for k, val in pricing.items():
                if type(val) not in (int, float) or val < 0:
                    errors.append(f"{key}/{o['id']}: invalid price {k}")
            promo = o.get("childPromo")
            if promo and (not o.get("priceStart") or promo["start"] < o["priceStart"]):
                errors.append(f"{key}/{o['id']}: promotion predates supported tariff")
        links = source_urls(c)
        if len(links) < 2:
            errors.append(f"{key}: insufficient original-source links")
        for title, url in links:
            parsed = urlparse(url)
            if not title or parsed.scheme != "https" or not parsed.netloc:
                errors.append(f"{key}: unsafe or incomplete operator URL: {url}")
        results.append({"id": key, "path": slug, "fare_reference_year": year,
                        "published_season_years": sorted((c.get("seasonWindows") or {}).keys()),
                        "source_count": len(links)})
    return errors, results


def probe(item):
    route, title, url = item
    try:
        request = urllib.request.Request(url, headers=HEADERS, method="GET")
        with urllib.request.urlopen(request, timeout=10) as response:
            response.read(1024)
            return {"route": route, "source": title, "url": url,
                    "status": response.status, "result": "reachable_not_fact_verified",
                    "resolved_url": response.geturl()}
    except urllib.error.HTTPError as exc:
        state = "unreachable_or_removed" if exc.code in (404, 410) else "indeterminate"
        return {"route": route, "source": title, "url": url, "status": exc.code, "result": state}
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return {"route": route, "source": title, "url": url, "result": "indeterminate",
                "detail": str(exc)[:160]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--online", action="store_true", help="Probe official links, never scrape unverified fares")
    parser.add_argument("--json", dest="output", help="Write a machine-readable review report")
    args = parser.parse_args()
    data = json.loads(DATA.read_text(encoding="utf-8"))
    errors, routes = validate(data)
    probes = []
    if args.online:
        jobs = [(c["id"], title, url) for c in data.values() for title, url in source_urls(c)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            probes = list(pool.map(probe, jobs))
    report = {"audited_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "scope": "nine generated ferry planners; Mackinac maintained independently",
              "rules": "URL reachability is not timetable or fare verification. Never extrapolate 2026 fares.",
              "route_inventory": routes, "validation_errors": errors, "operator_link_checks": probes}
    if args.output:
        Path(args.output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"routes": len(routes), "errors": errors,
                      "links_checked": len(probes),
                      "removed_or_missing": [x["url"] for x in probes if x["result"] == "unreachable_or_removed"],
                      "indeterminate": sum(x["result"] == "indeterminate" for x in probes)}, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
