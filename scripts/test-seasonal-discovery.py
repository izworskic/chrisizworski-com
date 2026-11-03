"""Calendar QA: editorial relevance, diversity, rollover, and source integrity."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('seasonal', Path(__file__).with_name('build-seasonal-discovery.py'))
engine = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(engine)


class CalendarTests(unittest.TestCase):
    def test_twelve_months_diverse_and_traceable(self):
        entries, _ = engine.catalog()
        known = {e['id']: e for e in entries}
        for month in range(1, 13):
            picks = engine.select(entries, month)
            self.assertEqual(len(picks), 6)
            self.assertEqual(len({e['id'] for e in picks}), 6)
            self.assertGreaterEqual(sum(e['kind'] == 'Tool' for e in picks), 2)
            self.assertGreaterEqual(sum(e['kind'] == 'Guide' for e in picks), 2)
            self.assertGreaterEqual(len({e['cluster'] for e in picks}), 3)
            for e in picks:
                self.assertEqual(engine.phase(known[e['id']], month), e['phase'])
                self.assertLessEqual(sum(p['cluster'] == e['cluster'] for p in picks), 2)
                self.assertTrue(e['why'])

    def test_seasonal_regression_examples(self):
        data = engine.compile_data()['months']
        urls = lambda m: {p['url'] for p in data[str(m)]['picks']}
        self.assertIn('/edmund-fitzgerald/', urls(11))
        self.assertNotIn('/fall-color/', urls(11))
        self.assertIn('/michigan-maple-sap-run/', urls(3))
        self.assertIn('/fall-color/', urls(9))
        self.assertIn('/michigan-garden-pest-watch/', urls(7))
        self.assertNotEqual(urls(1), urls(7))

    def test_year_rollover_and_unknown_month(self):
        january = dict(months=[1, 2], id='winter')
        self.assertEqual(engine.phase(january, 12), 'soon')
        self.assertEqual(engine.phase(january, 1), 'now')
        self.assertIsNone(engine.phase(january, 8))
        for invalid in (0, 13):
            with self.assertRaises(ValueError): engine.phase(january, invalid)

    def test_invalid_or_duplicate_calendar_windows_fail(self):
        for invalid in ('', '0,1', '1,13', '1,1', 'garbage'):
            with self.assertRaises(ValueError): engine.months(invalid)

    def test_duplicate_canonicals_are_collapsed(self):
        entries, _ = engine.catalog()
        self.assertEqual(len(entries), len({engine.key(e['url']) for e in entries}))
        self.assertEqual(engine.key('/fall-color/'), engine.key('https://chrisizworski.com/fall-color'))

    def test_missing_editorial_target_fails_closed(self):
        original = engine.ROOT
        with tempfile.TemporaryDirectory() as directory:
            engine.ROOT = Path(directory)
            try:
                for p in engine.SOURCES:
                    target = engine.ROOT / p
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_text((original / p).read_text())
                edit = json.loads((original / engine.EDITORIAL).read_text())
                edit['overrides']['/does-not-exist/'] = dict(months=[1], cluster='trips', why='Invalid')
                target = engine.ROOT / engine.EDITORIAL
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(json.dumps(edit))
                with self.assertRaisesRegex(ValueError, 'no longer in directory'): engine.catalog()
            finally:
                engine.ROOT = original


if __name__ == '__main__':
    unittest.main()
