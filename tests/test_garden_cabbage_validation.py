"""Scientific validation gates for real MSU cabbage maggot observations."""
import copy
import importlib.util
import json
import math
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("cabbage_validation", ROOT / "scripts/build_garden_cabbage_validation.py")
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)


class CabbageEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = C.load_evidence()
        cls.bundle = C.compile_bundle(cls.original)

    def test_real_reports_are_not_first_flights(self):
        s = self.bundle
        self.assertEqual(s["fieldEvidence"]["verifiedReportMentions"], 4)
        self.assertEqual(s["fieldEvidence"]["uniqueMSUReportIssues"], 3)
        self.assertEqual(s["fieldEvidence"]["reportSeasons"], [2025])
        self.assertEqual(s["fieldEvidence"]["firstFlightMeasurements"], 0)
        self.assertEqual(s["fieldEvidence"]["independentStationYears"], 0)
        self.assertTrue(s["fieldEvidence"]["publicationDateIsNotFirstEmergenceDate"])
        for r in s["fieldEvidence"]["reports"]:
            self.assertEqual(r["dateMeaning"], "ISSUE_DATE_NOT_EXACT_FIELD_OBSERVATION")
            self.assertFalse(r["canScoreFirstFlightError"])
            self.assertFalse(r["firstFlightObserved"])
            self.assertTrue(r["sourceUrl"].startswith("https://www.canr.msu.edu/news/"))

    def test_empirical_validation_fails_closed_without_station_years(self):
        result = self.bundle["evaluation"]
        self.assertEqual(result["status"], "NO_MATCHED_INDEPENDENT_FIRST_FLIGHT_STATION_YEARS")
        self.assertEqual(result["uniqueMatchedStationYears"], 0)
        self.assertEqual(result["distinctHeldOutSeasons"], 0)
        self.assertFalse(result["promotionAllowed"])
        for key in ("observationalMedianAbsoluteErrorDays", "observationalP90AbsoluteErrorDays",
                    "modelBiasDays", "empiricalHitRate", "skillScore", "correlation"):
            self.assertIsNone(result[key], key)

    def test_report_source_date_not_observation_date_and_no_spatial_match(self):
        r = self.original["reports"][0]
        self.assertIsNone(r["observationDateExact"])
        self.assertIsNone(r["coords"])
        self.assertIsNone(r["siteID"])
        self.assertIsNone(r["observationDateEarliest"])
        self.assertEqual(r["observationDateLatest"], "2025-05-07")
        self.assertEqual(r["sitePrecision"], "REGION_ONLY")
        compare = self.bundle["regionalUnmatchedExample"]
        self.assertEqual(compare["reportIssueDate"], "2025-05-07")
        self.assertEqual(compare["mean300Reference"], "2025-05-06")
        self.assertEqual(compare["bayCityMean300Reference"], "2025-05-13")
        self.assertTrue(compare["referenceCityNotField"])
        self.assertIsNone(compare["errorDays"])
        self.assertIsNone(compare["measuredFirstFlightDate"])

    def test_all_thirty_five_real_grid_years_have_two_distinct_heat_methods(self):
        x = self.bundle["methodSensitivity"]
        self.assertEqual(x["archivedGridYears"], 35)
        self.assertEqual(len(x["completeReferenceGridYears"]), 35)
        self.assertEqual(len(x["regions2025"]), 7)
        self.assertEqual(x["publishedFirstAdultDD"], 300)
        self.assertEqual(x["publishedSpringAdultPeakDD"], 565)
        self.assertEqual(x["earliestShiftDays"], -15)
        self.assertEqual(x["latestShiftDays"], -1)
        self.assertFalse(x["parityWithOperationalMSU"])
        for row in x["completeReferenceGridYears"]:
            self.assertLess(row["first300SingleSine"], row["first300Mean"])
            self.assertLess(row["first300Mean"], row["peak565Mean"])
            self.assertLess(row["first300SingleSine"], row["peak565SingleSine"])
            self.assertEqual(row["modelParity"], "UNVERIFIED_MSU_STATION_IMPLEMENTATION")

    def test_sine_formula_analytic_independent_numerical_integration(self):
        for lo, hi in ((30, 45), (20, 80), (40, 75), (38, 100), (55, 80)):
            n = 50000
            mean = (lo + hi) / 2
            amplitude = (hi - lo) / 2
            integrated = sum(max(0, mean + amplitude * math.sin(2 * math.pi * (i + .5) / n) - 43)
                             for i in range(n)) / n
            self.assertAlmostEqual(integrated, C.single_sine_degree_days(lo, hi, 43), delta=.001)
        self.assertEqual(C.single_sine_degree_days(30, 40), 0)
        self.assertEqual(C.single_sine_degree_days(60, 80), 27)

    def test_only_exact_msu_extension_report_urls_and_dates(self):
        self.assertTrue(C.official_url("https://www.canr.msu.edu/news/michigan-vegetable-crop-report-may-7-2025"))
        for fake in (
            "http://www.canr.msu.edu/news/michigan-vegetable-crop-report-may-7-2025",
            "https://www.canr.msu.edu.evil.com/news/michigan-vegetable-crop-report-may-7-2025",
            "https://www.canr.msu.edu@evil.com/news/michigan-vegetable-crop-report-may-7-2025",
            "https://www.canr.msu.edu/news/michigan-vegetable-crop-report-may-7-2025?q=1",
            "https://www.canr.msu.edu/news/predicted-egg-flight-2025",
        ):
            self.assertFalse(C.official_url(fake))

    def test_no_forecast_warnings_trials_or_user_photos_can_be_promoted(self):
        for key, value in (
            ("observationKind", "FORECAST_ONLY"), ("sitePrecision", "FIELD_EXACT"),
            ("confirmedAdultFirstFlight", True), ("observationDateExact", "2025-05-07"),
            ("coords", {"lat": 43, "lon": -85}), ("siteID", "claimed-station"),
        ):
            fake = copy.deepcopy(self.original)
            fake["reports"][0][key] = value
            with tempfile.TemporaryDirectory() as tmp:
                p = Path(tmp) / "ledger.json"
                p.write_text(json.dumps(fake), encoding="utf-8")
                with self.assertRaises(C.EvidenceVeto, msg=key):
                    C.load_evidence(p)
        fake = copy.deepcopy(self.original)
        fake["stationFirstFlights"].append({"source": "unverified-visitor"})
        with self.assertRaisesRegex(C.EvidenceVeto, "STATION_DATA_UNSUPPORTED"):
            C.compile_bundle(fake)

    def test_duplicate_records_future_dates_and_missing_sources_veto(self):
        for modifier in ("duplicate", "future", "source", "species"):
            fake = copy.deepcopy(self.original)
            if modifier == "duplicate":
                fake["reports"].append(copy.deepcopy(fake["reports"][0]))
            if modifier == "future":
                fake["reports"][0]["issueDate"] = "2027-05-07"
            if modifier == "source":
                fake["reports"][0]["sourceUrl"] = "https://bad.example/crop-report"
            if modifier == "species":
                fake["targetTaxon"] = "Delia platura"
            with tempfile.TemporaryDirectory() as tmp:
                p = Path(tmp) / "ledger.json"
                p.write_text(json.dumps(fake), encoding="utf-8")
                with self.assertRaises(C.EvidenceVeto, msg=modifier):
                    C.load_evidence(p)

    def test_compiled_asset_is_deterministic_and_no_unsupported_numbers(self):
        output = C.render(self.bundle)
        self.assertEqual(output, C.OUTPUT.read_text(encoding="utf-8"))
        self.assertIn("window.GardenCabbageValidation=Object.freeze(", output)
        self.assertNotIn('"empiricalHitRate":0', output)
        self.assertNotIn('"observationalMedianAbsoluteErrorDays":0', output)
        self.assertNotIn('"promotionAllowed":true', output)


if __name__ == "__main__":
    unittest.main()
