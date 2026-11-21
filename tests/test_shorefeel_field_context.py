"""Research-only, synthetic scenarios. No real station or on-sand calibration claimed."""
import copy
import importlib.util
import unittest
from datetime import datetime, timezone
from pathlib import Path

FILE = Path(__file__).resolve().parents[1] / "scripts" / "shorefeel-field-context.py"
SPEC = importlib.util.spec_from_file_location("shorefeel_field_context", FILE)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
NOW = datetime(2026, 7, 3, tzinfo=timezone.utc)
BEACH = {"role": "beach", "temperature_unit": "C", "permission_documented": True,
         "radiation_shielded": True, "sensor_height_m": 2, "distance_to_shore_m": 45,
         "lat": 43.6714, "lon": -83.907, "station_id": "SYNTHETIC-BEACH",
         "calibrated_on": "2026-06-01"}
INLAND = dict(BEACH, role="inland", station_id="SYNTHETIC-INLAND",
              lon=-83.912, distance_to_shore_m=420)
WATER = {"observedAt": "2026-07-01T11:00:00Z", "tempF": 62.0,
         "lat": 43.672, "lon": -83.87, "quality": "valid",
         "kind": "NOAA_GLSEA_ACSPO_NEARSHORE_PIXEL",
         "sourceUrl": "https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS"}
WIND = {"observedAt": "2026-07-01T12:03:00Z", "fromDeg": 85,
        "speedMph": 9, "quality": "valid"}


def inputs():
    paired = {
        "schema": "shorefeel.paired-air-loggers.v1",
        "stationMetadataIndependentlyVerified": False,
        "beachStationId": BEACH["station_id"], "inlandStationId": INLAND["station_id"],
        "records": [{
            "beachAt": "2026-07-01T12:00:00Z",
            "inlandAt": "2026-07-01T12:02:00Z",
            "beachAirF": 65, "inlandAirF": 74,
            "beachMinusInlandF": -9, "independentFieldObservation": True
        }]
    }
    issued = {
        "schema": "shorefeel.issued-air-comparison.v1",
        "modelVersion": "synthetic-locked-v1",
        "modelLockedAt": "2026-06-25T00:00:00Z",
        "holdoutStartsAt": "2026-06-30T00:00:00Z",
        "records": [{
            "validAt": "2026-07-01T12:00:00Z",
            "nwsIssuedAt": "2026-07-01T10:00:00Z",
            "modelIssuedAt": "2026-07-01T11:00:00Z",
            "nwsShoreF": 72, "modelBeachF": 66,
            "modelVersion": "synthetic-locked-v1", "eventId": "synthetic-event-one",
            "nwsSourceUrl": "https://api.weather.gov/gridpoints/DTX/70,54/forecast/hourly",
            "modelSource": "independently-archived-preissued"
        }]
    }
    context = {
        "schema": "shorefeel.local-observation-context.v1",
        "windStation": {
            "role": "local-observed-wind", "lat": 43.6714, "lon": -83.907,
            "heightM": 10, "permissionDocumented": True
        },
        "wind": [copy.deepcopy(WIND)],
        "water": [copy.deepcopy(WATER)]
    }
    return paired, issued, context, copy.deepcopy(BEACH), copy.deepcopy(INLAND)


