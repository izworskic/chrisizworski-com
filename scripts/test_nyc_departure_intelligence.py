"""Scientific/contract tests: fixtures are synthetic, NEVER published as NYC observations."""
import importlib.util
import json
import io
import re
from urllib.parse import parse_qs, urlsplit
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location("nyc_py", ROOT/"scripts/nyc_departure_intelligence.py")
nyc=importlib.util.module_from_spec(spec)
spec.loader.exec_module(nyc)
NOW=datetime(2026,11,7,17,0,tzinfo=timezone.utc)


def samples(latest=NOW.date(), shift_holdout=False, flat=False):
    rows=[]
    for days_back in range(93):
        day=latest-timedelta(days=days_back)
        for link in nyc.BY_LINK:
            for hour in range(24):
                peak = 0 if flat else (9 if 7 <= hour <= 9 or 16 <= hour <= 19 else 2)
                weekday = 0 if flat else (4 if day.weekday() < 5 else 0)
                noise = ((day.toordinal()*7+hour*3)%11 - 5) * 0.11
                minutes = 7+peak+weekday+noise
                if shift_holdout and days_back < 14:
                    minutes += 22
                rows.append({"link_id":link,"service_date":day.isoformat()+"T00:00:00.000",
                             "hour":str(hour),"mean_seconds":str(minutes*60),
                             "sample_count":"8"})
    return rows


