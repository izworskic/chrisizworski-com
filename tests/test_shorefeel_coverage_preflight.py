import importlib.util, pathlib, unittest, datetime as dt
spec=importlib.util.spec_from_file_location("preflight",pathlib.Path(__file__).resolve().parents[1]/"scripts/shorefeel-coverage-preflight.py")
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
def fixture():
    a={"canPromoteModel":False,"stations":{s:{str(h):{"exact":int(s in p.PRIMARY)} for h in p.LEADS} for s in p.STATIONS}}
    obs={s:{} for s in p.STATIONS}
    meta={s:{m:{"sha256":"a"*64} for m in ("6","7")} for s in p.STATIONS}
    for row in p.frozen_slots():
        if row["station"] not in p.PRIMARY:continue
        b=dt.datetime.fromisoformat(row["cycleAt"])+dt.timedelta(hours=4)
        for t in (b,b+dt.timedelta(hours=2+row["leadHours"])):obs[row["station"]][t]=17
    return obs,meta,a
class CoverageTests(unittest.TestCase):
    def test_denominators_and_no_temperature_output(self):
        obs,meta,a=fixture();r=p.evaluate(obs,meta,a)
        self.assertEqual(len(r["slots"]),200);self.assertEqual(len({(x["station"],x["cycleAt"],x["leadHours"]) for x in r["slots"]}),200)
        self.assertEqual(r["metrics"]["24"]["primary"]["expected"],80)
        self.assertEqual(r["metrics"]["24"]["all"]["expected"],100)
        self.assertEqual(r["metrics"]["48"]["off-hour-extension"]["exactAvailable"],0)
        self.assertTrue(r["canAcquireFixedPrimaryForecastCohort"]);self.assertFalse(r["canPromoteModel"])
        for station in obs:
            for t in obs[station]:obs[station][t]=22
        self.assertEqual(r,p.evaluate(obs,meta,a))
    def test_missing_date_is_not_replaced_even_if_fraction_passes(self):
        obs,meta,a=fixture()
        for s in p.PRIMARY:obs[s].pop(dt.datetime.fromisoformat("2026-06-03T04:00:00+00:00"))
        r=p.evaluate(obs,meta,a)
        self.assertEqual(r["metrics"]["24"]["primary"]["exactAvailable"],72)
        self.assertEqual(r["metrics"]["24"]["primary"]["dateBlocks"],9)
        self.assertFalse(r["canAcquireFixedPrimaryForecastCohort"])
    def test_source_failure_and_eligibility(self):
        obs,meta,a=fixture();meta["45002"]["6"]["error"]="unavailable"
        r=p.evaluate(obs,meta,a)
        self.assertEqual(r["metrics"]["24"]["primary"]["exactAvailable"],70)
        a["stations"]["45210"]["24"]["exact"]=1;a["stations"]["45210"]["48"]["exact"]=1
        with self.assertRaises(ValueError):p.evaluate(obs,meta,a)
if __name__=="__main__":unittest.main()
