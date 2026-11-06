#!/usr/bin/env python3
"""Independent zero-network fixtures for official mission reconciliation."""
import unittest
from datetime import datetime,timezone,timedelta
from rocket_official_matcher import (
    INDEXES,markers,event_url,discover,extract_event,prospective_date,
    validate_manifest,reconcile,collect_evidence,iso
)
UTC=timezone.utc
NOW=datetime(2026,11,5,18,tzinfo=UTC)
VID="0f9d86a2-8132-42c6-b203-91d4116b3d17"
WID="68ce1112-85f6-49e2-b5f2-61d98b87af90"
WRONG="7872b8a7-b930-4451-b1f3-81ac5039d446"
CAL_URL="https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/7000000/ussf-259-launch-announced/"
WAL_URL="https://www.nasa.gov/blogs/wallops/2026/11/05/haste-12-launch-announced/"
def manifest(checked=None,health="recent"):
    return {"ok":True,"version":1,"health":health,
      "checkedAt":iso(checked or NOW),"missions":[
        {"id":VID,"region":"california","name":"USSF-259 | Falcon 9",
         "net":"2026-11-06T22:30:00Z","netPrecision":"minute","sourceStale":False},
        {"id":WID,"region":"virginia","name":"HASTE 12 | Rocket Lab",
         "net":"2026-11-12T17:00:00Z","netPrecision":"minute","sourceStale":False},
        {"id":WRONG,"region":"florida","name":"USSF-259 | Falcon 9",
         "net":"2026-11-06T22:30:00Z","netPrecision":"minute","sourceStale":False}
       ]}
def record(sid,url,title,body):
    return extract_event({"sourceId":sid,"region":"virginia" if sid=="wallops-range-blog" else "california",
       "url":url,"title":title},
       "<html><body><article><h1>"+title+"</h1><p>"+body+"</p></article></body></html>",NOW)
def ussf_event():
    return record("vandenberg-launch-news",CAL_URL,"Space Force approves USSF-259 mission",
       "The U.S. Space Force approved the launch of USSF-259 from Vandenberg. "
       "The Falcon 9 rocket is scheduled to launch November 6, 2026 from Vandenberg Space Force Base.")
def haste_event():
    return record("wallops-range-blog",WAL_URL,"HASTE 12 launch from NASA Wallops",
       "NASA Wallops Flight Facility in Virginia is targeting a HASTE 12 rocket launch on November 12, 2026 from Wallops Island.")
