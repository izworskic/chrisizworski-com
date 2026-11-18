#!/usr/bin/env python3
"""Human-reviewed promotion of winter source-health evidence to the noindex desk.

The scheduled watch never writes site data. This manual command prepares a
review packet, checks its integrity, and, with an explicit reviewer receipt,
writes ONLY the two source-health JSON files in both the tracked preview and
published noindex pilot. It cannot author route-access or parking verdicts.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
PREVIEW = ROOT / "previews" / "great-lakes-winter-desk"
PUBLIC = ROOT / "public" / "great-lakes-winter-field-desk"
FILES = ("source-checks.json", "operator-notice-monitor.json", "monitor-report.json")
PROMOTED = FILES[:2]
ROUTES = ("gooseberry-upper", "munising-snowshoe", "meyers-lakeshore")
SCOPE = "source-observation-only"
PHRASE = "I reviewed the original NPS and DNR sources; this does not verify trail access."
MAX_AGE_HOURS = 3
HASH = re.compile(r"^[0-9a-f]{64}$")


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_bundle(directory: pathlib.Path):
    data = {}
    contents = {}
    for name in FILES:
        p = directory / name
        if not p.is_file() or p.is_symlink() or p.stat().st_size > 100_000:
            raise ValueError(f"Missing, linked, or oversized evidence file: {name}")
        raw = p.read_bytes()
        contents[name] = raw
        data[name] = json.loads(raw)
    return data, contents


def parse_time(value):
    try:
        stamp = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        return stamp if stamp.tzinfo else None
    except (ValueError, TypeError, AttributeError):
        return None


def age_ok(value, now):
    stamp = parse_time(value)
    if stamp is None:
        return False
    age = (now - stamp).total_seconds() / 3600
    return -0.1 <= age <= MAX_AGE_HOURS


def evaluate(data, contents, baseline, now=None):
    """Validate independent of the watcher's self-reported SUCCESS state."""
    now = now or dt.datetime.now(dt.timezone.utc)
    errors = []
    source = data.get(FILES[0], {})
    notices = data.get(FILES[1], {})
    report = data.get(FILES[2], {})
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "winter_desk_monitor_promotion", ROOT / "scripts" / "winter-desk-evidence-watch.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        recomputed = mod.evaluate(source, notices, now)
    except Exception as exc:
        errors.append(f"Cannot independently recompute monitor status: {type(exc).__name__}")
        recomputed = {}

    for label, value in (("condition generated", source.get("generatedAt")),
                         ("notice generated", notices.get("generatedAt")),
                         ("report checked", report.get("checkedAt"))):
        if not age_ok(value, now):
            errors.append(f"{label} timestamp is stale, future or unavailable")
    if recomputed.get("state") != "SOURCE_SIGNALS_PRESENT":
        errors.append("Official-source statements are changed, unavailable, invalid or stale")
    if report.get("schemaVersion") != 1 or report.get("state") != recomputed.get("state"):
        errors.append("Monitor report does not match a new independent evaluation")
    if report.get("requiresReview") is not False or report.get("accessVerified") is not False \
            or report.get("mayPublishAccessClaim") is not False:
        errors.append("Monitor report contains an unsafe publication or access claim")
    if report.get("routes") != recomputed.get("routes") or report.get("errors") != recomputed.get("errors"):
        errors.append("Monitor report route evidence is inconsistent with source data")
    if set(source.get("places", {})) != set(ROUTES) or set(notices.get("places", {})) != set(ROUTES):
        errors.append("Expected exactly three named route source records")

    for route in ROUTES:
        s = source.get("places", {}).get(route, {})
        n = notices.get("places", {}).get(route, {})
        if s.get("reachability") != "REACHED" or s.get("httpStatus") != 200 \
                or s.get("bodyTruncated") is not False or not HASH.fullmatch(s.get("bodyPrefixSha256") or ""):
            errors.append(f"{route}: missing complete official conditions HTML digest")
        if n.get("state") != "MATCHED" or n.get("sourceHttpStatus") != 200 \
                or not HASH.fullmatch(n.get("bodySha256") or ""):
            errors.append(f"{route}: operator notice statement is not verified in returned HTML")
        if not age_ok(s.get("retrievedAt"), now) or not age_ok(n.get("checkedAt"), now):
            errors.append(f"{route}: official observation is too old")
        if s.get("operatorAccess") != "NOT_DETERMINED" or n.get("operatorAccess") != "NOT_DETERMINED":
            errors.append(f"{route}: source health must not assert open or closed")

    baseline_digest = sha_bytes(b"".join(
        name.encode("ascii") + b"\0" + baseline[name] + b"\0" for name in PROMOTED))
    candidate_digest = sha_bytes(b"".join(
        name.encode("ascii") + b"\0" + contents[name] + b"\0" for name in FILES))
    return {
        "schemaVersion": 1,
        "mode": "source-health-review-only",
        "eligible": not errors,
        "errors": errors,
        "sourceState": recomputed.get("state", "MONITOR_ERROR"),
        "candidateDigest": candidate_digest,
        "baselineDigest": baseline_digest,
        "sourceUrls": sorted(set(
            [source.get("places", {}).get(route, {}).get("sourceUrl", "") for route in ROUTES] +
            [notices.get("places", {}).get(route, {}).get("sourceUrl", "") for route in ROUTES]
        )),
        "candidateTime": report.get("checkedAt"),
        "changedFiles": [name for name in PROMOTED if contents[name] != baseline[name]],
        "unchangedProtectedFiles": ["route-access-evidence.json", "arrival-evidence.json"],
        "notice": "Statement presence and page reachability only. No route access, parking, plowing or ice-safety verdict.",
    }


