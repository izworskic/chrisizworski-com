"""Synthetic issuance tests; real API retrieval is separately checked in CI."""
import importlib.util
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

PATH=Path(__file__).resolve().parents[1]/"scripts"/"shorefeel-nws-forecast-capture.py"
SPEC=importlib.util.spec_from_file_location("shorefeel_nws_capture",PATH)
M=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
NOW=datetime(2026,7,1,12,5,tzinfo=timezone.utc)
SHA="a"*64

def point(name):
    x,y=(70,54) if name=="park-land-grid" else (71,54)
    return {"properties":{"gridId":"DTX","gridX":x,"gridY":y,
      "forecastHourly":f"https://api.weather.gov/gridpoints/DTX/{x},{y}/forecast/hourly"}}

def forecast():
    return {"properties":{"generatedAt":"2026-07-01T11:50:00Z",
      "updateTime":"2026-07-01T11:48:00Z","periods":[
      {"startTime":"2026-07-01T12:00:00Z","endTime":"2026-07-01T13:00:00Z","temperature":70,"temperatureUnit":"F"},
      {"startTime":"2026-07-01T13:00:00Z","endTime":"2026-07-01T14:00:00Z","temperature":71,"temperatureUnit":"F"},
      {"startTime":"2026-07-01T14:00:00Z","endTime":"2026-07-01T15:00:00Z","temperature":None,"temperatureUnit":"F"},
      {"startTime":"2026-07-01T15:00:00Z","endTime":"2026-07-01T16:00:00Z","temperature":75,"temperatureUnit":"F"}
    ]}}

def fetcher(url):
    if url.endswith("/forecast/hourly"):
        return forecast(),SHA,NOW
    if "/points/43.6714,-83.912" in url:
        return point("park-land-grid"),SHA,NOW-timedelta(minutes=1)
    if "/points/43.6714,-84.1" in url:
        return point("west-bay-inland"),SHA,NOW-timedelta(minutes=1)
    raise AssertionError("unexpected NWS source "+url)

class TestIssuedForecast(unittest.TestCase):
    def test_two_actual_grid_identities_and_future_only(self):
        a=M.capture(fetcher)
        self.assertEqual(a["schema"],M.SCHEMA)
        self.assertTrue(a["distinctForecastGridCells"])
        self.assertEqual(len(a["pointForecasts"]),2)
        first=a["pointForecasts"][0]
        self.assertEqual(first["futurePeriods"][0]["validAt"],"2026-07-01T13:00:00Z")
        self.assertEqual(first["futurePeriods"][0]["nwsIssuedAt"],"2026-07-01T12:05:00Z")
        self.assertEqual(first["futurePeriods"][0]["sourceGeneratedAt"],"2026-07-01T11:50:00Z")
        self.assertEqual([p["nwsShoreF"] for p in first["futurePeriods"]],[71,75])
        self.assertFalse(a["publicationAuthorized"])
        self.assertIsNone(a["beachAirMeasurementF"])
        self.assertIsNone(a["modelBeachF"])
        self.assertIsNone(a["eventId"])
    def test_same_grid_avoids_claim_of_independent_coast(self):
        def same(url):
            obj,h,t=fetcher(url)
            if url.endswith("/points/43.6714,-84.1"):
                return point("park-land-grid"),h,t
            return obj,h,t
        x=M.capture(same)
        self.assertFalse(x["distinctForecastGridCells"])
        self.assertFalse(x["isQuarterMileShoreDifference"])
    def test_missing_nonphysical_and_past_periods_skipped(self):
        mapping=M.normalize_point("park-land-grid",point("park-land-grid"))
        f=forecast()
        f["properties"]["periods"][1]["temperature"]=None
        f["properties"]["periods"][3]["temperature"]=200
        with self.assertRaisesRegex(ValueError,"No future valid"):
            M.normalize_forecast(mapping,f,NOW,SHA)
    def test_source_generated_in_future_and_stale_refused(self):
        mapping=M.normalize_point("park-land-grid",point("park-land-grid"))
        f=forecast()
        f["properties"]["generatedAt"]="2026-07-01T15:00:00Z"
        with self.assertRaisesRegex(ValueError,"future"):
            M.normalize_forecast(mapping,f,NOW,SHA)
        f["properties"]["generatedAt"]="2026-06-25T11:00:00Z"
        with self.assertRaisesRegex(ValueError,"72 hours"):
            M.normalize_forecast(mapping,f,NOW,SHA)
    def test_grid_mismatch_malicious_endpoint_and_null(self):
        p=point("park-land-grid")
        p["properties"]["gridX"]=7
        with self.assertRaisesRegex(ValueError,"does not match"):
            M.normalize_point("park-land-grid",p)
        for url in ("https://evil.example/gridpoints/DTX/70,54/forecast/hourly",
                    "http://api.weather.gov/gridpoints/DTX/70,54/forecast/hourly",
                    "https://api.weather.gov/gridpoints/DTX/70,54/forecast/hourly?fake=1"):
            with self.assertRaises(ValueError):
                M.safe_api_url(url,forecast=True)
    def test_offsets_and_clock_bounds(self):
        self.assertEqual(M.stamp(M.utc("2026-07-01T09:00:00-04:00")),
                         "2026-07-01T13:00:00Z")
        with self.assertRaisesRegex(ValueError,"lacks UTC offset"):
            M.utc("2026-07-01T09:00:00")
    def test_nws_endpoint_determined_by_public_grid(self):
        self.assertEqual(M.point_url(M.SITES["park-land-grid"]),
                         "https://api.weather.gov/points/43.6714,-83.912")
        mapping=M.normalize_point("park-land-grid",point("park-land-grid"))
        self.assertEqual(mapping["grid"],{"id":"DTX","x":70,"y":54})

if __name__=="__main__":
    unittest.main()