class MissionReconciliationTests(unittest.TestCase):
    def test_distinctive_markers_only(self):
        self.assertEqual(markers("Starlink Group 15-24 and USSF-259"),{"USSF-259"})
        self.assertEqual(markers("USSF 259"),{"USSF-259"})
        self.assertEqual(markers("Falcon 9 rocket launch"),set())
        self.assertEqual(markers("TOMEX+"),{"TOMEX+"})
        self.assertEqual(markers("HASTE 12"),{"HASTE-12"})

    def test_exact_official_link_hosts_and_paths(self):
        self.assertEqual(event_url("wallops-range-blog",WAL_URL),WAL_URL)
        self.assertIsNone(event_url("wallops-range-blog","https://www.nasa.gov.evil.example/blogs/wallops/2026/11/05/x"))
        self.assertIsNone(event_url("wallops-range-blog","https://www.nasa.gov/events/"))
        self.assertIsNone(event_url("vandenberg-launch-news","https://attacker.com/News/Article-Display/Article/7000000/fake/"))
        self.assertIsNone(event_url("wallops-range-blog","//attacker.com/"))
        self.assertEqual(event_url("vandenberg-launch-news",CAL_URL+"?utm_source=x"),CAL_URL)

    def test_index_discovery_filters_archive_and_limits_article_fetches(self):
        blog="<a href='"+WAL_URL+"'>NASA HASTE 12 rocket launch</a>"
        past="<a href='/blogs/wallops/2026/09/30/nasa-wallops-launch/'>NASA rocket launch in October</a>"
        self.assertEqual(len(discover("wallops-range-blog",blog+past,NOW)),1)
        self.assertEqual(discover("wallops-range-blog",past,NOW),[])

    def test_strict_forward_launch_date_not_publication_or_report_date(self):
        self.assertEqual(prospective_date(
            "Space Force plans to launch the USSF-259 rocket on November 6, 2026.",NOW),"2026-11-06")
        self.assertIsNone(prospective_date(
            "Published November 5, 2026. USSF-259 rocket lifted off yesterday.",NOW))
        self.assertIsNone(prospective_date(
            "Falcon 9 successfully launched on November 6, 2026.",NOW))
        self.assertIsNone(prospective_date(
            "NASA rocket is scheduled to launch later this year.",NOW))
        self.assertIsNone(prospective_date(
            "NASA Wallops range will support a rocket launch on Nov 2 2024.",NOW))

    def test_positive_space_force_article_requires_date_and_same_range(self):
        event=ussf_event()
        self.assertIsNotNone(event)
        self.assertEqual(event["markers"],["USSF-259"])
        out=reconcile([event],manifest(),NOW)
        self.assertEqual(out["health"],"matched-with-current-ll2")
        self.assertEqual(out["matches"][0]["launchId"],VID)
        self.assertEqual(out["matches"][0]["matchRule"],"exact-designation-and-local-date")
        self.assertEqual(out["matches"][0]["accessStatus"],"not-evaluated")
        self.assertEqual(out["matches"][0]["officialEventDate"],"2026-11-06")

    def test_wallops_suborbital_article_positively_matches_only_same_region(self):
        event=haste_event()
        self.assertIsNotNone(event)
        self.assertEqual(event["publishedDate"],"2026-11-05")
        out=reconcile([event],manifest(),NOW)
        self.assertEqual(out["matches"][0]["launchId"],WID)

    def test_fails_closed_for_location_time_identity_and_operator_ambiguity(self):
        e=ussf_event();self.assertIsNotNone(e)
        bad=manifest()
        bad["missions"][0]["net"]="2026-11-20T21:00:00Z"
        self.assertEqual(reconcile([e],bad,NOW)["matches"],[])
        bad=manifest()
        bad["missions"][0]["region"]="texas"
        self.assertEqual(reconcile([e],bad,NOW)["matches"],[])
        bad=manifest()
        bad["missions"][0]["name"]="Falcon 9 generic payload"
        self.assertEqual(reconcile([e],bad,NOW)["matches"],[])
        bad=manifest()
        bad["missions"].append(dict(bad["missions"][0],id="41006347-a507-459a-8b07-826ae76a5cbc"))
        self.assertEqual(reconcile([e],bad,NOW)["matches"],[])
        self.assertGreaterEqual(reconcile([e],bad,NOW)["conflicts"],1)

    def test_no_military_launch_identity_from_generic_nasa_range_notice(self):
        notice=record("wallops-range-blog",WAL_URL,"NASA Wallops to support sounding rocket launch",
            "NASA Wallops Flight Facility in Virginia is scheduled to support a rocket launch November 12, 2026 "
            "for a fleet exercise. The flight is not a public spectator launch.")
        self.assertIsNone(notice)
        offsite=record("wallops-range-blog",WAL_URL,"NASA Wallops rocket mission HASTE 12",
            "NASA Wallops supports HASTE 12 launch scheduled November 12, 2026 from Poker Flat Research Range, Alaska.")
        self.assertIsNone(offsite)

    def test_old_blog_card_and_stale_schedule_cannot_match(self):
        event=ussf_event()
        self.assertEqual(reconcile([event],manifest(checked=NOW-timedelta(hours=2)),NOW)["matches"],[])
        self.assertEqual(reconcile([event],manifest(health="stale"),NOW)["matches"],[])
        self.assertIsNone(validate_manifest({"version":1,"health":"recent","checkedAt":iso(NOW),
                                             "missions":[{"id":"fake","region":"virginia"}]},NOW))

    def test_duplicate_contradictory_agency_notices_never_create_go(self):
        first=ussf_event()
        second=dict(first,articleUrl=CAL_URL.replace("7000000","7000001"),
                    officialEventDate="2026-11-07",sourceFingerprint="f"*24)
        out=reconcile([first,second],manifest(),NOW)
        self.assertEqual(out["matches"],[])
        self.assertEqual(out["conflicts"],1)

    def test_real_publisher_fetch_failure_is_unknown_no_imagined_evidence(self):
        def fail(url,host,size):
            raise OSError("blocked")
        out=collect_evidence(manifest(),NOW,fail)
        self.assertEqual(out["matches"],[])
        self.assertEqual(len(out["sourceStatus"]),2)
        self.assertTrue(all(s["status"]=="unavailable" for s in out["sourceStatus"]))
    def test_no_article_published_date_as_event_date(self):
        event=record("wallops-range-blog",WAL_URL,"NASA HASTE 12",
            "NASA Wallops posted an update on November 5, 2026. The rocket has no announced launch window.")
        self.assertIsNone(event)
if __name__=="__main__":
    unittest.main()
