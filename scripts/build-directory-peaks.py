#!/usr/bin/env python3
"""Apply curated peak windows to directory cards.

Reads  data/directory-peaks.json
Writes data-peak="MM-DD/MM-DD[,MM-DD/MM-DD]" and data-peak-note="..." onto the
matching <article class="directory-card" data-tool-id="..."> cards, so the page's
"Worth checking now" list is driven by one reviewed source instead of hand edits.

    python3 scripts/build-directory-peaks.py          # apply
    python3 scripts/build-directory-peaks.py --check  # fail if the page disagrees
"""
from __future__ import annotations

import datetime as dt
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data/directory-peaks.json"
PAGES = {"national": ROOT / "public/synced-national-tools/index.html"}
WINDOW = re.compile(r"^(\d{2})-(\d{2})/(\d{2})-(\d{2})$")
CARD = re.compile(r'<article class="directory-card"[^>]*>')
MAX_NOTE = 80


def valid_day(month: int, day: int) -> bool:
    try:
        dt.date(2024, month, day)  # leap year so 02-29 is allowed
        return True
    except ValueError:
        return False


def validate(page: str, entries: dict, present: set[str]) -> list[str]:
    errors = []
    for tool, spec in entries.items():
        if tool not in present:
            errors.append(f"{page}: no card with data-tool-id={tool!r}")
        windows = spec.get("windows") or []
        if not windows:
            errors.append(f"{page}/{tool}: needs at least one window")
        for w in windows:
            m = WINDOW.match(w)
            if not m or not (valid_day(int(m[1]), int(m[2])) and valid_day(int(m[3]), int(m[4]))):
                errors.append(f"{page}/{tool}: bad window {w!r} (use MM-DD/MM-DD)")
        note = spec.get("note", "")
        if not note or len(note) > MAX_NOTE:
            errors.append(f"{page}/{tool}: note must be 1-{MAX_NOTE} characters")
        if re.search(r"\b20\d\d\b", note):
            errors.append(f"{page}/{tool}: note must stay true every year (no years)")
    return errors


def apply(text: str, entries: dict) -> str:
    def rewrite(match: re.Match) -> str:
        tag = match.group(0)
        tool = re.search(r'data-tool-id="([^"]+)"', tag)
        tag = re.sub(r'\s+data-peak(?:-note)?="[^"]*"', "", tag)
        if not tool or tool.group(1) not in entries:
            return tag
        spec = entries[tool.group(1)]
        attrs = f' data-peak="{",".join(spec["windows"])}" data-peak-note="{html.escape(spec["note"], quote=True)}"'
        return tag[:-1] + attrs + ">"
    return CARD.sub(rewrite, text)


def main() -> int:
    check = "--check" in sys.argv
    source = json.loads(SOURCE.read_text(encoding="utf8"))
    stale, errors = [], []
    for page, path in PAGES.items():
        entries = source.get(page, {})
        text = path.read_text(encoding="utf8")
        present = set(re.findall(r'<article class="directory-card"[^>]*data-tool-id="([^"]+)"', text))
        errors += validate(page, entries, present)
        updated = apply(text, entries)
        if updated != text:
            if check:
                stale.append(str(path.relative_to(ROOT)))
            else:
                path.write_text(updated, encoding="utf8")
        print(f"{page}: {len(entries)} peak windows on {len(present)} cards")
    if errors:
        print("Directory peak errors:\n  " + "\n  ".join(errors))
        return 1
    if stale:
        print("Peak windows are out of date in: " + ", ".join(stale) + "\nRun: python3 scripts/build-directory-peaks.py")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
