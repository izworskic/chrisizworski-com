"""Pure source-integrity regression for the remote NOAA harbor depth audit."""
import importlib.util
import json
import pathlib
import unittest
HERE=pathlib.Path(__file__).parents[1]
script=HERE/'scripts/rockhounding/verify-harbor-bathymetry.py'
spec=importlib.util.spec_from_file_location('rockhounding_harbor_depth',script)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
reviewed=json.loads((HERE/'data/rockhounding/grand-marais-noaa-enc-harbor-depth-2026-10-15.json').read_text())
class TestNOAAHarborCoverage(unittest.TestCase):
 def test_chart_zones_are_bounded_and_use_no_api_key(self):
  self.assertEqual(len(mod.ZONES),4)
  u=mod.query_url(mod.SOUNDING_LAYER,mod.ZONES['pier-north']['bbox'])
  self.assertIn('/76/query?',u)
  self.assertIn('Z%2CSORDAT',u)
  self.assertNotIn('key=',u)
  with self.assertRaisesRegex(ValueError,'bounds'):
   mod.query_url(76,(-90,45,-80,50))
 def test_sounding_provenance_and_values_reject_missing_and_malformed(self):
  good={'attributes':{'OBJECTID':42,'DSNM':mod.CHART,'Z':2.8,
         'SORDAT':'20160920','SORIND':'US,US,graph,DD-31282'}}
  r=mod.summarize_features(76,[good])
  self.assertEqual(r['sourceDates'],['20160920'])
  self.assertFalse(r['isNavigableDepthEstimate'])
  bad={'attributes':{**good['attributes'],'Z':9999}}
  with self.assertRaisesRegex(ValueError,'Corrupt'):mod.summarize_features(76,[bad])
  bad2={'attributes':{**good['attributes'],'SORDAT':None}}
  with self.assertRaisesRegex(ValueError,'Dated NOAA'):mod.summarize_features(76,[bad2])
 def test_zero_contour_is_not_an_observed_zero_wave_or_survey_date(self):
  contour={'attributes':{'OBJECTID':123,'DSNM':mod.CHART,
    'VALDCO':0.0,'SORDAT':None}}
  row=mod.summarize_features(104,[contour])
  self.assertEqual(row['chartValueMin'],0)
  self.assertEqual(row['sourceDates'],[])
  self.assertFalse(row['isCurrentSoundingSurvey'])
 def test_freeze_reports_all_four_reproducible_noaa_zones(self):
  self.assertEqual(set(mod.ZONES),set(reviewed['zones']))
  for key,zone in mod.ZONES.items():
   self.assertEqual(list(zone['bbox']),reviewed['zones'][key]['bbox'])
  self.assertEqual([reviewed['zones'][k]['soundings']['count'] for k in mod.ZONES],[17,41,38,42])
  self.assertFalse(reviewed['safety']['canPublishHarborWaveHeight'])
 def test_fail_if_noaa_coverage_drifted_or_a_new_wave_claim_was_inserted(self):
  fake={'schemaVersion':reviewed['schemaVersion'],
   'source':{'chartDataset':mod.CHART},'zones':{}}
  for k,z in reviewed['zones'].items():
   fake['zones'][k]={'bbox':z['bbox'],
    'soundings':{'featureCount':z['soundings']['count'],
     'chartValueMin':z['soundings']['chartedZValueRange'][0],
     'chartValueMax':z['soundings']['chartedZValueRange'][1],
     'sourceDates':z['soundings']['sourceDates']},
    'contours':{'featureCount':z['contours']['count'],
     'chartValueMin':z['contours']['chartedContourValueRange'][0],
     'chartValueMax':z['contours']['chartedContourValueRange'][1]}}
  self.assertTrue(mod.check_against_reviewed_snapshot(fake,reviewed))
  fake['zones']['pier-north']['soundings']['featureCount']+=1
  with self.assertRaisesRegex(ValueError,'manual research source review'):
   mod.check_against_reviewed_snapshot(fake,reviewed)
if __name__=='__main__':unittest.main()