class ContextStudy(unittest.TestCase):
    def join(self, dataset):
        return M.compose(*dataset, now=NOW)

    def test_paired_air_lake_water_wind_and_prospective_forecasts_are_distinct(self):
        result = self.join(inputs())
        self.assertEqual(result["status"], "RESEARCH_ONLY_UNVERIFIED_FIELD_METADATA")
        self.assertEqual(result["coverage"]["forecastComparable"], 1)
        r = result["descriptive"][0]
        self.assertEqual(r["beachMinusInlandF"], -9)
        self.assertEqual(r["windSector"], "onshore")
        self.assertEqual(r["waterTempF"], 62)
        self.assertEqual(r["localWindFromDeg"], 85)
        self.assertFalse(r["isValidatedForecast"])
        val = result["validationDataset"]
        self.assertEqual(val["observations"][0]["nwsShoreF"], 72)
        self.assertEqual(val["observations"][0]["modelBeachF"], 66)
        self.assertEqual(val["observations"][0]["eventId"], "synthetic-event-one")
        self.assertFalse(result["publicationAuthorized"])
        self.assertFalse(result["calibrationAuthorized"])
        self.assertFalse(result["forecastSkillClaim"])
        self.assertTrue(result["windSectorIsDescriptivePostHoc"])

    def test_forecast_after_target_cannot_be_backfilled_as_if_prospective(self):
        data = list(inputs())
        data[1]["records"][0]["modelIssuedAt"] = "2026-07-01T12:05:00Z"
        result = self.join(data)
        self.assertEqual(result["coverage"]["forecastComparable"], 0)
        self.assertEqual(result["coverage"]["rejected"]["missingForecast"], 1)

    def test_missing_old_or_unlicensed_water_never_becomes_beach_water(self):
        for modified in [
            lambda x: x[2].update(water=[]),
            lambda x: x[2]["water"][0].update(observedAt="2026-06-29T12:00:00Z"),
            lambda x: x[2]["water"][0].update(sourceUrl="https://example.com/other"),
            lambda x: x[2]["water"][0].update(kind="lakewide-surface-mean")
        ]:
            data = list(inputs())
            modified(data)
            r = self.join(data)
            self.assertEqual(r["coverage"]["forecastComparable"], 0)
            self.assertEqual(r["coverage"]["rejected"]["missingWaterPixel"], 1)
            self.assertIsNone(r["descriptive"][0]["waterTempF"])

    def test_remote_wind_station_is_not_a_nearshore_wind_regime(self):
        data = list(inputs())
        data[2]["windStation"]["lon"] = -83.7
        with self.assertRaisesRegex(ValueError, "within 2 km"):
            self.join(data)

    def test_no_wind_or_calm_wind_cannot_assign_onshore_sector(self):
        for variant in ("missing", "calm", "bad"):
            data = list(inputs())
            if variant == "missing":
                data[2]["wind"] = []
            elif variant == "calm":
                data[2]["wind"][0]["speedMph"] = 1
            else:
                data[2]["wind"][0]["quality"] = "maintenance"
            r = self.join(data)
            self.assertEqual(r["coverage"]["forecastComparable"], 0)
            self.assertEqual(r["descriptive"][0]["windSector"], "unknown")

    def test_wind_direction_from_water_vs_land_and_cross_shore(self):
        beach, water = {"lat": 43.67, "lon": -83.907}, {"lat": 43.67, "lon": -83.87}
        az = M.bearing_deg(beach, water)
        self.assertAlmostEqual(az, 90, delta=1)
        self.assertEqual(M.wind_sector(az, az, 12), "onshore")
        self.assertEqual(M.wind_sector((az + 180) % 360, az, 12), "offshore")
        self.assertEqual(M.wind_sector((az + 90) % 360, az, 12), "alongshore")
        self.assertIsNone(M.wind_sector(az, az, 2))

    def test_conflicting_duplicate_observed_wind_rejects_entire_time(self):
        data = list(inputs())
        data[2]["wind"].append(dict(data[2]["wind"][0], fromDeg=267))
        r = self.join(data)
        self.assertEqual(r["coverage"]["conflicts"]["wind"], 1)
        self.assertEqual(r["coverage"]["forecastComparable"], 0)
        self.assertEqual(r["descriptive"][0]["windSector"], "unknown")

    def test_duplicate_hour_uses_nearest_field_sample_only(self):
        data = list(inputs())
        another = dict(data[0]["records"][0], beachAt="2026-07-01T12:09:00Z",
                       inlandAt="2026-07-01T12:10:00Z")
        data[0]["records"].append(another)
        r = self.join(data)
        self.assertEqual(r["coverage"]["distinctHours"], 1)
        self.assertEqual(r["coverage"]["rejected"]["duplicateHour"], 1)
        self.assertEqual(r["descriptive"][0]["observedAt"], "2026-07-01T12:00:00Z")

    def test_station_identity_calibration_and_model_lock_fail_closed(self):
        for mutate in (
            lambda d: d[4].update(station_id="wrong-inland-logger"),
            lambda d: d[3].update(radiation_shielded=False),
            lambda d: d[1].update(modelLockedAt="2026-07-02T00:00:00Z"),
            lambda d: d[0].update(stationMetadataIndependentlyVerified=True)
        ):
            data = list(inputs())
            mutate(data)
            with self.assertRaises(ValueError):
                self.join(data)

    def test_calibrated_after_sample_is_not_a_usable_observation(self):
        data = list(inputs())
        data[3]["calibrated_on"] = "2026-07-02"
        r = self.join(data)
        self.assertEqual(r["coverage"]["rejected"]["uncalibratedTime"], 1)
        self.assertEqual(r["coverage"]["forecastComparable"], 0)

    def test_bad_time_zone_future_time_and_mismatched_difference_rejected(self):
        for mutation in (
            lambda d: d[0]["records"][0].update(beachAt="2026-07-01T12:00:00-04:00"),
            lambda d: d[0]["records"][0].update(beachAt="2027-07-01T12:00:00Z"),
            lambda d: d[0]["records"][0].update(beachMinusInlandF=0)
        ):
            data = list(inputs())
            mutation(data)
            r = self.join(data)
            self.assertEqual(r["coverage"]["forecastComparable"], 0)
            self.assertEqual(r["coverage"]["rejected"]["invalidPairs"], 1)

    def test_hour_matching_and_cross_midnight_rollover(self):
        self.assertEqual(M.selected_hour(M.utc("2026-07-01T23:55:00Z")),
                         M.utc("2026-07-02T00:00:00Z"))
        self.assertIsNone(M.selected_hour(M.utc("2026-07-01T23:28:00Z")))
        self.assertEqual(M.stamp(M.utc("2026-07-01T12:00:00Z")),
                         "2026-07-01T12:00:00Z")


if __name__ == "__main__":
    unittest.main()
