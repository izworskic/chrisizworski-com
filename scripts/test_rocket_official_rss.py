#!/usr/bin/env python3
"""No-network official RSS provenance and matched mission safety fixtures."""
import unittest
from datetime import datetime,timezone,timedelta
from rocket_official_matcher import (RSS_SOURCE,official_rss_events,rss_article_url,
                                     collect_evidence,reconcile,iso)
NOW=datetime(2026,11,5,18,tzinfo=timezone.utc)
ID="0f9d86a2-8132-42c6-b203-91d4116b3d17"
URL="https://www.spaceforce.mil/News/Article-Display/Article/7000000/vandenberg-ussf-259-launch/"
def feed(title="Space Force approves USSF-259 mission launch",
         description=("The U.S. Space Force approved the launch of USSF-259 from Vandenberg Space Force Base. "
                      "A Falcon 9 rocket carrying USSF-259 is scheduled to launch November 6, 2026 at Vandenberg."),
         link=URL,published="Thu, 05 Nov 2026 13:00:00 GMT"):
    return ('<?xml version="1.0" encoding="utf-8"?>'
            '<rss version="2.0"><channel><title>U.S. Space Force News</title><item>'
            '<title>'+title+'</title><description><![CDATA['+description+']]></description>'
            '<link>'+link+'</link><pubDate>'+published+'</pubDate>'
            '</item></channel></rss>')
def schedule():
    return {"version":1,"health":"recent","checkedAt":iso(NOW),
        "missions":[{"id":ID,"name":"Falcon 9 Block 5 | USSF-259",
                     "region":"california","net":"2026-11-07T00:46:00Z",
                     "netPrecision":"minute","sourceStale":False}]}
class OfficialRssTests(unittest.TestCase):
    def test_exact_announcement_matches_spatial_and_temporal_mission(self):
        events,n=official_rss_events(feed(),NOW)
        self.assertEqual(n,1)
        self.assertEqual(events[0]["sourceId"],"spaceforce-news-rss")
        self.assertEqual(events[0]["publishedDate"],"2026-11-05")
        self.assertEqual(events[0]["eventDate"],"2026-11-06")
        self.assertEqual(events[0]["markers"],["USSF-259"])
        result=reconcile(events,schedule(),NOW)
        self.assertEqual(len(result["matches"]),1)
        self.assertEqual(result["matches"][0]["launchId"],ID)
        self.assertEqual(result["matches"][0]["matchRule"],"official-rss-exact-designation-and-local-date")
        self.assertEqual(result["matches"][0]["accessStatus"],"not-evaluated")

    def test_general_space_force_news_cannot_become_california_launch(self):
        cases=[
            ("Space Force advances new strategy","Space Force officials met at Vandenberg on November 6, 2026."),
            ("Falcon 9 mission announced","A rocket is scheduled to launch November 6, 2026 from Vandenberg."),
            ("Space Force approves USSF-259 mission","A Falcon 9 rocket is scheduled to launch November 6, 2026 from Cape Canaveral."),
            ("Space Force USSF-259 mission recap","USSF-259 successfully launched November 6, 2026 from Vandenberg."),
            ("Space Force USSF-259 update","The USSF-259 rocket is targeting a launch window soon at Vandenberg; briefing published November 5, 2026."),
            ("Space Force USSF-259 and USSF-260","USSF-259 and USSF-260 are scheduled to launch November 6, 2026 from Vandenberg.")
        ]
        for title,body in cases:
            with self.subTest(title=title):
                events,n=official_rss_events(feed(title,body),NOW)
                self.assertEqual(events,[])

    def test_official_feed_url_can_never_be_an_external_or_third_party_redirect(self):
        for bad in ["https://www.spaceforce.mil.evil.example/News/Article-Display/Article/2/a/",
                    "https://evil.example/fake",
                    "javascript:alert(1)",
                    "https://www.spaceforce.mil/News/Article-Display/Article/2/a/?foo=1",
                    "http://www.spaceforce.mil/News/Article-Display/Article/2/a/",
                    "https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/2/a/"]:
            self.assertIsNone(rss_article_url(bad))
            self.assertEqual(official_rss_events(feed(link=bad),NOW)[0],[])
        self.assertEqual(rss_article_url(URL),URL)

    def test_publication_day_does_not_count_as_launch_day(self):
        events,_=official_rss_events(feed(
            description="USSF-259 launch from Vandenberg discussed on November 5, 2026. "
                        "The USSF-259 rocket has a launch window, with date not yet announced."),NOW)
        self.assertEqual(events,[])

    def test_stale_or_future_rss_article_rejected(self):
        older="Tue, 29 Sep 2026 13:00:00 GMT"
        tomorrow_late="Sun, 08 Nov 2026 13:00:00 GMT"
        self.assertEqual(official_rss_events(feed(published=older),NOW)[0],[])
        self.assertEqual(official_rss_events(feed(published=tomorrow_late),NOW)[0],[])

    def test_invalid_xml_and_entity_payload_fail_closed(self):
        for raw in ["<html><body>Space Force</body></html>",
                    "<!DOCTYPE rss [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><rss></rss>",
                    "<rss><channel><item>",
                    "x"*500000]:
            with self.subTest(sample=raw[:20]):
                with self.assertRaises((ValueError,Exception)):
                    official_rss_events(raw,NOW)

    def test_source_status_survives_vandenberg_html_403(self):
        def fetch(url,host,size):
            if host=="www.spaceforce.mil":return feed()
            raise OSError("official HTML returned 403")
        got=collect_evidence(schedule(),NOW,fetch)
        self.assertEqual(len(got["sourceStatus"]),3)
        self.assertEqual(got["sourceStatus"][1]["status"],"unavailable")
        self.assertEqual(got["sourceStatus"][2]["id"],"spaceforce-news-rss")
        self.assertEqual(got["sourceStatus"][2]["status"],"retrieved")
        self.assertEqual(got["sourceStatus"][2]["candidateCount"],1)
        self.assertEqual(len(got["matches"]),1)

    def test_independent_source_disagreement_abstains(self):
        first,_=official_rss_events(feed(),NOW)
        second=[dict(first[0],articleUrl=URL.replace("7000000","7000001"),
               sourceId="vandenberg-launch-news",eventDate="2026-11-07")]
        result=reconcile(first+second,schedule(),NOW)
        self.assertEqual(result["matches"],[])
        self.assertGreater(result["conflicts"],0)

if __name__=="__main__":
    unittest.main()
