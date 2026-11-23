#!/usr/bin/env python3
"""Read-only inventory of dropdown-heavy canonical tool pages.

A native select is not inherently bad: this identifies research candidates, not
a directive to replace finite year/time/status selections or accessible controls.
No network, inference model, privacy data or production dependency.
"""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


class Inputs(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.selects = []
        self.searches = []
        self.comboboxes = []
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "select":
            self.selects.append(attributes.get("id") or "(unnamed)")
        elif tag == "input":
            if attributes.get("type") in ("search", "text"):
                self.searches.append(attributes.get("id") or "(unnamed)")
            if attributes.get("role") == "combobox":
                self.comboboxes.append(attributes.get("id") or "(unnamed)")
        elif tag == "link" and attributes.get("rel") == "canonical":
            self.canonical = attributes.get("href")


def audit(top=20, min_selects=2):
    pages = []
    total = 0
    examined = 0
    for path in sorted(PUBLIC.rglob("*.html")):
        if any(part in ("node_modules", "vendor", "fixtures") for part in path.parts):
            continue
        examined += 1
        doc = Inputs()
        doc.feed(path.read_text(encoding="utf-8", errors="replace"))
        total += len(doc.selects)
        if len(doc.selects) < min_selects:
            continue
        pages.append({
            "path": str(path.relative_to(ROOT)),
            "canonical": doc.canonical,
            "selects": len(doc.selects),
            "typed_inputs": len(doc.searches),
            "accessible_combos": len(doc.comboboxes),
            "select_ids": doc.selects[:24],
            "review_score": max(0, len(doc.selects) - 2 * len(doc.comboboxes))
        })
    pages.sort(key=lambda row: (-row["review_score"], -row["selects"], row["path"]))
    return {
        "purpose": "triage only; retain native finite-select controls where appropriate",
        "html_files_scanned": examined,
        "total_native_selects": total,
        "pages_above_threshold": len(pages),
        "top": pages[:top]
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--top", type=int, default=20)
    parser.add_argument("--min-selects", type=int, default=2)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    result = audit(max(0, args.top), max(1, args.min_selects))
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Scanned {result['html_files_scanned']} pages: "
              f"{result['total_native_selects']} select tags, "
              f"{result['pages_above_threshold']} pages over threshold")
        for row in result["top"]:
            print(f"  {row['selects']:2} native / {row['accessible_combos']} typed combos: {row['path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
