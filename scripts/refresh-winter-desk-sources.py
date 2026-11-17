#!/usr/bin/env python3
"""Check source reachability, never park access, for the Lake Superior winter desk.

Output is a bounded JSON cache of when official condition pages could be reached.
This worker DOES NOT decide whether a trail is open, plowed, ice-safe or groomed.
Run deliberately at build time or through an approved future schedule. A request
failure is UNAVAILABLE; no silent reused success. Standard library only.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "previews/great-lakes-winter-desk/source-checks.json"
SOURCES = {
    "gooseberry-upper": "https://www.dnr.state.mn.us/trailconditions/index.html",
    "munising-snowshoe": "https://www.nps.gov/piro/planyourvisit/conditions.htm",
    "meyers-lakeshore": "https://www.nps.gov/apis/planyourvisit/conditions.htm",
}
EXPECTED_HOSTS = {"www.nps.gov", "www.dnr.state.mn.us"}
USER_AGENT = "ChrisIzworskiWinterDesk/1.0 (chrisizworski.com; evidence-reachability)"
MAX_BYTES = 262144

def utc_now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

def safe_url(url):
    parsed = urllib.parse.urlparse(url)
    return parsed.scheme == "https" and parsed.netloc in EXPECTED_HOSTS

def probe(url, now):
    if not safe_url(url):
        return {"reachability": "UNAVAILABLE", "reason": "unapproved official host"}
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            final_url = response.geturl()
            if not safe_url(final_url):
                raise ValueError("redirected outside the official host allowlist")
            code = response.status
            if code != 200:
                raise ValueError(f"unexpected response code {code}")
            kind = response.headers.get("Content-Type", "").lower()
            if "html" not in kind:
                raise ValueError("unexpected response media type")
            data = response.read(MAX_BYTES + 1)
            partial = len(data) > MAX_BYTES
            data = data[:MAX_BYTES]
            return {
                "reachability": "REACHED",
                "retrievedAt": now,
                "httpStatus": code,
                "lastModifiedHeader": response.headers.get("Last-Modified"),
                "bodyPrefixSha256": hashlib.sha256(data).hexdigest(),
                "bodyTruncated": partial,
                "operatorAccess": "NOT_DETERMINED",
            }
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        # A missing source is never a closed/open verdict.
        return {
            "reachability": "UNAVAILABLE",
            "retrievedAt": now,
            "reason": type(exc).__name__,
            "operatorAccess": "NOT_DETERMINED",
        }

def build(fetch=probe, now=None):
    now = now or utc_now()
    return {
        "schemaVersion": 1,
        "generatedAt": now,
        "meaning": "Official source reachability only. Does not verify winter access or route condition.",
        "accessVerified": False,
        "places": {
            key: {"sourceUrl": url, **fetch(url, now)}
            for key, url in SOURCES.items()
        },
    }

def valid(doc):
    if doc.get("schemaVersion") != 1 or doc.get("accessVerified") is not False:
        return False
    if set(doc.get("places", {})) != set(SOURCES):
        return False
    for key, row in doc["places"].items():
        if row.get("sourceUrl") != SOURCES[key]:
            return False
        if row.get("operatorAccess") != "NOT_DETERMINED":
            return False
        if row.get("reachability") not in ("REACHED", "UNAVAILABLE"):
            return False
        if row.get("reachability") == "REACHED" and not row.get("retrievedAt"):
            return False
    return True

def self_test():
    now = "2026-11-17T15:00:00Z"
    doc = build(lambda url, t: {"reachability": "REACHED", "retrievedAt": t, "operatorAccess": "NOT_DETERMINED"}, now)
    assert valid(doc)
    assert doc["accessVerified"] is False
    assert not safe_url("http://www.nps.gov/unsafe")
    assert not safe_url("https://malicious.example/path")
    doc["places"]["gooseberry-upper"]["operatorAccess"] = "OPEN"
    assert not valid(doc)
    return True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true", help="run fixtures without network")
    parser.add_argument("--output", type=pathlib.Path, default=OUT)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        print("PASS source desk offline safety and provenance fixtures")
        return
    doc = build()
    if not valid(doc):
        raise SystemExit("Source output failed its own validation")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"output": str(args.output), "states": {k: v["reachability"] for k, v in doc["places"].items()}}, indent=2))

if __name__ == "__main__":
    main()
