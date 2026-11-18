"""Evidence promotion requires exact source digests and an explicit reviewed receipt.

No test asserts a real park opening. Only fabricated source-health fixtures are
used; the two production protected files are never modified by this suite.
"""
from __future__ import annotations

import datetime as dt
import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
SCRIPTS=ROOT/"scripts"
NOW=dt.datetime(2026,11,18,13,0,tzinfo=dt.timezone.utc)
STAMP="2026-11-18T13:00:00Z"
DIGEST="a"*64

def load(filename,label):
    spec=importlib.util.spec_from_file_location(label,SCRIPTS/filename)
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

promotion=load("winter-desk-evidence-promotion.py","winter_desk_promotion_test")
sources=load("refresh-winter-desk-sources.py","winter_desk_source_promotion_test")
notices=load("refresh-winter-desk-operator-notices.py","winter_desk_notices_promotion_test")
watch=load("winter-desk-evidence-watch.py","winter_desk_watcher_promotion_test")

def fixture():
    a=sources.build(fetch=lambda url,checked:{
        "reachability":"REACHED","retrievedAt":checked,"httpStatus":200,
        "bodyTruncated":False,"bodyPrefixSha256":DIGEST,
        "operatorAccess":"NOT_DETERMINED"
    },now=STAMP)
    b=notices.build(now=STAMP,fetch=lambda rule,checked:{
        "state":"MATCHED","checkedAt":checked,"sourceHttpStatus":200,
        "bodySha256":"b"*64,
    })
    c=watch.evaluate(a,b,NOW)
    docs={"source-checks.json":a,"operator-notice-monitor.json":b,"monitor-report.json":c}
    raw={name:(json.dumps(value,indent=2)+"\n").encode() for name,value in docs.items()}
    base={name:b'{"existing":"unrelated previous checked source"}\n' for name in promotion.PROMOTED}
    return docs,raw,base

class EvidencePromotionReviewTests(unittest.TestCase):
    def setUp(self):
        self.docs,self.raw,self.base=fixture()

    def assessment(self):
        return promotion.evaluate(self.docs,self.raw,self.base,NOW)

    def receipt(self,packet):
        return {
            "schemaVersion":1,"scope":promotion.SCOPE,"reviewer":"Site editor",
            "reviewedAt":STAMP,"candidateDigest":packet["candidateDigest"],
            "baselineDigest":packet["baselineDigest"],"reviewedSourceUrls":packet["sourceUrls"],
            "verifiedNoOpening":True,"approvalPhrase":promotion.PHRASE,
        }

    def test_six_independently_validated_sources_are_review_eligible_not_open(self):
        p=self.assessment()
        self.assertTrue(p["eligible"],p["errors"])
        self.assertEqual(p["sourceState"],"SOURCE_SIGNALS_PRESENT")
        self.assertEqual(p["changedFiles"],list(promotion.PROMOTED))
        self.assertEqual(len(p["sourceUrls"]),6)
        self.assertIn("route-access-evidence.json",p["unchangedProtectedFiles"])

    def test_receipt_needs_named_reviewer_exact_content_and_no_open_acknowledgement(self):
        packet=self.assessment()
        good=self.receipt(packet)
        self.assertEqual(promotion.approve_receipt(good,packet,NOW),[])
        for key,value in (
            ("reviewer","TBD"),("reviewedAt","2026-11-17T00:00:00Z"),
            ("candidateDigest","f"*64),("baselineDigest","f"*64),
            ("reviewedSourceUrls",[]),("verifiedNoOpening",False),
            ("approvalPhrase","I approve opening the trails")
        ):
            bad=dict(good)
            bad[key]=value
            self.assertTrue(promotion.approve_receipt(bad,packet,NOW),key)

    def test_claimed_success_cannot_override_source_drift(self):
        self.docs["operator-notice-monitor.json"]["places"]["meyers-lakeshore"]["state"]="REVIEW_REQUIRED"
        self.assertFalse(self.assessment()["eligible"])

    def test_missing_and_truncated_conditions_html_is_not_eligible(self):
        row=self.docs["source-checks.json"]["places"]["gooseberry-upper"]
        for key,value in (("bodyTruncated",True),("bodyPrefixSha256","invalid"),("httpStatus",304)):
            original=row[key]
            row[key]=value
            self.assertFalse(self.assessment()["eligible"],key)
            row[key]=original

    def test_operator_access_open_claim_is_rejected(self):
        row=self.docs["source-checks.json"]["places"]["munising-snowshoe"]
        row["operatorAccess"]="OPEN"
        self.assertFalse(self.assessment()["eligible"])

    def test_stale_and_future_reports_are_rejected(self):
        self.docs["source-checks.json"]["generatedAt"]="2026-11-17T01:00:00Z"
        self.assertFalse(self.assessment()["eligible"])
        self.docs["source-checks.json"]["generatedAt"]="2026-11-18T18:00:00Z"
        self.assertFalse(self.assessment()["eligible"])

    def test_inconsistent_monitor_report_does_not_get_approved(self):
        self.docs["monitor-report.json"]["routes"]=[]
        self.assertFalse(self.assessment()["eligible"])

    def test_manual_copy_affects_only_two_source_health_files(self):
        with tempfile.TemporaryDirectory() as folder:
            dest=pathlib.Path(folder)
            sentinel={"route-access-evidence.json":b"NO ROUTE ACCESS VERIFIED\n",
                      "arrival-evidence.json":b"NO PARKING ACCESS VERIFIED\n"}
            for name,content in {**self.base,**sentinel}.items():
                (dest/name).write_bytes(content)
            original=promotion.PREVIEW
            try:
                promotion.PREVIEW=dest
                promotion.promote(self.raw)
            finally:
                promotion.PREVIEW=original
            for name in promotion.PROMOTED:
                self.assertEqual((dest/name).read_bytes(),self.raw[name])
            for name,content in sentinel.items():
                self.assertEqual((dest/name).read_bytes(),content)

    def test_file_receipt_digests_change_when_sources_or_baseline_change(self):
        before=self.assessment()
        self.raw["source-checks.json"]+=b"\n"
        after=self.assessment()
        self.assertNotEqual(before["candidateDigest"],after["candidateDigest"])
        self.assertTrue(promotion.approve_receipt(self.receipt(before),after,NOW))
        self.raw["source-checks.json"]=self.raw["source-checks.json"].rstrip()+b"\n"
        self.base["source-checks.json"]=b'{"changed":"concurrent review"}\n'
        concurrent=self.assessment()
        self.assertNotEqual(before["baselineDigest"],concurrent["baselineDigest"])

if __name__=="__main__":
    unittest.main()
