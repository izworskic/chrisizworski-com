"""NASA favorable-weather reports: offline tests, no external network."""
import datetime as dt
import os
import sys
import unittest

SCRIPTS=os.path.abspath("scripts")
if SCRIPTS not in sys.path:
    sys.path.insert(0,SCRIPTS)
from space_coast_nasa_weather import (
    news_items,nasa_report,collect_nasa_reports,official_article_url,
    cited_launch_day
)

NOW=dt.datetime(2026,9,30,18,tzinfo=dt.timezone.utc)
CREW={"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "name":"Falcon 9 Block 5 | NASA Crew-13",
      "net":"2026-10-01T15:10:00Z"}
ARTICLE="https://www.nasa.gov/blogs/commercialcrew/2026/09/30/weather-55-favorable-for-thursday-crew-13-mission-launch/"
POST={"title":"Weather 55% Favorable for Thursday Crew-13 Mission Launch",
      "sourceUrl":ARTICLE,"publishedAt":"2026-09-30T16:02:00Z",
      "excerpt":"The 45th Weather Squadron predicts 55% favorable weather for Crew-13."}
BODY=b"""<html><main><article><h1>Weather 55% Favorable for Thursday Crew-13 Mission Launch</h1>
<p>Launch weather officers with Cape Canaveral Space Force Station's
45th Weather Squadron predict a 55% chance of favorable weather conditions
for the launch of NASA's SpaceX Crew-13 mission at 11:10 a.m. EDT Thursday, Oct. 1.</p>
<p>The primary weather concerns are the cumulus cloud rule and flight through precipitation.</p>
</article></main></html>"""
FEED=("""<?xml version="1.0"?><rss version="2.0"><channel><title>NASA Blogs</title>
<item><title>Weather 55% Favorable for Thursday Crew-13 Mission Launch</title>
<link>"""+ARTICLE+"""</link><pubDate>Wed, 30 Sep 2026 16:02:00 +0000</pubDate>
<description>45th Weather Squadron weather forecasts Crew-13 mission</description></item>
</channel></rss>""").encode()

class NASAOfficialWeatherTest(unittest.TestCase):
    def test_exact_nasa_article_only(self):
        self.assertEqual(official_article_url(ARTICLE),ARTICLE)
        for u in (
            ARTICLE.replace("www.nasa.gov","www.nasa.gov.evil.example"),
            ARTICLE+"?weather=60",
            "http://"+ARTICLE.removeprefix("https://"),
            "https://www.nasa.gov/news/2026/crew-13/",
        ):
            self.assertIsNone(official_article_url(u))

    def test_feed_uses_only_nasa_article_links_and_publication_date(self):
        items=news_items(FEED)
        self.assertEqual(len(items),1)
        self.assertEqual(items[0]["publishedAt"],"2026-09-30T16:02:00Z")
        self.assertEqual(items[0]["sourceUrl"],ARTICLE)

    def test_official_nasa_report_attributed_and_valid_launch_day(self):
        report=nasa_report(POST,BODY,CREW,NOW)
        self.assertIsNotNone(report)
        self.assertEqual(report["reportedFavorablePercent"],55)
        self.assertEqual(report["reportedTargetDate"],"2026-10-01")
        self.assertIn("Cumulus Cloud Rule",report["primaryConcerns"])
        self.assertEqual(report["sourceUrl"],ARTICLE)
        self.assertEqual(len(report["sourceSha256"]),64)

    def test_nasa_report_does_not_inherit_percentage_after_date_change(self):
        changed=dict(CREW,net="2026-10-02T15:10:00Z")
        self.assertIsNone(cited_launch_day(BODY.decode(),changed))
        self.assertIsNone(nasa_report(POST,BODY,changed,NOW))

    def test_wrong_mission_and_unauthorized_article_not_accepted(self):
        changed=dict(CREW,name="Falcon 9 Block 5 | NASA Crew-14")
        self.assertIsNone(nasa_report(POST,BODY,changed,NOW))
        self.assertIsNone(nasa_report(dict(POST,sourceUrl="https://bad.example/fake"),BODY,CREW,NOW))

    def test_no_45ws_attribution_or_ambiguous_favorable_values_rejected(self):
        self.assertIsNone(nasa_report(POST,BODY.replace(b"45th Weather Squadron",
                                                         b"Local team"),CREW,NOW))
        conflicting=BODY.replace(b"55% chance of favorable",b"55% chance of favorable and 40% chance of favorable")
        self.assertIsNone(nasa_report(POST,conflicting,CREW,NOW))

    def test_percentage_not_derived_from_other_percentages(self):
        humid=BODY.replace(b"55% chance of favorable",b"55% relative humidity")
        self.assertIsNone(nasa_report(POST,humid,CREW,NOW))

    def test_collect_two_nasa_feeds_dedupes_single_mission_article(self):
        calls=[]
        def fake_download(url,limit,accept):
            calls.append(url)
            return BODY if url==ARTICLE else FEED
        evidence,health=collect_nasa_reports([CREW],fake_download,NOW)
        self.assertEqual(len(evidence),1)
        self.assertEqual(len(health),2)
        self.assertEqual(calls.count(ARTICLE),1)
        self.assertTrue(all(x["status"]=="checked" for x in health))

    def test_unavailable_feeds_do_not_claim_no_forecasts_exist(self):
        def fail(*args):
            raise RuntimeError("NASA temporarily unavailable")
        evidence,health=collect_nasa_reports([CREW],fail,NOW)
        self.assertEqual(evidence,[])
        self.assertTrue(all(x["status"]=="unavailable" for x in health))

if __name__=="__main__":
    unittest.main()