class PythonNycIntelligenceTests(unittest.TestCase):
    def test_realistic_synthetic_holdout_passes_and_covers_six_audited_links(self):
        model=nyc.build_model(samples(), NOW)
        self.assertEqual(model["state"],"AVAILABLE")
        self.assertEqual(set(model["crossings"]),set(nyc.LINKS))
        self.assertEqual(model["source"]["latestObservationDate"],"2026-11-07")
        for key, crossing in model["crossings"].items():
            self.assertGreaterEqual(crossing["holdout"]["gainFraction"],0.05)
            self.assertGreaterEqual(crossing["holdout"]["intervalCoverage"],0.55)
            self.assertGreaterEqual(crossing["holdout"]["observedHourRows"],100)
            self.assertEqual(crossing["linkId"],nyc.LINKS[key][0])
            self.assertIn("weekday:8",crossing["slots"])
            self.assertIn("weekend:8",crossing["slots"])

    def test_archive_stale_blocks_model_not_a_forecast(self):
        model=nyc.build_model(samples(latest=NOW.date()-timedelta(days=8)),NOW)
        self.assertEqual(model["state"],"STALE")
        self.assertEqual(model["crossings"],{})

    def test_empty_and_rejected_rows_never_become_zero_traffic(self):
        for rows in ([],[{"link_id":"4456510","service_date":"2026-11-08",
                          "hour":1,"mean_seconds":400,"sample_count":8}]):
            model=nyc.build_model(rows,NOW)
            self.assertEqual(model["state"],"UNAVAILABLE")
            self.assertEqual(model["crossings"],{})

    def test_identical_duplicates_deduplicated_and_conflicts_discarded(self):
        row={"link_id":"4456510","service_date":"2026-11-05T00:00:00.000",
             "hour":"8","mean_seconds":"300","sample_count":"8"}
        clean,meta=nyc.normalize([row,dict(row)],NOW)
        self.assertEqual(len(clean),1)
        self.assertEqual(meta["duplicateRows"],1)
        conflict=dict(row,mean_seconds="600")
        clean,meta=nyc.normalize([row,conflict,dict(row)],NOW)
        self.assertEqual(len(clean),0)
        self.assertGreaterEqual(meta["conflictRows"],1)

    def test_future_bad_count_unknown_link_and_nan_discarded(self):
        base={"link_id":"4456510","service_date":"2026-11-05","hour":"8",
              "mean_seconds":"400","sample_count":"8"}
        bad=[dict(base,link_id="nope"),dict(base,hour=45),dict(base,sample_count=0),
             dict(base,mean_seconds="nan"),dict(base,service_date="2026-11-10")]
        clean,meta=nyc.normalize(bad,NOW)
        self.assertEqual(clean,[])
        self.assertEqual(meta["invalidRows"],5)

    def test_training_data_cannot_consume_held_out_date_hour_values(self):
        shifted=nyc.build_model(samples(shift_holdout=True),NOW)
        self.assertEqual(shifted["state"],"UNAVAILABLE")
        self.assertEqual(shifted["crossings"],{})

    def test_flat_data_cannot_fake_skill_over_naive(self):
        flat=nyc.build_model(samples(flat=True),NOW)
        self.assertEqual(flat["state"],"UNAVAILABLE")

    def test_live_scientific_audit_identifies_validated_and_failed_sensor_links(self):
        observations = samples()
        # Six synthetic links all pass; an actual source outage does not.
        heartbeats = [
            {"link_id": lid, "status": "0", "n": "100",
             "latest": "2026-11-07T09:00:00.000"} for lid in nyc.BY_LINK
        ]
        report = nyc.audit_live(NOW, rows=observations, heartbeats=heartbeats)
        self.assertEqual(report["publishingCandidateState"], "AVAILABLE")
        self.assertEqual(len(report["modelReadyLinks"]), 6)
        for entry in report["crossings"].values():
            self.assertEqual(entry["state"], "MODEL_ELIGIBLE")
            self.assertTrue(entry["holdout"]["passed"])
            self.assertGreaterEqual(entry["holdout"]["scoredHoldoutDateHours"], 100)
            self.assertEqual(entry["statusCounts7d"]["0"], 100)

    def test_audit_rejects_heartbeat_only_updates_of_nonworking_link(self):
        rows = [record for record in samples()
                if record["link_id"] != "4456510" or
                record["service_date"][:10] <= "2026-10-31"]
        heartbeat = [
            {"link_id": "4456510", "status": "-101", "n": "2000",
             "latest": "2026-11-07T12:15:00.000"},
        ]
        report = nyc.audit_live(NOW, rows=rows, heartbeats=heartbeat)
        tunnel = report["crossings"]["queens-midtown"]
        self.assertEqual(tunnel["state"], "STALE_LINK")
        self.assertEqual(tunnel["latestReportedAt"], "2026-11-07T12:15:00.000")
        self.assertEqual(tunnel["lastUsableDate"], "2026-10-31")
        self.assertFalse(tunnel["state"] == "MODEL_ELIGIBLE")
        self.assertNotIn("queens-midtown", report["modelReadyLinks"])

    def test_nyc_date_near_utc_midnight_is_not_tomorrow_in_new_york(self):
        when = datetime(2026, 11, 8, 2, 0, tzinfo=timezone.utc)
        self.assertEqual(nyc.local_date(when), date(2026, 11, 7))
        self.assertEqual(nyc.local_date(NOW), date(2026, 11, 7))
        with self.assertRaises(ValueError):
            nyc.local_date(datetime(2026, 11, 7))

    def test_failure_metrics_remain_visible_without_model_publication(self):
        rows = samples(shift_holdout=True)
        clean, _ = nyc.normalize(rows, NOW)
        newest = max(item[1] for item in clean)
        cutoff = newest - timedelta(days=13)
        start = cutoff - timedelta(days=70)
        selected = [r for r in clean if r[0] == "4456510"
                    and start <= r[1] <= newest]
        score = nyc.score_link(selected, cutoff)
        self.assertFalse(score["passed"])
        self.assertGreaterEqual(score["scoredHoldoutDateHours"], 100)
        self.assertIsNotNone(score["modelMaeMinutes"])
        self.assertIsNotNone(score["naiveMaeMinutes"])
        self.assertIsNone(nyc.fit_link(selected, cutoff))

    def test_real_ingestion_partitions_are_bounded_and_cover_every_link(self):
        calls = []
        def fake_urlopen(request, timeout=35):
            params = parse_qs(urlsplit(request.full_url).query)
            self.assertEqual(params["$limit"], ["800"])
            self.assertEqual(timeout, 35)
            where = params["$where"][0]
            # NYC DOT calls status an artifact, not evidence of measurement validity.
            self.assertNotIn("status=", where)
            self.assertIn("speed::number>0", where)
            self.assertIn("travel_time::number>0", where)
            lid = re.search(r"link_id='(\d+)'", where).group(1)
            start = date.fromisoformat(re.search(r"data_as_of >= '(\d{4}-\d{2}-\d{2})", where).group(1))
            stop = date.fromisoformat(re.search(r"data_as_of < '(\d{4}-\d{2}-\d{2})", where).group(1))
            self.assertLessEqual((stop-start).days, 30)
            self.assertIn(lid, nyc.BY_LINK)
            calls.append((lid, start, stop))
            payload = [{"link_id": lid, "service_date": start.isoformat()+"T00:00:00.000",
                        "hour": "8", "mean_seconds": "300", "sample_count": "6"}]
            return io.BytesIO(json.dumps(payload).encode())
        rows=nyc.fetch_rows(NOW, fetcher=fake_urlopen)
        self.assertEqual(len(rows),24)
        self.assertEqual(len(calls),24)
        for lid in nyc.BY_LINK:
            windows=sorted((a,b) for link,a,b in calls if link==lid)
            self.assertEqual(len(windows),4)
            self.assertEqual(windows[0][0],nyc.local_date(NOW)-timedelta(days=93))
            self.assertEqual(windows[-1][1],nyc.local_date(NOW)+timedelta(days=1))
            for previous, following in zip(windows,windows[1:]):
                self.assertEqual(previous[1],following[0])

    def test_truncated_hourly_aggregate_is_rejected_not_partial_model(self):
        def truncated(request, timeout=35):
            params=parse_qs(urlsplit(request.full_url).query)
            lid=re.search(r"link_id='(\d+)'",params["$where"][0]).group(1)
            item={"link_id":lid,"service_date":"2026-08-06T00:00:00.000",
                  "hour":"8","mean_seconds":"300","sample_count":"8"}
            return io.BytesIO(json.dumps([item]*800).encode())
        with self.assertRaisesRegex(ValueError, "Potentially truncated"):
            nyc.fetch_rows(NOW, fetcher=truncated)

    def test_wrong_date_partition_and_wrong_link_cannot_pass_upstream(self):
        def bad_link(request, timeout=35):
            entry={"link_id":"not-a-sensor","service_date":"2026-08-06T00:00:00.000",
                   "hour":"8","mean_seconds":"300","sample_count":"8"}
            return io.BytesIO(json.dumps([entry]).encode())
        with self.assertRaisesRegex(ValueError, "Invalid upstream NYC"):
            nyc.fetch_rows(NOW,fetcher=bad_link)

    def test_one_transient_timeout_does_not_erase_a_valid_calendar_partition(self):
        attempts = {}
        def sometimes_timeout(request, timeout=35):
            key=request.full_url
            attempts[key]=attempts.get(key,0)+1
            where=parse_qs(urlsplit(key).query)["$where"][0]
            if "link_id='4456510'" in where and "2026-08-06" in where and attempts[key]==1:
                raise TimeoutError("Simulated upstream read timeout")
            link=re.search(r"link_id='(\d+)'",where).group(1)
            start=re.search(r"data_as_of >= '(\d{4}-\d{2}-\d{2})",where).group(1)
            return io.BytesIO(json.dumps([{"link_id":link,
                "service_date":start+"T00:00:00.000","hour":"8",
                "mean_seconds":"300","sample_count":"8"}]).encode())
        rows=nyc.fetch_rows(NOW,fetcher=sometimes_timeout)
        self.assertEqual(len(rows),24)
        self.assertEqual(sum(attempts.values()),25)

    def test_unreachable_source_is_explicitly_incomplete_not_a_valid_model(self):
        report=nyc.source_incomplete(NOW,"Official historical source timed out.")
        self.assertEqual(report["state"],"INCOMPLETE")
        self.assertEqual(report["publishingCandidateState"],"UNAVAILABLE")
        self.assertEqual(report["modelReadyLinks"],[])
        self.assertEqual(report["crossings"],{})
        self.assertIn("timed out",report["reason"])

    def test_official_2026_toll_reference_matches_calculation_engine(self):
        proof=nyc.audit_tolls()
        self.assertGreaterEqual(proof["casesChecked"],10)
        self.assertEqual(proof["verifiedOn"],"2026-11-07")


if __name__=="__main__":
    unittest.main()
