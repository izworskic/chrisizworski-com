"""Reproducible synthetic tests for ShoreFeel research-only NOAA GRIB extraction."""
import importlib.util
import json
import math
import unittest
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "scripts" / "shorefeel-noaa-hindcast.py"
SPEC = importlib.util.spec_from_file_location("shorefeel_hindcast", PATH)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
SHA = "f" * 64
HRRR = "https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.20260701/conus/hrrr.t12z.wrfsfcf01.grib2"
URMA = "https://noaa-urma-pds.s3.amazonaws.com/urma2p5.20260701/urma2p5.t12z.2dvaranl_ndfd.grb2_wexp"


def message(var="2t", level=2, start=1200, valid=1300, temp_k=293.15):
    return {
        "shortName": var, "typeOfLevel": "heightAboveGround",
        "level": level, "units": "K" if var == "2t" else "m s**-1",
        "dataDate": 20260701, "dataTime": start,
        "validityDate": 20260701, "validityTime": valid,
        # ecCodes can report 0..360 longitudes.
        "values": [temp_k, temp_k + 1],
        "latitudes": [43.6714, 44.7],
        "longitudes": [360 - 83.912, 360 - 84.1],
    }


def record(product="HRRR", site="park-land-grid", messages=None):
    return M.extract(messages if messages is not None else [message()],
                     product=product, site_id=site,
                     source_url=HRRR if product == "HRRR" else URMA, sha256=SHA)


class ShoreFeelNoaaArchive(unittest.TestCase):
    def test_extraction_kelvin_utc_lead_and_geography(self):
        x = record()
        self.assertEqual(x["schema"], M.VERSION)
        self.assertEqual(x["tempF"], 68)
        self.assertEqual(x["forecastLeadHours"], 1)
        self.assertEqual(x["validAt"], "2026-07-01T13:00:00Z")
        self.assertEqual(x["cycleAt"], "2026-07-01T12:00:00Z")
        self.assertLess(x["gridDistanceKm"], .001)
        self.assertAlmostEqual(x["gridLon"], -83.912, places=3)
        self.assertEqual(x["kind"], "model-forecast")
        self.assertIs(x["isBeachAirMeasurement"], False)
        self.assertIs(x["calibrationEligibleAlone"], False)

    def test_urma_analysis_not_forecast(self):
        result = record(product="URMA", messages=[message(valid=1200)])
        self.assertEqual(result["kind"], "gridded-analysis")
        self.assertEqual(result["forecastLeadHours"], 0)
        with self.assertRaisesRegex(ValueError, "zero-lead"):
            record(product="URMA")

    def test_wind_vector_can_precede_air_temp(self):
        u = message("10u", 10)
        v = message("10v", 10)
        u["values"] = [-5.0, 0.0]
        v["values"] = [0.0, 0.0]
        result = record(messages=[u, v, message()])
        self.assertEqual(result["windMps"], 5)
        self.assertEqual(result["windFromDeg"], 90.0)

    def test_wind_grids_must_agree(self):
        u = message("10u", 10)
        u["values"] = [-5.0, 0.0]
        u["validityTime"] = 1400
        with self.assertRaisesRegex(ValueError, "same grid point and time"):
            record(messages=[message(), u])

    def test_missing_bad_and_far_thermometer_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "Required 2m"):
            record(messages=[message("10u", 10)])
        with self.assertRaisesRegex(ValueError, "No physical"):
            record(messages=[message(temp_k=9999)])
        m = message()
        m["latitudes"] = [41.0, 42.0]
        with self.assertRaisesRegex(ValueError, "within 8 km"):
            record(messages=[m])

    def test_invalid_sources_and_unsupported_sites(self):
        for url in ["http://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.20260701/a.grib2",
                    "https://attacker.example/hrrr.20260701/a.grib2"]:
            with self.assertRaises(ValueError):
                M.verify_source("HRRR", url)
        with self.assertRaises(ValueError):
            M.extract([message()], product="HRRR", site_id="near-my-house",
                      source_url=HRRR, sha256=SHA)

    def test_timestamp_and_month_rollover(self):
        self.assertEqual(M.stamp(M.grib_clock(20261231, 2359)), "2026-12-31T23:59:00Z")
        self.assertEqual(M.stamp(M.grib_clock(20270101, 0)), "2027-01-01T00:00:00Z")
        with self.assertRaises(ValueError):
            M.utc("2026-07-01T13:00:00-04:00")
        self.assertAlmostEqual(M.distance_km(43.6714, -83.9120, 43.6714, -83.9120), 0)

    def test_archive_audit_forecast_pair_and_missing(self):
        shore = record()
        inland = record(site="west-bay-inland", messages=[{
            **message(temp_k=294.15),
            "latitudes": [43.6714, 43.6714],
            "longitudes": [360 - 84.1, 360 - 83.912],
        }])
        result = M.audit([shore, inland, dict(shore)])
        self.assertEqual(result["accepted"], 2)
        self.assertEqual(result["duplicates"], 1)
        self.assertEqual(len(result["pairs"]), 1)
        self.assertEqual(result["pairs"][0]["shoreMinusInlandF"], -1.8)
        self.assertIsNone(result["publishedBeachCorrectionF"])
        self.assertIs(result["modelSkillClaim"], False)
        self.assertEqual(result["status"], "REQUIRES_FIELD_MEASUREMENTS")

    def test_conflicting_revision_never_silently_wins(self):
        a = record()
        b = dict(a, tempF=a["tempF"] + 5)
        r = M.audit([a, b])
        self.assertEqual(r["accepted"], 0)
        self.assertEqual(r["conflictingRevisions"], 1)
        self.assertEqual(r["pairs"], [])

    def test_undefined_source_and_fabricated_beach_measurement_are_rejected(self):
        a = record()
        b = dict(a, isBeachAirMeasurement=True)
        c = dict(a, gridDistanceKm=40)
        r = M.audit([a, b, c])
        self.assertEqual(r["accepted"], 1)
        self.assertEqual(r["rejected"], 2)


if __name__ == "__main__":
    unittest.main()
