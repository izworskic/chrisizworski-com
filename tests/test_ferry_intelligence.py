"""Offline regression tests for ferry operator change detection and safe publishing."""
import datetime as dt
import unittest

from scripts.ferry_intelligence import (
    badger_season, due_today, process, readable, semantic_lines,
)

TODAY = dt.date(2027, 11, 7)
BADGER = "https://ssbadger.com/schedule/"


class FerryIntelligenceTests(unittest.TestCase):
    def test_explicit_future_badger_window(self):
        text = ("2028 Schedule\nS.S. Badger's Departure and Arrival Schedules\n"
                "Full Season - May 12 - October 8\nOvernight sailings vary")
        self.assertEqual(
            badger_season(text, TODAY), (2028, ["2028-05-12", "2028-10-08"]))

    def test_vague_or_future_timetable_is_not_a_window(self):
        for value in (
            "2028 Schedule Coming Soon. 2027 fares listed below.",
            "May 12 - October 8. Please check the 2028 sailing calendar.",
            "2028 Schedule Full Season - February 30 - October 8",
            "2028 Schedule Full Season - October 8 - May 12",
            "2028 Schedule Full Season - May 12 - October 8. "
            "2029 Schedule Full Season - May 11 - October 7",
        ):
            self.assertIsNone(badger_season(value, TODAY), value)

    def test_ignore_script_noise(self):
        raw = b"<html><script>2029 Schedule Full Season - May 2 - October 3</script><main><h1>2028 Schedule</h1><h2>Full Season - May 12 - October 8</h2><p>Vehicle bookings require a reservation.</p></main></html>"
        self.assertNotIn("2029 Schedule", readable(raw))
        digest, sample = semantic_lines(raw, "text/html")
        self.assertEqual(len(digest), 64)
        self.assertIn("2028 Schedule", sample)

    def test_exact_operator_window_only(self):
        planners = {"ss-badger": {"id": "ss-badger", "seasonWindows":
                    {"2027": ["2027-05-14", "2027-10-10"]}, "modified": "2026-11-07"}}
        observation = [{"route": "ss-badger", "label": "Official Badger schedule",
                        "url": BADGER, "status": "ok", "digest": "new", "sample": "2028",
                        "text": "2028 Schedule Full Season - May 12 - October 8"}]
        previous = {"sources": {BADGER: {"digest": "old", "sample": "2027 schedule"}}}
        updated, snapshot, report = process(planners, previous, observation, TODAY)
        self.assertEqual(updated["ss-badger"]["seasonWindows"]["2028"],
                         ["2028-05-12", "2028-10-08"])
        self.assertEqual(updated["ss-badger"]["modified"], TODAY.isoformat())
        self.assertEqual(snapshot["sources"][BADGER]["digest"], "new")
        self.assertTrue(report["auto_publish_eligible"])
        self.assertEqual(report["accepted_season_windows"][0]["kind"],
                         "season_window_only")

    def test_changed_existing_window_never_overwritten(self):
        planners = {"ss-badger": {"id": "ss-badger", "seasonWindows":
                    {"2028": ["2028-05-12", "2028-10-08"]}}}
        observation = [{"route": "ss-badger", "label": "Official Badger schedule",
                        "url": BADGER, "status": "ok", "digest": "new", "sample": "new",
                        "text": "2028 Schedule Full Season - May 13 - October 8"}]
        updated, state, report = process(planners, {"sources": {}}, observation, TODAY)
        self.assertEqual(updated, planners)
        self.assertEqual(len(report["conflicting_official_windows"]), 1)
        self.assertFalse(report["auto_publish_eligible"])

    def test_alerts_require_review_and_outage_never_clears_state(self):
        url = "https://www.bibco.com/ferry-schedules/"
        previous = {"sources": {url: {"digest": "old", "sample": "2026 schedule"}}}
        observation = [{"route": "beaver", "label": "Beaver schedule", "url": url,
                        "status": "ok", "digest": "new", "sample": "2027 fare and cancellation",
                        "text": "Something changed"},
                       {"route": "mackinac", "label": "Arnold fares", "url": "https://arnoldtransitcompany.com/",
                        "status": "indeterminate", "reason": "HTTP 403"}]
        data, state, report = process({}, previous, observation, TODAY)
        self.assertFalse(report["auto_publish_eligible"])
        self.assertEqual(len(report["requires_review"]), 1)
        self.assertEqual(len(report["unavailable_sources"]), 1)
        self.assertEqual(state["sources"][url]["digest"], "new")
        self.assertNotIn("https://arnoldtransitcompany.com/", state["sources"])

    def test_no_repeat_drift_and_winter_cadence(self):
        url = "https://www.bibco.com/ferry-schedules/"
        prior = {"sources": {url: {"digest": "stable", "sample": "stable"}}}
        _, state, report = process({}, prior, [{"route": "beaver", "label": "schedule",
                                                "url": url, "status": "ok",
                                                "digest": "stable", "sample": "stable"}], TODAY)
        self.assertEqual(prior["sources"], state["sources"])
        self.assertEqual(report["changed_sources"], [])
        self.assertTrue(due_today(dt.date(2027, 7, 6)))
        self.assertTrue(due_today(dt.date(2027, 12, 6)))
        self.assertFalse(due_today(dt.date(2027, 12, 7)))


if __name__ == "__main__":
    unittest.main()
