"""Research-only independent shoreline polygon preflight for NOAA GRIB point."""
import importlib.util
import json
import pathlib
import tempfile
import unittest
HERE=pathlib.Path(__file__).parents[1]/'scripts'/'rockhounding'
spec=importlib.util.spec_from_file_location('rockhounding_gis_water_capture',HERE/'capture-fixed-wave-cycle.py')
capture=importlib.util.module_from_spec(spec)
spec.loader.exec_module(capture)
class GreatLakesStudySourceTests(unittest.TestCase):
 def test_real_historic_water_side_evidence_corroborates_anchor_not_surf(self):
  r=capture.independent_water_side_preflight()
  self.assertTrue(r['fixedResearchCellWaterSideCorroborated'])
  self.assertFalse(r['shorelineOutwardBearingMeasured'])
  self.assertFalse(r['harborHydrodynamicShelterModeled'])
  self.assertFalse(r['canPublishBeachSurf'])
 def test_if_correct_model_cell_becomes_land_avoid_fetching_noaa(self):
  raw=json.loads(capture.GIS_SOURCE.read_text())
  next(p for p in raw['sampledLocations'] if p['id']=='agate_500m_wave_candidate')['gisClass']='LAND'
  with tempfile.TemporaryDirectory() as tmp:
   f=pathlib.Path(tmp)/'fake.json';f.write_text(json.dumps(raw))
   with self.assertRaisesRegex(ValueError,'GLAHF point changed'):
    capture.independent_water_side_preflight(f)
 def test_snapshot_will_not_authorize_surveyed_shoreline_normal(self):
  raw=json.loads(capture.GIS_SOURCE.read_text())
  raw['gates']['shorelineBearingSurveyed']=True
  with tempfile.TemporaryDirectory() as tmp:
   f=pathlib.Path(tmp)/'fake.json';f.write_text(json.dumps(raw))
   with self.assertRaisesRegex(ValueError,'Independent historic water-side'):
    capture.independent_water_side_preflight(f)
 def test_mapped_points_must_remain_the_exact_pinned_noaa_cell(self):
  raw=json.loads(capture.GIS_SOURCE.read_text())
  next(p for p in raw['sampledLocations'] if p['id']=='agate_500m_wave_candidate')['coordinate']['lon']+=.002
  with tempfile.TemporaryDirectory() as tmp:
   f=pathlib.Path(tmp)/'fake.json';f.write_text(json.dumps(raw))
   with self.assertRaisesRegex(ValueError,'research anchor diverged'):
    capture.independent_water_side_preflight(f)
if __name__=='__main__':unittest.main()