def approve_receipt(receipt, packet, now):
    errors = []
    if receipt.get("schemaVersion") != 1 or receipt.get("scope") != SCOPE:
        errors.append("Approval must be for source observations only")
    reviewer = receipt.get("reviewer")
    if not isinstance(reviewer, str) or len(reviewer.strip()) < 3 or reviewer.strip() in ("TBD", "UNKNOWN", "bot"):
        errors.append("A named human reviewer is required")
    if receipt.get("approvalPhrase") != PHRASE or receipt.get("verifiedNoOpening") is not True:
        errors.append("Required explicit no-trail-opening acknowledgement is missing")
    if receipt.get("candidateDigest") != packet["candidateDigest"] \
            or receipt.get("baselineDigest") != packet["baselineDigest"]:
        errors.append("Source files or baseline changed since human review")
    if receipt.get("reviewedSourceUrls") != packet["sourceUrls"]:
        errors.append("Review receipt must list all six exact original official URLs")
    if not age_ok(receipt.get("reviewedAt"), now):
        errors.append("Human review timestamp is missing, stale or in the future")
    if not packet["eligible"]:
        errors.append("Cannot approve a changed, stale or incomplete official source report")
    return errors


def writing_branch():
    try:
        result = subprocess.run(
            ["git", "symbolic-ref", "--quiet", "--short", "HEAD"],
            cwd=ROOT, capture_output=True, text=True, check=True, timeout=8)
        return result.stdout.strip()
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        return None


