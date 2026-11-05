"""Evidence integrity regressions for the Seaway Python Intelligence OS pilot."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "seaway_fieldbook", ROOT / "scripts/build_seaway_seasonal_fieldbook.py")
FIELD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(FIELD)
ARCHIVE = json.loads((ROOT / "data/seaway/history.json").read_text(encoding="utf-8"))


class SeawayFieldbookTests(unittest.TestCase):
    def test_source_2022_2024_and_monthly_coverage(self):
        data = FIELD.build_fieldbook(ARCHIVE)
        self.assertEqual(data["schema"], "seaway-seasonal-fieldbook-v1")
        self.assertEqual(data["years"], [2022, 2023, 2024])
        self.assertEqual(len(data["months"]), 12)
        jan = data["months"][0]
        self.assertEqual(jan["sampleCount"], 0)
        self.assertIsNone(jan["median"])
        self.assertEqual(jan["state"], "unreported")
        self.assertEqual(jan["sourceClosedNoteYears"], [2022, 2023, 2024])
        octo = data["months"][9]
        self.assertEqual((octo["minimum"], octo["median"], octo["maximum"]),
                         (204, 279, 292))
        self.assertEqual(octo["sampleYears"], [2022, 2023, 2024])
        self.assertEqual(data["sourceLicense"], "Public Domain U.S. Government")

    def test_closed_source_note_never_becomes_zero_traffic(self):
        a = FIELD.build_fieldbook(ARCHIVE)
        for month in a["months"][:3]:
            self.assertEqual(month["state"], "unreported")
            self.assertIsNone(month["minimum"])
            self.assertIsNone(month["maximum"])
            self.assertTrue(all(x["transits"] is None for x in month["reportedValues"]))

    def test_duplicate_and_missing_rows_fail_closed(self):
        duplicated = copy.deepcopy(ARCHIVE)
        duplicated["rows"].append(copy.deepcopy(duplicated["rows"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate"):
            FIELD.build_fieldbook(duplicated)
        missing = copy.deepcopy(ARCHIVE)
        missing["rows"].pop()
        with self.assertRaisesRegex(ValueError, "missing"):
            FIELD.build_fieldbook(missing)

    def test_invalid_numbers_bad_dates_and_future_without_source_year(self):
        for value in ("-1", "NaN", "12.5", "999999999", True, 2.5):
            a = copy.deepcopy(ARCHIVE)
            a["rows"][3]["vessel_transits"] = value
            with self.subTest(value=value), self.assertRaises(ValueError):
                FIELD.build_fieldbook(a)
        bad = copy.deepcopy(ARCHIVE)
        bad["rows"][0]["month"] = "2027-01-01T00:00:00.000"
        with self.assertRaises(ValueError):
            FIELD.build_fieldbook(bad)
        malformed = copy.deepcopy(ARCHIVE)
        malformed["rows"][0]["month"] = "2022-13-01T00:00:00.000"
        with self.assertRaises(ValueError):
            FIELD.build_fieldbook(malformed)

    def test_partial_years_are_not_advertised_as_a_historical_median(self):
        altered = copy.deepcopy(ARCHIVE)
        for row in altered["rows"]:
            if row["month"].startswith("2022-10"):
                del row["vessel_transits"]
        october = FIELD.build_fieldbook(altered)["months"][9]
        self.assertEqual(october["sampleCount"], 2)
        self.assertEqual(october["state"], "partial")
        self.assertIsNone(october["median"])
        self.assertIsNone(october["minimum"])
        self.assertIsNone(october["maximum"])

    def test_snapshot_reuse_is_deterministic(self):
        a = FIELD.render(ARCHIVE)
        b = FIELD.render(copy.deepcopy(ARCHIVE))
        self.assertEqual(a, b)
        checked = (ROOT / "public/assets/seaway-seasonal-fieldbook.json").read_text(encoding="utf-8")
        self.assertEqual(a, checked)
        self.assertEqual(FIELD.main(["--check"]), 0)


if __name__ == "__main__":
    unittest.main()
