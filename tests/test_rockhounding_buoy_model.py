"""Offline tests for NOAA buoy 45004 model coordinates and missing-value mask."""
import importlib.util
import pathlib
import unittest
root=pathlib.Path(__file__).parents[1]/'scripts/rockhounding'
spec=importlib.util.spec_from_file_location('rockhounding_45004_model',root/'capture-buoy45004-model.py')
model=importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)
class TestBuoyModelCell(unittest.TestCase):
 def test_real_noaa_offshore_coordinate_and_grid_source(self):
  self.assertEqual(model.STATION['id'],'45004')
  self.assertAlmostEqual(model.STATION['lat'],47.583)
  self.assertAlmostEqual(model.STATION['lon'],-86.586)
  url=model.model_url('20261015','12')
  self.assertIn('glwu.grlc_2p5km_sr.t12z.grib2',url)
  self.assertIn('var_HTSGW=on',url)
  self.assertIn('47.68',url)
 def test_no_beach_cell_or_invalid_missing_wave(self):
  self.assertFalse(model.is_valid_height(9999))
  self.assertFalse(model.is_valid_height(float('nan')))
  self.assertFalse(model.is_valid_height(-1))
  self.assertTrue(model.is_valid_height(0))
 def test_select_nearest_real_water_cell_and_normalize_west_lon(self):
  candidates=[
   {'lat':47.583,'lon':273.414,'value':9999},
   {'lat':47.590,'lon':273.415,'value':.56},
   {'lat':47.610,'lon':-86.590,'value':1.01}]
  found=model.select_cell(candidates)
  self.assertEqual(found['lat'],47.59)
  self.assertEqual(found['lon'],-86.585)
  self.assertAlmostEqual(found['heightM'],.56)
  self.assertLess(found['distanceKm'],5)
 def test_rejects_distant_or_all_masked_model_cells(self):
  self.assertIsNone(model.select_cell([{'lat':46.680,'lon':-85.985,'value':.2}]))
  self.assertIsNone(model.select_cell([{'lat':47.583,'lon':-86.586,'value':9999}]))
 def test_cycle_range_validation(self):
  with self.assertRaises(ValueError):
   model.model_url('20261015','24')
  with self.assertRaises(ValueError):
   model.model_url('2026-10-15','12')
if __name__=='__main__':
 unittest.main()
