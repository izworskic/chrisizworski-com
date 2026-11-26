import json
import math
import unittest
from pathlib import Path
import replay
import ice_progression
import hybrid
import collector

HERE = Path(__file__).resolve().parent
EXPECTED = json.loads((HERE / 'reference_metrics.json').read_text())

class ResearchTests(unittest.TestCase):
    def test_issued_replay_matches_original_metrics(self):
        result = replay.run()
        self.assertFalse(result['can_promote'])
        self.assertFalse(result['interval_eligible'])
        self.assertEqual(result['counts'], dict(five_lake_records=240, erie_records=48, five_lake_evaluation=80, erie_evaluation_per_horizon=16))
        n = 0
        def compare(actual, values, order):
            nonlocal n
            for key, expected in zip(order, values):
                self.assertTrue(math.isclose(actual[key], expected, abs_tol=1e-9, rel_tol=0), (key, actual[key], expected))
                n += 1
        for name, values in EXPECTED['pooled'].items():
            compare(result['pooled_equal_lake_week'][name], values, EXPECTED['pooled_order'])
        for lake, models in EXPECTED['lakes'].items():
            for name, values in models.items():
                compare(result['lakes'][lake]['models'][name]['evaluation'], values, EXPECTED['metric_order'])
        for horizon, models in EXPECTED['erie'].items():
            for name, values in models.items():
                compare(result['erie_horizons'][horizon]['models'][name]['evaluation'], values, EXPECTED['metric_order'])
        self.assertEqual(n, 149)

    def test_frozen_cohort_rejects_mutations(self):
        text = (HERE / 'five_lake_frozen.txt').read_text()
        for bad in (text.split('\n', 1)[1], text.replace('Superior,2021','Superior,2022',1), text.replace('1.7,2,1.6','nan,2,1.6',1), text.replace('1.7,2,1.6','101,2,1.6',1)):
            with self.subTest(bad=bad[:50]), self.assertRaises(ValueError):
                replay.parse(bad)

    def test_basin_archive_and_reference_metrics(self):
        raw = (HERE.parent / 'data' / 'noaa-basin-daily-1973-2026.txt').read_bytes()
        import hashlib
        self.assertEqual(hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest(), ice_progression.PINNED_GIT_BLOB)
        result = ice_progression.run(ice_progression.parse(raw))
        self.assertFalse(result['can_promote_model'])
        for key, expected in EXPECTED['basin'].items():
            m = result['models'][key]
            actual = [m['evaluation']['n'],m['evaluation']['mae'],m['evaluation']['bias'],m['half_width_pp']]
            for a,b in zip(actual,expected):
                self.assertAlmostEqual(a,b,places=9)
        ice_progression.self_test()

    def test_hybrid_withholds_unreviewed_domain(self):
        with self.assertRaises(ValueError):
            hybrid.area_mean([1,3],[0,1],[1,1],expected_count=2,reviewed_domain=False)
        self.assertEqual(hybrid.area_mean([1,3],[0,1],[1,1],expected_count=2,reviewed_domain=True)['coverage_pct'],75)
        with self.assertRaises(ValueError):
            hybrid.domain_arithmetic([1,3],[0],[1,1],expected_count=2)

    def test_collector_missing_and_immutable_evidence(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            a = collector.Archive(tmp, lambda u,n:(b'evidence',{},200))
            self.assertEqual(a.read('https://example.test'), 'evidence')
            self.assertEqual((Path(tmp)/'blobs'/a.receipts[0]['sha256']).read_bytes(),b'evidence')
            with self.assertRaises(ValueError):
                collector.write_once(Path(tmp)/'blobs'/a.receipts[0]['sha256'],b'changed')
        now=collector.timestamp('2026-11-25T12:00:00Z')
        self.assertIsNone(collector.observation_status({},now)['values'])
        with self.assertRaises(ValueError):
            collector.parse_vector('Dataset {}\n------------\naice[1][2]\n[0], 0.1',2)

if __name__=='__main__':
    unittest.main()
