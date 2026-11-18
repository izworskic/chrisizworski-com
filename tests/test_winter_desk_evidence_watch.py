"""Offline regression tests for scheduled winter evidence collection and launch HOLD."""
from __future__ import annotations

import copy
import datetime as dt
import importlib.util
import json
import pathlib
import subprocess
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
SCRIPTS=ROOT/"scripts"
INSTANT=dt.datetime(2026,11,17,22,0,tzinfo=dt.timezone.utc)
STAMP="2026-11-17T22:00:00Z"

def load(path,label):
    spec=importlib.util.spec_from_file_location(label,SCRIPTS/path)
    obj=importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(obj)
    return obj

watch=load("winter-desk-evidence-watch.py","desk_watch_test")
source=load("refresh-winter-desk-sources.py","desk_source_test")
notice=load("refresh-winter-desk-operator-notices.py","desk_notice_test")

def fixtures():
    sources=source.build(fetch=lambda url,t:{
        "reachability":"REACHED","retrievedAt":t,"operatorAccess":"NOT_DETERMINED"
    },now=STAMP)
    notices=notice.build(now=STAMP,fetch=lambda rule,t:{
        "state":"MATCHED","checkedAt":t
    })
    return sources,notices

class EvidenceWatchContractTests(unittest.TestCase):
    def test_six_official_signals_are_monitor_health_not_openings(self):
        sources,notices=fixtures()
        report=watch.evaluate(sources,notices,INSTANT)
        self.assertEqual(report["state"],"SOURCE_SIGNALS_PRESENT")
        self.assertFalse(report["requiresReview"])
        self.assertIs(report["accessVerified"],False)
        self.assertIs(report["mayPublishAccessClaim"],False)
        self.assertEqual(len(report["routes"]),3)
        self.assertEqual(report["errors"],[])

    def test_missing_official_phrase_needs_editorial_review_not_reopening(self):
        sources,notices=fixtures()
        notices["places"]["meyers-lakeshore"]["state"]="REVIEW_REQUIRED"
        report=watch.evaluate(sources,notices,INSTANT)
        self.assertEqual(report["state"],"REVIEW_REQUIRED")
        self.assertTrue(report["requiresReview"])
        self.assertIn("meyers-lakeshore",[x["routeId"] for x in report["routes"] if x["needsReview"]])
        self.assertFalse(report["mayPublishAccessClaim"])

    def test_nps_source_outage_never_turns_into_open_or_closed(self):
        sources,notices=fixtures()
        sources["places"]["munising-snowshoe"]["reachability"]="UNAVAILABLE"
        report=watch.evaluate(sources,notices,INSTANT)
        self.assertEqual(report["state"],"REVIEW_REQUIRED")
        self.assertFalse(report["mayPublishAccessClaim"])

    def test_stale_timestamp_blocks_monitor_health(self):
        sources,notices=fixtures()
        notices["places"]["gooseberry-upper"]["checkedAt"]="2026-11-16T20:00:00Z"
        report=watch.evaluate(sources,notices,INSTANT)
        self.assertEqual(report["state"],"REVIEW_REQUIRED")
        self.assertTrue(any("timestamp" in e for e in report["errors"]))

    def test_operator_access_assertion_rejected(self):
        sources,notices=fixtures()
        sources["places"]["meyers-lakeshore"]["operatorAccess"]="OPEN"
        report=watch.evaluate(sources,notices,INSTANT)
        self.assertEqual(report["state"],"REVIEW_REQUIRED")
        self.assertTrue(any("operator access" in e for e in report["errors"]))

    def test_source_origin_mismatch_rejected(self):
        sources,notices=fixtures()
        notices["places"]["munising-snowshoe"]["sourceUrl"]="https://untrusted.example/"
        report=watch.evaluate(sources,notices,INSTANT)
        self.assertEqual(report["state"],"REVIEW_REQUIRED")
        self.assertIn("operator-notice contract invalid",report["errors"])

    def test_future_time_rejected(self):
        sources,notices=fixtures()
        sources["places"]["gooseberry-upper"]["retrievedAt"]="2026-11-18T04:00:00Z"
        report=watch.evaluate(sources,notices,INSTANT)
        self.assertTrue(report["requiresReview"])
        self.assertFalse(report["mayPublishAccessClaim"])

    def test_monitor_workflow_never_writes_main_or_deploys(self):
        workflow=(ROOT/".github/workflows/winter-field-evidence-watch.yml").read_text()
        self.assertIn("contents: read",workflow)
        self.assertIn("issues: write",workflow)
        self.assertIn("actions/upload-artifact@v4",workflow)
        self.assertIn("winter-desk-unsigned-review-packet",workflow)
        self.assertIn("--review-out",workflow)
        self.assertNotIn(" --apply",workflow)
        self.assertIn("workflow_dispatch:",workflow)
        self.assertIn("schedule:",workflow)
        self.assertNotIn("git push",workflow)
        self.assertNotIn("contents: write",workflow)
        self.assertIn("if: github.event_name != 'pull_request'",workflow)

    def test_preview_pass_and_public_release_remains_blocked(self):
        script=SCRIPTS/"winter-desk-release-gate.cjs"
        preview=subprocess.run(["node",str(script),"--preview"],capture_output=True,text=True,cwd=ROOT)
        self.assertEqual(preview.returncode,0,preview.stderr+preview.stdout)
        report=json.loads(preview.stdout)
        self.assertEqual(report["status"],"PREVIEW_PASS")
        self.assertFalse(report["publicLaunchApproved"])
        publish=subprocess.run(["node",str(script),"--release"],capture_output=True,text=True,cwd=ROOT)
        self.assertEqual(publish.returncode,3,publish.stderr+publish.stdout)
        report=json.loads(publish.stdout)
        self.assertEqual(report["status"],"HOLD")
        self.assertTrue(report["releaseBlockers"])
        self.assertFalse(report["publicLaunchApproved"])


if __name__=="__main__":
    unittest.main()
