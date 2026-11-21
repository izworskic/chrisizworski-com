"""Deterministic GLOS shoreline archive ingestion tests; fixtures are synthetic."""
import copy
import importlib.util
import unittest
from datetime import datetime, timezone
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "scripts" / "shorefeel-glos-observations.py"
SPEC = importlib.util.spec_from_file_location("shorefeel_glos_observations", PATH)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
NOW = datetime(2026, 11, 21, 15, 0, tzinfo=timezone.utc)
START = M.utc("2024-07-15T12:00:00Z")
END = M.utc("2024-07-15T16:00:00Z")


def sample(at="2024-07-15T12:15:00Z", temp_k=293.15):
    return [at, -84.912903, 45.407589, temp_k, 1, 4, 1, 75, 1]


def fixture(rows=None):
    return {"table": {
        "columnNames": list(M.FIELDS),
        "columnUnits": list(M.UNITS),
        "columnTypes": ["String", "double", "double", "double", "byte",
                        "double", "byte", "double", "byte"],
        "rows": [sample()] if rows is None else rows
    }}


class GlosStationTests(unittest.TestCase):
    def check(self, rows=None, payload=None):
        return M.normalize(fixture(rows) if payload is None else payload,
                           start=START, end=END, now=NOW,
                           provenance=M.source_url(START, END))

    def test_good_kelvin_air_wind_and_no_calibration_claim(self):
        result = self.check()
        self.assertEqual(result["schema"], M.SCHEMA)
        self.assertEqual(result["status"], "SHORE_STATION_RESEARCH_ONLY")
        self.assertEqual(result["coverage"]["goodAirRows"], 1)
        obs = result["observations"][0]
        self.assertEqual(obs["airTempF"], 68)
        self.assertEqual(obs["windFromDeg"], 75)
        self.assertEqual(obs["observedWindMph"], 8.95)
        self.assertFalse(result["sourceFreshWithinSixHours"])
        self.assertIsNone(result["shoreInlandGradientF"])
        self.assertIsNone(result["candidateForecastSkill"])
        self.assertFalse(result["hasVerifiedBeachSandThermometer"])
        self.assertFalse(result["hasSameHourInlandObservation"])
        self.assertFalse(result["publicationAuthorized"])

    def test_qartod_missing_or_suspect_air_is_not_usable(self):
        rows = [sample()]
        rows[0][4] = 2  # not evaluated, not GOOD
        result = self.check(rows)
        self.assertEqual(result["status"], "NO_QC_APPROVED_OBSERVATIONS")
        self.assertEqual(result["coverage"]["badAirOrQuality"], 1)
        self.assertEqual(result["observations"], [])

    def test_wind_requires_independently_good_direction_and_speed(self):
        rows = [sample(), sample("2024-07-15T12:30:00Z")]
        rows[0][6] = 3
        rows[1][8] = 9
        r = self.check(rows)
        self.assertEqual(r["coverage"]["goodAirRows"], 2)
        self.assertEqual(r["coverage"]["goodAirAndWindRows"], 0)
        self.assertEqual(r["coverage"]["unusableWind"], 2)
        self.assertTrue(all(x["windFromDeg"] is None for x in r["observations"]))

    def test_bad_time_latitude_and_spatial_reference_are_rejected(self):
        a = sample("2024-07-15T12:15:00-04:00")
        b = sample("2024-07-15T12:30:00Z")
        b[1] = -85.3
        c = sample("2024-07-15T17:00:00Z")
        r = self.check([a, b, c])
        self.assertEqual(r["coverage"]["invalidTimeOrCoordinates"], 3)
        self.assertEqual(r["coverage"]["goodAirRows"], 0)

    def test_duplicate_and_conflict_times_excluded_not_silently_revised(self):
        r = self.check([sample(), sample()])
        self.assertEqual(r["coverage"]["duplicate"], 1)
        self.assertEqual(r["coverage"]["goodAirRows"], 1)
        r2 = self.check([sample(), sample(temp_k=294.15), sample()])
        self.assertEqual(r2["coverage"]["conflictingRevision"], 1)
        self.assertEqual(r2["coverage"]["goodAirRows"], 0)

    def test_erddap_provider_unit_aliases_and_aggregate_test_names(self):
        x = fixture()
        self.assertIn("air_temperature_aggregate_test", x["table"]["columnNames"])
        self.assertIn("wind_speed_aggregate_test", x["table"]["columnNames"])
        self.assertIn("wind_from_direction_aggregate_test", x["table"]["columnNames"])
        x["table"]["columnUnits"][5] = "m/s"
        x["table"]["columnUnits"][7] = "°"
        r = self.check(payload=x)
        self.assertEqual(r["coverage"]["goodAirAndWindRows"], 1)
        self.assertEqual(r["observations"][0]["observedWindMph"], 8.95)

    def test_wrong_units_fail_closed_instead_of_fake_fahrenheit(self):
        x = fixture()
        x["table"]["columnUnits"][3] = "degree_C"
        with self.assertRaisesRegex(ValueError, "physical measurement unit"):
            self.check(payload=x)

    def test_no_response_structure_and_unbounded_response_fails(self):
        with self.assertRaisesRegex(ValueError, "ERDDAP JSON"):
            self.check(payload={})
        with self.assertRaisesRegex(ValueError, "variable selection"):
            self.check(payload={"table": {"columnNames": ["time"], "columnUnits": ["UTC"], "rows": []}})
        with self.assertRaisesRegex(ValueError, "row count"):
            self.check(rows=[sample()] * 5001)

    def test_date_windows_reject_future_and_large_scrapes(self):
        with self.assertRaisesRegex(ValueError, "At most one day"):
            M.bounded_window(M.utc("2024-07-15T00:00:00Z"),
                             M.utc("2024-07-17T00:00:00Z"), NOW)
        with self.assertRaisesRegex(ValueError, "real dates"):
            M.bounded_window(M.utc("2027-07-01T00:00:00Z"),
                             M.utc("2027-07-01T04:00:00Z"), NOW)
        self.assertEqual(M.stamp(M.utc("2024-12-31T23:59:00Z")),
                         "2024-12-31T23:59:00Z")

    def test_fetch_path_is_fixed_provider_and_never_arbitrary_url(self):
        visited = []
        result = M.fetch_window(START, END, NOW,
                                fetcher=lambda url: visited.append(url) or fixture())
        self.assertEqual(len(visited), 1)
        self.assertTrue(visited[0].startswith(M.SOURCE + "?"))
        self.assertIn("time%3E=", visited[0])
        self.assertIn("time%3C=", visited[0])
        self.assertEqual(result["coverage"]["goodAirRows"], 1)
        self.assertEqual(result["sourceUrl"], visited[0])


if __name__ == "__main__":
    unittest.main()
