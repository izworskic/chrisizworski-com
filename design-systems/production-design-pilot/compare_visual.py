"""Compare deterministic design-lab captures. Never updates a reference."""
import argparse
import hashlib
import json
import re
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageOps

EXPECTED = {
    "lab-1280.png", "lab-1280-alternate-focus.png",
    "lab-1280-cross-family.png", "lab-390.png",
    "lab-390-alternate-focus.png", "lab-390-cross-family.png",
    "lab-390-no-js.png",
}


def validate_manifest(manifest):
    if (manifest.get("schema") != 1
            or not re.fullmatch(r"[0-9a-f]{40}", manifest.get("reviewedSource", ""))
            or manifest.get("comparison") != {
                "mode": "same-run-recapture-pinned-source",
                "pixelTolerance": 0, "mask": "none",
            }):
        raise ValueError("Invalid reference identity or comparison policy")
    images = manifest.get("images", [])
    if len(images) != len(EXPECTED) or {i["file"] for i in images} != EXPECTED:
        raise ValueError("Reference must retain all seven reviewed states")
    for item in images:
        if not re.fullmatch(r"[0-9a-f]{64}", item.get("sha256", "")):
            raise ValueError("Missing reviewed screenshot provenance")
        if not all(isinstance(item.get(k), int) and item[k] > 0 for k in ("width", "height")):
            raise ValueError("Invalid reviewed dimensions")


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def compare_pair(before, after, diff_path):
    with Image.open(before) as b, Image.open(after) as a:
        ref, new = b.convert("RGB"), a.convert("RGB")
    result = {"referenceSize": list(ref.size), "candidateSize": list(new.size),
              "referenceSHA256": digest(before), "candidateSHA256": digest(after)}
    if ref.size != new.size:
        result.update(status="REVIEW_REQUIRED", reason="dimensions_changed")
        return result
    r, g, b = ImageChops.difference(ref, new).split()
    mask = ImageChops.lighter(ImageChops.lighter(r, g), b).point(
        lambda value: 255 if value else 0)
    changed = mask.histogram()[255]
    result.update(changedPixels=changed, totalPixels=ref.width * ref.height,
                  changedFraction=changed / (ref.width * ref.height),
                  changedBounds=list(mask.getbbox()) if changed else None,
                  status="REVIEW_REQUIRED" if changed else "PASS")
    if changed:
        muted = Image.blend(ref, ImageOps.grayscale(ref).convert("RGB"), .65)
        Image.composite(Image.new("RGB", ref.size, "#dc2626"), muted, mask).save(diff_path)
    return result


def compare(manifest, reference, candidate, output):
    validate_manifest(manifest)
    output.mkdir(parents=True, exist_ok=True)
    reference_names = {p.name for p in reference.glob("*.png")}
    candidate_names = {p.name for p in candidate.glob("*.png")}
    inventory_ok = reference_names == candidate_names == EXPECTED
    report = {
        "reviewedSource": manifest["reviewedSource"],
        "comparison": "Both renders captured in the same runner, no masks or tolerance",
        "missingReference": sorted(EXPECTED - reference_names),
        "missingCandidate": sorted(EXPECTED - candidate_names),
        "unexpectedReference": sorted(reference_names - EXPECTED),
        "unexpectedCandidate": sorted(candidate_names - EXPECTED),
        "images": {},
    }
    for name in sorted(EXPECTED & reference_names & candidate_names):
        result = compare_pair(reference / name, candidate / name,
                              output / ("diff-" + name))
        report["images"][name] = result
        print(name, result["status"], result.get("changedPixels", result.get("reason")))
    passed = inventory_ok and all(i["status"] == "PASS" for i in report["images"].values())
    report["status"] = "PASS" if passed else "REVIEW_REQUIRED"
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    return passed


def self_test():
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        before, after, diff = [root / (n + ".png") for n in ("before", "after", "diff")]
        image = Image.new("RGB", (10, 10), "#ffffff")
        image.save(before)
        image.save(after)
        assert compare_pair(before, after, diff)["status"] == "PASS"
        assert not diff.exists()
        image.putpixel((4, 5), (254, 255, 255))
        image.save(after)
        changed = compare_pair(before, after, diff)
        assert changed["status"] == "REVIEW_REQUIRED"
        assert changed["changedPixels"] == 1
        assert changed["changedBounds"] == [4, 5, 5, 6]
        assert diff.exists()
        Image.new("RGB", (9, 10), "#ffffff").save(after)
        assert compare_pair(before, after, diff)["reason"] == "dimensions_changed"
        manifest = json.loads((Path(__file__).parent / "visual-reference.json").read_text())
        for name in ("reference", "candidate"):
            directory = root / name
            directory.mkdir()
            for state in EXPECTED:
                image.save(directory / state)
        assert compare(manifest, root / "reference", root / "candidate", root / "pass")
        (root / "candidate" / "lab-390-no-js.png").unlink()
        assert not compare(manifest, root / "reference", root / "candidate", root / "missing")
        image.save(root / "candidate" / "lab-390-no-js.png")
        image.save(root / "candidate" / "unexpected.png")
        assert not compare(manifest, root / "reference", root / "candidate", root / "extra")
    print("Negative controls passed: one pixel, dimensions, missing and extra states detected.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--reference", type=Path)
    parser.add_argument("--candidate", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.self_test:
        self_test()
    elif all((args.manifest, args.reference, args.candidate, args.output)):
        raise SystemExit(0 if compare(json.loads(args.manifest.read_text()),
                                     args.reference, args.candidate, args.output) else 1)
    else:
        parser.error("Provide --self-test or all four comparison paths")
