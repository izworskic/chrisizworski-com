"""Offline tests for the exact NOAA range-selection and field-evidence contract."""
import importlib.util
import io
import unittest
from pathlib import Path
from unittest.mock import patch

PATH = Path(__file__).resolve().parents[1] / "scripts" / "shorefeel-pull-noaa-research.py"
SPEC = importlib.util.spec_from_file_location("shorefeel_real_noaa_pull", PATH)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


def example_index(product="HRRR"):
    step = "1 hour fcst" if product == "HRRR" else "anl"
    return ("1:0:d=2026111912:REFC:entire atmosphere:" + step + ":\n"
            "2:400:d=2026111912:TMP:2 m above ground:" + step + ":\n"
            "3:900:d=2026111912:UGRD:10 m above ground:" + step + ":\n"
            "4:1400:d=2026111912:VGRD:10 m above ground:" + step + ":\n"
            "5:1900:d=2026111912:REST:surface:" + step + ":\n").encode()


class TestRealNoaaPull(unittest.TestCase):
    def test_official_urls_are_exact_and_fixed_sites(self):
        self.assertEqual(
            M.url_for("HRRR", "20261119", 12, 1),
            "https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.20261119/conus/"
            "hrrr.t12z.wrfsfcf01.grib2")
        self.assertEqual(
            M.url_for("URMA", "20261119", 12, 0),
            "https://noaa-urma-pds.s3.amazonaws.com/urma2p5.20261119/"
            "urma2p5.t12z.2dvaranl_ndfd.grb2_wexp")

    def test_realistic_index_produces_three_bounded_ranges(self):
        r = M.parse_idx(example_index(), "HRRR", "2026111912", 1)
        self.assertEqual(r["temperature"]["start"], 400)
        self.assertEqual(r["temperature"]["end"], 899)
        self.assertEqual(r["u"]["start"], 900)
        self.assertEqual(r["v"]["end"], 1899)
        self.assertEqual(r["temperature"]["length"], 500)
        self.assertEqual(
            M.parse_idx(example_index("URMA"), "URMA", "2026111912", 0)["v"]["length"], 500)

    def test_wrong_cycle_lead_index_and_timestamps_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "cycle"):
            M.parse_idx(example_index(), "HRRR", "2026112012", 1)
        with self.assertRaisesRegex(ValueError, "lead"):
            M.parse_idx(example_index(), "HRRR", "2026111912", 2)
        with self.assertRaisesRegex(ValueError, "analysis"):
            M.parse_idx(example_index(), "URMA", "2026111912", 0)
        with self.assertRaisesRegex(ValueError, "offsets"):
            M.parse_idx(example_index().replace(b"4:1400:", b"4:100:"), "HRRR", "2026111912", 1)

    def test_missing_and_duplicated_thermometer_message_refused(self):
        blob = example_index().replace(b"2 m above ground", b"surface")
        with self.assertRaisesRegex(ValueError, "temperature"):
            M.parse_idx(blob, "HRRR", "2026111912", 1)
        with self.assertRaisesRegex(ValueError, "exactly one"):
            M.parse_idx(example_index().replace(
                b"5:1900:d=2026111912:REST:surface:",
                b"5:1900:d=2026111912:TMP:2 m above ground:"),
                "HRRR", "2026111912", 1)

    def test_server_must_return_exact_partial_content_not_full_file(self):
        def fake(url, headers=None, limit=40000):
            if url.endswith(".idx"):
                return 200, None, example_index()
            # A server ignoring Range cannot accidentally produce dataset.
            return 200, None, b"GRIB" + b"0" * 494 + b"7777"
        with patch.object(M, "get", fake):
            with self.assertRaisesRegex(ValueError, "did not honor"):
                M.download_fields(M.url_for("HRRR", "20261119", 12, 1),
                                  "HRRR", "2026111912", 1)

    def test_ndbc_missing_values_not_promoted_to_air(self):
        sample = ("#YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE\n"
                  "2026 11 19 23 40 130 6.2 7.2 MM MM MM MM MM MM MM MM MM MM MM\n")
        with patch.object(M, "get", return_value=(200, None, sample.encode())):
            result = M.read_ndbc("SBLM4")
        self.assertIs(result["airAvailable"], False)
        self.assertIsNone(result["latestAirC"])
        self.assertEqual(result["latestWindMps"], 6.2)
        self.assertIs(result["isBeachAirMeasurement"], False)


if __name__ == "__main__":
    unittest.main()
