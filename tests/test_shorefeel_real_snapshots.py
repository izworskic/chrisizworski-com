"""Check that committed NOAA archive observations remain traceable and non-predictive.

These are actual NOAA model-grid samples from pinned historical archive files.
They are NOT beach air sensor readings and must never become a calibrated
public shoreline temperature estimate without independently verified field truth.
"""
import importlib.util
import json
import math
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "scripts" / "shorefeel-noaa-hindcast.py"
S = importlib.util.spec_from_file_location("shorefeel_snapshots_hindcast", P)
M = importlib.util.module_from_spec(S)
S.loader.exec_module(M)

DATES = ["2026-07-15", "2026-09-20", "2026-11-19"]


class TestRealArchiveSnapshots(unittest.TestCase):
    def test_three_actual_model_snapshots_have_full_source_identity(self):
        for date in DATES:
            with self.subTest(date=date):
                path = ROOT / "research" / "shorefeel" / "noaa" / (date + "-12z.json")
                report = json.loads(path.read_text())
                self.assertEqual(report["schema"], "shorefeel.noaa-real-hindcast-pull.v1")
                self.assertEqual(report["sourceDate"], date)
                self.assertEqual(report["cycleUTC"], "12:00")
                self.assertFalse(report["publicationAuthorized"])
                self.assertFalse(report["calibrationAuthorized"])
                self.assertFalse(report["fieldThermometersIndependentlyVerified"])
                self.assertIsNone(report["measuredBeachMinusInlandF"])
                self.assertIsNone(report["calibratedBeachAirEstimateF"])
                self.assertEqual(report["archiveAudit"]["accepted"], 4)
                self.assertEqual(report["archiveAudit"]["rejected"], 0)
                self.assertEqual(report["archiveAudit"]["conflictingRevisions"], 0)
                self.assertFalse(report["archiveAudit"]["modelSkillClaim"])
                self.assertEqual(report["archiveAudit"]["status"], "REQUIRES_FIELD_MEASUREMENTS")
                self.assertEqual(len(report["modelSources"]), 2)
                self.assertEqual(len(report["archiveAudit"]["pairs"]), 2)
                for archive in report["modelSources"]:
                    product = archive["product"]
                    self.assertIn(product, ("HRRR", "URMA"))
                    M.verify_source(product, archive["url"])
                    self.assertEqual(len(archive["indexSha256"]), 64)
                    self.assertEqual(set(archive["ranges"]), {"temperature", "u", "v"})
                    self.assertEqual(set(archive["points"]), set(M.SITES))
                    for field in archive["ranges"].values():
                        self.assertEqual(field["length"], field["end"] - field["start"] + 1)
                        self.assertEqual(len(field["sha256"]), 64)
                    for site, row in archive["points"].items():
                        self.assertEqual(row["schema"], "shorefeel.noaa-hindcast-subset.v1")
                        self.assertEqual(row["site"], site)
                        self.assertEqual(row["product"], product)
                        self.assertIsNone(row["sourceFileSha256"],
                                          "Do not mislabel selected GRIB slices as whole-source checksum")
                        self.assertEqual(len(row["selectedFieldsSha256"]), 64)
                        self.assertIs(row["isBeachAirMeasurement"], False)
                        self.assertIs(row["calibrationEligibleAlone"], False)
                        self.assertTrue(-60 <= row["tempF"] <= 130)
                        self.assertTrue(0 <= row["gridDistanceKm"] <= 8)
                        self.assertTrue(math.isfinite(row["windMps"]))
                        self.assertTrue(0 <= row["windFromDeg"] < 360)
                        if product == "HRRR":
                            self.assertEqual(row["forecastLeadHours"], 1)
                            self.assertEqual(row["kind"], "model-forecast")
                        else:
                            self.assertEqual(row["forecastLeadHours"], 0)
                            self.assertEqual(row["kind"], "gridded-analysis")
                    shore = archive["points"]["park-land-grid"]["tempF"]
                    inland = archive["points"]["west-bay-inland"]["tempF"]
                    pairs = [x for x in report["archiveAudit"]["pairs"]
                             if x["product"] == product]
                    self.assertEqual(len(pairs), 1)
                    self.assertAlmostEqual(pairs[0]["shoreMinusInlandF"],
                                           round(shore - inland, 2), places=2)

    def test_three_sample_dates_are_not_presented_as_site_calibration(self):
        # The sample windows are different seasons but only one UTC cycle each.
        # They cannot support statistics about typical summer lake breezes.
        self.assertEqual(len(DATES), 3)
        self.assertTrue(all(date.startswith("2026-") for date in DATES))


if __name__ == "__main__":
    unittest.main()
