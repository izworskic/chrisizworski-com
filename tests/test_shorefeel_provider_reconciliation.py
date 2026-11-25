import importlib.util, pathlib, unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location("provider",pathlib.Path(__file__).resolve().parents[1]/"scripts/shorefeel-provider-reconciliation.py")
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class ProviderTests(unittest.TestCase):
    def test_kelvin_quality_conflicts_and_timestamp_precision(self):
        head="time,latitude,longitude,sea_surface_temperature,sea_surface_temperature_aggregate_test\nUTC,degrees_north,degrees_east,K,\n"
        raw=(head+"2026-07-06T04:00:00Z,44.055,-87.05,293.15,1\n2026-07-06T04:00:01Z,44.055,-87.05,294.15,1\n2026-07-06T04:01:00Z,44.055,-87.05,295.15,2\n2026-07-06T04:02:00Z,44.055,-87.05,295.15,1\n2026-07-06T04:02:00Z,44.055,-87.05,296.15,1\n2026-07-06T04:03:00Z,41,-87.05,296.15,1\n").encode()
        obs,counts,minutes=p.parse(raw,p.SOURCES["glos45210"],44.055,-87.05)
        self.assertEqual(len(obs),2);self.assertAlmostEqual(obs[p.timestamp("2026-07-06T04:00:00Z")]["tempC"],20)
        self.assertEqual(minutes,{"00:00":1,"00:01":1});self.assertEqual(counts["conflictingTimestamps"],1)
        self.assertEqual(counts["flag_2"],1)
    def test_cdip_identity_secondary_and_units(self):
        head="station_id,time,latitude,longitude,sstSeaSurfaceTemperature,sstFlagPrimary,sstFlagSecondary\n,UTC,degrees_north,degrees_east,Celsius,,\n"
        raw=(head+"269,2026-07-06T04:00:00Z,44.055,-87.05,20,1,0\n268,2026-07-06T04:01:00Z,44.055,-87.05,21,1,0\n269,2026-07-06T04:02:00Z,44.055,-87.05,21,1,5\n").encode()
        obs,counts,_=p.parse(raw,p.SOURCES["cdip269"],44.055,-87.05)
        self.assertEqual(len(obs),1);self.assertEqual(counts["secondary_nonzero"],1)
        with self.assertRaises(ValueError):p.parse(raw.replace(b"Celsius",b"Fahrenheit"),p.SOURCES["cdip269"],44.055,-87.05)
    def test_source_failure_keeps_all_slots(self):
        rows=[{"station":"45210","cycleAt":str(i),"leadHours":24,"reason":"missing"} for i in range(20)]
        with patch.object(p,"fetch",side_effect=TimeoutError("offline")):
            out=p.reconcile(p.SOURCES["cdip269"],rows,{})
        self.assertEqual(out["status"],"unavailable");self.assertEqual(len(out["slots"]),20)
    def test_query_is_bounded_and_operator_specific(self):
        url=p.url_for(p.SOURCES["cdip269"])
        self.assertIn("station_id=%22269%22",url);self.assertIn(p.START,url);self.assertIn(p.END,url)
if __name__=="__main__":unittest.main()
