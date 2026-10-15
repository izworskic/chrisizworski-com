"""Pure-input regression tests for open-north NOAA candidate screening, without ecCodes/network."""
import importlib.util
import pathlib
import unittest
spec=importlib.util.spec_from_file_location('rockhounding_wave_cell',pathlib.Path(__file__).parents[1]/'scripts/rockhounding/wave-cell-research.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class ShoreCellSelectorTests(unittest.TestCase):
    def test_northern_offshore_half_plane_avoids_harbor_side(self):
        self.assertFalse(mod.in_open_north_study_sector(46.667276,-85.978659))
        self.assertTrue(mod.in_open_north_study_sector(46.680000,-85.984978))
        self.assertTrue(mod.in_open_north_study_sector(46.688341,-85.976613))
    def test_mask_9999_is_not_zero_wave(self):
        self.assertFalse(mod.good_value('HTSGW',9999))
        self.assertTrue(mod.good_value('HTSGW',0))
        self.assertFalse(mod.good_value('WVPER',0))
        self.assertTrue(mod.good_value('WVDIR',143.52))
        self.assertFalse(mod.good_value('WVDIR',9999))
    def test_fixed_sector_filters_south_and_inland_mask(self):
        cells=mod.candidates_from_height_field(
            [46.667276,46.6765,46.680000,46.688341],
            [-85.978659,-85.984978,-85.984978,-85.976613],
            [0.03,9999,0.12,0.16],limit=8)
        self.assertEqual(len(cells),2)
        self.assertEqual(cells[0]['lat'],46.68)
        self.assertEqual(cells[0]['htsgwFirstM'],0.12)
        self.assertEqual(cells[1]['lat'],46.688341)
    def test_longitude_360_normalization(self):
        self.assertAlmostEqual(mod.longitude180(274.015022),-85.984978,places=4)
        self.assertTrue(mod.in_open_north_study_sector(46.68,274.015022))
    def test_far_side_of_lake_rejected(self):
        self.assertFalse(mod.in_open_north_study_sector(47.00,-85.98))
        self.assertFalse(mod.in_open_north_study_sector(46.680,-85.5))
    def test_prefers_nearer_cell_when_temporal_coverage_is_almost_equal(self):
        near=(0,{"distanceKm":0.445,"lat":46.68},[(i,{}) for i in range(48)])
        far=(1,{"distanceKm":1.114,"lat":46.6835},[(i,{}) for i in range(49)])
        self.assertEqual(mod.choose_best_candidate([far,near])[0],0)
        sparse=(2,{"distanceKm":0.21,"lat":46.68},[(i,{}) for i in range(10)])
        self.assertEqual(mod.choose_best_candidate([sparse,far,near])[0],0)
        self.assertIsNone(mod.choose_best_candidate([]))
    def test_not_harbor_validation(self):
        self.assertEqual(mod.HARBOR['id'],'grand-marais-harbor')
        self.assertGreater(mod.MIN_NORTH_DELTA_DEG,0)

if __name__=='__main__':
    unittest.main()
