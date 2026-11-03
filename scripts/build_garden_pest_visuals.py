#!/usr/bin/env python3
"""Build and audit the Garden Pest Watch photo comparison catalog.

Python is the deterministic, offline evidence/QA layer. The existing Vercel
Node services retain authority for live weather and phenology. Photos and
symptoms are NEVER observations or predictive evidence.
Run: python3 scripts/build_garden_pest_visuals.py
     python3 scripts/build_garden_pest_visuals.py --check
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/garden-pest-visual-catalog.json"
TARGET = ROOT / "public/assets/garden-pest-visual-data.js"
ALLOWED_LICENSES = {
    "CC0 1.0", "CC BY 2.0", "CC BY 4.0", "CC BY-SA 3.0",
    "CC BY-SA 4.0",
}
ALLOWED_CROPS = {
    "squash", "cucumbers", "tomatoes", "brassicas", "potatoes",
    "beans", "corn", "lettuce", "grapes", "berries", "roses", "eggplant",
}
VALID_ID = re.compile(r"^[a-z]+(?:-[a-z]+)*$")
HEADER = "window.GardenPestVisualCatalog=Object.freeze("
FOOTER = ");\n"


def load_and_validate():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["schema"] == "garden-pest-visual-evidence-v1"
    clues = manifest["clues"]
    clue_ids = {item["id"] for item in clues}
    assert len(clue_ids) == len(clues) and len(clues) >= 6
    assert all(VALID_ID.fullmatch(item["id"]) and item["label"] for item in clues)
    pests = manifest["pests"]
    pest_ids = {item["id"] for item in pests}
    assert len(pest_ids) == len(pests) and len(pests) >= 6
    for item in pests:
        assert VALID_ID.fullmatch(item["id"])
        assert item["name"] and item["diagnostic"] and item["lookalike"]
        assert item["crops"] and set(item["crops"]) <= ALLOWED_CROPS
        assert item["clues"] and set(item["clues"]) <= clue_ids
        assert item["pest"]["file"] != item["damage"]["file"]
        for role in ("pest", "damage"):
            photo = item[role]
            assert photo["file"].lower().endswith((".jpg", ".jpeg", ".png"))
            assert "/" not in photo["file"] and "\\" not in photo["file"]
            assert photo["author"].strip() and photo["alt"].strip() and photo["caption"].strip()
            assert photo["license"] in ALLOWED_LICENSES, (item["id"], photo["license"])
    return manifest


def comparisons(manifest, crop, selected_clues):
    """Rank illustrated comparisons; never produce a diagnosis or risk probability."""
    selected = set(selected_clues)
    known = {v["id"] for v in manifest["clues"]}
    if not selected <= known:
        raise ValueError("Unknown symptom code")
    matches = []
    for item in manifest["pests"]:
        if crop not in item["crops"]:
            continue
        score = len(selected.intersection(item["clues"]))
        if selected and score == 0:
            continue
        matches.append((score, item["name"], item["id"]))
    return sorted(matches, key=lambda r: (-r[0], r[1]))


def serialize(manifest):
    return HEADER + json.dumps(
        manifest, separators=(",", ":"), ensure_ascii=False
    ) + FOOTER


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    manifest = load_and_validate()
    output = serialize(manifest)
    if args.check:
        if not TARGET.exists():
            raise SystemExit("FAIL: compiled visual-data JS missing")
        existing = TARGET.read_text(encoding="utf-8")
        if not existing.startswith(HEADER) or not existing.endswith(FOOTER):
            raise SystemExit("FAIL: compiled catalog wrapper changed")
        parsed = json.loads(existing[len(HEADER):-len(FOOTER)])
        if parsed != manifest:
            raise SystemExit("FAIL: compiled catalog differs from curated photo manifest")
    else:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_text(output, encoding="utf-8")
    assert comparisons(manifest, "squash", ["frass"])[0][2] == "squash-vine-borer"
    assert comparisons(manifest, "brassicas", ["shot-holes"])[0][2] == "flea-beetles"
    assert comparisons(manifest, "roses", ["skeletonized"])[0][2] == "japanese-beetle"
    assert not comparisons(manifest, "tomatoes", ["frass"])
    try:
        comparisons(manifest, "squash", ["unknown-symptom"])
    except ValueError:
        pass
    else:
        raise AssertionError("Unknown clue must be rejected")
    print(
        f"Garden photo evidence PASS: {len(manifest['pests'])} pests, "
        f"{len(manifest['pests']) * 2} licensed photographs, "
        f"{len(manifest['clues'])} symptom clues; "
        f"{'verified' if args.check else 'generated'} static catalog."
    )


if __name__ == "__main__":
    main()
