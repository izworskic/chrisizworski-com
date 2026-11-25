import importlib.util
import pathlib
import unittest
spec=importlib.util.spec_from_file_location("physics_regime",pathlib.Path(__file__).resolve().parents[1]/"scripts/shorefeel-physics-regime-diagnostic.py")
p=importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

def hour(i,wind=True,water=True,shore=True):
    return {"windSamples":int(wind),"meanWindSpeedMps":6 if wind else None,
            "offshoreStressProxyM2S2":12 if wind and shore else None,
            "meanWaterC":(20 if i<18 else 18) if water else None}

class PhysicsRegimeTest(unittest.TestCase):
    def test_fixed_features(self):
        f=p.features([hour(i) for i in range(24)])
        self.assertAlmostEqual(f["waterTrendF"],-3.6)
        self.assertEqual(f["windHours"],24)
        self.assertEqual(p.classify(f),{"wind":"atLeast5mps","priorTrend":"cooling","offshore":"favorable"})

    def test_missing_features_not_imputed(self):
        f=p.features([hour(i,wind=i<17,water=i<17,shore=False) for i in range(24)])
        self.assertEqual(p.classify(f),{"wind":"missing","priorTrend":"missing","offshore":"missing"})
        f=p.features([hour(i,water=i<21,shore=False) for i in range(24)])
        self.assertIsNone(f["waterTrendF"])
        self.assertIsNone(f["offshoreStressProxyM2S2"])
        with self.assertRaises(ValueError):p.features([hour(0)])

    def test_paired_denominators_and_missing_outcome(self):
        bands=p.classify(p.features([hour(i) for i in range(24)]))
        rows=[{"leadHours":24,"bands":bands,"actualChangeF":-4,"modelChangeF":-4},
              {"leadHours":24,"bands":bands,"actualChangeF":None,"modelChangeF":-3}]
        m=p.summarize(rows)["24"]["wind"]["atLeast5mps"]
        self.assertEqual(m["expected"],2)
        self.assertEqual(m["matched"],1)
        self.assertEqual(m["candidateMAE_F"],3)
        self.assertEqual(m["persistenceMAE_F"],4)
        self.assertIsNone(p.summarize(rows)["48"]["wind"]["atLeast5mps"]["candidateMAE_F"])

if __name__=="__main__":unittest.main()
