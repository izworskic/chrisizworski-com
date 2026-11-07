#!/usr/bin/env python3
"""Review-oriented import of factual UP waterfall directory identities.

This reads a saved Markdown export of the public directory listing. It NEVER
fetches the web, imports editorial prose/photos, publishes routes or modifies
the curated public map. Review source data and rights before refreshing.

Usage:
 python3 scripts/import-up-waterfall-identity-directory.py directory.md --check
 python3 scripts/import-up-waterfall-identity-directory.py directory.md --write --reviewed 2026-11-07

It expects the source page's "Showing N of N UP waterfalls" completeness marker.
"""
from __future__ import annotations

import argparse
from datetime import date
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "data/up-waterfall-external-identity-shorelinescout.json"
SOURCE_PREFIX = "https://shorelinescout.com/michigan/waterfalls/"
URL_RE = re.compile(r"\[([^\]]+)\]\((https://shorelinescout\.com/michigan/waterfalls/[^)]+)\)")
COUNT_RE = re.compile(r"Showing (\d+) of (\d+) UP waterfalls")
SPLIT_RE = re.compile(r"\\{2,}")
COUNTY_RE = re.compile(r"^([A-Za-z ]+) County(?:\s*·\s*(.*))?$")
VALID_COUNTIES = frozenset(("Alger", "Baraga", "Chippewa", "Delta", "Dickinson", "Gogebic",
                            "Houghton", "Iron", "Keweenaw", "Luce", "Mackinac",
                            "Marquette", "Menominee", "Ontonagon", "Schoolcraft"))


def extract(markdown: str, minimum: int = 150) -> list[dict]:
    marker = COUNT_RE.search(markdown)
    if not marker or marker[1] != marker[2]:
        raise ValueError("Directory completeness marker missing or source listing is paginated/incomplete")
    expected = int(marker[1])
    result = []
    for label, url in URL_RE.findall(markdown):
        cells = [s.strip() for s in SPLIT_RE.split(label) if s.strip()]
        if len(cells) < 2:
            raise ValueError("Missing waterfall/county information: " + label[:120])
        match = COUNTY_RE.match(cells[1])
        if not match or match[1] not in VALID_COUNTIES:
            raise ValueError("Unrecognized U.P. county: " + cells[1])
        slug = urlparse(url).path.rstrip("/").split("/")[-1]
        if not re.fullmatch(r"[a-z0-9-]+", slug):
            raise ValueError("Unsafe or ambiguous source URL slug")
        result.append({
            "id": "ss:" + slug,
            "name": cells[0],
            "county": match[1],
            "river": match[2] or None,
            "reference": url,
        })
    if len(result) != expected or len(result) < minimum:
        raise ValueError(f"Incomplete listing: extracted {len(result)} identities; expected {expected}, minimum {minimum}")
    if len(set(x["id"] for x in result)) != len(result):
        raise ValueError("Duplicate source URL slugs; manual disambiguation required")
    return result


def main() -> None:
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("markdown", type=Path, help="Saved plain Markdown from the published directory page")
    mode = cli.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    cli.add_argument("--reviewed", help="Source review date YYYY-MM-DD (required for --write)")
    args = cli.parse_args()
    if not args.markdown.is_file():
        cli.error("Markdown input not found")
    if args.write and not args.reviewed:
        cli.error("--write requires an explicit --reviewed YYYY-MM-DD date")
    original = json.loads(OUTPUT.read_text(encoding="utf-8"))
    review_date = args.reviewed or original["retrieved"]
    date.fromisoformat(review_date)
    result = extract(args.markdown.read_text(encoding="utf-8"))
    original["retrieved"] = review_date
    original["sourceAdvertisedEntries"] = len(result)
    original["observationCount"] = len(result)
    original["observations"] = result
    rendered = json.dumps(original, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if OUTPUT.read_text(encoding="utf-8") != rendered:
            raise SystemExit("Source snapshot differs from the reviewed listing; use --write only after evaluating changes")
        print(f"Reviewed directory matches {len(result)} research-only identities.")
    else:
        OUTPUT.write_text(rendered, encoding="utf-8")
        print(f"Updated {OUTPUT.relative_to(ROOT)} with {len(result)} factual identities only.")
        print("Regenerate the Python discovery crosswalk; do not auto-publish any guide or map point.")


if __name__ == "__main__":
    main()
