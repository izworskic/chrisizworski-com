"""Frozen original-publisher review benchmark, never a layup prediction score."""
import copy
import json
from pathlib import Path
import unittest
from evaluate import audit

ROOT = Path(__file__).resolve().parents[2]


class LargeSourceReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = json.loads(
            (ROOT / "public/assets/freighter-layup-registry.json").read_text())
        cls.corpus = json.loads(
            (ROOT / "data/freighter-layup-source-checked-evaluation-2026.json").read_text())

    def test_41_original_source_checks_meet_retrospective_threshold_only(self):
        result = audit(self.corpus, self.registry)
        self.assertEqual(result["reviewedCases"], 41)
        self.assertEqual(result["sourceSupportedReviewLeads"], 14)
        self.assertEqual(result["sourceSupportedNonLeads"], 27)
        self.assertTrue(result["retrospectiveSampleSizeThresholdMet"])
        self.assertFalse(result["prospectiveCurrentSeasonCalibrationCompleted"])
        self.assertFalse(result["currentSeasonPositiveEvidenceAvailable"])
        self.assertFalse(result["publicationEnabled"])
        self.assertEqual(len(result["publisherSourceCounts"]), 4)
        self.assertEqual(
            {year: (s["reviewWorthy"], s["notReviewWorthy"])
             for year, s in result["bySeason"].items()},
            {"2023-24": (7, 13), "2024-25": (3, 0),
             "2025-26": (4, 0), "2026-27": (0, 14)})

    def test_shadow_and_naive_baseline_leave_misses_visible(self):
        result = audit(self.corpus, self.registry)
        self.assertEqual(result["shadow"], {
            "trueReviewLeads": 5, "missedReviewLeads": 9,
            "correctlyIgnored": 27, "unnecessaryReviewLeads": 0})
        self.assertEqual(result["simpleTitleBaseline"], {
            "trueReviewLeads": 1, "missedReviewLeads": 13,
            "correctlyIgnored": 27, "unnecessaryReviewLeads": 0})
        self.assertEqual(len(result["misses"]), 9)
        self.assertNotIn("precision", result)
        self.assertNotIn("recall", result)
        self.assertIn("no blinded second", result["limitations"])
        self.assertEqual(
            result["bySeason"]["2026-27"]["shadow"]["trueReviewLeads"], 0)

    def test_unverified_or_misclassified_source_fails_closed(self):
        first = self.corpus["cases"][0]
        for replacement in [
            {"url": "http://untrusted.example.org/ship"},
            {"url": "https://not-boatnerd.example.org/ship"},
            {"verificationMethod": "unverified_prediction"},
            {"sourceCheckedOn": "2027-05-01"},
            {"reviewBasis": ("no_winter_berth_in_original_post" if
                             first["editorialReviewRequired"] else
                             "publisher_documents_winter_berth")},
            {"date": "2028-01-01"},
        ]:
            bad = copy.deepcopy(self.corpus)
            bad["cases"][0].update(replacement)
            with self.subTest(replacement=replacement), self.assertRaises(ValueError):
                audit(bad, self.registry)

    def test_duplicate_wrong_season_or_missing_label_fails_closed(self):
        bad = copy.deepcopy(self.corpus)
        bad["cases"].append(copy.deepcopy(bad["cases"][0]))
        with self.assertRaises(ValueError):
            audit(bad, self.registry)
        for change in [{"season": "2024-25"}, {"editorialReviewRequired": None}]:
            bad = copy.deepcopy(self.corpus)
            bad["cases"][0].update(change)
            with self.assertRaises(ValueError):
                audit(bad, self.registry)

    def test_selection_order_does_not_change_results(self):
        reversed_corpus = {**self.corpus, "cases": list(reversed(self.corpus["cases"]))}
        a, b = audit(self.corpus, self.registry), audit(reversed_corpus, self.registry)
        self.assertEqual(a["shadow"], b["shadow"])
        self.assertEqual(a["bySeason"], b["bySeason"])
        self.assertEqual(a["publisherSourceCounts"], b["publisherSourceCounts"])


if __name__ == "__main__":
    unittest.main()
