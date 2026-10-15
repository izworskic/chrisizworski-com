"""Offline NOAA ENC coastline and harbor structure research tests."""
import importlib.util
import pathlib
import unittest
HERE=pathlib.Path(__file__).parents[1]/'scripts'/'rockhounding'
spec=importlib.util.spec_from_file_location('grand_marais_noaa_enc',HERE/'verify-noaa-enc-shoreline.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
class NOAAENCGeometryTests(unittest.TestCase):
 def test_noaa_chart_uses_real_harbor_coastline_and_pier_feature_ids(self):
  self.assertEqual(mod.SHORE_ID,1938304)
  self.assertEqual(mod.PIER_IDS,(2496904,2496908))
  self.assertIn('objectIds=1938304',mod.url_for(mod.SHORE_LAYER,[mod.SHORE_ID]))
  self.assertIn('objectIds=2496904%2C2496908',mod.url_for(mod.PIER_LAYER,mod.PIER_IDS))
 def test_local_polyline_tangent_is_computed_in_meters_not_degrees(self):
  # Flat SW-NE stretch just north of the Agate research anchor.
  coords=[(-85.988,46.6755),(-85.984,46.6768),(-85.980,46.6781)]
  c=mod.closest_polyline(coords)
  self.assertLess(c['distanceM'],180)
  normal=mod.candidate_normals(c,100)
  self.assertEqual(len(normal),2)
  self.assertAlmostEqual((normal[0]-normal[1])%360,180,places=3)
 def test_waterward_bearing_requires_independent_land_and_water_confirmation(self):
  coords=[(-85.990,46.676),(-85.980,46.676)]
  c=mod.closest_polyline(coords)
  def mock(lat,lon):
   return 'WATER' if lat>46.676 else 'LAND'
  report=mod.pick_waterward(c,mock)
  self.assertEqual(report['status'],'HISTORIC_CHART_NORMAL_GIS_SIDE_CORROBORATED')
  self.assertLess(min(report['researchBearingDeg'],360-report['researchBearingDeg']),.01)
  self.assertEqual([p['glahfClass'] for p in report['bearings'][0]['sidePoints']],['LAND']*3)
  self.assertEqual([p['glahfClass'] for p in report['bearings'][1]['sidePoints']],['WATER']*3)
 def test_two_water_classifications_do_not_invent_surveyed_normal(self):
  c=mod.closest_polyline([(-85.990,46.676),(-85.980,46.676)])
  report=mod.pick_waterward(c,lambda lat,lon:'WATER')
  self.assertIsNone(report['researchBearingDeg'])
  self.assertEqual(report['status'],'INDEPENDENT_NORMAL_PROBES_CONFLICT')
 def test_historic_enc_provenance_and_pier_class_required(self):
  def geo(layer,cat='pier'):
   return {'type':'FeatureCollection','features':[{
    'id':mod.SHORE_ID if layer==mod.SHORE_LAYER else mod.PIER_IDS[0],
    'properties':{'DSNM':mod.SOURCE_CHART,'SORDAT':'201401',
                  'SORIND':'US,US,graph,Chart 14962','CATSLC':cat},
    'geometry':{'type':'LineString','coordinates':[[-85.984,46.676],[-85.983,46.678]]}}]}
  self.assertIn(mod.SHORE_ID,mod.validated_features(geo(mod.SHORE_LAYER),[mod.SHORE_ID],mod.SHORE_LAYER))
  self.assertIn(mod.PIER_IDS[0],mod.validated_features(geo(mod.PIER_LAYER),[mod.PIER_IDS[0]],mod.PIER_LAYER))
  with self.assertRaisesRegex(ValueError,'chart-classified as pier'):
   mod.validated_features(geo(mod.PIER_LAYER,'breakwater'),[mod.PIER_IDS[0]],mod.PIER_LAYER)
  wrong=geo(mod.SHORE_LAYER)
  wrong['features'][0]['properties']['DSNM']='OTHER'
  with self.assertRaisesRegex(ValueError,'source chart'):
   mod.validated_features(wrong,[mod.SHORE_ID],mod.SHORE_LAYER)
 def test_harbor_outline_is_never_pier_centerline_length_or_attenuation(self):
  pier={'id':2496908,'sourceDate':'201401',
        'coordinates':[[-85.97122,46.67638],[-85.97184,46.68382],
                       [-85.97174,46.68378],[-85.97122,46.67638]]}
  value=mod.chart_pier_summary(pier)
  self.assertGreater(value['northSouthSpanM'],700)
  self.assertEqual(value['chartedClass'],'PIER')
  self.assertEqual(value['isCurrentStructuralSurvey'],False)
  self.assertNotIn('pierLengthM',value)
 def test_outside_study_bbox_fail_closed(self):
  with self.assertRaisesRegex(ValueError,'bounds'):
   mod.validated_features({'type':'FeatureCollection','features':[{
    'id':mod.SHORE_ID,'properties':{'DSNM':mod.SOURCE_CHART,'SORDAT':'201401',
      'SORIND':'Chart 14962'},'geometry':{'type':'LineString',
      'coordinates':[[-80,50],[-85.984,46.676]]}}]},[mod.SHORE_ID],mod.SHORE_LAYER)
if __name__=='__main__':unittest.main()
