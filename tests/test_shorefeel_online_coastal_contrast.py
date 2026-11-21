"""Offline, synthetic NWS coastal comparison QA (no field station assumptions)."""
import copy
import importlib.util
import unittest
from datetime import datetime, timezone
from pathlib import Path

PATH=Path(__file__).resolve().parents[1]/"scripts"/"shorefeel-online-coastal-contrast.py"
SPEC=importlib.util.spec_from_file_location("shorefeel_coastal_contrast",PATH)
M=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
NOW=datetime(2026,11,21,20,0,tzinfo=timezone.utc)


def example():
    first={"id":"park-land-grid","reference":{"lat":43.6714,"lon":-83.912},
           "grid":{"id":"DTX","x":31,"y":93},
           "forecastUrl":"https://api.weather.gov/gridpoints/DTX/31,93/forecast/hourly"}
    last={"id":"west-bay-inland","reference":{"lat":43.6714,"lon":-84.1},
          "grid":{"id":"DTX","x":25,"y":93},
          "forecastUrl":"https://api.weather.gov/gridpoints/DTX/25,93/forecast/hourly"}
    for s,t in ((first,45),(last,49)):
        s["futurePeriods"]=[{
            "validAt":"2026-11-22T00:00:00Z",
            "nwsIssuedAt":"2026-11-21T19:00:00Z",
            "sourceGeneratedAt":"2026-11-21T18:55:00Z",
            "nwsShoreF":t,"sourceUrl":s["forecastUrl"],
            "isForecastNotObservation":True
        }]
    return {"schema":M.INPUT_SCHEMA,"siteCount":2,"pointForecasts":[first,last]}


class OnlineNwsCoastalContrast(unittest.TestCase):
    def run_result(self, x):
        return M.compare(x,now=NOW)
    def test_paired_grid_contrast_not_on_sand_forecast(self):
        r=self.run_result(example())
        self.assertEqual(r["status"],"SOURCE_GROUNDED_FORECAST_COMPARISON")
        self.assertEqual(r["hours"][0]["shoreMinusInlandForecastF"],-4)
        self.assertEqual(r["coverage"]["pairedHours"],1)
        self.assertTrue(r["distinctForecastGridCells"])
        self.assertTrue(r["hours"][0]["forecastsCapturedBeforeValidAt"])
        self.assertIsNone(r["measuredShoreInlandGradientF"])
        self.assertIsNone(r["beachSandTemperatureF"])
        self.assertIsNone(r["quarterMileDifferenceF"])
        self.assertFalse(r["publicationAuthorized"])
    def test_same_grid_blocks_illusory_independent_coastal_gradient(self):
        x=example()
        x["pointForecasts"][1]["grid"]=x["pointForecasts"][0]["grid"].copy()
        x["pointForecasts"][1]["forecastUrl"]=x["pointForecasts"][0]["forecastUrl"]
        x["pointForecasts"][1]["futurePeriods"][0]["sourceUrl"]=x["pointForecasts"][1]["forecastUrl"]
        r=self.run_result(x)
        self.assertEqual(r["status"],"NO_COMPARABLE_INDEPENDENT_GRID_HOURS")
        self.assertEqual(r["coverage"]["skipped"]["sameGrid"],1)
    def test_post_valid_issue_and_bad_source_never_become_a_comparison(self):
        for name,value in (("nwsIssuedAt","2026-11-22T01:00:00Z"),
                           ("sourceUrl","https://fake.invalid/gridpoints/DTX/31,93/forecast/hourly"),
                           ("nwsShoreF",None),
                           ("sourceGeneratedAt","2026-11-21T20:30:00Z")):
            x=example()
            x["pointForecasts"][0]["futurePeriods"][0][name]=value
            self.assertEqual(self.run_result(x)["coverage"]["pairedHours"],0,name)
    def test_old_or_different_forecast_issues_are_not_paired(self):
        x=example()
        x["pointForecasts"][1]["futurePeriods"][0]["nwsIssuedAt"]="2026-11-21T18:00:00Z"
        self.assertEqual(self.run_result(x)["coverage"]["skipped"]["differentIssueWindows"],1)
    def test_conflicting_hour_excluded_not_overwritten(self):
        x=example()
        s=x["pointForecasts"][0]["futurePeriods"]
        s.append(dict(s[0],nwsShoreF=89))
        r=self.run_result(x)
        self.assertEqual(r["coverage"]["sourceConflictingHours"]["shore"],1)
        self.assertEqual(r["coverage"]["pairedHours"],0)
    def test_missing_and_bad_hour_envelope(self):
        x=example()
        x["pointForecasts"][1]["futurePeriods"]=[]
        r=self.run_result(x)
        self.assertEqual(r["coverage"]["pairedHours"],0)
        x=example()
        x["pointForecasts"][1]["futurePeriods"][0]["validAt"]="2026-11-24T20:00:00Z"
        self.assertEqual(self.run_result(x)["coverage"]["pairedHours"],0)
    def test_fake_station_and_modified_grid_endpoint_refused(self):
        x=example()
        x["pointForecasts"][0]["forecastUrl"]="https://example.com/temperature"
        with self.assertRaisesRegex(ValueError,"does not match"):
            self.run_result(x)
        x=example()
        x["pointForecasts"][0]["id"]="my-front-yard"
        with self.assertRaisesRegex(ValueError,"public research reference"):
            self.run_result(x)
    def test_date_rollover_is_utc_no_local_assumption(self):
        self.assertEqual(M.utc("2026-12-31T23:00:00Z").year,2026)
        with self.assertRaises(ValueError):
            M.utc("2026-11-21T15:00:00-05:00")

if __name__=="__main__":
    unittest.main()
