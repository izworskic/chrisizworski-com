"""Guarded scientific checks: measured weather history is never pest emergence evidence."""
import copy
import datetime as dt
import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "fieldbook", ROOT / "scripts/build_garden_pest_python_fieldbook.py")
F = importlib.util.module_from_spec(spec)
spec.loader.exec_module(F)


class PythonPestFieldbookTests(unittest.TestCase):
    def test_numpy_free_source_compiler_reproduces_12775_nasa_daily_cells(self):
        a = F.assemble()
        self.assertEqual(a["schema"], "garden-pest-python-regional-fieldbook-v1")
        self.assertEqual(a["audit"]["dailyWeatherValuesVerified"], 12_775)
        self.assertEqual(a["audit"]["completeClimateLocationYears"], 35)
        self.assertEqual(a["audit"]["confirmedPestPresenceRecords"], 0)
        self.assertEqual(a["audit"]["operationalModelParity"], "NOT_ESTABLISHED")
        self.assertEqual(len(a["cities"]), 7)
        self.assertEqual([y["year"] for y in a["cities"][0]["years"]], [2021, 2022, 2023, 2024, 2025])
        self.assertEqual(len(F.render(a)), len(F.OUTPUT.read_text(encoding="utf-8")))
        self.assertEqual(F.render(a), F.OUTPUT.read_text(encoding="utf-8"),
                         "Python compiler must reproduce checked-in browser asset exactly")

    def test_daymet_leap_calendar_keeps_daymet365_not_fabricated_dec31(self):
        self.assertEqual(F.date_for_day(2024, 60), "2024-02-29")
        self.assertEqual(F.date_for_day(2024, 365), "2024-12-30")
        self.assertEqual(F.date_for_day(2025, 365), "2025-12-31")

    def test_japanese_beetle_triangle_geometry_and_bounded_upper_cutoff(self):
        self.assertAlmostEqual(F.triangle_degree_days(40, 60), 2.5)
        self.assertAlmostEqual(F.triangle_degree_days(60, 80), 20.0)
        self.assertAlmostEqual(F.triangle_degree_days(80, 100), 38.4)
        self.assertEqual(F.triangle_degree_days(95, 107), 42)
        for low, high in [(50, 20), (-200, 20), (40, 300)]:
            with self.assertRaises(F.DataVeto):
                F.triangle_degree_days(low, high)

    def test_cabbage_simple_mean_is_independent_and_method_unverified(self):
        self.assertEqual(F.simple_mean_degree_days(40, 80), 17.0)
        self.assertNotEqual(F.simple_mean_degree_days(40, 80),
                            F.triangle_degree_days(40, 80))
        cabbage = next(m for m in F.assemble()["models"] if m["id"] == "cabbage-maggot")
        self.assertEqual(cabbage["lowerF"], 43)
        self.assertEqual(cabbage["start"], "March 1")
        self.assertEqual([x["thresholdGddF"] for x in cabbage["stages"]],
                         [300, 1476, 2652])
        self.assertEqual(cabbage["methodParity"],
                         "MSU_DEGREE_DAY_METHOD_NOT_SPECIFIED_ON_PUBLIC_PAGE")

    def test_missing_day_vetoes_full_climate_year_and_no_zero_fill(self):
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "missing.csv"
            source = (F.INPUT / "bay-city.csv").read_text(encoding="utf-8")
            lines = source.splitlines()
            altered = [line for line in lines if not line.startswith("2024,120,")]
            file.write_text("\n".join(altered) + "\n", encoding="utf-8")
            with self.assertRaisesRegex(F.DataVeto, "Expected"):
                F.validate_daily_csv(file, lat=43.5945, lon=-83.8889)

    def test_wrong_location_or_duplicate_day_is_a_source_veto(self):
        with self.assertRaisesRegex(F.DataVeto, "coordinate"):
            F.validate_daily_csv(F.INPUT / "bay-city.csv", lat=43.59, lon=-83.8889)
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "duplicate.csv"
            content = (F.INPUT / "bay-city.csv").read_text(encoding="utf-8")
            content = content.replace("2025,200,", "2025,199,", 1)
            file.write_text(content, encoding="utf-8")
            with self.assertRaisesRegex(F.DataVeto, "duplicate|unordered"):
                F.validate_daily_csv(file, lat=43.5945, lon=-83.8889)

    def test_no_unsupported_five_year_range_when_one_crossing_is_missing(self):
        annual = [
            {"year": y, "events": {
                "japanese-adults": f"{y}-07-10" if y != 2023 else None,
                "japanese-eggs": None,
                "cabbage-first": f"{y}-05-10",
                "cabbage-second": None,
                "cabbage-third": None,
            }} for y in F.YEARS
        ]
        summary = F.summarize_years(annual)
        self.assertEqual(summary["japanese-adults"]["status"], "INCOMPLETE_THRESHOLD_HISTORY")
        self.assertIsNone(summary["japanese-adults"]["earliestMonthDay"])
        self.assertEqual(summary["japanese-adults"]["yearsReached"], 4)
        self.assertEqual(summary["cabbage-first"]["yearsReached"], 5)
        self.assertEqual(summary["cabbage-first"]["earliestMonthDay"], "05-10")
        self.assertEqual(summary["cabbage-first"]["latestMonthDay"], "05-10")

    def test_2026_2027_future_dates_and_emergence_counts_never_enter_output(self):
        data = F.assemble()
        self.assertTrue(all(y["year"] in F.YEARS for c in data["cities"] for y in c["years"]))
        self.assertTrue(all(value is None or value.startswith(str(yr["year"]))
                    for c in data["cities"] for yr in c["years"]
                    for value in yr["events"].values()))
        self.assertTrue(all("2026" not in c["summary"]["japanese-adults"]["sampledCrossingYears"][0]["date"]
                    for c in data["cities"]))
        self.assertNotIn("probability", F.render(data).lower())
        self.assertIn("not a sighting", F.render(data).lower())


if __name__ == "__main__":
    unittest.main()
