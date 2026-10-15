"""USACE eHydro source and no-safety-claim checks, fully offline."""
import importlib.util
import json
import pathlib
import unittest
from urllib.parse import parse_qs, urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
p = ROOT / 'scripts/rockhounding/verify-usace-ehydro.py'
spec = importlib.util.spec_from_file_location('ehydro_rockhounding', p)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def row(object_id=4, name='Grand Marais Harbor, MI'):
    return {'attributes': {
        'OBJECTID': object_id,
        'sdsfeaturename': name,
        'surveytype': 'CONDITION',
        'surveydatestart': 1685577600000,
        'surveydateend': 1685664000000,
        'dateuploaded': 1690000000000,
        'usacedistrictcode': 'LRE',
        'sourcedatalocation': None
    }}

class EhydroTests(unittest.TestCase):
    def test_query_is_local_and_does_not_need_key(self):
        u = mod.query_url()
        q = parse_qs(urlparse(u).query)
        self.assertIn('/FeatureServer/0/query', u)
        self.assertEqual(q['geometryType'], ['esriGeometryEnvelope'])
        self.assertEqual(q['geometry'], [','.join(map(str,mod.BBOX))])
        self.assertEqual(q['returnGeometry'], ['false'])
        self.assertNotIn('token',q)
        with self.assertRaisesRegex(ValueError,'bounds'):
            mod.query_url((-90, 44, -80, 50))

    def test_source_date_is_survey_date_not_upload_date(self):
        rows = mod.parse_catalog({'features':[row()]})
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['surveyEndUTC'],'2023-06-02')
        self.assertNotEqual(rows[0]['surveyEndUTC'], rows[0]['uploadedUTC'])
        self.assertFalse(rows[0]['fullBathymetricSurveyDownloadedAndValidated'])
        self.assertFalse(rows[0]['validatesPresentHarborWaveHeight'])

    def test_catalog_can_have_no_matching_named_survey_without_proving_absence(self):
        self.assertEqual(mod.parse_catalog({'features':[row(name='Another Harbor')]}),[])

    def test_broken_source_or_duplicate_fails_closed(self):
        for payload in ({'error':{'message':'Unavailable'}},
                        {'features':[],'exceededTransferLimit':True},
                        {'features':[row(),row()]},
                        {'features':[{'attributes':{'OBJECTID':4}}]}):
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    mod.parse_catalog(payload)

    def test_malformed_survey_date_cannot_be_backfilled_from_upload_time(self):
        x = row()
        x['attributes']['surveydateend'] = 'yesterday'
        with self.assertRaisesRegex(ValueError,'date'):mod.parse_catalog({'features':[x]})

    def test_register_does_not_imply_live_waves(self):
        doc = json.loads((ROOT/'data/rockhounding/grand-marais-contemporary-source-register-2026-10-15.json').read_text())
        self.assertEqual([s['id'] for s in doc['observationStations']],['GRMM4','45172','45004'])
        self.assertTrue(all(s['confirmedHarborWaveSensor'] is False for s in doc['observationStations']))
        self.assertEqual(doc['hydrographicSurvey']['latestSurveyEndUTC'], '2026-07-30')
        self.assertTrue(doc['hydrographicSurvey']['recentMatchingSurveyJobVerified'])
        self.assertFalse(doc['publicStatements']['canPredictFreshAgates'])

if __name__ == '__main__':
    unittest.main()
