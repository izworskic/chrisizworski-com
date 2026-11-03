import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('freighter_gsc', Path('scripts/search/freighter_gsc.py'))
gsc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gsc)

class FreighterGscTest(unittest.TestCase):
    def setUp(self):
        self.pages = [{'Top pages': gsc.TARGET, 'Clicks': '10', 'Impressions': '1,000', 'Position': '7.0'}]
        self.queries = [
            {'Top queries': 'great lakes ship tracker', 'Clicks': '2', 'Impressions': '100', 'Position': '8'},
            {'Top queries': 'great lakes ships live map', 'Clicks': '3', 'Impressions': '300', 'Position': '4'},
            {'Top queries': 'michigan garden', 'Clicks': '20', 'Impressions': '30', 'Position': '2'},
        ]

    def test_sitewide_does_not_claim_page_attribution_and_weights_position(self):
        result = gsc.analyze(self.pages, self.queries, 'sitewide')
        self.assertIn('NOT necessarily', result['query_note'])
        group = result['query_groups']['live map and tracking']
        self.assertEqual(group['impressions'], 400)
        self.assertEqual(group['position'], 5)
        self.assertEqual(group['ctr_percent'], 1.25)

    def test_page_filter_includes_all_rows_without_inventing_missing_data(self):
        result = gsc.analyze(self.pages, self.queries, 'page-filtered')
        self.assertIn('incomplete', result['query_note'])
        self.assertEqual(result['query_groups']['other or uncertain']['clicks'], 20)

    def test_missing_or_duplicate_page_and_impossible_counts_fail(self):
        with self.assertRaises(ValueError): gsc.analyze([], self.queries, 'sitewide')
        with self.assertRaises(ValueError): gsc.analyze(self.pages * 2, self.queries, 'sitewide')
        with self.assertRaises(ValueError): gsc.metric({'Clicks': '4', 'Impressions': '3', 'Position': '2'})

if __name__ == '__main__': unittest.main()
