"""Offline contract tests for original July 2026 USACE survey metadata."""
import importlib.util
import json
import pathlib
import unittest
from urllib.parse import parse_qs, urlparse

ROOT=pathlib.Path(__file__).resolve().parents[1]
script=ROOT/'scripts/rockhounding/verify-usace-2026-source.py'
spec=importlib.util.spec_from_file_location('usace_2026_source',script)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
source=json.loads((ROOT/'data/rockhounding/grand-marais-usace-2026-survey-source.json').read_text())['source']

def payload():
    attrs={
       'OBJECTID':125722,'surveyjobidpk':'GR_01_MAS_20260730_CS',
       'sdsfeaturename':'Grand Marais Harbor','surveytype':'CS',
       'channelareaidfk':'CELRE_GR_01_MAS','usacedistrictcode':'CELRE',
       'sourceagency':'CELRE_DIS',
       'sourceprojection':'NAD_1983_StatePlane_Michigan_North_FIPS_2111_Feet',
       'surveydatestart':1785412800000,'surveydateend':1785412800000,
       'dateuploaded':1789142150000,
       'sourcedatalocation':source['sourceArchiveURL'],
       'plotsheetlocation':source['publicPlotPDFURL'],
       'sourcedatacontent':','.join(source['sourceDataContent']),
    }
    return {'features':[{'attributes':attrs}]}

class TestSurveySource(unittest.TestCase):
    def test_query_is_single_object_not_expensive_grid_download(self):
        u=mod.source_url()
        qs=parse_qs(urlparse(u).query)
        self.assertEqual(qs['where'],['OBJECTID=125722'])
        self.assertEqual(qs['returnGeometry'],['false'])
        self.assertNotIn('token',qs)
    def test_true_survey_date_upload_distinction_and_source_archive(self):
        audit=mod.validate_query(payload(),source)
        self.assertEqual(audit['surveyEndUTC'],'2026-07-30')
        self.assertFalse(audit['originalArchiveContentsParsed'])
        self.assertFalse(audit['bathymetryDatumCalibratedToNOAA'])
        self.assertIsNone(audit['waveHeightMeters'])
    def test_wrong_original_link_timestamp_projected_units_or_missing_file_fail(self):
        edits=[
         lambda a: a.update(surveydatestart=1789142150000),
         lambda a: a.update(dateuploaded=1785412800000),
         lambda a: a.update(sourcedatalocation='https://evil.test/download'),
         lambda a: a.update(sourceprojection='WGS84'),
         lambda a: a.update(sourcedatacontent='GR_01_MAS_20260730_CS.PDF')
        ]
        for edit in edits:
            p=payload();edit(p['features'][0]['attributes'])
            with self.assertRaises(ValueError):mod.validate_query(p,source)
    def test_missing_multiple_and_truncated_original_features_fail(self):
        for p in ({'features':[]},{'features':[payload()['features'][0]]*2},
                  {'error':{'message':'Unavailable'}}, {'features':[],'exceededTransferLimit':True}):
            with self.assertRaises(ValueError):mod.validate_query(p,source)

if __name__=='__main__':unittest.main()
