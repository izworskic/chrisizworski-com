import datetime as dt, importlib.util, pathlib, unittest
spec=importlib.util.spec_from_file_location("year",pathlib.Path(__file__).resolve().parents[1]/"scripts/shorefeel-separate-year-validation.py")
y=importlib.util.module_from_spec(spec);spec.loader.exec_module(y)
class SeparateYearTests(unittest.TestCase):
    def test_fixed_membership_and_observation_gate(self):
        self.assertEqual(len(y.slots()),200)
        self.assertEqual(len({(p["station"],p["cycleAt"],p["leadHours"]) for p in y.slots()}),200)
        obs={s:{} for s in y.STATIONS};meta={s:{"sha256":"a"*64} for s in y.STATIONS}
        for p in y.slots():
            if p["station"] not in y.PRIMARY:continue
            b=dt.datetime.fromisoformat(p["cycleAt"])+dt.timedelta(hours=4)
            obs[p["station"]][b]=12
            obs[p["station"]][b+dt.timedelta(hours=2+p["leadHours"])]=13
        r=y.preflight(obs,meta)
        self.assertTrue(r["observationGate"])
        self.assertEqual(r["metrics"]["24"]["primary"]["expected"],80)
        self.assertEqual(r["metrics"]["24"]["all"]["expected"],100)
        for s in y.PRIMARY:obs[s].pop(dt.datetime.fromisoformat("2025-07-03T04:00:00+00:00"))
        self.assertFalse(y.preflight(obs,meta)["observationGate"])
    def test_scores_keep_missing_slots_and_fixed_weights(self):
        rows=[]
        for p in y.slots():
            rows.append({**p,"reason":"missing"})
        r=y.score(rows)
        self.assertEqual(r["24"]["expected"],80)
        self.assertEqual(r["24"]["weight"],.25)
        self.assertEqual(r["48"]["weight"],1)
        self.assertFalse(r["24"]["passesResearchGates"])
        self.assertIsNone(r["48"]["candidate"]["maeF"])
    def test_archive_identity(self):
        self.assertTrue(y.archive_url("2025-07-03",30).endswith("/2025/07/03/lmhofs.t00z.20250703.regulargrid.f030.nc"))
if __name__=="__main__":unittest.main()
