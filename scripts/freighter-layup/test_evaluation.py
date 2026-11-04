"""The layup audit evaluation is an exploratory retrospective regression, NOT a forecast."""
import json
from pathlib import Path
import unittest
from evaluate import audit

ROOT=Path(__file__).resolve().parents[2]

class SourceAdjudicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry=json.loads((ROOT/'public/assets/freighter-layup-registry.json').read_text())
        cls.corpus=json.loads((ROOT/'data/freighter-layup-shadow-adjudications.json').read_text())

    def test_representative_source_checked_corpus_is_small_and_not_calibrated(self):
        result=audit(self.corpus,self.registry)
        self.assertEqual(result['status'],'EXPLORATORY_NOT_CALIBRATED')
        self.assertEqual(result['reviewedCases'],15)
        self.assertEqual(result['sourceSupportedReviewLeads'],7)
        self.assertEqual(result['sourceSupportedNonLeads'],8)
        self.assertFalse(result['publicationEnabled'])
        self.assertEqual(result['shadow']['trueReviewLeads'],5)
        self.assertEqual(result['shadow']['missedReviewLeads'],2)
        self.assertEqual(result['shadow']['unnecessaryReviewLeads'],0)
        self.assertEqual(result['simpleTitleBaseline']['trueReviewLeads'],1)
        self.assertEqual(len(result['misses']),2)
        self.assertNotIn('precision',result)
        self.assertNotIn('recall',result)

    def test_duplicate_and_unadjudicated_examples_fail_closed(self):
        bad={**self.corpus,'cases':self.corpus['cases'][:1]*2}
        with self.assertRaises(ValueError):
            audit(bad,self.registry)
        bad={**self.corpus,'cases':[{**self.corpus['cases'][0],
                                   'editorialReviewRequired':None}]}
        with self.assertRaises(ValueError):
            audit(bad,self.registry)

    def test_shuffled_cases_have_same_counts(self):
        reversed_cases={**self.corpus,'cases':list(reversed(self.corpus['cases']))}
        a=audit(self.corpus,self.registry)
        b=audit(reversed_cases,self.registry)
        self.assertEqual(a['shadow'],b['shadow'])
        self.assertEqual(a['simpleTitleBaseline'],b['simpleTitleBaseline'])
