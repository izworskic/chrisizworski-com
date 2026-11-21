"""Synthetic, local-only sensor matching tests."""
import importlib.util
import io
import unittest
from datetime import datetime, timezone
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "scripts" / "shorefeel-field-pair.py"
SPEC = importlib.util.spec_from_file_location("shorefeel_field_pair", PATH)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
NOW = datetime(2026, 7, 3, tzinfo=timezone.utc)
BEACH = {"role": "beach", "temperature_unit": "C", "permission_documented": True,
         "radiation_shielded": True, "sensor_height_m": 2, "distance_to_shore_m": 45,
         "lat": 43.6714, "lon": -83.907, "station_id": "BAY-SHORE-EXAMPLE",
         "calibrated_on": "2026-06-01"}
INLAND = dict(BEACH, role="inland", station_id="BAY-INLAND-EXAMPLE",
              lon=-83.912, distance_to_shore_m=420)


def csv(rows):
    return io.StringIO("observed_at_utc,temperature_c,quality_flag\n" + "\n".join(rows) + "\n")


class FieldPairing(unittest.TestCase):
    def test_genuine_pairing_without_claiming_a_forecast(self):
        beach = csv(["2026-07-01T12:00:00Z,19.0,valid",
                     "2026-07-01T13:00:00Z,18.0,valid"])
        inland = csv(["2026-07-01T12:02:00Z,24.0,valid",
                      "2026-07-01T13:01:00Z,23.0,valid"])
        r = M.pair(beach, inland, BEACH, INLAND, now=NOW)
        self.assertEqual(r["paired"], 2)
        self.assertEqual(r["records"][0]["beachMinusInlandF"], -9)
        self.assertEqual(r["records"][0]["timeGapSeconds"], 120)
        self.assertFalse(r["publicationAuthorized"])
        self.assertFalse(r["calibrationAuthorized"])
        self.assertFalse(r["stationMetadataIndependentlyVerified"])
        self.assertEqual(r["status"], "UNVERIFIED_FIELD_METADATA")

    def test_same_station_and_unpermissioned_location_refused(self):
        with self.assertRaisesRegex(ValueError, "independent instruments"):
            M.pair(csv([]), csv([]), BEACH, dict(INLAND, station_id=BEACH["station_id"]), now=NOW)
        with self.assertRaisesRegex(ValueError, "permissioned"):
            M.pair(csv([]), csv([]), BEACH, dict(INLAND, permission_documented=False), now=NOW)
        with self.assertRaisesRegex(ValueError, "permissioned"):
            M.pair(csv([]), csv([]), dict(BEACH, radiation_shielded=False), INLAND, now=NOW)

    def test_stale_or_unpaired_times_not_silently_interpolated(self):
        r = M.pair(csv(["2026-07-01T12:00:00Z,19,valid"]),
                   csv(["2026-07-01T12:06:00Z,24,valid"]), BEACH, INLAND, now=NOW)
        self.assertEqual(r["paired"], 0)
        self.assertEqual(r["unpairedBeach"], 1)
        self.assertEqual(r["unpairedInland"], 1)

    def test_missing_future_conflicting_and_flagged_samples(self):
        beach = csv(["2026-07-01T12:00:00Z,19,valid",
                     "2026-07-01T12:00:00Z,22,valid",
                     "2026-07-01T13:00:00Z,9999,valid",
                     "2026-07-01T14:00:00Z,22,maintenance",
                     "2026-07-01T15:00:00+01:00,21,valid",
                     "2027-07-01T12:00:00Z,19,valid"])
        inland = csv(["2026-07-01T12:00:00Z,24,valid"])
        r = M.pair(beach, inland, BEACH, INLAND, now=NOW)
        self.assertEqual(r["paired"], 0)
        self.assertEqual(r["rejected"]["beach"]["conflict"], 1)
        self.assertEqual(r["rejected"]["beach"]["invalid"], 2)
        self.assertEqual(r["rejected"]["beach"]["flagged"], 1)
        self.assertEqual(r["rejected"]["beach"]["future"], 1)

    def test_unique_inland_reading_used_once(self):
        r = M.pair(csv(["2026-07-01T12:00:00Z,19,valid",
                        "2026-07-01T12:01:00Z,18,valid"]),
                   csv(["2026-07-01T12:00:30Z,24,valid"]), BEACH, INLAND, now=NOW)
        self.assertEqual(r["paired"], 1)
        self.assertEqual(r["unpairedBeach"], 1)

    def test_invalid_metadata_and_malformed_csv(self):
        self.assertFalse(M.station_valid(dict(BEACH, calibrated_on="2026-14-90"), "beach"))
        self.assertFalse(M.station_valid(dict(INLAND, sensor_height_m=9), "inland"))
        with self.assertRaisesRegex(ValueError, "requires"):
            M.read_log(io.StringIO("timestamp,temp\n2026-07-01,20"), NOW)


if __name__ == "__main__":
    unittest.main()
