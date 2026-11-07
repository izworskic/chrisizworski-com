"""Scientific/contract tests: fixtures are synthetic, NEVER published as NYC observations."""
import importlib.util
import json
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

    def test_official_2026_toll_reference_matches_calculation_engine(self):
        proof=nyc.audit_tolls()
        self.assertGreaterEqual(proof["casesChecked"],10)
        self.assertEqual(proof["verifiedOn"],"2026-11-07")


if __name__=="__main__":
    unittest.main()
