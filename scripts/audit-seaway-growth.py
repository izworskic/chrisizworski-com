#!/usr/bin/env python3
"""Reproducible Seaway landing-page search audit from a Google Search Console Pages CSV.

Usage:
  python3 scripts/audit-seaway-growth.py my-export/Pages.csv
  python3 scripts/audit-seaway-growth.py Pages.csv --previous older-Pages.csv --json
Does not call Google APIs, infer missing queries, or claim a ranking outcome.
"""
import argparse
import csv
import json
from pathlib import Path
from urllib.parse import urlparse

FOCUS = ("/welland-canal/", "/st-lawrence-seaway/", "/eisenhower-lock/")
BASELINE = Path(__file__).resolve().parents[1] / "data/seaway/gsc-baseline-2026-11-05.json"


def landing_path(value):
    p = urlparse(str(value).strip())
    if p.hostname and p.hostname not in {"chrisizworski.com", "www.chrisizworski.com"}:
        return None
    result = p.path.rstrip("/") + "/"
    return result if result in FOCUS else None


def read_pages(path):
    found = {}
    with Path(path).open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("Empty Google Search Console Pages export")
        keys = {x.strip().lower(): x for x in reader.fieldnames}
        for key in ("top pages", "clicks", "impressions", "position"):
            if key not in keys:
                raise ValueError(f"Pages CSV missing column: {key}")
        for row in reader:
            page = landing_path(row[keys["top pages"]])
            if page is None:
                continue
            clicks = int(str(row[keys["clicks"]]).replace(",", ""))
            impressions = int(str(row[keys["impressions"]]).replace(",", ""))
            position = float(row[keys["position"]])
            if clicks < 0 or impressions < 0 or clicks > impressions or position < 0:
                raise ValueError("Invalid Search Console measurement for " + page)
            if page in found:
                raise ValueError("Duplicate landing page row: " + page)
            found[page] = {"clicks": clicks, "impressions": impressions,
                           "ctr": round(clicks / impressions, 6) if impressions else 0.0,
                           "position": position}
    return found


def compare(current, previous):
    result = {}
    for page in FOCUS:
        now = current.get(page)
        old = previous.get(page)
        result[page] = {"current": now, "previous": old,
                        "impression_delta": now["impressions"] - old["impressions"] if now and old else None,
                        "click_delta": now["clicks"] - old["clicks"] if now and old else None}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pages_csv", type=Path)
    parser.add_argument("--previous", type=Path, help="Optional prior export, same filter and window length")
    parser.add_argument("--json", action="store_true", help="Machine-readable output")
    args = parser.parse_args()
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))["pages"]
    current = read_pages(args.pages_csv)
    older = read_pages(args.previous) if args.previous else baseline
    result = compare(current, older)
    if args.json:
        print(json.dumps({"baseline": "2026-11-05", "pages": result}, indent=2))
    else:
        print("Seaway Search Console landing-page audit; missing row means not exported, not zero.")
        for path, row in result.items():
            now, old = row["current"], row["previous"]
            if not now:
                print(path, "NOT IN EXPORT")
            else:
                print(f'{path} impressions={now["impressions"]} clicks={now["clicks"]} '
                      f'CTR={now["ctr"]:.2%} position={now["position"]:.2f}; '
                      f'impression change={row["impression_delta"] if old else "n/a"}')
        print("Compare matched non-overlapping windows to evaluate launch impact.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
