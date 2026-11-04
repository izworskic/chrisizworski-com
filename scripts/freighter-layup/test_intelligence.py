"""Python Intelligence OS regression tests for the winter-layup shadow and archive."""
import importlib.util
from pathlib import Path
import unittest

DIR = Path(__file__).resolve().parent


def mod(name):
    spec = importlib.util.spec_from_file_location(name, DIR / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


shadow = mod("shadow")
history = mod("history")


def archive():
    return {
        "schemaVersion": 2,
        "harbors": [{"id": "superior", "name": "Superior, WI"},
                    {"id": "milwaukee", "name": "Milwaukee, WI"}],
        "seasons": [
            {"id": "2025-26", "state": "historical_snapshot", "records": [
                {
                    "id": "mesabi-miner", "name": "Mesabi Miner",
                    "identity": {"key": "mesabi-miner"},
                    "aliases": ["M. Miner"],
                    "status": "confirmed_historical", "harborId": "superior",
                    "statusAsOf": "2026-01-30", "evidenceClass": "port_authority",
                    "evidence": {"url": "https://port.example.org/2026",
                                 "publisher": "Port Authority"},
                    "events": [{"date": "2026-01-30", "type": "roster",
                                "text": "Included in winter port roster",
                                "source": "https://port.example.org/2026"}],
                }
            ]},
            {"id": "2024-25", "state": "historical_snapshot", "records": [
                {"id": "mesabi-miner", "name": "Mesabi Miner",
                 "identity": {"key": "mesabi-miner"}, "status": "reported_historical",
                 "harborId": "milwaukee", "statusAsOf": "2025-01-20",
                 "evidenceClass": "journalistic_report",
                 "evidence": {"url": "https://report.example.org/2025",
                              "publisher": "Maritime Press"},
                 "events": [{"date": "2025-01-20", "type": "reported_arrival",
                             "text": "Reported winter berth",
                             "source": "https://report.example.org/2025"}]}
            ]},
            {"id": "2026-27", "state": "upcoming_unconfirmed", "records": []}
        ]
    }


def observation(url, title, date="2026-01-15", decision="accepted", kind="arrival",
                vessel="mesabi-miner", harbor="superior", source="port"):
    return {"url": url, "title": title, "date": date, "decision": decision,
            "kind": kind, "vesselKey": vessel, "harborId": harbor,
            "sourceId": source, "sourceClass": "port_authority",
            "publisher": "Port Authority"}


class HistoryTests(unittest.TestCase):
    def test_history_is_descriptive_and_retains_source_qualification(self):
        result = history.build_history(archive())
        self.assertEqual(result["status"], "PARTIAL")
        self.assertTrue(result["notFleetCensus"])
        self.assertEqual(result["recordCount"], 2)
        self.assertEqual(result["uniqueVesselCount"], 1)
        self.assertEqual(result["recurringKeys"], ["mesabi-miner"])
        self.assertEqual([s["recordCount"] for s in result["seasons"]], [1, 1])
        self.assertEqual(result["seasons"][1]["vessels"][0]["status"],
                         "reported_historical")
        markup = history.render(result)
        self.assertIn("Record as of", markup)
        self.assertIn("not a full fleet census", markup)
        self.assertNotIn("real-time vessel location", markup)

    def test_duplicate_vessel_same_season_is_error(self):
        data = archive()
        data["seasons"][0]["records"].append(data["seasons"][0]["records"][0].copy())
        with self.assertRaises(ValueError):
            history.build_history(data)

    def test_invalid_date_and_unknown_harbor_fail_closed(self):
        data = archive()
        data["seasons"][0]["records"][0]["statusAsOf"] = "2026-02-30"
        with self.assertRaises(ValueError):
            history.build_history(data)
        data = archive()
        data["seasons"][0]["records"][0]["harborId"] = "unverified-dock"
        with self.assertRaises(ValueError):
            history.build_history(data)

    def test_current_unreported_winter_not_carried_into_history(self):
        result = history.build_history(archive())
        self.assertNotIn("2026-27", [s["id"] for s in result["seasons"]])

    def test_generated_html_requires_explicit_markers(self):
        fragment = history.render(history.build_history(archive()))
        with self.assertRaises(ValueError):
            history.apply_markers("<html></html>", fragment)
        original = f"<main>{history.START}OLD{history.END}</main>"
        self.assertEqual(history.apply_markers(original, fragment),
                         "<main>" + fragment + "</main>")


class ShadowTests(unittest.TestCase):
    def setUp(self):
        self.ledger = {"schemaVersion": 1, "season": "2025-26", "events": []}
        self.run = "2026-02-01T12:00:00Z"
        self.url = "https://port.example.org/news/ship-2026"

    def report(self, rows, outcomes=None):
        inputs = {"schemaVersion": 1, "season": "2025-26",
                  "observations": rows,
                  "sources": [{"source": "port", "ok": True}]
                  if outcomes is None else outcomes}
        return shadow.analyze(inputs, archive(), self.ledger, self.run)

    def test_clear_title_creates_a_nonpublishing_recommendation(self):
        result = self.report([observation(self.url,
                             "Mesabi Miner arrived at Superior for winter layup")])
        self.assertEqual(result["status"], "AVAILABLE")
        self.assertFalse(result["publicationEnabled"])
        self.assertFalse(result["cases"][0]["publishEligible"])
        self.assertEqual(result["existingNodeAccepted"], 1)
        self.assertEqual(result["flaggedObservations"], 0)

    def test_planned_future_and_missing_dates_are_flagged(self):
        rows = [
            observation(self.url, "Mesabi Miner expected for winter layup",
                        date="2026-02-02"),
            observation("https://port.example.org/missing",
                        "Mesabi Miner arrived for winter layup", date=""),
        ]
        result = self.report(rows)
        self.assertIn("planned_not_actual_arrival", result["cases"][0]["risks"])
        self.assertIn("future_publication_date", result["cases"][0]["risks"])
        self.assertEqual(result["validObservations"], 1)
        self.assertEqual(result["anomalyCount"], 1)

    def test_duplicate_url_and_conflicting_harbors_are_review_only(self):
        rows = [
            observation(self.url, "Mesabi Miner arrived for winter layup at Superior"),
            observation(self.url, "Mesabi Miner docked for winter layup at Milwaukee",
                        source="another", harbor="milwaukee")
        ]
        result = self.report(rows)
        self.assertGreaterEqual(result["flaggedObservations"], 1)
        self.assertIn("different_harbors_same_vessel_day",
                      [x["type"] for x in result["anomalies"]])
        self.assertEqual(result["existingNodeAccepted"], 2)
        self.assertFalse(result["publicationEnabled"])

    def test_missing_sources_are_unavailable_not_zero_coverage(self):
        result = self.report([], outcomes=[])
        self.assertEqual(result["status"], "UNAVAILABLE")
        self.assertTrue(result["unknownIsNotZero"])
        mixed = self.report([], outcomes=[{"ok": True}, {"ok": False}])
        self.assertEqual(mixed["status"], "PARTIAL")
        self.assertEqual(len(mixed["failedSources"]), 1)

    def test_aliases_do_not_become_verified_berth_positions(self):
        result = self.report([observation(self.url,
                             "Unknown freighter returns to service",
                             decision="accepted", kind="arrival")])
        self.assertIn("accepted_without_known_ship_in_headline",
                      result["cases"][0]["risks"])
        self.assertIn("departure_title_classified_as_arrival",
                      result["cases"][0]["risks"])
        self.assertNotIn("confidence", result["cases"][0])

    def test_ignored_explicit_layup_headline_is_triaged_but_not_published(self):
        result = self.report([observation(
            self.url, "Mesabi Miner arrived at Superior for winter layup",
            decision="not_layup", kind=None)])
        self.assertEqual(result["existingNodeAccepted"], 0)
        self.assertEqual(result["flaggedObservations"], 1)
        self.assertIn("potentially_missed_layup_headline", result["cases"][0]["risks"])
        self.assertFalse(result["publicationEnabled"])

    def test_nonlayup_duplicates_and_out_of_season_vessels_do_not_generate_alerts(self):
        other = self.url + "-two"
        rows = [
            observation(self.url, "Lee A Tregurtha arrived on the lake",
                        date="2025-08-20", decision="wrong_season", vessel=None),
            observation(other, "Routine trade update from a publisher",
                        date="2026-01-16", decision="not_layup", vessel=None),
            observation(other, "Routine trade update from a second feed",
                        date="2026-01-16", decision="not_layup", vessel=None),
        ]
        result = self.report(rows)
        self.assertEqual(result["flaggedObservations"], 0)
        self.assertEqual(result["duplicateArticleRows"], 1)
        self.assertEqual(result["uniqueSourceURLs"], 2)
        self.assertEqual(result["outOfSeasonObservations"], 1)

    def test_museum_winter_arrival_is_review_only_even_without_layup_keyword(self):
        row = observation(self.url, "Mesabi Miner arrives at Fincantieri",
                          date="2026-01-16", decision="not_layup",
                          kind=None)
        row["sourceClass"] = "maritime_historical_society"
        report = self.report([row])
        self.assertEqual(report["flaggedObservations"], 1)
        self.assertIn("potentially_missed_layup_headline", report["cases"][0]["risks"])
        self.assertFalse(report["cases"][0]["publishEligible"])
        self.assertFalse(report["publicationEnabled"])

    def test_all_sources_blocked_is_unavailable_and_empty_feeds_are_not_dated(self):
        blocked = self.report([], outcomes=[{"source":"one","ok":False,"error":"HTTP 403"}])
        self.assertEqual(blocked["status"], "UNAVAILABLE")
        empty = self.report([], outcomes=[
            {"source":"port","ok":True,"feedState":"empty","items":0}
        ])
        self.assertEqual(empty["status"], "PARTIAL")
        self.assertEqual(empty["sourceCoverage"]["emptyFeeds"], 1)
        self.assertEqual(empty["sourceCoverage"]["datedFeeds"], 0)

    def test_wrong_season_is_rejected(self):
        with self.assertRaises(ValueError):
            shadow.analyze({"schemaVersion": 1, "season": "2026-27",
                            "observations": [], "sources": []},
                           archive(), self.ledger, self.run)


if __name__ == "__main__":
    unittest.main()
