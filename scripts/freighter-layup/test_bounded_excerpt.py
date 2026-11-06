"""Synthetic contract tests for research-only bounded feed-context triage.

These invented cases are not observational validation and must never be
reported as performance on original publisher reporting.
"""
import json
import unittest

from shadow import analyze


def registry():
    return {"seasons": [{"records": [
        {"name": "Mesabi Miner", "identity": {"key": "mesabi-miner"}, "aliases": []},
        {"name": "Lake Guardian", "identity": {"key": "lake-guardian"}, "aliases": []},
    ]}]}


def observation(title, excerpt="", **kwargs):
    return {
        "url": "https://publisher.example.org/winter-report",
        "date": "2027-01-18",
        "title": title,
        "sourceExcerpt": excerpt,
        "sourceId": "fictional-original-publisher",
        "sourceClass": "journalistic_report",
        "publisher": "Fictional publisher (synthetic fixture)",
        "decision": "not_layup",
        "kind": None,
        "vesselKey": None,
        "harborId": None,
        **kwargs,
    }


def run(*rows):
    return analyze({
        "schemaVersion": 1, "season": "2026-27",
        "observations": list(rows),
        "sources": [{"source": "fictional-original-publisher", "ok": True,
                     "feedState": "dated"}],
    }, registry(), {"schemaVersion": 1, "season": "2026-27", "events": []},
        "2027-01-20T10:00:00Z")


class BoundedExcerptScientificContracts(unittest.TestCase):

    def test_known_ship_and_bounded_winter_evidence_find_review_lead(self):
        r = run(observation(
            "Mesabi Miner arrives in port",
            "The Mesabi Miner docked at the yard for winter layup."))
        self.assertEqual(r["flaggedObservations"], 1)
        self.assertIn("potentially_missed_layup_excerpt", r["cases"][0]["risks"])
        self.assertEqual(r["cases"][0]["excerptMatches"], ["mesabi-miner"])
        self.assertFalse(r["cases"][0]["publishEligible"])
        self.assertFalse(r["publicationEnabled"])

    def test_generic_headline_can_surface_vessel_only_in_feed_text(self):
        r = run(observation(
            "Fleet update from the harbor",
            "The Lake Guardian was tied up for the winter after arrival."))
        self.assertEqual(r["flaggedObservations"], 1)
        self.assertIn("vessel_named_only_in_feed_excerpt", r["cases"][0]["risks"])
        self.assertFalse(r["cases"][0]["publishEligible"])

    def test_unknown_name_is_a_hint_never_registry_or_ship_confirmation(self):
        r = run(observation(
            "Atlantic Herald arrives in Sturgeon Bay",
            "Atlantic Herald docked for winter layup at Sturgeon Bay."))
        self.assertEqual(r["flaggedObservations"], 1)
        case = r["cases"][0]
        self.assertEqual(case["tentativeVesselName"], "Atlantic Herald")
        self.assertIn("unregistered_vessel_identity_requires_editorial_verification",
                      case["risks"])
        self.assertFalse(case["publishEligible"])
        self.assertNotIn("confidence", case)

    def test_negative_winter_context_does_not_trigger(self):
        for title, excerpt in [
            ("Atlantic Herald arrives in Sturgeon Bay",
             "Atlantic Herald arrived to unload ore and returned to trading."),
            ("Mesabi Miner arrives in Duluth",
             "Mesabi Miner is not wintering here and will depart tomorrow."),
            ("Harbor winter traffic report",
             "Ice conditions and lake weather are worsening."),
            ("Mesabi Miner expected to arrive in January",
             "The vessel is scheduled for winter layup pending arrival."),
            ("Mesabi Miner expected for winter layup",
             "A ship is due to arrive but no berth has occurred."),
            ("Mesabi Miner not wintering at this port",
             "No winter berth is documented."),
            ("Remembering Atlantic Herald arrives in Sturgeon Bay",
             "An archive recalls an old winter layup."),
        ]:
            with self.subTest(title=title):
                r = run(observation(title, excerpt))
                self.assertEqual(r["flaggedObservations"], 0)

    def test_stale_and_future_articles_are_not_current_leads(self):
        old = observation("Mesabi Miner arrives at port",
                          "Mesabi Miner docked for winter layup.",
                          date="2026-10-30")
        future = observation("Mesabi Miner arrives at port",
                             "Mesabi Miner docked for winter layup.",
                             date="2027-01-22",
                             url="https://publisher.example.org/future")
        self.assertEqual(run(old, future)["flaggedObservations"], 0)

    def test_untrusted_or_oversized_excerpt_is_not_retained_or_emitted(self):
        sentinel = "NEVER_COPY_PUBLISHER_ARTICLE_TEXT_TO_REPORT"
        huge = "Mesabi Miner wintering at the dock. " + sentinel * 300
        report = run(observation("Mesabi Miner arrives in port", huge),
                     observation("Regular port news", ["untrusted", "array"],
                                 url="https://publisher.example.org/another"))
        self.assertEqual(report["excerptSupplied"], 2)
        self.assertEqual(report["snippetPolicy"].split(";")[0], "720 characters maximum")
        self.assertNotIn(sentinel, json.dumps(report))
        self.assertNotIn("sourceExcerpt", json.dumps(report))
        self.assertFalse(report["publicationEnabled"])


if __name__ == "__main__":
    unittest.main()