def promote(contents, baseline):
    """Stage two reviewed source-health files in preview and published pilot.

    Only --apply calls this helper, after the signed human receipt and non-main
    branch checks. Both targets must still match the reviewed baseline. The
    scheduled watcher remains read-only and cannot call this function.
    """
    destinations = (PREVIEW, PUBLIC)
    targets = []
    for directory in destinations:
        if not directory.is_dir() or directory.is_symlink():
            raise ValueError("Missing or linked winter desk destination")
        for name in PROMOTED:
            target = directory / name
            if not target.is_file() or target.is_symlink():
                raise ValueError(f"Unexpected winter desk source target: {target}")
            if target.read_bytes() != baseline[name]:
                raise ValueError(
                    f"Reviewed baseline differs from {directory.name}/{name}; "
                    "refuse partial or unreviewed public synchronization")
            targets.append((target, contents[name]))

    # Prepare every replacement before changing either directory. These remain
    # ordinary tracked-file edits for an independent pull-request review.
    temps = []
    try:
        for target, content in targets:
            fd, temp = tempfile.mkstemp(prefix=".winter-approved-", dir=target.parent)
            with os.fdopen(fd, "wb") as handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
            temps.append((pathlib.Path(temp), target))
        for temp, target in temps:
            os.replace(temp, target)
    finally:
        for temp, _ in temps:
            temp.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate-dir", type=pathlib.Path, required=True)
    parser.add_argument("--review-out", type=pathlib.Path)
    parser.add_argument("--approval", type=pathlib.Path)
    parser.add_argument("--apply", action="store_true",
                        help="requires named reviewer receipt; syncs two reviewed source files to preview and noindex pilot")
    args = parser.parse_args()
    if args.apply and (not args.approval or args.review_out):
        parser.error("--apply needs --approval and cannot also --review-out")
    if not args.apply and args.approval:
        parser.error("--approval is valid only with --apply")

    try:
        candidate = args.candidate_dir.resolve(strict=True)
        if candidate == PREVIEW.resolve() or PREVIEW.resolve() in candidate.parents:
            raise ValueError("Candidate must be external to tracked visitor preview")
        data, contents = read_bundle(candidate)
        if any(not isinstance(value, dict) for value in data.values()):
            raise ValueError("All three evidence documents must be JSON objects")
        baseline = {name: (PREVIEW / name).read_bytes() for name in PROMOTED}
        packet = evaluate(data, contents, baseline)
        if args.review_out:
            target = args.review_out.resolve()
            if target == PREVIEW.resolve() or PREVIEW.resolve() in target.parents:
                raise ValueError("Review output cannot overwrite tracked preview data")
            target.mkdir(parents=True, exist_ok=True)
            (target / "review.json").write_text(json.dumps(packet, indent=2) + "\n")
            template = {
                "schemaVersion": 1, "scope": SCOPE, "reviewer": "TBD",
                "reviewedAt": "TBD", "candidateDigest": packet["candidateDigest"],
                "baselineDigest": packet["baselineDigest"],
                "reviewedSourceUrls": packet["sourceUrls"],
                "verifiedNoOpening": False, "approvalPhrase": PHRASE,
            }
            (target / "approval-template.json").write_text(json.dumps(template, indent=2) + "\n")
            lines = [
                "# Winter Field Desk source-health promotion review",
                "",
                "Status: **" + ("ELIGIBLE FOR HUMAN REVIEW" if packet["eligible"] else "HOLD") + "**",
                "Candidate checked: " + str(packet["candidateTime"]),
                "Candidate SHA-256: `" + packet["candidateDigest"] + "`",
                "Baseline SHA-256: `" + packet["baselineDigest"] + "`",
                "Changed files: " + (", ".join(packet["changedFiles"]) or "none"),
                "",
                "## Original official source pages to inspect",
            ]
            lines.extend("- " + url for url in packet["sourceUrls"])
            lines.extend([
                "",
                "## Required human decision",
                "Review each original source above and compare the two candidate JSON files",
                "against the checked-in noindex preview. A page responding HTTP 200 or",
                "containing a historical policy phrase does NOT establish today's trail",
                "opening, safe ice, plowed parking or a closure of a different trail.",
                "",
                "If all observations are still accurate, fill in approval-template.json:",
                "a real reviewer identity, UTC reviewedAt, verifiedNoOpening: true,",
                "the exact source URL list, both SHA-256 hashes and the required phrase.",
                "Then use the --apply --approval options on a non-main review branch.",
                "The reviewed two source files update BOTH preview and public noindex",
                "pilot copies in the same GitHub pull request, never by cron.",
                "Review the resulting four-file git diff and require an ordinary PR review.",
                "This script does not authenticate the claimed reviewer identity.",
                "",
                "Never promote a changed or unavailable source as an opening. A HOLD",
                "requires fresh source review, not an automated fallback.",
                "",
                "## Validation errors",
            ])
            lines.extend("- " + issue for issue in packet["errors"])
            if not packet["errors"]:
                lines.append("- None in automated evidence health checks")
            (target / "REVIEW.md").write_text("\n".join(lines) + "\n")
        if args.apply:
            branch = writing_branch()
            if not branch or branch in ("main", "master"):
                raise ValueError("Preview source promotion requires a named review branch, not main or detached HEAD")
            receipt = json.loads(args.approval.read_text(encoding="utf-8"))
            faults = approve_receipt(receipt, packet, dt.datetime.now(dt.timezone.utc))
            if faults:
                raise ValueError("; ".join(faults))
            promote(contents, baseline)
            packet["appliedToBranch"] = branch
            packet["appliedFiles"] = [str(directory.relative_to(ROOT) / name)
                                      for directory in (PREVIEW, PUBLIC) for name in PROMOTED]
        print(json.dumps(packet, indent=2))
        if not packet["eligible"]:
            return 2
        return 0
    except (ValueError, FileNotFoundError, json.JSONDecodeError, OSError) as exc:
        print(json.dumps({"status":"HOLD","reason":str(exc),"accessVerified":False}),file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
